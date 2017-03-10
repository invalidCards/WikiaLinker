const Discord = require('discord.js');
const request = require('request');
const jsonfile = require('jsonfile');
const fs = require('fs');
const config = require('./config.json');

const bot = new Discord.Client();

const dbfile = './db.json';

bot.on('message', (msg) => {
	if (msg.author.bot) return;

	if (msg.content.startsWith(config.prefix)) {
		const command = msg.content.slice(config.prefix.length).split(' ').shift();
		if (commands.hasOwnProperty(command)) commands[command](msg);
	} else {
		const mps = ['**Wiki links detected:**'];
		const removeCodeblocks = msg.cleanContent.replace(/`{3}[\S\s]*?`{3}/gm, '');
		const removeInlineCode = removeCodeblocks.replace(/`[\S\s]*?`/gm, '');
		const cleaned = removeInlineCode.replace(/\u200B/g, '');

		if (/\[\[([^\]|]+)(?:|[^\]]+)?\]\]/g.test(cleaned)) {
			const name = cleaned.replace(/.*?\[\[([^\]|]+)(?:|[^\]]+)?\]\]/g, '$1\u200B');
			const allLinks = name.split('\u200B').slice(0, -1);
			const unique = new Set(allLinks);

			unique.forEach((item) => {
				var toPush = dbCheck(msg, item.trim(), false);
				if (toPush !== null) mps.push(toPush);
			});
		}

		if (/\{\{([^}|]+)(?:|[^}]+)?\}\}/g.test(cleaned)) {
			const name = cleaned.replace(/.*?\{\{([^}|]+)(?:|[^}]+)?\}\}/g, '$1\u200B');
			const allLinks = name.split('\u200B').slice(0, -1);
			const unique = new Set(allLinks);

			unique.forEach((item) => {
				var toPush = dbCheck(msg, `Template:${item.trim()}`, false);
				if (toPush !== null) mps.push(toPush);
			});
		}

		if (/--([^\-|]+)(?:|[^-]+)?--/g.test(cleaned)) {
			const name = cleaned.replace(/.*?--([^\-|]+)(?:|[^-]+)?--/g, '$1\u200B');
			const allLinks = name.split('\u200B').slice(0, -1);
			const unique = new Set(allLinks);

			unique.forEach((item) => {
				var toPush = dbCheck(msg, item.trim().replace(/\s/g, '_'), true);
				if (toPush !== null) mps.push(toPush);
			});
		}

		Promise.all(mps)
			.then(preparedSend => {
				preparedSend = preparedSend.filter(item => item !== undefined);
				if (preparedSend.length > 1) {
					console.log('Sending message...');
					msg.channel.sendMessage(preparedSend);
				}
			})
			.catch(console.error);
	}
});

// D.js auto-reconnects, this may cause the bot to login with 2 instances
/* bot.on('disconnected', () => {
	bot.login(config.token);
}); */

const dbCheck = (msg, requestname, raw) => {
	jsonfile.readFile(dbfile, (err, obj) => {
		if (err) {
			console.error(err);
			return null;
		}
		if (!msg.guild) {
			msg.reply("please don't PM me :(");
			return null;
		}
		if (obj[msg.guild.id] === null || obj[msg.guild.id] === undefined) {
			msg.channel.sendMessage('This server has not set a default wiki yet.\nUsers with the "Administrator" permission can do this using %setWiki <wikiname>.');
			return null;
		}
		const wiki = obj[msg.guild.id];
		if (raw) {
			return `<http://${wiki}.wikia.com/wiki/${requestname.trim().replace(/\s/g, '_')}>`;
		} else {
			return reqAPI(wiki, requestname);
		}
	});
};

const commands = {
	help: (msg) => {
		msg.channel.sendMessage('Syntax and commands: <https://github.com/ThePsionic/RSWikiLinker#syntax>');
	},
	restart: (msg) => {
		if (msg.author.id !== config.admin_snowflake) return msg.channel.sendMessage("Sorry, Dave. I can't let you do that.");
		return msg.channel.sendMessage('**Bot restarting!**')
			.then(() => {
				process.exit(1);
			});
	},
	setWiki: (msg) => {
		if (msg.author.id !== config.admin_snowflake || !msg.member.hasPermission('ADMINISTRATOR')) {
			return msg.reply('you are not allowed to change the default wiki of this server.');
		}
		if (!msg.guild) {
			return msg.reply('you can\'t set a default wiki privately as of right now.');
		}
		return msg.reply(jsonfile.readFile(dbfile, (err, obj) => {
			if (err) {
				console.error(err);
				return `error while setting wiki - sorry!`;
			}
			var wiki = msg.cleanContent.split(/\s/g)[1];
			console.log(`wiki = ${wiki}`);
			obj[msg.guild.id] = wiki;
			jsonfile.writeFile(dbfile, obj, (innererr) => {
				console.error(innererr);
			});
			return `you have set the default wiki of this server to ${wiki}.`;
		}));
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

if (config.admin_snowflake === '') {
	console.log('Admin snowflake empty. Startup disallowed.');
	process.exit(1);
} else {
	fs.stat(dbfile, (err) => {
		if (err === null) {
			console.log('File exists');
		} else if (err.code === 'ENOENT') {
			fs.writeFile(dbfile, '{}');
		} else {
			console.error('Bad file error: ', err.code);
		}
	});
	bot.login(config.token);
}
