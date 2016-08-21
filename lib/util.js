
var util = {};


util.cmd = function(cmd)
{
  return new RegExp("^\/(" + cmd + ")+(\@burningbridgesbot)?$");
}

util.name = function(user) {
    return (user.first_name || "") + ' ' + (user.last_name || "");
}

util.isGroup = function(chat)
{
  return (chat.type.indexOf('group') != -1)
}

module.exports = util;
