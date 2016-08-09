var TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

var token = fs.readFileSync('token.txt').toString().split('\n')[0];
// Setup polling way
var bot = new TelegramBot(token, {
    polling: true
});

var users = {};
var games = {};

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
    return user.first_name + ' ' + user.last_name;
}

// Matches /echo [whatever]
bot.onText(/^\/start$/, function(msg, match) {
    var user = msg.from;
    console.log(user.last_name + ' ' + user.first_name + ' started'); //lets assume asian names first

    users[user.id] = user //

    if (msg.chat.type == "group") bot.sendMessage(msg.chat.id, "Burning Bridges Group Initialized!");
    else bot.sendMessage(msg.chat.id, "Private Chat Initialized :)");
    console.log(msg);
    //bot.sendMessage(user.id, '/start');
});

bot.onText(/^\/startbb$/, function(msg, match) {
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
    bot.sendMessage(msg.chat.id, "Game started by *" + compose_name(user) + "*. Type /joinbb to participate 👻", {"parse_mode":"Markdown"});
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
    bot.sendMessage(chat.id, "*" + compose_name(user) + "* joined", {"parse_mode":"Markdown"});
});


var questions = {};
bot.onText(/^\/forcestart$/, function(msg, match) {
    if (msg.chat.type != "group" && msg.chat.type != "supergroup") //only can start in a group
    {
        bot.sendMessage(msg.chat.id, 'Only can start game in a group!');
        return;
    }
    if (!games[msg.chat.id] || games[msg.chat.id].active == false) {
        bot.sendMessage(msg.chat.id, 'No game here!');
        return;
    }
    var chat = msg.chat;
    var user = msg.user;
    var players = Object.keys(games[msg.chat.id].players);
    if (players.length < 1) { // rmb to change to < 3
        bot.sendMessage(msg.chat.id, 'Need > 2 players! Imma not let you play with ' + players.length);
        return;
    }
    games[chat.id].playerorder = players;
    shuffle(players);
    var playerorder = "";
    for (var i = 0; i < players.length; i++) {
        playerorder += (i+1).toString()+". *" + compose_name(games[chat.id].players[players[i]]) + "*\n";
    }
    bot.sendMessage(msg.chat.id, "Game Starting, Ordered Players are: \n" + playerorder, {"parse_mode":"Markdown"});
    

    games[chat.id].counter = 0; //start at 0
       var opts = {
  reply_markup: JSON.stringify(
    {
      force_reply: true
    }
  )};

    bot.sendMessage(players[0], 'Ask <...> a Question! Note, you need to reply to this message', opts) //ask the question
    .then(function (sent) {
      var chatId = sent.chat.id;
      var messageId = sent.message_id;
      console.log(chatId, messageId);
      bot.onReplyToMessage(chatId, messageId, function (message) {
        bot.sendMessage(chatId, 'You asked \'' + message.text + '\'');
        bot.sendMessage(players[0], '<...> asked \'' + message.text + '\''); //TODO, REMEMBER TO SEND TO THE NEXT PLAYER
        var playeroptions = [];
        for(var i = 0;i<players.length; i++ )
        {
            playeroptions.push([ {text: compose_name(games[chat.id].players[players[i]]), callback_data: players[i]}]);
        }
	console.log(playeroptions);
        bot.sendMessage(players[0], 'Point to: ', {reply_markup: JSON.stringify({ inline_keyboard: playeroptions})})
        .then(function(sent) {
           questions[sent.message_id] = {group: chat.id , user: players[0]};
        });
      });
    });
    games[chat.id].active = false; //deactivate the game for now
});

bot.on('callback_query', function (msg) {
    if(questions[msg.message.message_id]) //it a reply to a 'select a user' question
    {
      bot.editMessageText('You selected ' + compose_name(users[parseInt(msg.data)]), {chat_id: msg.message.chat.id, message_id: msg.message.message_id});
      bot.sendMessage(questions[msg.message.message_id].group, compose_name(msg.message.chat) + ' pointed to ' + compose_name(users[parseInt(msg.data)]));
    }
});
bot.on('message', function(msg) {
    users[msg.from.id] = msg.from;
//  console.log(msg);
});
/*bot.on('message', function (msg) {
  var chatId = msg.chat.id;
  // photo can be: a file path, a stream or a Telegram file_id
  bot.sendMessage(chatId, 'msg recv');
  //var photo = 'cats.png';
  //bot.sendPhoto(chatId, photo, {caption: 'Lovely kittens'});
});*/
