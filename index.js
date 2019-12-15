var token = "831341230:AAE0u1SfWJLPG8NNjk7REg99PXIdP6FPP34";
var ssId = "1y00gPwrEoUR6uSTFZOi-gFDI_OOc8SZn1UHQ0E4oiT8";

function doPost(e) {
    // Make sure to only reply to json requests
    if (e.postData.type == "application/json") {

        // Parse the update sent from Telegram
        var update = JSON.parse(e.postData.contents);

        // Instantiate our bot passing the update 
        var bot = new Bot(token, update);

        // Building commands
        var bus = new CommandBus();
        bus.on(/\/program/, function () {
            var message = getTrngProgram();
            this.replyToSender(message);
        });

        bus.on(/\/lineup/, function () {
            var message = getLineUp();
            this.replyToSender(message);
        });

        bus.on(/\/start/, function () {
            this.replyToSender("Welcome to NUS Canoe/Kayak Sprint \n \n" +
                "This bot support two commands: \n" +
                "/program - the program for today(shows tomorrow's program after 1500) \n" +
                "/lineup - the lineup for today(shows tomorrow's program after 2200)");
        });

        bus.on(/\/help/, function () {
            this.replyToSender("Welcome to NUS Canoe/Kayak Sprint \n \n" +
                "This bot support two commands: \n" +
                "/program - the program for today(shows tomorrow's program after 1500) \n" +
                "/lineup - the lineup for today(shows tomorrow's program after 2200)");
        });

        // Register the command bus
        bot.register(bus);

        // If the update is valid, process it
        if (update) {
            bot.process();
        }
    }
}

function setWebhook() {
    var bot = new Bot(token, {});
    var result = bot.request('setWebhook', {
        url: ScriptApp.getService().getUrl()
    });
    Logger.log(result);
}

function getLineUp() {
    var sheetNumber = 4;
    var dateOnSheetFound = false;
    //Access the sheet number 4 first if date found, breaks
    while (!dateOnSheetFound) {
        var sheet = SpreadsheetApp.openById(ssId).getSheets()[sheetNumber];
        var lineupAndDateCells = sheet.getRange("A14:U52").getValues();

        //Check the date and saves the corresponding trng program
        var today = new Date();
        //If past 10 oclock, sets today as the next day for program
        if (today.getHours() > 2200) {
            today.setDate(today.getDate() + 1);
        }
        var dateRow = 0;
        var lineupRow = 2;
        var lineup = "";
        var dateInString = "";
        var message = "";
        //If sheet not created yet and today > sunday of the sheet
        if (today > new Date(lineupAndDateCells[dateRow][18]) && sheetNumber == 4) {
            break;
        }
        for (var col = 0; col <= 18; col += 3) {
            var dateOnSheet = new Date(lineupAndDateCells[dateRow][col]);
            if (sameDay(today, dateOnSheet)) {
                dateOnSheetFound = true;
                dateInString = getDateStringddMMyy(lineupAndDateCells[dateRow][col]);
                message = convertLineupArrayToString(dateInString, lineupAndDateCells, lineupRow, col);
                break;
            }
        }
        sheetNumber++;
    }
    if (!dateOnSheetFound) {
        return "Sheet not created yet!";
    } else if (message == "") {
        return "The training program is not out yet!";
    } else {
        Logger.log(message);
        return message;
    }
}

function getTrngProgram() {
    var sheetNumber = 4;
    var dateOnSheetFound = false;
    //Access the sheet number 4 first if date found, breaks
    while (!dateOnSheetFound) {
        var sheet = SpreadsheetApp.openById(ssId).getSheets()[sheetNumber];
        var prgAndDateCells = sheet.getRange("A12:U14").getValues();

        //Check the date and saves the corresponding trng program
        var today = new Date();
        //If past 2oclock, sets today as the next day for program
        if (today.getHours() > 14) {
            today.setDate(today.getDate() + 1);
        }
        var dateRow = 2;
        var prgRow = 0;
        var trngPrg = "";
        var dateInString = "";
        //       If sheet not created yet and today > sunday of the sheet
        if (today > new Date(prgAndDateCells[dateRow][18]) && sheetNumber == 4) {
            break;
        }

        for (var col = 0; col <= 18; col += 3) {
            var dateOnSheet = new Date(prgAndDateCells[dateRow][col]);
            if (sameDay(today, dateOnSheet)) {
                dateOnSheetFound = true;
                dateInString = getDateStringddMMyy(prgAndDateCells[dateRow][col]);
                trngPrg = prgAndDateCells[prgRow][col];
                break;
            }
        }
        sheetNumber++;
    }

    if (!dateOnSheetFound) {
        return "Sheet not created yet!";
    } else if (trngPrg == "") {
        return "The training program is not out yet!";
    } else {
        return "Training program for " + dateInString + ": \n" + trngPrg;
    }
}

//Helper Functions
function sameDay(first, second) {
    return (first.getFullYear() == second.getFullYear() &&
        first.getMonth() == second.getMonth() &&
        first.getDate() == second.getDate());
}

function convertLineupArrayToString(dateInString, arr, row, col) {
    var message = "The line up for " + dateInString + ":\n";
    for (; row < arr.length; row++) {
        //format of print name(arr[row][col]): arr[row][col + 2]
        if (!(arr[row][col] == "")) {
            message = message + arr[row][col] + ": " + arr[row][col + 2] + "\n";
        }
    }
    return message;
}

function getDateStringddMMyy(date) {
    return date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();
}

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
        'chat_id': this.update.message.from.id,
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