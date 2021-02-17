class RecaptchaPlugin {


  constructor() {

    var form = $("div.form-fields")
    var recaptchaInput = $('<input type="text" style="display:none" name="g-recaptcha-response" id="g-recaptcha-response">')
    form.append(recaptchaInput)

    setInterval(this.hideBadge, 3000);
    let queryString = window.location.search;
    let urlParams = new window.URLSearchParams(queryString);
    this.version = urlParams.get('recaptchav2') ? "v2" : "v3"
    var button = $("#auth-button")

    var loadIcon = $('<div align="center" id="loader">\
                       <img width="50" src="https://chatbot-banesco-static-dev.mybluemix.net/static/img/loader.gif">\
                     </div>')
    var googleTerms = $('<p id="google_terms">\
                         Este sitio esta protegido por reCAPTCHA y la \
                         <a href="https://policies.google.com/privacy?hl=es" target="_blank">Política de privacidad</a> y los\
                         <a href="https://policies.google.com/terms?hl=es" target="_blank">Términos de servicio</a> de Google aplican.\
                        </p>')

    button.after(googleTerms)
    button.after(loadIcon)


    if (this.version == "v3") {
      // Escondemos el boton de iniciar chat y mostramos el icono de carga
      button.hide()
      $("#loader").show();

      // Cuando reCAPTCHA v3 cargue, se llama esta funcion para colocar el token y mostrar el boton de Iniciar Chat
      grecaptcha.ready(function() {
        $(".grecaptcha-badge").hide();
        button.show().prop("disabled", 0)
        $("#loader").hide();
      });

      // Agregar el onclick al boton de Iniciar Chat
      button.click(function() {
        grecaptcha.execute(recaptchaPublicKey || "", {action: 'chat'})
          .then(function(token) {
            $("#g-recaptcha-response").val(token)
            Api.requestAuth("v3");
          }
        );
        return false;
      });
    } else if (this.version == "v2") {
      // Configuramos el boton de Iniciar chat para activar reCAPTCHA v2
      button.hide().prop("disabled", 1)
      button.addClass("g-recaptcha")
      button.attr("data-sitekey", recaptchaPublicKey)
      button.attr("data-callback", "v2Callback")
      button.click(function() {
        return false;
      })
    }
    var self = this;
    Api.subscribe("onAuthRequest", function(body){ self.onAuthRequest(body)})
    Api.subscribe("onAuthResponse", this.onAuthResponse)
  }

  hideBadge() {
    $(".grecaptcha-badge").hide();
  }



  static onload() {
    if ($(".grecaptcha-badge").length == 0) {
      $("#loader").hide();
      $("#auth-button").hide().before($("<div id='g-recaptcha-div'>"))
      grecaptcha.render("g-recaptcha-div", {
          'sitekey'  : recaptchaPublicKey,
          'callback' : "v2Callback"
        }, true
      );
    } else {
      $(".grecaptcha-badge").hide();
      $("#auth-button").show().prop("disabled", 0)
      $("#loader").hide();
    }
  }
  onAuthRequest(body) {
    $("#auth-button").hide().prop("disabled", 0)
    $("#loader").show();
    body["g-recaptcha-response"] = $("#g-recaptcha-response").val();
    body["g-recaptcha-version"] = this.version

  }

  onAuthResponse(body) {
    $("#auth-button").show()
    $("#loader").hide();
  }

}

function v2Callback() {
  Api.requestAuth("v2")
}


Api.addPlugin(RecaptchaPlugin)