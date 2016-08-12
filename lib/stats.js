
var stats = {};

var statsdata;
fs.readFile(__dirname + "../assets/stats.txt", function(err, data) {
    if (err) {
        console.error(err);
    }
    console.log("Stats LOADED >> " + data)
    statsdata = JSON.parse(data);
});


stats.save = function(){
    statsdata.lastupdatetime = Date.now();
    var save = JSON.stringify(statsdata)
    console.log("Stats SAVED >> " + save)
    fs.writeFile(__dirname + "../assets/stats.txt", save);
}

stats.saveQuestion(qn) {
    console.log("Question SAVED >> " + qn)
    fs.appendFile(__dirname + "../assets/questionsasked.txt", Date.now().toString() + " : " + qn.toString() + "\n");
}
module.exports = stats;
