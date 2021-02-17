/**
 * Message Handler Manager
 **/
class MessageHandler {
  handle(e) { throw new Error('Method handler() not implemented.'); }
}

class BasicMessageHandler extends MessageHandler {
  handle(e) {
    if (e.data.message == "identify") {
      if (e.data.payload != undefined) {
        Api.requestAuth("v3", e.data.payload)
      }
    }
  }
}




class PDFHandler extends MessageHandler {


  handle(e) {
    if (e.data.message == "pdf") {
      if (e.data.payload != undefined) {
      }
    }
  }
}

// messageHandlerManager.add(new StyleHandler)

class MessageHandlerManager {
  constructor() {
    this.handlers = [new BasicMessageHandler, new PDFHandler]
    this.window = window.parent
    window.onmessage = this._handle
  }
  postMessage(message, data, origin) {
    this.window.postMessage({message: message, payload:data}, origin)
  }
  add(handler) {
    if (handler instanceof MessageHandler) {
      this.handlers.push(handler)
    } else {
        console.log(handler.constructor.name + " does not extends WatsonHandler")
    }
  }
  _handle(e) {
    console.log(e)
    for (var i = 0; i < messageHandlerManager.handlers.length; i++) {
      messageHandlerManager.handlers[i].handle(e);
    }
  }
}
var messageHandlerManager = new MessageHandlerManager()


