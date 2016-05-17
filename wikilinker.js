var Discord = require("discord.js");
var config = require("./config.json");

var bot = new Discord.Client();

bot.on("message", function(msg) {
    if (msg.cleanContent.search(/\[\[.+\]\]/g) !== -1) {
        console.log("Link found!");
        name = msg.cleanContent.replace(/\[\[(.+)\]\]/g, "$1");
        name = name.replace(/ /g, "_");
        if (name.search(/#/g) !== -1) {
            bot.sendMessage(msg.channel, "\<http://rs.wikia.com/"+name+"\>");
        } else if (name.search(/\?action=\w+/g) !== -1) {
            bot.sendMessage(msg.channel, "\<http://rs.wikia.com/"+name+"\>");
        } else {
            if (name.search(/\?/g) !== -1) {
                name = name.replace(/\?/g, "%63");
            }
            bot.sendMessage(msg.channel, "\<http://rs.wikia.com/"+name+"?action=view\>");
        }
    }
});

bot.loginWithToken(config.token);