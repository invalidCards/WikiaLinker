var Discord = require("discord.js");
var request = require("request");
var config = require("./config.json");

var bot = new Discord.Client();

var somethingToSend = false;
var preparedSend = "";

bot.on("message", function(msg) {
    if (msg.cleanContent.search(/\[\[([^\]\|]+)(?:|[^\]]+)?\]\]/g) !== -1) {
		channel = msg.channel;
        cleaned = msg.cleanContent.replace(/\u200B/g, "");
        name = cleaned.replace(/.*?\[\[([^\]\|]+)(?:|[^\]]+)?\]\]/g, "$1\u200B");
        allLinks = name.split("\u200B");

        allLinks.pop();
        unique = allLinks.filter(onlyUnique);

        for (item in unique) {
            if (unique.hasOwnProperty(item)) {
                unique[item] = unique[item].trim();

                reqAPI(unique[item], function () {
                    prepareSend(this);
                })
            }
        }
    }
	if (msg.cleanContent.search(/\{\{([^\}\|]+)(?:|[^\}]+)?\}\}/g) !== -1) {
		channel = msg.channel;
        cleaned = msg.cleanContent.replace(/\u200B/g, "");
		name = cleaned.replace(/.*?\{\{([^\}\|]+)(?:|[^\}]+)?\}\}/g, "$1\u200B");
        allLinks = name.split("\u200B");

        allLinks.pop();
        unique = allLinks.filter(onlyUnique);

        for (item in unique) {
            if (unique.hasOwnProperty(item)) {
                unique[item] = "Template:"+unique[item].trim();

                reqAPI(unique[item], function () {
                    prepareSend(this);
                })
            }
        }
    }
	if (msg.cleanContent.search(/\-\-([^\-\|]+)(?:|[^\-]+)?\-\-/g) !== -1) {
		channel = msg.channel;
        cleaned = msg.cleanContent.replace(/\u200B/g, "");
		name = cleaned.replace(/.*?\-\-([^\-\|]+)(?:|[^\-]+)?\-\-/g, "$1\u200B");
        allLinks = name.split("\u200B");

        allLinks.pop();
        unique = allLinks.filter(onlyUnique);

        for (item in unique) {
            if (unique.hasOwnProperty(item)) {
                unique[item] = unique[item].trim();
				unique[item] = unique[item].replace(/\s/g, "_");
				prepareSend("http://runescape.wikia.com/wiki/" + unique[item]);
			}
		}
	}
	if (msg.content.startsWith("%help")) {
		msg.channel.sendMessage("Syntax and commands: <https://github.com/ThePsionic/RSWikiLinker#syntax>");
	}
    if (msg.content.startsWith("%restart")) {
        if (msg.author.id === config.admin_snowflake) {
            msg.channel.sendMessage("**Bot restarting!**");
            setTimeout(function() {process.exit(1);}, 100);
        } else {
            msg.channel.sendMessage("Sorry, Dave. I can't let you do that.");
        }
    }
	
	setTimeout(function() {
		if (preparedSend !== "") {
			send(msg);
		}
	}, 1000);
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
            console.log("First item: " + body.items[0].title);
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

function prepareSend(toAdd) {
	if (preparedSend === "") {
		preparedSend = "**Wiki links detected:**";
	}
	preparedSend += "\n<" + toAdd + ">";
}

function send(msg) {
	console.log("Sending message...");
	msg.channel.sendMessage(preparedSend);
	preparedSend = "";
}

if (config.admin_snowflake === '') {
    console.log("Admin snowflake empty. Startup disallowed.");
    process.exit(1);
} else {
    bot.login(config.token);
}