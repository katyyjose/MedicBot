// The Api module is designed to handle all interactions with the server


// Funcion para determinar si el User Agent es de un movil.
(function(a){(jQuery.browser=jQuery.browser||{}).mobile=/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))})(navigator.userAgent||navigator.vendor||window.opera);


// URLSearchParams no existe en versiones viejas de navegadores
(function (w) {
    w.URLSearchParams = w.URLSearchParams || function (searchString) {
        var self = this;
        self.searchString = searchString;
        self.get = function (name) {
            var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(self.searchString);
            if (results == null) {
                return null;
            }
            else {
                return decodeURI(results[1]) || 0;
            }
        };
    }

})(window)

var Api = (function() {
  var requestPayload;
  var responsePayload;
  var messageEndpoint = APP_URL+'/api/message';

  var date;
  var initialTime = 0;
  var primeraInter = true;


  // Publicly accessible methods defined
  return {
    requestAuth: requestAuth,
    subscribe: subscribe,
    sendRequest: sendRequest,
    sendFeedbackScore: sendFeedbackScore,
    _events: {
      "onAuthRequest": [],
      "onAuthResponse": [],
      "onMessageRequest": [],
      "onMessageResponse": [],
      "onDisplayMessage": [],
      "onUserInput": [],
    },
    _plugins: [],
    addPlugin: addPlugin,

    // The request/response getters/setters are defined here to prevent internal methods
    // from calling the methods without any of the callbacks that are added elsewhere.
    getRequestPayload: function() {
      return requestPayload;
    },
    setRequestPayload: function(newPayload) {

      requestPayload = newPayload;
      ConversationPanel.displayMessage(requestPayload, ConversationPanel.settings.authorTypes.user);
    },
    getResponsePayload: function() {
      return responsePayload;
    },
    setResponsePayload: function(newPayload) {
      responsePayload = newPayload;
      ConversationPanel.displayMessage(responsePayload, ConversationPanel.settings.authorTypes.watson);
    },
  };






  function subscribe(event, func) {
    if (Api._events[event] != undefined) {
      if (typeof func == "function"){
        Api._events[event].push(func)
      } else {
        console.log("Api.subscribe: subscriber is not a function.")
      }
    } else {
      console.log("Api.subscribe: event does not exists.")
    }
  }

  function addPlugin(PlugIn) {
    $(document).ready(function() {
      Api._plugins.push(new PlugIn());
    })

  }



  function requestAuth(data = undefined){

    var body = data || {}

    var xhr = new XMLHttpRequest();
    xhr.open("POST", APP_URL+"/api/auth?version=v3", true);

    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function() {
      try{
        var data = JSON.parse(this.responseText);


        $("#auth-token").val(data["token"])
        $("#form_auth").hide();
        $("#chat-column-holder").show();
        $("footer.msg_footer").show();
        $('.message-pane-input').focus();
        if ($.browser.mobile) {
          $('.message-pane-input').blur();
        }

        let status_code = data.status

        /* onAuthResponse event */
        for (var i = 0; i < Api._events["onAuthResponse"].length; i++) {
          Api._events["onAuthResponse"][i](data)
        }

        if (status_code >= 110) {
          document.location.href = APP_URL+"/chatbot?e="+data.status
          return
        };

        Api.sendRequest( '', null, $("#auth-token").val());

      } catch(err) {
        console.log(">>> ", this.responseText);
      }
    }

    /* onAuthRequest event */
    for (var i = 0; i < Api._events["onAuthRequest"].length; i++) {
      if (Api._events["onAuthRequest"][i](body) == false) {
        return false
      }
    }

    body = JSON.stringify(body)
    xhr.send(body);

    return true
  }



  // Receive response from server
  function receiveResponse(http){
      if (http.readyState === 4 && http.status === 200 && http.responseText) {
        var response = JSON.parse(http.responseText)
        // Manejador de errores
        if (response.status >= 110){

          if (debug){
            document.location.href = APP_URL+"/chatbot?e=" + response.status
          } else {
            document.location.href = APP_URL+"?e=" + response.status
          }
          return
        }

        if (response.status === 102 && response.token !== undefined){
          $("#auth-token").val(response.token)
        }

        if (debug) {
          console.log("Output ->", response.output);
          console.log("Conexto ->", response.context);
        }
        var hasOutput = response.output != undefined;
        var hasContext = (response.context && response.context.skills["main skill"] && response.context.skills["main skill"].user_defined) != undefined;
        if (hasOutput || hasContext){
          response.output = response.output || {}
          response.context = response.context || {"skill": {"main skill": {"user_defined": {}}}}
          watsonHandlerManager._handle(response.output, response.context.skills["main skill"].user_defined || {})
        } else {
          console.log("No output or context")
        }

        Api.setResponsePayload(response);


      }
    };

  // Send a message request to the server
  function sendRequest(text, context) {
    // Build request payload
    var payloadToWatson = {};
    if (text) {
      payloadToWatson.input = {
        text: text.replace(/(\n)+/g,"")
      };
    }


    var hasContext = context && context.skills && context.skills["main skill"] && context.skills["main skill"].user_defined;
    var user_defined = hasContext ? context.skills["main skill"].user_defined : {}

    if (payloadToWatson.input){
      watsonHandlerManager._preHandle(payloadToWatson.input, user_defined)
    }

    if (hasContext) {
      payloadToWatson.context = context;
    } else {
      context = {"skill": {"main skill": {"user_defined": user_defined}}}
    }

    // JWT
    payloadToWatson.token = $("#auth-token").val() || "";


    // Built http request
    var http = new XMLHttpRequest();
    http.open('POST', messageEndpoint, true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onreadystatechange = (() => { receiveResponse(http) })

    var params = JSON.stringify(payloadToWatson);
    // Stored in variable (publicly visible through Api.getRequestPayload)
    // to be used throughout the application
    if (Object.getOwnPropertyNames(payloadToWatson).length !== 0) {
      Api.setRequestPayload(payloadToWatson);
    }


    // Send request
    date = new Date();
    initialTime = date.getTime();
    http.send(params);
  }


  function sendFeedbackScore(score){
    if ($("#auth-token").val()) {
        var request = $.ajax({
            type: "GET",
            url: this.endpoint,
            data: {
                "respuesta_id": score,
                "token": $("#auth-token").val()
            },
        });
        return true
    }
    return false
  }
}());


// Api.addPlugin(InitialForm)


