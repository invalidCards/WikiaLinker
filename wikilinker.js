var Discord = require("discord.js");
var request = require("request");
var config = require("./config.json");

var bot = new Discord.Client();

bot.on("message", function(msg) {
    if (msg.cleanContent.search(/\[\[([^\]\|]+)(?:|[^\]]+)?\]\]/g) !== -1) {
		var channel = msg.channel;
        cleaned = msg.cleanContent.replace(/\u200B/g, "");
        name = cleaned.replace(/.*?\[\[([^\]\|]+)(?:|[^\]]+)?\]\]/g, "$1\u200B");
        allLinks = name.split("\u200B");

        allLinks.pop();
        unique = allLinks.filter(onlyUnique);
        replyString = "**Wiki links detected:**";

        for (item in unique) {
            if (unique.hasOwnProperty(item)) {
                unique[item] = unique[item].trim();

                reqAPI(unique[item], function () {
                    replyString += "\n<" + this + ">";
                })
            }
        }

        setTimeout(function () {
            if (replyString !== "**Wiki links detected:**") {
                channel.sendMessage(replyString);
            }
        }, 1000);
    }
    else if (msg.content.startsWith("%restart")) {
        if (msg.author.id === config.admin_snowflake) {
            bot.reply(msg, "okay!");
            setTimeout(function() {process.exit(1);}, 100);
        } else {
            bot.reply(msg, "no. Just no.");
        }
    }
});

bot.on("disconnected", function() {
    bot.login(config.token);
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

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

if (config.admin_snowflake === '') {
    console.log("Admin snowflake empty. Startup disallowed.");
    process.exit(1);
} else {
    bot.login(config.token);
}