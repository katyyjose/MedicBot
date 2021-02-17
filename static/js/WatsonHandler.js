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
  get(json, key) {
    return json[key] != undefined ? json[key] : "";
  }
  handle(output, context){
    console.log("Entra al handler!", context)
    if (output.user_defined){
      var actions = output.user_defined.action
      console.log(output, actions)
      if (actions) {
        if (actions.includes('generate-report')) {
          var payload={
              "title": "Prescription 2",
              "fontSize": 10,
              "textColor": "#333333",
              "data": {
                  "Name": this.get(context, "patient_name"),
                  "Gender": this.get(context, "patient_gender"),
                  "Age": String(this.get(context, "patient_age")),
                  "PatientName": this.get(context, "patient_name"),
                  "Allowance": this.get(context, "recipient"),
                  "DayCount": this.get(context, "rest_days"),

                  "Date": this.get(context, "date"),
                  "Prescription": this.get(context, "patient_illness") + ". " + this.get(context, "patient_prescription"),
                  "Clearance": this.get(context, "patient_restrictions"),
                  "DocAddress": this.get(context, "doc_address"),
                  "DocPhone": this.get(context, "doc_phone"),
                  "DocEmail": this.get(context, "doc_email"),
                  "DocName": this.get(context, "name"),
                  "DocTitle": this.get(context, "doc_title")
              }
          }
          var url = "/report?payload=" + JSON.stringify(payload).replace("#", "%23")
          messageHandlerManager.postMessage("show-report", {url: url}, "*")
        }
      }
    }
  }
}

watsonHandlerManager.add(new PrescriptionHandler());