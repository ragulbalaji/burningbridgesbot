const TelegramBot = require('node-telegram-bot-api-latest');
const fs = require('fs');
const chance = new require('chance')();
const adage = require('adage');
const gameutil = require('./lib/util');
const debug = require('debug');

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

require('./commands/help')(bot);
// Matches /echo [whatever]
bot.onText(cmd_regex('start'), function(msg, match) {
    var user = msg.from;
    userdb.register(user); //register the user, so that the bot can send messages to the user
    debug('game:start')(gameutil.name(user) + ' started');


    if (gameutil.isGroup(msg.chat)) { //do not /start in a group
        //bot.sendMessage(msg.chat.id, "Burning Bridges Group Initialized!");
        bot.sendMessage(msg.chat.id, "DO /start in a PRIVATE chat with @burningbridgesbot!");
    } else {
        bot.sendMessage(msg.chat.id, "Burning Bridges Private Chat Initialized :)"); //welcome message
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
    if (games[msg.chat.id] && games[msg.chat.id].active == true) { //alreadt running
        bot.sendMessage(msg.chat.id, 'Game Already Running!');
        return;
    }

    var user = msg.from;
    var chat = msg.chat;
    //give a welcome message
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
    games[chat.id].players[user.id] = user; //put the person in
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
    var playerarr = Object.keys(players); //get all players

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

    games[chat.id].playerorder = players; //get an array of player ids, used for shuffling

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
    }); //generate number of rounds

    games[chat.id].totalrounds = numrounds;
    games[chat.id].roundsleft = numrounds;

    stats.gameStarts++;  //Stats
    saveStats()

    startround(chat); //start the round!

    //askq(chat.id, players[0], players[1]);

    //"Round Ended, wanna play /oncemore or /end"
});
/**
 * Start a round
 * @param {Object} group Object of a group
 */
function startround(group)
{
  var group_id = group.id; //get the group id

  games[group_id].roundsleft--; //decrement teh rounds left

  //give a message
  bot.sendMessage(group_id, '*Starting Round ' + (games[group_id].totalrounds - games[group_id].roundsleft) + ' of ' + games[group_id].totalrounds+"*",{
        "parse_mode": "Markdown"
    }); //send message to group

  stats.totalRounds++;
  saveStats()

  var players = games[group_id].playerorder;//get the array of players
  var playerobj = games[group_id].players;//associative array of playerid -> player object
  shuffle(players);//shuffle them
  var playerz = [];
  var numpairstochoose = chance.integer({
      min: 1,
      max: Math.max(Math.floor(players.length / 2), 1)
  }); //choose a number of pairs

  for (var j = 0; j < numpairstochoose; j++) {
  console.log("Chosen pair is "+compose_name(playerobj[players[j * 2]])+" & "+compose_name(playerobj[players[(j * 2) + 1]]))
      askq(group, playerobj[players[j * 2]], playerobj[players[(j * 2) + 1]]); //ask question to each pair, in the form asker, pointer
  }
  bot.sendMessage(group_id, 'I have chosen ' + numpairstochoose + ' pairs... Check my private message with you.');
  adage({}, function(err, a) {
  	 bot.sendMessage(group_id,'_While waiting here have an adage:\n"'+a+'"_',{
        "parse_mode": "Markdown" //for fun
    });
	});
}
/**
 * Ask a question
 * @param {Object} group Object describing a group
 * @param {Object} asker Object describing a user (the asker)
 * @param {Object} pointer Object describing a user (the pointer)
 */
function askq(group, asker, pointer) {
    var opts = {
        reply_markup: JSON.stringify({
            force_reply: true
        })
    }
    //get the necessary info
    var asker_id = asker.id;
    var pointer_id = pointer.id;
    var group_id = group.id;
    var game = games[group_id];
    var players = games[group_id].playerorder;//player id array

    //ask a question
    bot.sendMessage(asker_id, '🤓😎😇 Ask ' + gameutil.name(pointer) + ' a Question!\nNote, you NEED to reply (tap & hold for options) to this message', opts) //ask the question
        .then(function(sent) {
            var chatId = sent.chat.id;
            var messageId = sent.message_id;
            bot.onReplyToMessage(chatId, messageId, function(message) { //wait for reply
                saveQuestions(compose_name(asker) + " asked "+compose_name(pointer)+" >> " + message.text) // Just some NSA kinda wiretappin!

                bot.sendMessage(chatId, 'Asked \'' + message.text + '\''); //reply back the question
                bot.sendMessage(pointer_id, compose_name(asker) + ' asked you "' + message.text + '"'); //send to pointer the question
                var playeroptions = []; //for each player, construct a button, each with its own line
                for (var i = 0; i < players.length; i++) {
                    if (players[i] != pointer_id) //exclude the pointer
                        playeroptions.push([{
                            text: compose_name(games[group_id].players[players[i]]),
                            callback_data: JSON.stringify(game.players[players[i]]) //we send the whole json object for the player as callback data, so no need for users global object
                        }]);
                } //compose inline keyboardo ptions
                //console.log(playeroptions);
                //actually send the options
                bot.sendMessage(pointer_id, 'Imma point at: ', {
                        reply_markup: JSON.stringify({
                            inline_keyboard: playeroptions
                        })
                    })
                    .then(function(sent) {
                        questions[sent.message_id] = { //mark the message as something you want to reply to
                            group: group,
                            user: pointer, //as usual pass the user objects in
                            question: message.text,
                            asker: asker
                        };
                    });
            });
        });
}
var inrps = {};
var rpsmsgs = {};
/**
 * Initiate a Rock Paper Scissors game
 * @param {Object} group Object describing a group
 * @param {Object} asker Object describing a user (the asker)
 * @param {Object} victim Object describing a user (the victim)
 * @param {Object} pointer Object describing a user (the pointer)
 * @param {String} question The question itself
 */
function rps(group, pointer, victim, asker, question) {


    var opts = {
      reply_markup: JSON.stringify({
          inline_keyboard: [
              [{ text: '✊', callback_data: JSON.stringify({index: 0, vs: 54321, gid: 12345})},
               { text: '✋', callback_data: JSON.stringify({index: 1, vs: 54321, gid: 12345})},
               { text: '✌️', callback_data: JSON.stringify({index: 2, vs: 54321, gid: 12345})}]
          ],
      })
    }; // make the inline keyboard

    // to pointer

    Promise.all([
      bot.sendMessage(pointer.id, 'ROCK-PAPER-SCISSORS with ' + compose_name(victim) + '!', opts), //to pointer
      bot.sendMessage(victim.id, compose_name(pointer) + ' pointed at you.\nROCK-PAPER-SCISSORS!', opts) //to victim
    ]).then(function(msgs) {
      var p_msg = msgs[0].message_id; //pointer message
      var v_msg = msgs[1].message_id; //victim message
        rpsgames[p_msg] = {
          asker: asker,
          question: question,
          group: group,
          vs: v_msg,
          vs_p: victim,
          role: 1,
          selected: -1
        };
        rpsgames[v_msg] = {
          asker: asker,
          question: question,
          group: group,
          vs: p_msg,
          vs_p: pointer,
          role: 0,
          selected: -1
        }
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
        bot.editMessageText('You selected ' + compose_name(victim), { //remove the inline keyboard so they dont click twice
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        });
        var asker = questions[msg.message.message_id].asker; //get the asker

        bot.sendMessage(questions[msg.message.message_id].group.id, compose_name(asker) + ' asked a question');
        bot.sendMessage(questions[msg.message.message_id].group.id , compose_name(msg.message.chat) + ' pointed to ' + compose_name(victim));
        var question = questions[msg.message.message_id].question;
        rps(questions[msg.message.message_id].group, pointer, victim, asker, question); //initiate rps

        questions[msg.message.message_id] = false;// this message no longer is valid
    }

    if (rpsgames[msg.message.message_id]) { // on reply to a rock paper scissors question
        var data = JSON.parse(msg.data); //receive data
        var gid = data.gid;
        var ind = data.index;
        var msgid = msg.message.message_id;
        if (ind == -1) {
            bot.sendMessage(user.id, "Don't send random stuff to me ( like a H4X0R ).");
        }

        rpsgames[msgid].selected = ind; //get the selected index
        bot.editMessageText('You: ' + rpse[ind], { //remove the inline keyboard so the user doesnt click twice
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        });

        if (rpsgames[rpsgames[msgid].vs].selected == -1) return; //the other person has not selected

        var victim, pointer; //figure out who is pointer and victim then get the selections
        var victim_s, pointer_s;
        if (rpsgames[msgid].role == 0) {
            victim = user;
            pointer = rpsgames[msgid].vs_p;
            victim_s = rpsgames[msgid].selected;
            pointer_s = rpsgames[rpsgames[msgid].vs].selected;
        }
        if (rpsgames[msgid].role == 1) {
            pointer = user;
            victim = rpsgames[msgid].vs_p;
            pointer_s = rpsgames[msgid].selected;
            victim_s = rpsgames[rpsgames[msgid].vs].selected;
        }

        //reveal choices
        bot.sendMessage(victim.id, compose_name(victim) + ' selected: ' + rpse[victim_s]);
        bot.sendMessage(pointer.id, compose_name(pointer) + ' selected: ' + rpse[pointer_s]);
        //draw condition, ask them play again
        if (victim_s == pointer_s && victim.id != pointer.id) { //second if is for debugging
            setTimeout(function(a){bot.sendMessage(a, 'Draw, select again');} , 700, victim.id);
            setTimeout(function(a){bot.sendMessage(a, 'Draw, select again');} , 700, pointer.id);
            //bot.sendMessage(victim, 'Draw, select again');
            //bot.sendMessage(pointer, 'Draw, select again');
            //rematch
            rps(rpsgames[msgid].group, pointer, victim, rpsgames[msgid].asker, rpsgames[msgid].question)
            rpsgames[msgid] = false;
            rpsgames[rpsgames[msgid].vs] = false;

            return;
        }

        var group = rpsgames[msgid].group;
        var asker = rpsgames[msgid].asker;
        var question = rpsgames[msgid].question;
        //get info and figure out who wins
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
        delete rpsgames[msgid];

        //GAME HAS ENDED here

        if(games[group.id].roundsleft == 0)// if there are no more rounds left end the game
        {
          //GAME really ENDED
          games[group.id] = {active: false};
          bot.sendMessage(group.id, "Game has ended!");
          stats.totalPlays++;
          saveStats()
        }
        else //else you start the round again
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

    bot.sendMessage(chatId, 'ROCK-PAPER-SCISSORS!', opts)
        .then(function(sent) {
            var chatId = sent.chat.id;
            var messageId = sent.message_id;
            console.log(chatId, messageId);
            rpsgames[messageId] = {selected: -1, vs: messageId, vs_p: user, asker: user, group: user, pointer: user, role:0,question:'debugqn'};
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
