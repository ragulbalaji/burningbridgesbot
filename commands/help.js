const gameutil = require('../lib/util');
module.exports = function(bot){
  bot.on(gameutil.cmd('config'), function(msg){
    bot.sendMessage(msg.chat.id,'Sent you a private message');
  })
}
