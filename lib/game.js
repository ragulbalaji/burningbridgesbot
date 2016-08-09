
var game = {};

game.create = function(group) {
	game[group] = {};
	game[group].active = true
	game[group].players = {};
}

game.isActive = function(group) {
	return game[group].active
}

game.addPlayer = function(group, user) {
	game[group].players[user.id] = user;
}

game.end = function(group) {
	game[group].active = false;
}
module.exports = game;
