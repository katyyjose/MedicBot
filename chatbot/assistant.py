""" Implementacion de la API para Watson Assistant """

from ibm_watson import AssistantV2
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from ibm_cloud_sdk_core.api_exception import ApiException

from django.conf import settings





class BaseAssistant():
    def __init__(self):
        self.authenticator = IAMAuthenticator(settings.ASSISTANT_APIKEY)
        self.assistant_id = settings.ASSISTANT_ID
        self.assistant = AssistantV2(
                version='2018-07-10',
                authenticator=self.authenticator
            )
        self.assistant.set_service_url("https://api.us-south.assistant.watson.cloud.ibm.com")

    def create_session(self):
        """ Crear sesion de watson assistant. Devuelve el ID de la conversacion """
        try:
            response = self.assistant.create_session(assistant_id=self.assistant_id)
            if response.status_code == 201:
                return response.get_result().get("session_id", None)
            return None
        except Exception as e:
            return None

    def send_message(self, user_input, context, session):
        """ Enviar input y contexto a Watson Assistant. En caso de que
            la sesión haya vencido, se crea una nueva y se guarda en la
            DB antes de enviar el mensaje
        """
        try:
            user_input['options'] = {'return_context': True}

            response = self.assistant.message(assistant_id=self.assistant_id,
                                              session_id=session.session_id,
                                              input=user_input,
                                              context=context).get_result()

            return response

        except ApiException as e:
            if e.code == 404 and e.message == 'Invalid Session':
                # Que hacer en caso de que la session expire
                response = self.assistant.create_session(assistant_id=self.assistant_id).get_result()
                session.session_id = response["session_id"]
                response = self.assistant.message(assistant_id=self.assistant_id,
                                             session_id=session.session_id,
                                             input=user_input,
                                             context=context).get_result()

                return response
            raise e
        except Exception as e:
            raise e

Assistant = BaseAssistant()
