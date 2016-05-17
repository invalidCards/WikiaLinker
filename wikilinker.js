var Discord = require("discord.js");
var config = require("./config.json");

var bot = new Discord.Client();

bot.on("message", function(msg) {
    if (msg.cleanContent.search(/\[\[([^\]\|]+)(?:|[^\]]+)?\]\]/g) !== -1) {
        console.log("Link found!");
        cleaned = msg.cleanContent.replace(/\u200B/g, "");
        name = cleaned.replace(/.*?\[\[([^\]\|]+)(?:|[^\]]+)?\]\]/g, "$1\u200B");
        allLinks = name.split("\u200B");
        console.log(allLinks);
        allLinks.pop();
        replyString = "**Wiki links detected:**";
        for (item in allLinks) {
            allLinks[item] = allLinks[item].trim();
            console.log(allLinks[item]);
            replyString += "\n"
            allLinks[item] = allLinks[item].replace(/ /g, "_");
            if (allLinks[item].search(/#/g) !== -1) {
                replyString += "\<http://rs.wikia.com/" + allLinks[item] + "\>";
            } else if (allLinks[item].search(/\?action=\w+/g) !== -1) {
                replyString += "\<http://rs.wikia.com/" + allLinks[item] + "\>";
            } else {
                if (allLinks[item].search(/\?/g) !== -1) {
                    allLinks[item] = allLinks[item].replace(/\?/g, "%63");
                }
                replyString += "\<http://rs.wikia.com/" + allLinks[item] + "\?action=view\>";
            }
        }
        bot.sendMessage(msg.channel, replyString);
    }
});

bot.on("disconnected", function() {
    bot.loginWithToken(config.token);
});

bot.loginWithToken(config.token);