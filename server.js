var TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

var token = fs.readFileSync('token.txt').toString().split('\n')[0];
// Setup polling way
var bot = new TelegramBot(token, {polling: true});

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

function compose_name(user)
{
  return user.first_name + ' ' + user.last_name;
}

// Matches /echo [whatever]
bot.onText(/^\/start$/, function (msg, match) {
  var user = msg.from;
  console.log(user.last_name + ' ' + user.first_name + ' started'); //lets assume asian names first 

  users[user.id] = user //

  if(msg.chat.type == "group") bot.sendMessage(msg.chat.id, "In a Group");
  else bot.sendMessage(msg.chat.id, "Private Chat");
  console.log(msg);
  //bot.sendMessage(user.id, '/start');
});

bot.onText(/^\/startbb$/, function(msg, match) {
  if(msg.chat.type != "group" && msg.chat.type != "supergroup") //only can start in a group
  {
    bot.sendMessage(msg.chat.id, 'Only can start game in a group!');
    return;
  }
  if(games[msg.chat.id] && games[msg.chat.id].active == true)
  {
    bot.sendMessage(msg.chat.id, 'Already running!');
    return;
  }
  var user = msg.from;
  var chat = msg.chat;
  bot.sendMessage(msg.chat.id, "Game started by " + compose_name(user) + "Press /joinbb to join");
  games[msg.chat.id] = games[msg.chat.id] || {}; //init game
  games[msg.chat.id].active = 1; //game is active
  games[msg.chat.id].players = {}; //array of players
});

bot.onText(/^\/joinbb$/, function(msg, match) {
  if(msg.chat.type != "group" && msg.chat.type != "supergroup") //only can start in a group
  {
    bot.sendMessage(msg.chat.id, 'Only can start game in a group!');
    return;
  }
  if(!games[msg.chat.id] || games[msg.chat.id].active == false)
  {
    bot.sendMessage(msg.chat.id, 'No game here!');
    return;
  }
  if(games[msg.chat.id].players[msg.from.id])
  {
    bot.sendMessage(msg.chat.id, 'Already joined');
    return;
  }
  
  games[msg.chat.id].players[msg.from.id] = msg.from;
  var user = msg.from;
  var chat = msg.chat;
  bot.sendMessage(chat.id, compose_name(user) + ' joined');
});


bot.onText(/^\/forcestart$/, function(msg, match) {
  if(msg.chat.type != "group" && msg.chat.type != "supergroup") //only can start in a group
  {
    bot.sendMessage(msg.chat.id, 'Only can start game in a group!');
    return;
  }
  if(!games[msg.chat.id] || games[msg.chat.id].active == false)
  {
    bot.sendMessage(msg.chat.id, 'No game here!');
    return;
  }
  var chat = msg.chat;
  var user = msg.user;
  var players = Object.keys(games[msg.chat.id].players);
  if(players.length < 1 )
  {
    bot.sendMessage(msg.chat.id, 'Too little players ' + players.length);
    return;
  }
  shuffle(players);
  var playerorder = "";
  for(var i = 0;i<players.length;i++)
  {
     playerorder += compose_name(games[chat.id].players[players[i]]) + "\n";
  }
  bot.sendMessage(msg.chat.id, "Order: \n" + playerorder);
  games[chat.id].active = false; //deactivate the game for now
});
// Any kind of message
/*bot.on('message', function (msg) {
  var chatId = msg.chat.id;
  // photo can be: a file path, a stream or a Telegram file_id
  bot.sendMessage(chatId, 'msg recv');
  //var photo = 'cats.png';
  //bot.sendPhoto(chatId, photo, {caption: 'Lovely kittens'});
});*/
