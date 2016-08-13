
var util = {};

util.arrayShuffle = function(a) {
    var j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}

util.cmd = function(cmd)
{
  return new RegExp("^\/(" + cmd + ")+(\@burningbridgesbot)?$","g");
}

util.name = function(user) {
    return (user.first_name || "") + ' ' + (user.last_name || "");
}

util.isGroup = function(chat)
{
  return (chat.type.indexOf('group') != -1)
}

module.exports = util;
