


class ChatView {

    constructor() {
        this.body = $(".msg_body")
        this.container = $(".chatContainer")
        this.cell = $(".chatCell")
        this.chat = $("#scrollingChat")

        this.chatbotQueue = []
        this.lockedQueue = false;
        var self = this;
        setInterval(function() {
            if (self.chatbotQueue.length > 0 && !self.lockedQueue) {
                self.lockedQueue = true;
                var bubble = self.chatbotQueue.shift();
                self.chat.append(bubble.html());
                bubble.load();
                $('.hiddenText').hide()
                $('.dots').attr("src","/static/img/dots.gif").attr('width','30px')
                ConversationPanel.scrollToChatBottom();
                setTimeout(function(){
                    var parent = $('.dots').parent()
                    $('.dots').remove()
                    $('.hiddenText').removeClass('hiddenText').show()
                    // $(parent).append($('<p></p>').append(currentText))
                    setTimeout(function(){
                        // Move chat to the most recent messages when new messages are appended
                        ConversationPanel.scrollToChatBottom();
                        self.lockedQueue = false;
                    },700); //1000
                    ConversationPanel.scrollToChatBottom();
                },700) //1000
            }
        }, 100)
    }

    insertBubble(bubble) {
        if (bubble.sender === ConversationPanel.settings.authorTypes.watson){
            this.chatbotQueue.push(bubble);
        } else {
            this.chat.append(bubble.html());
            bubble.load();
        }

    }
}

class Bubble {

    constructor(sender, content=undefined, avatar=undefined, messagePosition=0) {
        this.segment = $('<div class="segments load">')
        this.sender = sender;
        // <div class="from-watson/form-user latest">
        var msgClass =  ("from-"+sender) + ' latest ' + ((messagePosition === 0) ? 'top' : 'sub')
        this.bubble = $('<div class="'+msgClass+'">')
        this.segment.append(this.bubble)

        if (avatar !== undefined) {
            this.bubble.append($('<img align="center" class="avatar" src="'+avatar+'">'))
        } else {
            this.bubble.append($('<img align="center" class="avatar" style="display:none">'))
        }

        // <div  class="message-inner">
        var classMsg = avatar === undefined ? "" : "message-inner-avatar"
        this.inner = $('<div class="message-inner '+classMsg+'"></div>')



        this.bubble.append(this.inner)

        if (content) {
            this.inner.append(content)
        }
    }

    append(content) {
        this.inner.append(content)
    }

    html() {
        return this.segment[0]
    }

    // Callback que se ejecuta justo despues de insertar el html de la burbuja
    load() {}
}

class TextBubble extends Bubble {
    constructor(sender, text, avatar=undefined, dots=false) {
        if (dots){
            var paragraph = $("<p class='hiddenText'></p>")
            paragraph.html(text)
            super(sender, paragraph, avatar)
            this.append($('<img class="dots">'))
        } else {
            var paragraph = $("<p></p>")
            paragraph.html(text)
            super(sender, paragraph, avatar)
        }

    }
}



class ConversationAPI  {

    constructor() {
        this.customSubmitEvent = undefined;
        this.timer = null;
        this.chatActivated = true;
        this.chatView = new ChatView();
        this.style = {}
        this.settings = {
          selectors: {
            chatBox: '#scrollingChat',
            fromUser: '.from-user',
            fromWatson: '.from-watson',
            fromAgent: '.from-agent',
            latest: '.latest'
          },
          authorTypes: {
            user: 'user',
            watson: 'watson',
            agent: 'agent',
          }
        };
        $(document).ready(function() {
          $("textarea.message-pane-input").on("input keypress paste", ConversationPanel.onKeypressTextarea)
        })
    }


    refresh() {
        document.location.href = APP_URL+"/chatbot"
    }


    sendMessage(text=undefined){
        console.log(this.chatActivated);
        if (this.chatActivated) {
          console.log(text);
          if (text != undefined) {
            console.log("Entro");
            $($(".message-pane-input")[1]).val(text);
          }
          var e = jQuery.Event("keydown");
          e.which = 13; //choose the one you want
          e.keyCode = 13;
          this.checkForSubmitEvent(e, $(".message-pane-input")[1])
        }
    };

    writeMessage(text) {
        this.displayMessage({"output": {"generic": ["text"]}}, true, undefined);
    };


    // Display a user or Watson message that has just been sent/received
    displayMessage(newPayload, sender, isOutput, dots=true, avatar=undefined) {
        if (isOutput === undefined) {
          isOutput = false;
        }
        var isUser = isOutput ? false : this.isUserMessage(sender);

        if (isUser && this.chatActivated == false) {
            return;
        }

        var textExists = (newPayload.input && newPayload.input.text)
          || (newPayload.output && (newPayload.output.text || newPayload.output.generic));
        if (isUser !== null && textExists) {
          // Create new message DOM element

          var messageDivs = this.buildMessageDomElements(newPayload, isUser, sender, avatar, dots);

          var chatBoxElement = document.querySelector(this.settings.selectors.chatBox);

          var previousLatest = chatBoxElement.querySelectorAll((isUser
                  ? this.settings.selectors.fromUser : this.settings.selectors.fromWatson)
                  + this.settings.selectors.latest);
          // Previous "latest" message is no longer the most recent
          if (previousLatest) {
            for (var i = 0; i < previousLatest.length; i++) {
              previousLatest[i].classList.remove('latest');
            }
          }

          var _this = this
          messageDivs.forEach((currentDiv) => {_this.chatView.insertBubble(currentDiv);})

          if (isUser) {
            buttonsCarousel.deleteCarousel();
          }
          this.scrollToChatBottom();
          return messageDivs
        }
        return []
    }

    // Checks if the given typeValue matches with the user "name", the Watson "name", or neither
    // Returns true if user, false if Watson, and null if neither
    // Used to keep track of whether a message was from the user or Watson
    isUserMessage(typeValue) {
        if (typeValue === this.settings.authorTypes.user) {
          return true;
        } else if (typeValue === this.settings.authorTypes.watson) {
          return false;
        }
        return false;
    }



    // Get texts from Assistant V2 API's generics
    getGenericText(generic){
        if (generic == undefined) {
          return []
        }
        var texts = []
        for (var i = 0; i < generic.length; i++) {
          if (generic[i].response_type == "text") {
            texts.push(generic[i].text)
          }
        }
        return texts
    }

    buildMessageDomElements(newPayload, isUser, sender, avatar=undefined, dots=true) {
        var textArray = isUser ? newPayload.input.text : (newPayload.output.text ? newPayload.output.text : this.getGenericText(newPayload.output.generic));
        var isNotArray = Object.prototype.toString.call( textArray ) !== '[object Array]';
        if (isNotArray) {
          textArray = [textArray];
        }
        var messageArray = [];

        textArray.forEach(function(currentText) {
          if (currentText) {

            if (currentText.replace(" ", "") == "<&carousel&>" && newPayload.output.user_defined && newPayload.output.user_defined.carousel) {
                var bubble = new CarouselBubble(newPayload.output.user_defined.carousel)
                messageArray.push(bubble);
            } else {
                dots = !isUser && dots
                var bubble = new TextBubble(sender, currentText, avatar, dots)
                messageArray.push(bubble);
            }
          }
        });
        return messageArray;
    }

    // Constructs new DOM element from a message payload
    buildMessageDomElementsLegacy(newPayload, isUser, sender, avatar=undefined, dots=true) {
        var textArray = isUser ? newPayload.input.text : (newPayload.output.text ? newPayload.output.text : this.getGenericText(newPayload.output.generic));
        var isNotArray = Object.prototype.toString.call( textArray ) !== '[object Array]';
        if (isNotArray) {
          textArray = [textArray];
        }

        var messageArray = [];

        textArray.forEach(function(currentText) {
          if (currentText) {

            // <div class="segment">
            var segment = $('<div class="segments"></div>')

            // <div class="from-watson/form-user latest">
            var msgClass =  ("from-"+sender) + ' latest ' + ((messageArray.length === 0) ? 'top' : 'sub')
            var bubble = $('<div class="'+msgClass+'"> </div>')

            // <img class="avatar"> (if avatar)
            if (avatar !== undefined) {
              bubble.append($('<img align="center" class="avatar" src="'+avatar+'">'))
            }

            // <div  class="message-inner">
            var classMsg = avatar === undefined ? "" : "message-inner-avatar"
            var inner = $('<div class="message-inner">').addClass(classMsg)

            // parrafo del texto e imagen de los puntos (dots)
            if (isUser || !dots){
              var paragraph = $("<p></p>")
              paragraph.html(currentText)
              inner.append(paragraph)
            } else {
              inner.append($('<img class="dots">'))

              var paragraph = $("<p class='hiddenText'></p>")
              paragraph.html(currentText)
              inner.append(paragraph)
            }

            bubble.append(inner)
            segment.append(bubble)
            messageArray.push(segment[0]);
          }
        });

        return messageArray;
    }

    // Scroll to the bottom of the chat window (to the most recent messages)
    // Note: this method will bring the most recent user message into view,
    //   even if the most recent message is from Watson.
    //   This is done so that the "context" of the conversation is maintained in the view,
    //   even if the Watson message is long.
    scrollToChatBottom() {
        var scrollingChat = document.querySelector('.msg_body');
        scrollingChat.scrollTop = scrollingChat.scrollHeight;
    }

    putMessage(text) {
        var chatBox = $(this.settings.selectors.chatBox);
        var dom = $("<div class='chat-message'><i>" + text + "</i></div>")
        chatBox.append(dom)
        this.scrollToChatBottom()
    }

    onKeypressTextarea() {
        var textarea = $("textarea.message-pane-input")
        if (countLines(textarea[0]) >= 2){
          textarea.css("padding-top", "6px")
        } else {
          textarea.css("padding-top", "18px")
        }
    }

    // Handles the submission of input
    checkForSubmitEvent(event, inputBox) {
        // Submit on enter key, dis-allowing blank messages
        if (event.keyCode === 13 && inputBox.value) {
          if (this.customSubmitEvent != undefined) {
             this.customSubmitEvent(event, inputBox)
          }
          else {
            // Kill the timer, if active
            if (this.timer != null){
              clearInterval(this.timer);
              this.timer = null;
            }

            // Retrieve the context from the previous server response
            var context;
            var latestResponse = Api.getResponsePayload();
            if (latestResponse) {
              context = latestResponse.context;
            }

            // Send the user message
            Api.sendRequest(inputBox.value, context);
          }

          // Clear input box for further messages
          inputBox.value = '';
          event.preventDefault();
          return false;
        }

    }

    activateChat() {
        $("textarea.message-pane-input").prop('disabled', false)
        this.chatActivated = true
    }

    deactivateChat() {
        $("textarea.message-pane-input").prop('disabled', true)
        this.chatActivated = false
    }

}

var ConversationPanel = new ConversationAPI();

class ButtonsCarousel {
  constructor() {
    this.selector = ".carousel-inner"
    this.wrapper = ".carousel-wrapper"
    this.visible = false
    this.numberSlides = 0
    this.interval = undefined
    $("footer.msg_footer").prepend("<div class='carousel-wrapper'></div>")
  }

  buttonResponse(valor){
    ConversationPanel.sendMessage(valor);
    this.deleteCarousel();
  }

  // Eliminar el carousel. Tanto lo relacionado a la clase owlCarousel el HTML
  deleteCarousel(){
    if (this.visible) {
      this.visible = false;
      var chatDiv = $("div.msg_body")
      chatDiv.css("max-height", "100%")
      $(this.selector).remove()
      clearInterval(this.interval)
    }
  }

  // Ocultar el carousel
  hideCarousel(){
    this.visible = false
    $(this.selector).slideDown();
  }

  // Mostrar el carousel sin modificaciones.

  showCarousel(){
    if (!this.visible) {
      this.visible = true
      var chatDiv = $("div.msg_body")
      var size = $("footer.msg_footer").outerHeight();
      $(this.wrapper).css("bottom", (size+5) + "px")
      var carouselSize = $("div.carousel-wrapper").outerHeight();
      chatDiv.css("max-height", "calc(100% - "+String(carouselSize)+"px)")
      // $(this.carouselSelector).slideDown();
    }

  }



  setButtons(str, valores) {
    this.deleteCarousel();
    var wrapper = $('<div class="carousel-inner"> </div>')
    this.numberSlides = str.length;

    for (var i = 0; i < this.numberSlides; i++) {
      var _this = this;
      var button = $('<div> <div class="ic">'+str[i]+'</div> </div>');
      let valor = valores[i]
      button.click(function() {
        _this.buttonResponse(valor)
      });
      wrapper.append(button);
    }

    $(this.wrapper).prepend(wrapper)

    // wrapper.slick('slickAdd',"<div></div>");
    wrapper.slick({
        dots: false,
        infinite: false,
        speed: 300,
        slidesToShow: 2,
        slidesToScroll: 1,
        centerMode: this.numberSlides <= 4,
        variableWidth: true,
        arrows: true,
        rows: 2,
        zIndex: 0,
        useTransform: false,
        centerPadding : '0px',
        prevArrow: "<div class='arrow prevArrow'> <i class='fas fa-chevron-left'> </i> </div>",
        nextArrow: "<div class='arrow nextArrow'> <i class='fas fa-chevron-right'> </i> </div>",
    });

    // Fix: cuando son 3 o 4 botones, se centra a mano. El intervalo es para ajustarlo en caso de que la ventana cambie de tamaño
    if (this.numberSlides == 3 || this.numberSlides == 4) {
      this.interval = setInterval(function() {
        let windowWidth = $("#ventana-chatbot").width()
        let slides = $(".slick-slide")
        let offset = (windowWidth - ($(slides[0]).width() + $(slides[1]).width()))/2
        // let offsetPercent = (offset * 100) windowWidth
        $(".slick-track").css("left", String(offset)+"px")
      }, 50)
    }

    this.showCarousel()
  }
}

var buttonsCarousel = new ButtonsCarousel()

function countLines(textarea) {
    var _buffer = null;
    if (_buffer == null) {
        _buffer = document.createElement('textarea');
        _buffer.style.border = 'none';
        _buffer.style.height = '0';
        _buffer.style.overflow = 'hidden';
        _buffer.style.padding = '0';
        _buffer.style.position = 'absolute';
        _buffer.style.left = '0';
        _buffer.style.top = '0';
        _buffer.style.zIndex = '-1';
        document.body.appendChild(_buffer);
    }

    var cs = window.getComputedStyle(textarea);
    var pl = parseInt(cs.paddingLeft);
    var pr = parseInt(cs.paddingRight);
    var lh = parseInt(cs.lineHeight);

    // [cs.lineHeight] may return 'normal', which means line height = font size.
    if (isNaN(lh)) lh = parseInt(cs.fontSize);

    // Copy content width.
    _buffer.style.width = (textarea.clientWidth - pl - pr) + 'px';

    // Copy text properties.
    _buffer.style.font = cs.font;
    _buffer.style.letterSpacing = cs.letterSpacing;
    _buffer.style.whiteSpace = cs.whiteSpace;
    _buffer.style.wordBreak = cs.wordBreak;
    _buffer.style.wordSpacing = cs.wordSpacing;
    _buffer.style.wordWrap = cs.wordWrap;

    // Copy value.
    _buffer.value = textarea.value;

    var result = Math.floor(_buffer.scrollHeight / lh);
    if (result == 0) result = 1;
    return result;
}