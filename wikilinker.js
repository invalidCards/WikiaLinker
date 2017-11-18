const Discord = require('discord.js');
const bot = new Discord.Client();
const request = require('request');
const config = require('./config.json');

const sql = require('sqlite');
sql.open('./db.sqlite');

let trulyReady = false;

bot.once('ready', () => {
	bot.guilds.forEach(guild => {
		sql.get(`SELECT * FROM guilds WHERE id="${guild.id}"`).then(row => {
			if (!row) {
				sql.run('INSERT INTO guilds (id) VALUES (?)', [guild.id]);
			}
		}).catch(() => {
			sql.run('CREATE TABLE IF NOT EXISTS guilds (id TEXT, mainWiki TEXT, broadcastChannel TEXT)').then(() => {
				sql.run('CREATE TABLE IF NOT EXISTS overrides (guildID TEXT, channelID TEXT, wiki TEXT)').then(() => {
					sql.run('INSERT INTO guilds (id) VALUES (?)', [guild.id]);
				});
			});
		});
	});
	trulyReady = true;
	console.log(`Ready: serving ${bot.guilds.size} guilds, in ${bot.channels.size} channels, for ${bot.users.size} users.`);
});

bot.on('guildCreate', guild => {
	sql.get(`SELECT * FROM guilds WHERE id="${guild.id}"`).then(row => {
		if (!row) {
			sql.run('INSERT INTO guilds (id) VALUES (?)', [guild.id]);
		}
	}).catch(() => {
		sql.run('CREATE TABLE IF NOT EXISTS guilds (id TEXT, mainWiki TEXT, broadcastChannel TEXT)').then(() => {
			sql.run('INSERT INTO guilds (id) VALUES (?)', [guild.id]);
		});
	});
});

bot.on('message', (msg) => {
	if (msg.author.bot || !msg.guild || !trulyReady) return;

	if (msg.content.startsWith(config.prefix)) {
		const args = msg.content.slice(config.prefix.length).split(/ (.+)/);
		const command = args.shift();
		if (commands.hasOwnProperty(command)) {
		    commands[command](msg, args);
		}
	} else if (/\[\[([^\]|]+)(?:|[^\]]+)?\]\]/g.test(msg.cleanContent) || /\{\{([^}|]+)(?:|[^}]+)?\}\}/g.test(msg.cleanContent) || /--([^|]+?)--/g.test(msg.cleanContent)) {
		// eslint-disable-next-line consistent-return
		sql.get(`SELECT * FROM guilds WHERE id="${msg.guild.id}"`).then(row => {
			if (!row.mainWiki) {
				return msg.channel.send([
					'This server has not set a default wiki yet.',
					'Users with the "Administrator" permission can do this using wl~swiki <wikiname>.'
				]);
			}

			sql.get(`SELECT mainWiki FROM guilds WHERE id="${msg.guild.id}"`).then(lowrow => {
				let wiki = lowrow.mainWiki;

				sql.all(`SELECT * FROM overrides WHERE guildID="${msg.guild.id}"`).then(rows => {
					if (rows.length !== 0) {
						for (let i = 0; i < rows.length; i++) {
							if (rows[i].channelID === msg.channel.id) {
								wiki = rows[i].wiki;
							}
						}
					}
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

					if (/--([^|]+?)--/g.test(cleaned)) {
						const name = cleaned.replace(/.*?--([^|]+?)--/g, '$1\u200B').replace(/.*(?:\n|\r)/g, '');
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
				}).catch(console.error);
			}).catch(console.error);
		}).catch(console.error);
	}
});

// D.js auto-reconnects, this may cause the bot to login with 2 instances
/* bot.on('disconnected', () => {
	bot.login(config.token);
}); */

const sentByBotAdmin = (msg) => {
	return msg.author.id === config.admin_snowflake;
};

const sentByServerAdmin = (msg) => {
	return msg.member.hasPermission(Discord.Permissions.FLAGS.MANAGE_GUILD);
};

const sentByAnyAdmin = (msg) => {
	return sentByBotAdmin(msg) || sentByServerAdmin(msg);
};

const commands = {
	help: (msg) => {
		msg.channel.send('Syntax and commands: <http://thepsionic.com/bots/wikialinker/>');
	},
	restart: (msg) => {
		if (!sentByBotAdmin(msg)) {
			msg.channel.send("Sorry, Dave. I can't let you do that.");
		} else {
			msg.channel.send('**Bot restarting!**')
				.then(() => {
					process.exit(1);
				});
		}
	},
	bc: (msg, [globalMessage]) => {
		if (!sentByBotAdmin(msg)) {
			msg.reply("you don't get to yell at everyone!");
		} else {
			sql.each('SELECT * FROM guilds', (err, row) => {
				if (row.broadcastChannel && !err) {
					if (row.broadcastChannel !== '-1') {
						bot.channels.get(row.broadcastChannel).send(globalMessage);
					}
				} else if (bot.guilds.has(row.id)) {
					defaultChannel(bot.guilds.get(row.id)).then(channel => {
						channel.send(globalMessage);
					});
				}
			}).catch(console.error);
		}
	},
	swiki: (msg, [wiki]) => {
		if (!sentByAnyAdmin(msg)) {
			msg.reply('You are not allowed to change the default wiki of this server.');
		} else {
			wiki = wiki.split(' ')[0];
			sql.get(`SELECT * FROM guilds WHERE id=${msg.guild.id}`).then(row => {
				if (!row) {
					sql.run('INSERT INTO guilds (mainWiki) VALUES (?)', [wiki]).then(() =>
						msg.reply(`Wiki is now set to: ${wiki}`)
					).catch(() => msg.reply('Database error - please contact the developer!'));
				} else {
					sql.run('UPDATE guilds SET mainWiki=? WHERE id=?', [wiki, msg.guild.id]).then(() =>
						msg.reply(`Wiki is now set to: ${wiki}`));
				}
			}).catch(console.error);
		}
	},
	cwiki: (msg, [wiki]) => {
		if (!sentByAnyAdmin(msg)) {
			msg.reply('You are not allowed to change the default wiki of this server.');
		} else if (msg.channel.id === msg.guild.id) {
			msg.reply('You can\'t override the default channel of a server.');
		} else {
			console.log(wiki);
			wiki = wiki.split(' ')[0];
			sql.get(`SELECT * FROM overrides WHERE guildID="${msg.guild.id}" AND channelID="${msg.channel.id}"`).then(row => {
				if (row) {
					sql.run('UPDATE overrides SET wiki=? WHERE guildID=? AND channelID=?', [wiki, msg.guild.id, msg.channel.id]);
				} else {
					sql.run('INSERT INTO overrides (guildID, channelID, wiki) VALUES (?,?,?)', [msg.guild.id, msg.channel.id, wiki]);
				}
			}).then(() => msg.reply(`The wiki override for channel ${msg.channel.name} is now set to ${wiki}`)).catch(console.error);
		}
	},
	bchan: (msg) => {
		let channel;
		if (!sentByAnyAdmin(msg)) {
			msg.reply('You are not allowed to change the broadcast channel of this server.');
		} else if (msg.mentions.channels.size > 1) {
			msg.reply('You need to mention exactly one channel to be set as broadcast channel.');
		} else {

			if (msg.cleanContent.split(' ')[1] === 'off') {
				channel = {name: 'off', id: '-1'};
			} else if (msg.mentions.channels.size === 0) {
				channel = msg.channel;
			} else {
				channel = msg.mentions.channels.first();
			}
			console.log(`Channel is ${channel.name}`);
			sql.get(`SELECT * FROM guilds WHERE id="${msg.guild.id}"`).then(row => {
				console.log(row);
				if (row) {
					sql.run('UPDATE guilds SET broadcastChannel=? WHERE id=?', [channel.id, msg.guild.id]).then(() =>
						msg.reply(`The broadcast channel for this server is now set to: ${channel.name}.`)
					);
				} else {
					msg.reply('Database error - please contact the developer!');
				}
			});
		}
	},
	sinfo: (msg) => {
		if (!msg.guild) {
		    // do nothing

		} else {
			sql.get(`SELECT * FROM guilds WHERE id="${msg.guild.id}"`).then(row => {
				let totalMessage = `\`\`\`\nInfo for server: ${msg.guild.name}`;
				if (!row.broadcastChannel) {
					totalMessage += '\nNo broadcast channel set';
				} else if (row.broadcastChannel === '-1') {
					totalMessage += '\nBroadcasting turned off for this server';
				} else {
					totalMessage += `\nBroadcast channel: ${msg.guild.channels.get(row.broadcastChannel).name}`;
				}

				if (!row.mainWiki) {
					totalMessage += '\nNo main wiki set';
				} else {
					totalMessage += `\nMain wiki: ${row.mainWiki}`;
				}

				sql.all(`SELECT * FROM overrides WHERE guildID="${msg.guild.id}"`).then(rows => {
					if (rows.length === 0) {
						totalMessage += '\nNo channel overrides set';
					} else {
						totalMessage += '\nChannel overrides:';
						for (let i = 0; i < rows.length; i++) {
							totalMessage += `\n  Wiki ${rows[i].wiki} in channel ${msg.guild.channels.get(rows[i].channelID).name}`;
						}
					}

					totalMessage += '\n```';
					msg.channel.send(totalMessage);
				}).catch(console.error);
			}).catch(console.error);
		}
	}
};

const reqAPI = (wiki, requestname) => new Promise((resolve, reject) => {
	request({
		method: 'GET',
		uri: `http://${wiki}.wikia.com/api/v1/Search/List/?query=${requestname}&limit=1`,
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

const defaultChannel = (guild) => new Promise((resolve, reject) => {
	guild.channels.forEach((value, key, map) => {
		if (value.name === 'general') {
			return resolve(value);
		}
	});
	let alt = guild.channels.filter((channel) => channel.type === 'text' && channel.permissionsFor(bot.user).has('SEND_MESSAGES')).first();
	if (alt) {
		return resolve(alt);
	} else {
		return reject('No applicable channel found.');
	}
});

if (config.admin_snowflake === '') {
	console.log('Admin snowflake empty. Startup disallowed.');
	process.exit(1);
} else {
	bot.login(config.token);
}

process.on('unhandledRejection', re => console.log(re));
