const gameutil = require('../lib/util');
module.exports = function(bot){
  bot.on(gameutil.cmd('help'), function(msg){
    bot.sendMessage(msg.from.id,'/aboutgame: about the game\n /aboutpointer, /aboutasker, /aboutpointed: about the roles');
  })
  bot.on(gameutil.cmd('about'), function(msg){
    bot.sendMessage(msg.from.id,'lol');
  })
  bot.on(gameutil.cmd('about([^@]+)'), function(msg, match){
    var nomatch = false;
    switch(match[2]){
      case "game":
        bot.sendMessage(msg.from.id,'...');
        break;
      case "asker":
        bot.sendMessage(msg.from.id,'Ask question to the pointer');
        break;
      case "pointer":
        bot.sendMessage(msg.from.id,'Point to someone');
        break;
      case "pointed":
        bot.sendMessage(msg.from.id,'Play rock paper scissors to the pointer and if you win, the question is revealed');
        break;
      default:
        nomatch = true;
    }
    
  })
}
