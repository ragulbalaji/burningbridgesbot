const Sequelize = require('sequelize');
var sequelize = require('./db')

var User = sequelize.define('users', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true
  },
  username: {
    type: Sequelize.STRING
  },
  first_name: {
    type: Sequelize.STRING
  },
  last_name: {
    type: Sequelize.STRING
  }
}, {
  timestamps: true,
  freezeTableName: true // Model tableName will be the same as the model name
});

User.sync();

var users = {};

users.register = function(user)
{
  return User.create(user);
}

users.find = function(user)
{
  return User.findAll({where: {id: user.id}})
  .then(function(res){
    if(res.length) return Promise.resolve(true);
    else Promise.resolve(false);
  });
}

users.findId = function(user)
{
  return User.findAll({where: {id: user}})
}
module.exports = users;
