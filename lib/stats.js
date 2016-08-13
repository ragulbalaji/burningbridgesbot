const Sequelize = require('sequelize');
var sequelize = require('./db')

var stats = {};

var statsdata;

var Question = sequelize.define('questions', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  question:{
    type: Sequelize.INTEGER
  },
  pointer: {
    type: Sequelize.INTEGER
  },
  asker: {
    type: Sequelize.INTEGER
  },
  victim: {
    type: Sequelize.INTEGER
  }
}, {
  timestamps: true,
  freezeTableName: true // Model tableName will be the same as the model name
});


var Stats = sequelize.define('stats', {
  id: {
    type: Sequelize.STRING,
    primaryKey: true,
  },
  value:{
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
}, {
  timestamps: true,
  freezeTableName: true // Model tableName will be the same as the model name
});
Question.sync();
Stats.sync();
stats.saveQuestion = function(qn,p ,a, v) {
  return Question.create({
    question: qn,
    pointer: p.id,
    asked: a.id,
    vicitm: v.id,
  })
}

stats.increment = function(stat)
{
  return Stats.build({id: stat}).increment('value');
}
module.exports = stats;
