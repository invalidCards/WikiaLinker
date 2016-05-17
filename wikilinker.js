var Discord = require("discord.js");
var request = require("request");
var config = require("./config.json");

var bot = new Discord.Client();

bot.on("message", function(msg) {
    if (msg.cleanContent.search(/\[\[([^\]\|]+)(?:|[^\]]+)?\]\]/g) !== -1) {
        cleaned = msg.cleanContent.replace(/\u200B/g, "");
        name = cleaned.replace(/.*?\[\[([^\]\|]+)(?:|[^\]]+)?\]\]/g, "$1\u200B");
        allLinks = name.split("\u200B");

        allLinks.pop();
        replyString = "**Wiki links detected:**";

        for (item in allLinks) {
            allLinks[item] = allLinks[item].trim();

            reqAPI(allLinks[item], function() {
                replyString += "\n<" + this + ">";
            })
        }
        setTimeout(function() {bot.sendMessage(msg.channel, replyString);}, 1000);
    }
});

bot.on("disconnected", function() {
    bot.loginWithToken(config.token);
});

function reqAPI(requestname, callback) {
    request({
        method: "GET",
        uri: "http://runescape.wikia.com/api/v1/Search/List/?query="+requestname+"&limit=1&namespaces=0%2C14",
        json: true
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("First item: " + body.items[0]);
            callback.call(body.items[0].url);
        } else if (error) {
            console.log("Error: " + error);
        } else {
            console.log("Response code: " + response.statusCode);
        }
    });
}

bot.loginWithToken(config.token);