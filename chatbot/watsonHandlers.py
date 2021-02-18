# pylint: disable=R0201
# pylint: disable=C0103
# pylint: disable=C0301
# pylint: disable=w0703

import requests

from django.conf import settings

from chatbot import models



class WatsonHandler:
    enableHandler = True
    enablePreHandler = True
    def preHandle(self, input, context, session):
        pass

    def handle(self, output, context, actions, session, contextGlobal):
        pass

class BasicHandler(WatsonHandler):
    enablePreHandler = False
    def addImage(self, url, text=""):
        element = '''
            <a href="{0}" target="_blank">
                <i class="img-external fas fa-external-link-alt"></i>
                <img src="{0}" class="image-response">
            </a>
            {1}
        '''.format(url, text)
        return element

    def handle(self, output, context, actions, session, contextGlobal):
        # if 'generar-botones' in actions:
        botones = []
        valores = []
        i = 0

        if 'generic' in output:
            for i in range(len(output['generic'])):
                if output['generic'][i]['response_type'] == 'option' and 'options' in output['generic'][i]:
                    for op in output['generic'][i]['options']:
                        botones.append(op['label'])
                        valores.append(op['value']['input']['text'])
                    if "user_defined" not in output:
                        output["user_defined"] = {}
                    output["user_defined"]['botones'] = [botones, valores]
                    break


        if 'generar-imagen' in actions:
            i = 0
            for i in range(len(output['generic'])):
                if output['generic'][i]['response_type'] == 'image':
                    img = output['generic'][i]['source']
                    output['generic'][i]['response_type'] = "text"
                    output['generic'][i]['text'] = self.addImage(img)




