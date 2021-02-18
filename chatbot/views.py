# pylint: disable=R0201
# pylint: disable=C0103
# pylint: disable=C0301
# pylint: disable=w0703

# from datetime import datetime
# import time
import json
import uuid
import jwt
import pytz
import base64
import requests

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate
from django.contrib.auth import login as login_auth
from django.contrib.auth import logout as logout_auth
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from django.http import HttpRequest, JsonResponse, HttpResponse
from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.csrf import csrf_exempt

from . import models, forms

from .assistant import Assistant
from .watsonHandlers import *



def createToken(identifier):
    jwt_payload = {
        'id': identifier,
        'date': timezone.now().timestamp()
    }
    return jwt.encode(jwt_payload, settings.SECRET_KEY, algorithm='HS256')

def superuser_only(function):
    def _inner(request, *args, **kwargs):
        if not request.user.is_superuser:
            raise PermissionDenied
        return function(request, *args, **kwargs)
    return _inner


class JSONException(Exception):
    def __init__(self, json_response, *args, **kwargs):
        super(JSONException, self).__init__(*args, **kwargs)
        self.json_response = json_response

def template_global_context(request):
    return {
        "URL": settings.DEFAULT_DOMAIN,
        "APP_VIEW": bool(request.GET.get("app", 1)),
        "DEBUG": settings.DEBUG,
        "VERSION_DATE": settings.VERSION_DATE,
    }

# @login_required
@xframe_options_exempt
def chatbot(request: HttpRequest):
    return render(request, "chatbot.html", {"error": int(request.GET.get("e", 0))})



def customize_chatbot(request: HttpRequest):
    print("hola")
    return render(request, "customize_chatbot.html", {"error": int(request.GET.get("e", 0))})

@login_required
def index(request):
    return render(request, "index.html")



class BaseChatbot:

    def __init__(self, request):
        self.request = request
        if self.request is not None and request.method == "POST":
            try:
                self.request_body = json.loads(request.body.decode('utf-8'))
            except Exception as e:
                raise PermissionDenied

        self._start_time = None

        self.session = None
        self.access_token = None
        self.response_console = None
        self.response = None
        self.user_input = None
        self.context = None

        self.watson_handlers = []

    def authenticate(self):
        try:
            try:
                request_body = json.loads(self.request.body.decode('utf-8'))
            except Exception as e:
                return {'status': 112, 'error': 'Error de conexión: %s' % e}

            newSession = models.WatsonSession(user=self.request.user)

            session_id = Assistant.create_session()
            if session_id is None:
                error = "Counldn't create Assistant session"
                return {
                    "status": 115,
                    "error": error
                }

            newSession.save()
            newSession.session_id = session_id
            token = createToken(newSession.id).decode("utf-8")
            newSession.token = token
            newSession.save()

            if not self.request.session.get("chatbot_uuid", False):
                self.request.session["chatbot_uuid"] = str(uuid.uuid4())

            return {"status": 100, 'token': token}


        except Exception as e:
            raise e
            return {"status": 112, "error": "Couldn't identify user"}

    def send_feedback(self):
        try:
            respuesta_id = int(self.request.GET['respuesta_id'])
        except Exception as e:
            raise PermissionDenied

        self.access_token = self.get_access_token()
        self.session = self.get_session()

        if respuesta_id in range(0, 11):
            url = "%s/feedback/%s/%s" % (settings.CONSOLA_ENDPOINT, self.session.conv, respuesta_id)
            request_consola = requests.post(url)
            print(json.dumps(request_consola, indent=2))
            return {
                "status": 100
            }
        raise PermissionDenied



    def get_session(self) -> models.WatsonSession:
        try:
            return models.WatsonSession.objects.select_for_update().get(id=self.access_token['decoded']['id'])
        except Exception as e:
            raise JSONException({
                'status': 110,
                'error': 'Session not found'
            })

    def get_access_token(self):
        if self.request.method == "POST"  and "token" in self.request_body:
            token = self.request_body['token']
        elif self.request.method == "GET" and "token" in self.request.GET:
            token = self.request.GET['token']
        else:
            raise PermissionDenied

        decoded_token = jwt.decode(
            token.encode("utf-8"),
            settings.SECRET_KEY,
            algorithms=['HS256']
        )

        return {
            "raw": token,
            "decoded": decoded_token,
        }

    def validate_token(self):
        token = self.session.token
        previous_token = self.session.previousToken
        if token != self.access_token["raw"] and previous_token != self.access_token["raw"] and previous_token is not None:
            raise JSONException({
                'status': 113,
                'error': 'Invalid session'
            })

        if timezone.now().timestamp() - float(self.access_token['decoded']['date']) > 12*3600:
            raise JSONException({
                'status': 113,
                'error': 'Session expired'
            })

        self.session.count += 1

        # Si supera el hard limit es blockeado hasta que abra una nueva sesion.
        if self.session.count > settings.HARD_LIMIT_PER_TOKEN:
            self.session.delete()
            raise JSONException({
                'status': 111,
                'error': 'Interaction limit'
            })

    def check_token(self):
        if self.session.count > settings.SOFT_LIMIT_PER_TOKEN and self.session.token == self.access_token["raw"] and self.session.previousToken:
            self.session.count = 0
            self.session.previousToken = None

        elif self.session.count == settings.SOFT_LIMIT_PER_TOKEN and not self.session.previousToken:
            newToken = createToken(self.session.id)
            self.session.previousToken = self.session.token
            self.session.token = newToken.decode("utf-8")
            self.response['token'] = self.session.token
            self.response['status'] = 102


    def get_input_and_context(self):
        if 'input' in self.request_body:
            user_input = self.request_body['input']
        else:
            user_input = {'text': ''}

        if 'context' in self.request_body:
            context = self.request_body.get('context', {})
        else:
            context = {
                "global": {
                    "system": {
                        "user_id": self.request.session.get("chatbot_uuid", "")
                    }
                },
                "skills": {
                    "main skill": {
                        "user_defined": {
                            "name": self.request.user.full_name,
                            "doc_address": self.session.user.address,
                            "doc_phone": self.session.user.phone,
                            "doc_email": self.session.user.email,
                            "doc_title": self.session.user.title,
                        }
                    }
                }
            }

        return (user_input, context)


    def process_input(self):
        for i in WatsonHandler.__subclasses__():
            self.watson_handlers.append(i())
        try:
            with transaction.atomic():
                self.access_token = self.get_access_token()
                self.session = self.get_session()
                self.validate_token()
                self.user_input, self.context = self.get_input_and_context()
                self.prehandlers()
                self.response = self.send_message()
                self.handlers()
                self.check_token()
                self.session.save()
                if 'status' in self.response and self.response['status'] < 110:
                    return self.response

                self.response['status'] = 101


                return self.response

        except jwt.exceptions.InvalidSignatureError:
            return {
                'status': 114,
                'error': 'El token de autenticación es inválido.'
            }

        except KeyError as e:
            raise e
            return {
                'status': 116,
                'error': 'internal error'
            }

        except JSONException as e:
            return e.json_response

        # Error interno.
        except Exception as e:
            raise e
            return {
                'status': 115,
                'error': 'internal error'
            }



    def get_prehandlers(self):
        return [i for i in self.watson_handlers if i.enablePreHandler]

    def get_handlers(self):
        return [i for i in self.watson_handlers if i.enableHandler]

    def prehandlers(self):
        try:
            has_context = True
            context = self.context["skills"]["main skill"]["user_defined"]
        except KeyError:
            has_context = False
            context = {}


        for handler in self.get_prehandlers():
            handler.preHandle(self.user_input, context, self.session)

        if has_context:
            self.context["skills"]["main skill"]["user_defined"] = context

    def handlers(self):
        actions = self.response['output'].get('user_defined', {}).get('action', [])
        if isinstance(actions,str):
            actions = [actions]
        output = self.response['output']

        try:
            has_context = True
            context = self.response['context']["skills"]["main skill"]["user_defined"]
        except:
            has_context = False
            context = {}

        for handler in self.get_handlers():
            handler.handle(
                output, context, actions, self.session,
                contextGlobal=self.response.get("context", {}).get("global", {})
            )

        self.response["output"] = output
        if has_context:
            self.response['context']["skills"]["main skill"]["user_defined"] = context
        elif len(context) > 0:
            self.response['context'] = {
                "skills": {
                    "main skill": {
                        "user_defined": context
                    }
                }
            }
        print("Context >>", json.dumps(self.response['context'], cls=DjangoJSONEncoder, indent=2))
        self.session.context = json.dumps(self.response['context'], cls=DjangoJSONEncoder)

    def send_message(self):
        response = Assistant.send_message(self.user_input, self.context, self.session)

        # if response.status_code
        if 'context' not in response:

            response = {
                'output':{
                    'text': 'Hola, en pocos segundos podré atenderte.'
                }
            }
            raise JSONException(response)

        return response

class BaseTypingDNA:
    endpoint = "https://api.typingdna.com"
    api_key = "df8abeeee32b1f57fdb245d26ea89327"
    api_secret = "37c66288b8c2de7a90ea4043777fad5c"

    def get_auth_header(self):
        authstring = '%s:%s' % (self.api_key, self.api_secret)
        return base64.encodestring(authstring.encode()).decode().replace('\n', '')

    def check_user(self, user_id):

        url = self.endpoint + "/user/" + user_id
        headers = {
          'Authorization': 'Basic ' + self.get_auth_header()
        }

        response = requests.request("GET", url, headers=headers, data={})

        return response.json()

    def save_pattern(self, user_id, pattern):

        url = self.endpoint + "/save/" + user_id

        payload={'tp': pattern}

        headers = {
          'Authorization': 'Basic ' + self.get_auth_header()
        }

        response = requests.request("POST", url, headers=headers, data=payload)

        return response.json()

    def verify_pattern(self, user_id, pattern):
        url = self.endpoint + "/verify/" + user_id

        payload={'tp': pattern, 'quality': 1}
        headers = {
          'Authorization': 'Basic ' + self.get_auth_header()
        }

        response = requests.request("POST", url, headers=headers, data=payload)

        return response.json()



TypingDNA = BaseTypingDNA()


class TypingHandler(WatsonHandler):
    def preHandle(self, input, context, session : models.WatsonSession):
        if context.get("end_recording", False):
            context["patient_restrictions"] = input["text"]
            user_id = "user-" + str(session.user.pk)
            pattern = context["typing_pattern"]

            verification = TypingDNA.verify_pattern(user_id, pattern)
            print(json.dumps(verification, indent=2))

            if verification.get("score", 0) < 40:
                context["success_typing"] = False
            else:
                context["success_typing"] = True
                TypingDNA.save_pattern(user_id, pattern)

        elif context.get("check_password", False):
            user_id = "user-" + str(session.user.pk)
            verification = TypingDNA.verify_pattern(user_id, pattern)
            print(json.dumps(verification, indent=2))

            if verification.get("score", 0) < 40:
                context["success_password"] = False
            else:
                context["success_password"] = True
                TypingDNA.save_pattern(user_id, pattern)

    def handle(self, output, context, actions, session, contextGlobal):
        if "send-email" in actions:
            email = session.user.email

            url = "https://colslamv2.ddns.net:5050/prescription"
            payload={
              "title": "Prescription",
              "fontSize": 10,
              "textColor": "#333333",
              "data": {
                  "Name": context.get("patient_name", ""),
                  "Gender": context.get("patient_gender", ""),
                  "Age": str(context.get("patient_age", "")),
                  "RecipientName": context.get("recipient", ""),
                  "Allowance": context.get("patient_name", ""),
                  "DayCount": context.get("rest_days", ""),
                  "DocSign": "https://www.terragalleria.com/images-misc/signature_philip_hyde_small.jpg",
                  "Date": context.get("date", ""),
                  "Prescription": context.get("patient_illness", "") + ". " + context.get("patient_prescription", ""),
                  "Clearance": context.get("patient_restrictions", ""),
                  "DocAddress": context.get("doc_address", ""),
                  "DocPhone": context.get("doc_phone", ""),
                  "DocEmail": email,
                  "DocName": context.get("name", ""),
                  "DocTitle": context.get("doc_title", ""),

                  "PatientEmail": context.get("patient_email", ""),
                  "SendToDoc": True,
                }
            }
            print("\n\n\n\n\n")
            print(json.dumps(payload, indent=2))


            headers = {
              'Authorization': 'Basic b1l1S2ZmNGtHWmljb0t2cVhRRkJDQkM0YklIcGN1Z086',
              'Content-Type': 'application/json'
            }

            try:
                response = requests.request("POST", url, headers=headers, data=json.dumps(payload), verify=False)
                print(response.status_code)
            except:
                print("Falle miserablemente!")




@csrf_exempt
@xframe_options_exempt
def pdf(request):
    print("entre")
    if request.method == "GET":
        if "payload" in request.GET:
            url = "https://colslamv2.ddns.net:5050/prescription"
            payload = json.loads(request.GET["payload"])

            headers = {
              'Authorization': 'Basic b1l1S2ZmNGtHWmljb0t2cVhRRkJDQkM0YklIcGN1Z086',
              'Content-Type': 'application/json'
            }
            pdf = requests.request("POST", url, headers=headers, data=json.dumps(payload),verify=False)
            response = HttpResponse(pdf.content, content_type='application/pdf')
            response['Content-Disposition'] = 'inline; filename="report.pdf"'
            return response
            # print(response.text)

    return handler403(request)

@csrf_exempt
def auth(request):
    if request.method == "POST":
        response = BaseChatbot(request).authenticate()
        return JsonResponse(response)
    raise PermissionDenied


@csrf_exempt
def apiMessage(request):
    if request.method == 'POST':
        response = BaseChatbot(request).process_input()
        return JsonResponse(response)
    raise PermissionDenied

@xframe_options_exempt
def instructions(request):
    return render(request, "instructions.html")

@xframe_options_exempt
def admin_login(request):
    if request.user.is_authenticated:
        return redirect(request.GET.get('next', '/'))
    if request.method == "POST":
        form = forms.Login(request.POST)
        if form.is_valid():
            email = form.cleaned_data.get('email')
            # password = form.cleaned_data.get('password')
            try:
                user = models.User.objects.get(email=email)
            except:
                form = forms.Login()
                messages.error(request, "Wrong email.")
                return render(request, "login.html", {'form': form})

            if user is None:
                return render(request, "login.html", {'form': form})

            user_id = "user-" + str(user.pk)
            verification = TypingDNA.verify_pattern(user_id, form.cleaned_data["dna"])
            print(json.dumps(verification, indent=2))
            if verification.get("score", 0) < 40:
                form = forms.Login()
                messages.error(request, "TypingDNA couldn't verify it was you. Please type as yourself.")
                return render(request, "login.html", {'form': form})
            TypingDNA.save_pattern(user_id, form.cleaned_data["dna"])
            login_auth(request, user)
            return redirect(request.GET.get('next', "/"))


            messages.error(request, "Wrong email.")
    else:
        form = forms.Login()
    return render(request, "login.html", {'form': form})

def signup(request):
    if request.user.is_authenticated:
        return redirect("/")
    if request.method == "POST":
        print(request.POST)
        form = forms.CreateUser(request.POST)
        if form.is_valid():
            user = form.save()

            if user is None:
                return render(request, "signup.html", {'form': form})

            user_id = "user-" + str(user.pk)
            check = TypingDNA.check_user(user_id)
            print(user.pk, user.email)
            if check.get("count", 0) + check.get("mobilecount", 0) == 0:
                print(TypingDNA.save_pattern(user_id, form.cleaned_data["dna"]))

            # login_auth(request, user)
            return redirect(request.GET.get('next', "/"))

            messages.error(request, "Bad email or password.")
    else:
        form = forms.CreateUser()
    return render(request, "signup.html", {'form': form})



def admin_logout(request):
    logout_auth(request)
    return redirect(reverse('admin_login'))



# @cache_page(7*24*60*60) # 7 dias de cache
def chatbot_js(request):
    response = render(request, "chatbot.js")
    response['Content-Disposition'] = 'inline; filename="chatbot.js"'
    response['Content-Type'] = format("application/javascript")
    return response



@login_required
@superuser_only
def dashboard(request):
    if not request.user.is_superuser:
        raise PermissionDenied
    users = models.User.objects.all()
    return render(request, "usersList.html", {"users": users})




def handler404(request, custom=""):
    """ Vista para manejar Error 404 - Not found """
    title = "We Are Sorry!"
    message = "We couldn't find what you were looking for."
    response = render(request, 'error_handling/httpError.html',
                      {"title": title, "message": message, "custom": custom})
    response.status_code = 404
    return response


def handler403(request, custom=""):
    """ Vista para manejar Error 403 - Permission denied """
    title = "403: Forbidden"
    message = "You have no permissions to see this."
    response = render(request, 'error_handling/httpError.html',
                      {"title": title, "message": message, "custom": custom})
    response.status_code = 403
    return response


def handler500(request, custom=""):
    """ Vista para manejar Error 500 - Internal server error """
    title = "500: Internal Error"
    message = "Ocurrió un error interno en el servidor. Por favor, intente mas tarde."
    response = render(request, 'error_handling/httpError.html',
                      {"title": title, "message": message, "custom": custom})
    response.status_code = 500
    return response