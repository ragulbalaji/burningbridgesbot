var TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
var chance = new require('chance')();
var adage = require('adage');
var gameutil = require('./lib/util');
var debug = require('debug');

var token = fs.readFileSync('token.txt').toString().split('\n')[0];
// Setup polling way
var bot = new TelegramBot(token, {
    polling: true
});

var userdb = require('./lib/users');
var statsdb = require('./lib/stats');

var games = {};

// START of STATISTICSjs
var stats = {
    gameStartAttempts: 0,
    gameStarts: 0,
    joinedPlayers: 0,
    totalPlays: 0,
    questionsAsked: 0,
    questionsRevealed: 0,
    questionsHidden: 0,
    totalPointedAt: 0,
    totalRounds: 0,
    lastupdatetime: Date()
};

loadStats();

function loadStats() {
    fs.readFile("assets/stats.txt", function(err, data) {
        if (err) {
            console.error(err);
        }
        stats = JSON.parse(data);
        console.log("Stats LOADED from " + stats.lastupdatetime)
    });
}

function saveStats() {
    stats.lastupdatetime = Date().toString();
    var save = JSON.stringify(stats)
    fs.writeFile("assets/stats.txt", save);
    console.log("Stats SAVED as " + stats.lastupdatetime)
}

function saveQuestions(qn) {
    console.log("Question SAVED >> " + qn)
    //fs.appendFile("assets/questionsasked.txt", Date().toString() + " - " + qn.toString() + "\n");

    stats.questionsAsked++;
    saveStats();
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
function cmd_regex(cmd)
{
  return new RegExp("^\/(" + cmd + ")+(\@burningbridgesbot)?$","g");
}
function compose_name(user) {
    return (user.first_name || "") + ' ' + (user.last_name || "");
}

// Matches /echo [whatever]
bot.onText(cmd_regex('start'), function(msg, match) {
    var user = msg.from;
    userdb.register(user);
    debug('game:start')(gameutil.name(user) + ' started');


    if (gameutil.isGroup(msg.chat)) {
        //bot.sendMessage(msg.chat.id, "Burning Bridges Group Initialized!");
        bot.sendMessage(msg.chat.id, "DO /start in a PRIVATE chat with @burningbridgesbot!");
    } else {
        bot.sendMessage(msg.chat.id, "Burning Bridges Private Chat Initialized :)");
        bot.sendDocument(msg.chat.id, "assets/welcome.gif");
    }

    //bot.sendMessage(user.id, '/start');
});

bot.onText(cmd_regex('startbb'), function(msg, match) {
    if (!gameutil.isGroup(msg.chat)) //only can start in a group
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
    bot.sendMessage(msg.chat.id, "Game #"+stats.gameStarts+" started by *" + compose_name(user) + "*. Type /joinbb to participate 👻\nEnsure that you have /start privately with @burningbridgesbot!", {
        "parse_mode": "Markdown"
    });

    debug('game:startbb')("Game Start Attempt by "+gameutil.name(user)+" in "+chat.id);

    stats.gameStartAttempts++;
    stats.joinedPlayers++;
    saveStats()

    games[chat.id] = games[chat.id] ||
      {
        active: true,//game is active
        players: {//object of players

        }
      }; //init game
    games[chat.id].players[user.id] = user;
});

bot.onText(cmd_regex('joinbb'), function(msg, match) {
    if (!gameutil.isGroup(msg.chat)) //only can start in a group
    {
        bot.sendMessage(msg.chat.id, 'Only can join games in a group!');
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

    var user = msg.from;
    var chat = msg.chat;

    games[chat.id].players[user.id] = msg.from; //add this player into the game

    bot.sendMessage(chat.id, "*" + gameutil.name(user) + "* joined. "+Object.keys(games[msg.chat.id].players).length+" of min 3 needed.", {
        "parse_mode": "Markdown"
    });

    debug('game:joinbb')(gameutil.name(user)+" joined game in "+chat.id);

    stats.joinedPlayers++;
    saveStats()
});

bot.onText(cmd_regex('players'), function(msg, match) {
    if (!gameutil.isGroup(msg.chat)) //only can start in a group
    {
        bot.sendMessage(msg.chat.id, 'You gotta be in a group to do that mate!');
        return;
    }
    if (!games[msg.chat.id] || games[msg.chat.id].active == false) {
        bot.sendMessage(msg.chat.id, 'No game active!');
        return;
    }

    var user = msg.from;
    var chat = msg.chat;

    var playernames = "";
    var players = games[chat.id].players;
    var playerarr = Object.keys(players);

    for (var i = 0;i<playerarr.length;i++){

        playernames += (i + 1).toString() + ". *" + gameutil.name(games[chat.id].players[playerarr[i]]) + "*\n"; //compose player names
    }
    debug('game:players')(gameutil.name(user) + ' requested player list');
    bot.sendMessage(msg.chat.id, "The players who have joined are: \n" + playernames, {
        "parse_mode": "Markdown"
    });
});


var questions = {};
var rpsgames = {};
var rpscnt = 0;
bot.onText(cmd_regex('forcestartbb'), function(msg, match) {
    if (!gameutil.isGroup(msg.chat)) //only can start in a group
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
    if (players.length < 1) { // Rmb to change to < 2
        bot.sendMessage(msg.chat.id, 'Need > 1 players! 😈 Imma not let you play with ' + players.length);
        debug('game:forcestart')('Started with less than 2 players!');
        return;
    }

    games[chat.id].playerorder = players;

    var playernames = "";
    for (var i = 0; i < players.length; i++) {
        playernames += (i + 1).toString() + ". *" + compose_name(games[chat.id].players[players[i]]) + "*\n"; //compose player names
    }
    bot.sendMessage(msg.chat.id, "Game Starting, Players are: \n" + playernames, {
        "parse_mode": "Markdown"
    });

    var numrounds = chance.integer({
        min: 2,
        max: 5
    });

    games[chat.id].totalrounds = numrounds;
    games[chat.id].roundsleft = numrounds;

    stats.gameStarts++;  //Stats
    saveStats()

    startround(chat);

    //askq(chat.id, players[0], players[1]);

    //"Round Ended, wanna play /oncemore or /end"
});
function startround(group)
{
  var group_id = group.id;

  games[group_id].roundsleft--;
  bot.sendMessage(group_id, '*Starting Round ' + (games[group_id].totalrounds - games[group_id].roundsleft) + ' of ' + games[group_id].totalrounds+"*",{
        "parse_mode": "Markdown"
    }); //send message to group

  stats.totalRounds++;
  saveStats()

  var players = games[group_id].playerorder;
  var playerobj = games[group_id].players;
  shuffle(players);
  var playerz = [];
  var numpairstochoose = chance.integer({
      min: 1,
      max: Math.max(Math.floor(players.length / 2), 1)
  });

  for (var j = 0; j < numpairstochoose; j++) {
  console.log("Chosen pair is "+compose_name(playerobj[players[j * 2]])+" & "+compose_name(playerobj[players[(j * 2) + 1]]))
      askq(group, playerobj[players[j * 2]], playerobj[players[(j * 2) + 1]]);
  }
  bot.sendMessage(group_id, 'I have chosen ' + numpairstochoose + ' pairs... Check my private message with you.');
  adage({}, function(err, a) {
  	 bot.sendMessage(group_id,'_While waiting here have an adage:\n"'+a+'"_',{
        "parse_mode": "Markdown"
    });
	});
}
function askq(group, asker, pointer) {
    var opts = {
        reply_markup: JSON.stringify({
            force_reply: true
        })
    }
    var asker_id = asker.id;
    var pointer_id = pointer.id;
    var group_id = group.id;
    var game = games[group_id];
    var players = games[group_id].playerorder;
    bot.sendMessage(asker_id, '🤓😎😇 Ask ' + gameutil.name(pointer) + ' a Question!\nNote, you NEED to reply (tap & hold for options) to this message', opts) //ask the question
        .then(function(sent) {
            var chatId = sent.chat.id;
            var messageId = sent.message_id;
            bot.onReplyToMessage(chatId, messageId, function(message) {
                saveQuestions(compose_name(asker) + " asked "+compose_name(pointer)+" >> " + message.text) // Just some NSA kinda wiretappin!

                bot.sendMessage(chatId, 'Asked \'' + message.text + '\''); //reply back the question
                bot.sendMessage(pointer_id, compose_name(asker) + ' asked you "' + message.text + '"'); //send to pointer the question
                var playeroptions = [];
                for (var i = 0; i < players.length; i++) {
                    if (players[i] != pointer_id) //exclude the pointer
                        playeroptions.push([{
                            text: compose_name(games[group_id].players[players[i]]),
                            callback_data: JSON.stringify(game.players[players[i]])
                        }]);
                } //compose inline keyboardo ptions
                //console.log(playeroptions);
                bot.sendMessage(pointer_id, 'Imma point at: ', {
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
var inrps = {};
function rps(group, pointer, victim, asker, question) {


    var opts = {
      reply_markup: JSON.stringify({
          inline_keyboard: [
              [{ text: '✊', callback_data: JSON.stringify({index: 0, vs: 54321, gid: cnt})},
               { text: '✋', callback_data: JSON.stringify({index: 1, vs: 54321, gid: cnt})},
               { text: '✌️', callback_data: JSON.stringify({index: 2, vs: 54321, gid: cnt})}]
          ],
      })
    };
    rpsgames[cnt] = {
                      asker: asker,
                      question: question}
    rpsgames[cnt][victim.id] = victim;
    rpsgames[cnt][victim.id].role = 0;
    rpsgames[cnt][victim.id].selected = -1;
    rpsgames[cnt][victim.id].vs = pointer.id;
    rpsgames[cnt][pointer.id] = victim;
    rpsgames[cnt][pointer.id].role = 1;
    rpsgames[cnt][pointer.id].selected = -1;
    rpsgames[cnt][pointer.id].vs = victim.id;
    cnt++;

    inrps[pointer.id] = (inrps[pointer.id] || 0) + 1;
    inrps[victim.id] = (inrps[victim.id] || 0) + 1;

    bot.sendMessage(pointer.id, 'ROCK-PAPER-SCISSORS with ' + compose_name(victim) + '!', opts)
        .then(function(sent) {
            var chatId = sent.chat.id;
            var messageId = sent.message_id;

        });
    bot.sendMessage(victim.id, compose_name(pointer) + ' pointed at you.\nROCK-PAPER-SCISSORS!', opts)
        .then(function(sent) {
            var chatId = sent.chat.id;
            var messageId = sent.message_id;

        });

         stats.totalPointedAt++;
    saveStats();
}
bot.on('callback_query', function(msg) {
    var user = msg.from;
    var chat = msg.chat;

    if (questions[msg.message.message_id]) //it a reply to a 'select a user' question
    {
        var victim = JSON.parse(msg.data);
        var victim_id = victim.id;
        //var rpsid = data.
        var pointer = msg.from; //we get the pointerid
        bot.editMessageText('You selected ' + compose_name(victim), {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        });
        var asker = questions[msg.message.message_id].asker;

        bot.sendMessage(questions[msg.message.message_id].group.id, compose_name(asker) + ' asked a question');
        bot.sendMessage(questions[msg.message.message_id].group.id , compose_name(msg.message.chat) + ' pointed to ' + compose_name(victim));
        var question = questions[msg.message.message_id].question;
        rps(questions[msg.message.message_id].group, pointer, victim, asker, question);

        questions[msg.message.message_id] = false;
    }

    if (inrps[user.id] > 0) { // on reply to a rock paper scissors question
        var data = JSON.parse(msg.data);
        var gid = data.gid;
        var ind = data.index;
        if (ind == -1) {
            bot.sendMessage(user.id, "Don't send random stuff to me ( like a H4X0R ).");
        }
        rpsgames[gid][user.id].selected = ind;
        bot.editMessageText('You: ' + rpse[ind], {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        });

        if (rpsgames[gid][rpsgames[gid][user.id].vs].selected == -1) return;

        var victim, pointer;
        if (rpsgames[gid][user.id].role == 0) {
            victim = user;
            pointer = rpsgames[gid][rpsgames[gid][user.id].vs];
        }
        if (rpsgames[gid][user.id].role == 1) {
            pointer = user;
            victim = rpsgames[gid][rpsgames[gid][user.id].vs];
        }

        bot.sendMessage(victim.id, compose_name(pointer) + ' selected: ' + rpse[rpsgames[gid][pointer.id].selected]);
        bot.sendMessage(pointer.id, compose_name(victim) + ' selected: ' + rpse[rpsgames[gid][victim.id].selected]);

        var victim_s = rpsgames[gid][victim.id].selected;
        var pointer_s = rpsgames[gid][pointer.id].selected;

        if (victim_s == pointer_s && victim.id != pointer.id) { //second if is for debugging
            setTimeout(function(a){bot.sendMessage(a, 'Draw, select again');} , 700, victim.id);
            setTimeout(function(a){bot.sendMessage(a, 'Draw, select again');} , 700, pointer.id);
            //bot.sendMessage(victim, 'Draw, select again');
            //bot.sendMessage(pointer, 'Draw, select again');
            rpsgames[gid][victim.id].selected = -1;
            rpsgames[gid][pointer.id].selected = -1;
            return;
        }
        inrps[victim.id]--;
        inrps[pointer.id]--;
        var group = rpsgames[gid].group;
        var asker = rpsgames[gid].asker;
        var question = rpsgames[gid].question;

        if ((victim_s == 0 && pointer_s == 2) ||
            (victim_s == 1 && pointer_s == 0) ||
            (victim_s == 2 && pointer_s == 1)) {
            //victim wins
            bot.sendMessage(victim.id, 'You win!');
            bot.sendMessage(pointer.id, compose_name(victim) + ' win!');

            bot.sendMessage(group.id, compose_name(asker) + "'s question was\n'" + question + "'\nFor which " + compose_name(pointer) + " pointed to " + compose_name(victim));


            stats.questionsRevealed++;
    			saveStats();
        } else if ((pointer_s == 0 && victim_s == 2) ||
            (pointer_s == 1 && victim_s == 0) ||
            (pointer_s == 2 && victim_s == 1)) {
            //pointer wins
            bot.sendMessage(pointer.id, 'You win!');
            bot.sendMessage(victim.id, compose_name(pointer) + ' win!');

            bot.sendMessage(group.id, compose_name(asker) + "'s question remains a mystery 🤐.")
        		stats.questionsHidden++;
    			saveStats();
        }
        else {
          bot.sendMessage(pointer.id, 'You win!');
          bot.sendMessage(victim.id, compose_name(pointer) + ' win!');

          bot.sendMessage(group.id, compose_name(asker) + "'s question is " + question + " DEBUG VICTIM: " + compose_name(victim))
        }
        statsdb.saveQuestion(question, asker, pointer,victim);
        delete rpsgames[gid];

        //GAME HAS ENDED here

        if(games[group.id].roundsleft == 0)
        {
          //GAME really ENDED
          games[group.id] = {active: false};
          bot.sendMessage(group.id, "Game has ended!");
          stats.totalPlays++;
          saveStats()
        }
        else
        {
          setTimeout(startround, 1000, group);
        }
    }
});

var rpse = ['✊', '✋', '✌️'];
bot.onText(/\/debugrps/i, function(msg) {
    var chatId = msg.chat.id;
    var opts = {
        reply_to_message_id: msg.message_id,
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{ text: '✊', callback_data: JSON.stringify({index: 0, vs: 54321, rpsgame: 12345})},
                 { text: '✋', callback_data: JSON.stringify({index: 0, vs: 54321, rpsgame: 12345})},
                 { text: '✌️', callback_data: JSON.stringify({index: 0, vs: 54321, rpsgame: 12345})}]
            ],
        })
    };
    var user = msg.from;
    rpsgames[user.id] = {selected: -1, vs: user, asker: user, group: user, pointer: user, role:0,question:'debugqn'};
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
    var userid = msg.from.id;
    statsdb.increment('messages');
    userdb.find(msg.from)
    .then(function(res){
      if(!res)
      {
        bot.sendMessage(msg.chat.id, 'You have not registered with this bot, go to @burningbridgesbot and tap start or type /start');
      }
    })
    //  console.log(msg);
});
/*bot.on('message', function (msg) {
  var chatId = msg.chat.id;
  // photo can be: a file path, a stream or a Telegram file_id
  bot.sendMessage(chatId, 'msg recv');
  //var photo = 'cats.png';
  //bot.sendPhoto(chatId, photo, {caption: 'Lovely kittens'});
});*/
