/**
 * Watson Output and Context Handler Manager
 **/
class WatsonHandler {

  constructor() {
    this.enablePreHandler = false
    this.enableHandler = true
    this.enablePostHandler = false
  }

  preHandle(input, context) { throw new Error('Method preHandle(input, context) not implemented.'); }
  handle(output, context) { throw new Error('Method handle(output, context) not implemented.'); }
}

class WatsonHandlerManager {
  constructor() {
    this.handlers = []
  }

  add(handler) {
    if (handler instanceof WatsonHandler) {
      this.handlers.push(handler)
    } else {
        console.log(handler.constructor.name + " does not extends WatsonHandler")
    }
  }

  _preHandle(input, context) {
    for (var i = 0; i < this.handlers.length; i++) {
        if (this.handlers[i].enablePreHandler) {
            this.handlers[i].preHandle(input, context);
        }
    }
  }

  _handle(output, context) {
    for (var i = 0; i < this.handlers.length; i++) {
        if (this.handlers[i].enableHandler) {
          this.handlers[i].handle(output, context);
        }
    }
  }
}

var watsonHandlerManager = new WatsonHandlerManager()

/* HANDLERS */

class BasicWatsonHandler extends WatsonHandler {
  handle(output, context) {
    if (output.hasOwnProperty('user_defined')){
      var botones = output.user_defined.botones
      if (botones != undefined) {
            buttonsCarousel.setButtons(botones[0], botones[1]);
      }
    }
  }
}

watsonHandlerManager.add(new BasicWatsonHandler());


class PrescriptionHandler extends WatsonHandler {
  constructor() {
    this.enablePreHandler = true
    this.enableHandler = true
  }
  preHandle(input, context) {
    console.log("Entre prehandler", input, context,)
    if (context.check_password){
      context["typing_pattern"] = tdna.getTypingPattern(options)
    }
  }

  get(json, key) {
    return json[key] != undefined ? json[key] : "";
  }
  handle(output, context){
    console.log("Entra al handler!", context)
    if (context.start_recording){
      tdna.reset()
      tdna.start()
      console.log("start recording")
    }
    else if (context.end_recording) {
      console.log("end recording")
      context["typing_pattern"] = tdna.getTypingPattern(options)
      tdna.stop()

    }

    if (context.check_password) {
      tdna.reset()
      tdna.start()
    }

    if (output.user_defined){
      var actions = output.user_defined.action
      console.log(output, actions)
      if (actions) {
        if (actions.includes('generate-report')) {
          var payload={
              "title": "Prescription",
              "fontSize": 10,
              "textColor": "#333333",
              "data": {
                  "Name": this.get(context, "patient_name"),
                  "Gender": this.get(context, "patient_gender"),
                  "Age": String(this.get(context, "patient_age")),
                  "RecipientName": this.get(context, "recipient"),
                  "Allowance": this.get(context, "patient_name"),
                  "DayCount": this.get(context, "rest_days"),
                  "DocSign": "https://www.terragalleria.com/images-misc/signature_philip_hyde_small.jpg",
                  "Date": this.get(context, "date"),
                  "Prescription": this.get(context, "patient_illness") + ". " + this.get(context, "patient_prescription"),
                  "Clearance": this.get(context, "patient_restrictions"),
                  "DocAddress": this.get(context, "doc_address"),
                  "DocPhone": this.get(context, "doc_phone"),
                  "DocEmail": this.get(context, "doc_email"),
                  "DocName": this.get(context, "name"),
                  "DocTitle": this.get(context, "doc_title"),
                  "PatientEmail": "",
                  "SendToDoc": false,
              }
          }
          console.log(payload)
          var url = "/report?payload=" + JSON.stringify(payload).replace("#", "%23")
          messageHandlerManager.postMessage("show-report", {url: url}, "*")
        }
      }
    }
  }
}

watsonHandlerManager.add(new PrescriptionHandler());