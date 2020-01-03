//Bot Functions
function Bot(token, update) {
    this.token = token;
    this.update = update;
    this.handlers = [];
}

Bot.prototype.register = function (handler) {
    this.handlers.push(handler);
}

Bot.prototype.process = function () {
    for (var i in this.handlers) {
        var event = this.handlers[i];
        var result = event.condition(this);
        if (result) {
            return event.handle(this);
        }
    }
}

Bot.prototype.request = function (method, data) {
    var options = {
        'method': 'post',
        'contentType': 'application/json',
        'payload': JSON.stringify(data)
    };

    var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + this.token + '/' + method, options);

    if (response.getResponseCode() == 200) {
        return JSON.parse(response.getContentText());
    }

    return false;
}

Bot.prototype.replyToSender = function (text) {
    return this.request('sendMessage', {
        'chat_id': this.update.message.chat.id,
        'text': text
    });
}

function CommandBus() {
    this.commands = [];
}

CommandBus.prototype.on = function (regexp, callback) {
    this.commands.push({ 'regexp': regexp, 'callback': callback });
}

CommandBus.prototype.condition = function (bot) {
    return bot.update.message.text.charAt(0) === '/';
}

CommandBus.prototype.handle = function (bot) {
    for (var i in this.commands) {
        var cmd = this.commands[i];
        var tokens = cmd.regexp.exec(bot.update.message.text);
        if (tokens != null) {
            return cmd.callback.apply(bot, tokens.splice(1));
        }
    }
    return bot.replyToSender("Sorry, I am not sure what you mean");
}

//Webhook to activate the bot
function setWebhook() {
    var bot = new Bot(token, {});
    var result = bot.request('setWebhook', {
        url: ScriptApp.getService().getUrl()
    });
}