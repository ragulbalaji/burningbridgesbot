var TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
var chance = new require('chance')();

var token = fs.readFileSync('token.txt').toString().split('\n')[0];
// Setup polling way
var bot = new TelegramBot(token, {
    polling: true
});

var users = {};
var games = {};

// START of STATISTICSjs
var stats = {
    totalPlays: 0,
    lastupdatetime: Date.now(),
};

loadStats();

function loadStats() {
    fs.readFile("assets/stats.txt", function(err, data) {
        if (err) {
            console.error(err);
        }
        console.log("Stats LOADED >> " + data)
        stats = JSON.parse(data);
    });
}

function saveStats() {
    stats.lastupdatetime = Date.now();
    var save = JSON.stringify(stats)
    console.log("Stats SAVED >> " + save)
    fs.writeFile("assets/stats.txt", save);
}

function saveQuestions(qn) {
    console.log("Question SAVED >> " + qn)
    fs.appendFile("assets/questionsasked.txt", Date.now().toString() + " : " + qn.toString() + "\n");
}

function oneMoreTotalPlay() {
    stats.totalPlays++;
    saveStats()
}

// END of STATISTICSjs


function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}

function compose_name(user) {
    return (user.first_name || "") + ' ' + (user.last_name || "");
}

// Matches /echo [whatever]
bot.onText(/^\/start$/, function(msg, match) {
    var user = msg.from;
    console.log(user.last_name + ' ' + user.first_name + ' started'); //lets assume asian names first

    users[user.id] = user //

    if (msg.chat.type == "group" || msg.chat.type == "supergroup") {
        //bot.sendMessage(msg.chat.id, "Burning Bridges Group Initialized!");
		  bot.sendMessage(msg.chat.id, "DO /start in a PRIVATE chat with @burningbridgesbot!");
    } else {
        bot.sendMessage(msg.chat.id, "Burning Bridges Private Chat Initialized :)");
        bot.sendDocument(msg.chat.id, "assets/welcome.gif");
    }
    console.log(msg);
    //bot.sendMessage(user.id, '/start');
});

bot.onText(/^\/startbb(.*)$/, function(msg, match) {
    if (msg.chat.type != "group" && msg.chat.type != "supergroup") //only can start in a group
    {
        bot.sendMessage(msg.chat.id, 'You can only start game in a group!');
        return;
    }
    if (games[msg.chat.id] && games[msg.chat.id].active == true) {
        bot.sendMessage(msg.chat.id, 'Game Already Running!');
        return;
    }
    var user = msg.from;
    var chat = msg.chat;
    bot.sendMessage(msg.chat.id, "Game started by *" + compose_name(user) + "*. Type /joinbb to participate 👻\nEnsure that you have /start privately with the bot!", {
        "parse_mode": "Markdown"
    });
    games[msg.chat.id] = games[msg.chat.id] || {}; //init game
    games[msg.chat.id].active = 1; //game is active
    games[msg.chat.id].players = {}; //array of players

    games[msg.chat.id].players[msg.from.id] = msg.from; // add this dude in first
});

bot.onText(/^\/joinbb(.*)$/, function(msg, match) {
    if (msg.chat.type != "group" && msg.chat.type != "supergroup") //only can start in a group
    {
        bot.sendMessage(msg.chat.id, 'Only can start games in a group!');
        return;
    }
    if (!games[msg.chat.id] || games[msg.chat.id].active == false) {
        bot.sendMessage(msg.chat.id, 'No game active!');
        return;
    }
    if (games[msg.chat.id].players[msg.from.id]) {
        bot.sendMessage(msg.chat.id, 'Already joined');
        return;
    }

    games[msg.chat.id].players[msg.from.id] = msg.from;
    var user = msg.from;
    var chat = msg.chat;
    bot.sendMessage(chat.id, "*" + compose_name(user) + "* joined", {
        "parse_mode": "Markdown"
    });
});


var questions = {};
var rpsgames = {};
bot.onText(/^\/forcestartbb(.*)$/, function(msg, match) {
    if (msg.chat.type != "group" && msg.chat.type != "supergroup") //only can start in a group
    {
        bot.sendMessage(msg.chat.id, 'Only can start game in a group!');
        return;
    }
    if (!games[msg.chat.id] || games[msg.chat.id].active == false) {
        bot.sendMessage(msg.chat.id, 'No game here!');
        return;
    }
    if (games[msg.chat.id] && games[msg.chat.id].playing == true) {
        bot.sendMessage(msg.chat.id, 'Already started!');
        return;
    }
    games[msg.chat.id].playing = true;
    var chat = msg.chat;
    var user = msg.user;
    var players = Object.keys(games[msg.chat.id].players);
    if (players.length < 2) { // Rmb to change to < 2
        bot.sendMessage(msg.chat.id, 'Need > 1 players! 😈 Imma not let you play with ' + players.length);
        return;
    }
    games[chat.id].playerorder = players;

    var playerorder = "";
    for (var i = 0; i < players.length; i++) {
        playerorder += (i + 1).toString() + ". *" + compose_name(games[chat.id].players[players[i]]) + "*\n";
    }
    bot.sendMessage(msg.chat.id, "Game Starting, Players are: \n" + playerorder, {
        "parse_mode": "Markdown"
    });

    var numrounds = chance.integer({
        min: 2,
        max: 5
    });
numrounds = 1;
    for (var r = 0; r < 1/*numrounds*/; r++) {
        bot.sendMessage(msg.chat.id, 'Starting Round ' + (r + 1) + ' of ' + numrounds);
        oneMoreTotalPlay() //Stats
        shuffle(players);
        var playerz = [];
        var numpairstochoose = chance.integer({
            min: 1,
            max: Math.max(Math.floor(players.length / 2),1)
        });
        for (var j = 0; j < numpairstochoose; j++) {
            askq(chat.id, players[j * 2], players[(j * 2) + 1]);
        }
        bot.sendMessage(msg.chat.id, 'I have chosen ' + numpairstochoose + ' pairs...');
    }

    //askq(chat.id, players[0], players[1]);

    //"Round Ended, wanna play /oncemore or /end"
});

function askq(group, asker, pointer) {
    var opts = {
        reply_markup: JSON.stringify({
            force_reply: true
        })
    }
    var players = games[group].playerorder;
    bot.sendMessage(asker, 'Ask ' + compose_name(users[pointer]) + ' a Question!\nNote, you NEED to reply (tap & hold for options) to this message', opts) //ask the question
        .then(function(sent) {
            var chatId = sent.chat.id;
            var messageId = sent.message_id;
            bot.onReplyToMessage(chatId, messageId, function(message) {
                saveQuestions(compose_name(asker) + " >> " + message.text) // Just some NSA kinda wiretappin!
                bot.sendMessage(chatId, 'Asked \'' + message.text + '\'');
                bot.sendMessage(pointer, compose_name(users[asker]) + ' asked you "' + message.text + '"');
                var playeroptions = [];
                for (var i = 0; i < players.length; i++) {
                    if (players[i] != pointer)
                        playeroptions.push([{
                            text: compose_name(games[group].players[players[i]]),
                            callback_data: players[i]
                        }]);
                }
                console.log(playeroptions);
                bot.sendMessage(pointer, 'Imma point at: ', {
                        reply_markup: JSON.stringify({
                            inline_keyboard: playeroptions
                        })
                    })
                    .then(function(sent) {
                        questions[sent.message_id] = {
                            group: group,
                            user: pointer,
                            question: message.text,
                            asker: asker
                        };
                    });
            });
        });
}

function rps(group, pointer, victim, asker, question) {
    var opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                ['✊', '✋', '✌️']
            ],
            one_time_keyboard: true,
            resize_keyboard: true
        })
    };
    rpsgames[pointer] = {
        vs: victim,
        selected: -1,
        role: 1,
        group: group,
        asker: asker,
        question: question
    };
    rpsgames[victim] = {
        vs: pointer,
        selected: -1,
        role: 0,
        group: group
    };
    bot.sendMessage(pointer, 'ROCK-PAPER-SCISSORS with ' + compose_name(users[victim]) + '!', opts)
        .then(function(sent) {
            var chatId = sent.chat.id;
            var messageId = sent.message_id;
            console.log(chatId, messageId);

        });
    bot.sendMessage(victim, compose_name(users[pointer]) + ' pointed at you.\nROCK-PAPER-SCISSORS with him!', opts)
        .then(function(sent) {
            var chatId = sent.chat.id;
            var messageId = sent.message_id;
            console.log(chatId, messageId);

        });
}
bot.on('callback_query', function(msg) {
    if (questions[msg.message.message_id]) //it a reply to a 'select a user' question
    {
        var victim = parseInt(msg.data);
        var pointer = msg.from.id;
        bot.editMessageText('You selected ' + compose_name(users[victim]), {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        });        var asker = questions[msg.message.message_id].asker;

        bot.sendMessage(questions[msg.message.message_id].group, compose_name(users[asker]) + ' asked a question');
        bot.sendMessage(questions[msg.message.message_id].group, compose_name(msg.message.chat) + ' pointed to ' + compose_name(users[parseInt(msg.data)]));
        var question = questions[msg.message.message_id].question;
        rps(questions[msg.message.message_id].group, pointer, victim, asker, question);

        questions[msg.message.message_id] = false;
    }
    console.log(msg);
});

var rpse = ['✊', '✋', '✌️'];
bot.onText(/\/cuskey/, function(msg) {
    var chatId = msg.chat.id;
    var opts = {
        reply_to_message_id: msg.message_id,
        reply_markup: JSON.stringify({
            keyboard: [
                ['✊', '✋', '✌️']
            ],
            one_time_keyboard: true,
            resize_keyboard: true
        })
    };
    bot.sendMessage(chatId, 'ROCK-PAPER-SCISSORS!', opts)
        .then(function(sent) {
            var chatId = sent.chat.id;
            var messageId = sent.message_id;
            console.log(chatId, messageId);
            bot.onReplyToMessage(chatId, messageId, function(msg) {
                console.log(msg);
                bot.sendMessage(chatId, 'Received ' + msg.text);
            });
        });
});

bot.on('message', function(msg) {
    users[msg.from.id] = msg.from;
    var userid = msg.from.id;
    if (rpsgames[userid] && rpsgames[userid].selected == -1) {
        var ind = rpse.indexOf(msg.text);
        if (ind == -1) {
            bot.sendMessage(userid, 'Oi U think u haxor isit?');
        }
        rpsgames[userid].selected = ind;

        bot.sendMessage(userid, 'You: ' + msg.text);
        if (rpsgames[rpsgames[userid].vs].selected == -1) return;

        var victim, pointer;
        if (rpsgames[userid].role == 0) {
            victim = userid;
            pointer = rpsgames[userid].vs;
        }
        if (rpsgames[userid].role == 1) {
            pointer = userid;
            victim = rpsgames[userid].vs;
        }

        bot.sendMessage(victim, compose_name(users[pointer]) + ' selected: ' + rpse[rpsgames[pointer].selected]);
        bot.sendMessage(pointer, compose_name(users[victim]) + ' selected: ' + rpse[rpsgames[victim].selected]);

        var victim_s = rpsgames[victim].selected;
        var pointer_s = rpsgames[pointer].selected;

        if (victim_s == pointer_s) {
            bot.sendMessage(victim, 'Draw, select again');
            bot.sendMessage(pointer, 'Draw, select again');
            rpsgames[victim].selected = -1;
            rpsgames[pointer].selected = -1;
            return;
        }
        var group = rpsgames[victim].group;
        var asker = rpsgames[pointer].asker;
        var question = rpsgames[pointer].question;

        if ((victim_s == 0 && pointer_s == 2) ||
            (victim_s == 1 && pointer_s == 0) ||
            (victim_s == 2 && pointer_s == 1)) {
            //victim wins
            bot.sendMessage(victim, 'You win!');
            bot.sendMessage(pointer, compose_name(users[victim]) + ' win!');

            bot.sendMessage(group, compose_name(users[asker]) + "'s question is was\n'" + question + "'\nFor which " + compose_name(users[pointer]) + " pointed to " + compose_name(users[victim]));
        } else if ((pointer_s == 0 && victim_s == 2) ||
            (pointer_s == 1 && victim_s == 0) ||
            (pointer_s == 2 && victim_s == 1)) {
            //pointer wins
            bot.sendMessage(pointer, 'You win!');
            bot.sendMessage(victim, compose_name(users[pointer]) + ' win!');

            bot.sendMessage(group, compose_name(users[asker]) + "'s question remains a mystery 🤐.")
        }
        rpsgames[victim] = false;
        rpsgames[pointer] = false;
    }
    //  console.log(msg);
});
/*bot.on('message', function (msg) {
  var chatId = msg.chat.id;
  // photo can be: a file path, a stream or a Telegram file_id
  bot.sendMessage(chatId, 'msg recv');
  //var photo = 'cats.png';
  //bot.sendPhoto(chatId, photo, {caption: 'Lovely kittens'});
});*/
