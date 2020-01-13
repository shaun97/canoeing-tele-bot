var SHEET = null;
var SHEETARR = null;
//Webhook to activate the bot

user = {
    "id": "",
    "name": "Stranger",
    "dailyUpdate": false,
    "row": null
}

//Main Function that runs
function doPost(e) {
    //Make sure to only reply to json request

    if (e.postData.type == "application/json") {

        // Parse the update sent from Telegram
        var update = JSON.parse(e.postData.contents);

        // Instantiate our bot passing the update 
        var bot = new Bot(token, update);

        user.id = update.message.chat.id.toString();
        getSheet();
        getUser();
        // Building commands
        var bus = new CommandBus();
      
        bus.on(/\/updates/, function () {
            var message = toggleDailyUpdates();
            if (user.name == "Stranger") {
                this.replyToSender("Hello Stranger, please register first to use the updates feature!");
            } else {
                this.replyToSender("Hello " + user.name + ", " + message);
            }
        });

        bus.on(/\/program/, function () {
            var message = getTrngProgram();
            this.replyToSender("Hello " + user.name + ", " + message);
        });

        bus.on(/\/lineup/, function () {
            var message = getLineUp();
            this.replyToSender("Hello " + user.name + ", " + message);
        });

        bus.on(/\/start/, function () {
            this.replyToSender("Hello fellow canoeist, this smart boi will help you get updates on the /program and /lineup. " +
                "Begin by registering your name using /register [nickname on the sheets] and use /updates to toggle daily updates!");
        });

        bus.on(/\/register/, function () {
            user.name = update.message.text.substring(10).trim();
            if (user.name == "") {  //Regex this part for input validation?
                this.replyToSender("Please enter something for your name!");
            } else if (setUser()) {
                this.replyToSender("Hello " + user.name + ", you have been sucessfully registered.");
            } else {
                this.replyToSender("Hmm, I couldn't find your name.... are you sure you are one of us?");
            }
        });

        bus.on(/\/help/, function () {
            this.replyToSender("Here is a summary of what this smart boi can do: \n \n" +
                "/program - the program for today (shows tomorrow's program after 1500) \n" +
                "/lineup - the lineup for today (shows tomorrow's lineup after dana assigns usually around 2200) \n" +
                "/updates - to toggle between enabling/disabling daily 0600 updates \n" +
                "/register [nickname on sheet] - to register your name with me!"
            );
        });
    }
    // Register the command bus
    bot.register(bus);

    // If the update is valid, process it
    if (update) {
        bot.process();
    }
}

//Function to send all 
function sendToAll() {
    getSheet();
    var IDs = getIDsToUpdate();
    var trngPrg = capitaliseFirstLetter(getTrngProgram());
    var lineup = capitaliseFirstLetter(getLineUp());
    for (var i in IDs) {
        user.name = i;
        var message = "Hey " + user.name + ", rise and shine and get ready to obtain this grain!! \n\n" + trngPrg + "\n\n" + lineup;
        sendMessageById(IDs[i], message);
    }
}


//Returns a string for the lineup for the day
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
        return "the sheet not been created yet!";
    } else {
        return "this is the lineup for " + dateInString + ": \n" + message;
    }
}

//Returns the training program
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
        // If sheet not created yet and today > sunday of the sheet
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
        return "the sheet not been created yet";
    } else if (trngPrg == "") {
        return "the training program is not out yet!";
    } else {
        return "this is the program for " + dateInString + ": \n" + trngPrg;
    }
}

//Function to toggle daily updates 
function toggleDailyUpdates() {
    if (SHEETARR[user.row][4] == "1") {
        SHEET.getRange('E' + (user.row + 2)).setValue("0");
        return "you have succesfully turned daily updates off."
    } else {
        SHEET.getRange('E' + (user.row + 2)).setValue("1");
        return "you have succesfully turned daily updates on."
    }
}

//Helper Functions

function capitaliseFirstLetter(string) {
    const lower = string;
    const upper = lower.charAt(0).toUpperCase() + lower.substring(1);
    return upper;
}
function getSheet() {
    var logbook = SpreadsheetApp.openById(ssId);
    var lastSheet = logbook.getNumSheets() - 3; //two more hidden sheet at the end
    SHEET = logbook.getSheets()[lastSheet];
    SHEETARR = SHEET.getRange("A2:E70").getValues();
}

function sendMessageById(ID, content) {
    var method = 'sendMessage';
    var payload = {
        'chat_id': ID,
        'text': content
    };

    var options = {
        'method': 'post',
        'contentType': 'application/json',
        'payload': JSON.stringify(payload)
    };
    var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + method, options);
}

function getIDsToUpdate() {
    var idsToUpdate = {};
    for (var i = 0; i < SHEETARR.length; i++) {
        if (SHEETARR[i][4] == "1") {
            idsToUpdate[SHEETARR[i][0]] = SHEETARR[i][3];
        }
    }
    return idsToUpdate;
}

function getUser() {
    for (var i = 0; i < SHEETARR.length; i++) {
        if (SHEETARR[i][3] == user.id) {
            user.name = SHEETARR[i][0].trim();
            user.dailyUpdate = SHEETARR[i][4];
            user.row = i;
            return true;
        }
    }
    return false;
}

function setUser() {
    for (var i = 0; i < SHEETARR.length; i++) {
        if (SHEETARR[i][0] == user.name) {
            SHEET.getRange('D' + (i + 2)).setValue(user.id);
            return true;
        }
    }
    return false;
}


function sameDay(first, second) {
    return (first.getFullYear() == second.getFullYear() &&
        first.getMonth() == second.getMonth() &&
        first.getDate() == second.getDate());
}

function convertLineupArrayToString(dateInString, arr, row, col) {
    var message = "";
    for (; row < arr.length; row++) {
        if (!(arr[row][col] == "")) {
            var paddler = arr[row][col];
            var boat = arr[row][col + 2];
          var remarks = arr[row][col + 1];
          if (remarks != "") {
            remarks = "(" + remarks + ")";
          }
            message = message + paddler + ": " + boat + remarks + "\n";
        }
    }
    return message;
}

function getDateStringddMMyy(date) {
    return date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();
}
