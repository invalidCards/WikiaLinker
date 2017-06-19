const Discord = require('discord.js');
const bot = new Discord.Client();
const request = require('request');
const fs = require('fs-extra-promise');
const config = require('./config.json');
const dbfile = './db.json';

let trulyReady = false;
let db;

try {
	db = require(dbfile);
} catch (err) {
	db = {};
}

bot.once('ready', () => {
	bot.guilds.forEach(guild => {
		if (!db.hasOwnProperty(guild.id)) db[guild.id] = {};
		guild.settings = db[guild.id];
	});
	saveDB().then(() => {
		trulyReady = true;
		console.log(`Ready: serving ${bot.guilds.size} guilds, in ${bot.channels.size} channels, for ${bot.users.size} users.`);
	}).catch(console.error);
});

bot.on('guildCreate', guild => {
	if (!db.hasOwnProperty(guild.id)) db[guild.id] = {};
	guild.settings = db[guild.id];
	saveDB().then(() => {
		console.log(`New Guild: ${guild.name}`);
	}).catch(console.error);
});

bot.on('message', (msg) => {
	if (msg.author.bot || !msg.guild || !trulyReady) return;

	if (msg.content.startsWith(config.prefix)) {
		const args = msg.content.slice(config.prefix.length).split(/ (.+)/);
		const command = args.shift();
		if (commands.hasOwnProperty(command)) commands[command](msg, args);
	} else if (/\[\[([^\]|]+)(?:|[^\]]+)?\]\]/g.test(msg.cleanContent) || /\{\{([^}|]+)(?:|[^}]+)?\}\}/g.test(msg.cleanContent) || /--([^\-|]+)(?:|[^-]+)?--/g.test(msg.cleanContent)) {
		if (!msg.guild.settings.wiki) {
			// eslint-disable-next-line consistent-return
			return msg.channel.send([
				'This server has not set a default wiki yet.',
				'Users with the "Administrator" permission can do this using wl~swiki <wikiname>.'
			]);
		} else if (!msg.guild.settings.broadcastChannel) {
			// eslint-disable-next-line consistent-return
			return msg.channel.send([
				'This server has not set a broadcast channel yet.',
				'Users with the "Administrator" permission can do this using wl~broadcastchan <channel mention>.'
			]);
		}

		let wiki = msg.guild.settings.wiki;
		if (msg.guild.settings.channelOverrides) wiki = msg.guild.settings.channelOverrides[msg.channel.id] || msg.guild.settings.wiki;

		const mps = ['**Wiki links detected:**'];
		const removeCodeblocks = msg.cleanContent.replace(/`{3}[\S\s]*?`{3}/gm, '');
		const removeInlineCode = removeCodeblocks.replace(/`[\S\s]*?`/gm, '');
		const cleaned = removeInlineCode.replace(/\u200B/g, '');

		if (/\[\[([^\]|]+)(?:|[^\]]+)?\]\]/g.test(cleaned)) {
			const name = cleaned.replace(/.*?\[\[([^\]|]+)(?:|[^\]]+)?\]\]/g, '$1\u200B');
			const allLinks = name.split('\u200B').slice(0, -1);
			const unique = new Set(allLinks);

			unique.forEach((item) => {
				mps.push(reqAPI(wiki, item.trim()).catch(console.error));
			});
		}

		if (/\{\{([^}|]+)(?:|[^}]+)?\}\}/g.test(cleaned)) {
			const name = cleaned.replace(/.*?\{\{([^}|]+)(?:|[^}]+)?\}\}/g, '$1\u200B');
			const allLinks = name.split('\u200B').slice(0, -1);
			const unique = new Set(allLinks);

			unique.forEach((item) => {
				mps.push(reqAPI(wiki, `Template:${item.trim()}`).catch(console.error));
			});
		}

		if (/--([^\-|]+)(?:|[^-]+)?--/g.test(cleaned)) {
			const name = cleaned.replace(/.*?--([^\-|]+)(?:|[^-]+)?--/g, '$1\u200B');
			const allLinks = name.split('\u200B').slice(0, -1);
			const unique = new Set(allLinks);

			unique.forEach((item) => {
				mps.push(`<http://${wiki}.wikia.com/wiki/${item.trim().replace(/\s/g, '_')}>`);
			});
		}

		Promise.all(mps)
			.then(preparedSend => {
				preparedSend = preparedSend.filter(item => item !== undefined);
				if (preparedSend.length > 1) {
					console.log('Sending message...');
					msg.channel.send(preparedSend);
				}
			})
			.catch(console.error);
	}
});

// D.js auto-reconnects, this may cause the bot to login with 2 instances
/* bot.on('disconnected', () => {
	bot.login(config.token);
}); */

const commands = {
	help: (msg) => {
		msg.channel.send('Syntax and commands: <https://github.com/ThePsionic/RSWikiLinker#syntax>');
	},
	restart: (msg) => {
		if (msg.author.id !== config.admin_snowflake) return msg.channel.send("Sorry, Dave. I can't let you do that.");
		return msg.channel.send('**Bot restarting!**')
			.then(() => {
				process.exit(1);
			});
	},
	// eslint-disable-next-line consistent-return
	broadcast: (msg, [globalMessage]) => {
		if (msg.author.id !== config.admin_snowflake) return msg.reply("you don't get to yell at everyone!");
		var joinedGuilds = Array.from(bot.guilds.keys());
		for (var i = 0; i < joinedGuilds.length; i++) {
			var guildID = joinedGuilds[i];
			if (db[guildID].broadcastChannel) {
				return bot.channels.get(db[guildID].broadcastChannel).send(globalMessage);
			}
		}
	},
	swiki: (msg, [wiki]) => {
		if (msg.author.id !== config.admin_snowflake || !msg.member.hasPermission('ADMINISTRATOR')) {
			return msg.reply('You are not allowed to change the default wiki of this server.');
		}
		db[msg.guild.id].wiki = wiki.split(' ')[0];
		return saveDB().then(() => {
			msg.reply(`Wiki is now set to: ${wiki}.`);
		}).catch(console.error);
	},
	cwiki: (msg, [wiki]) => {
		if (msg.author.id !== config.admin_snowflake || !msg.member.hasPermission('ADMINISTRATOR')) {
			return msg.reply('You are not allowed to override the wiki of this channel.');
		} else if (msg.channel.id === msg.guild.id) {
			return msg.reply('You can\'t override the default channel of a server.');
		}
		if (!db[msg.guild.id].channelOverrides) db[msg.guild.id].channelOverrides = {};
		db[msg.guild.id].channelOverrides[msg.channel.id] = wiki.split(' ')[0];
		return saveDB().then(() => {
			msg.reply(`Wiki in this channel is now set to: ${wiki}.`);
		}).catch(console.error);
	},
	broadcastchan: (msg) => {
		if (!msg.mentions.channels || msg.mentions.channels.size > 1) {
			return msg.reply('You need to mention exactly one channel to be set as broadcast channel.');
		} else {
			var channel = msg.mentions.channels.first();
			db[msg.guild.id].broadcastChannel = channel.id;
			return saveDB().then(() => {
				msg.reply(`The broadcast channel for this server is now set to: ${channel.name}.`);
			});
		}
	},
	serverinfo: (msg) => {
		if (!msg.guild) return;
		var totalMessage = `\`\`\`\nInfo for server: ${msg.guild.name}`;
		if (!msg.guild.settings.broadcastChannel) {
			totalMessage += '\nNo broadcast channel set';
		} else {
			totalMessage += `\nBroadcast channel: ${msg.guild.channels.get(msg.guild.settings.broadcastChannel).name}`;
		}
		if (!msg.guild.settings.wiki) {
			totalMessage += '\nNo main wiki set';
		} else {
			totalMessage += `\nMain wiki: ${msg.guild.settings.wiki}`;
		}
		if (!msg.guild.settings.channelOverrides) {
			totalMessage += '\nNo channel overrides set';
		} else {
			totalMessage += '\nChannel overrides:';
			var channelIDs = Object.keys(msg.guild.settings.channelOverrides);
			for (var i = 0; i < channelIDs.length; i++) {
				totalMessage += `\n  Wiki ${msg.guild.settings.channelOverrides[channelIDs[i]]} in channel ${msg.guild.channels.get(channelIDs[i]).name}`;
			}
		}
		totalMessage += '\n```';
		msg.channel.send(totalMessage);
	}
};

const reqAPI = (wiki, requestname) => new Promise((resolve, reject) => {
	request({
		method: 'GET',
		uri: `http://${wiki}.wikia.com/api/v1/Search/List/?query=${requestname}&limit=1&namespaces=0%2C14`,
		json: true
	}, (error, response, body) => {
		if (!error && response.statusCode === 200) {
			console.log(`First item: ${body.items[0].title}`);
			return resolve(`<${body.items[0].url}>`);
		} else if (error) {
			return reject(`Error: ${error}`);
		} else {
			return reject(`Response code: ${response.statusCode}`);
		}
	});
});

const saveDB = () => fs.writeFileAsync(dbfile, JSON.stringify(db, null, 2));

if (config.admin_snowflake === '') {
	console.log('Admin snowflake empty. Startup disallowed.');
	process.exit(1);
} else {
	bot.login(config.token);
}
