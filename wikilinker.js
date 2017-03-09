const Discord = require('discord.js');
const request = require('request');
const config = require('./config.json');

const bot = new Discord.Client();

bot.on('message', (msg) => {
	if (msg.author.bot) return;

	if (msg.content.startsWith(config.prefix)) {
		const command = msg.content.slice(config.prefix.length).split(' ').shift();
		if (commands.hasOwnProperty(command)) commands[command](msg);
	} else {
		const mps = ['**Wiki links detected:**'];
		const cleaned = msg.cleanContent.replace(/\u200B/g, '');

		if (/\[\[([^\]|]+)(?:|[^\]]+)?\]\]/g.test(cleaned)) {
			const name = cleaned.replace(/.*?\[\[([^\]|]+)(?:|[^\]]+)?\]\]/g, '$1\u200B');
			const allLinks = name.split('\u200B').slice(0, -1);
			const unique = new Set(allLinks);

			unique.forEach((item) => {
				mps.push(reqAPI(item.trim()).catch(console.error));
			});
		}

		if (/\{\{([^}|]+)(?:|[^}]+)?\}\}/g.test(cleaned)) {
			const name = cleaned.replace(/.*?\{\{([^}|]+)(?:|[^}]+)?\}\}/g, '$1\u200B');
			const allLinks = name.split('\u200B').slice(0, -1);
			const unique = new Set(allLinks);

			unique.forEach((item) => {
				mps.push(reqAPI(`Template:${item.trim()}`).catch(console.error));
			});
		}

		if (/--([^\-|]+)(?:|[^-]+)?--/g.test(cleaned)) {
			const name = cleaned.replace(/.*?--([^\-|]+)(?:|[^-]+)?--/g, '$1\u200B');
			const allLinks = name.split('\u200B').slice(0, -1);
			const unique = new Set(allLinks);

			unique.forEach((item) => {
				mps.push(`<http://runescape.wikia.com/wiki/${item.trim().replace(/\s/g, '_')}>`);
			});
		}

		Promise.all(mps)
			.then(preparedSend => {
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
	}
};

const reqAPI = requestname => new Promise((resolve, reject) => {
	request({
		method: 'GET',
		uri: `http://runescape.wikia.com/api/v1/Search/List/?query=${requestname}&limit=1&namespaces=0%2C14`,
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
	bot.login(config.token);
}
