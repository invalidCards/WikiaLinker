# WikiaLinker
A configurable Discord bot for linking wiki articles from any Wikia-based community.

# Syntax
`[[<article name>]]` -> `http://rs.wikia.com/<article_name>`

`{{<template name>}}` -> `http://rs.wikia.com/Template:<template_name>`

`--<raw article>--` -> `http://rs.wikia.com/<raw_article>` (bypasses Wikia API)

## Other commands
`wl~help` - Links to this README.

`wl~sinfo` - Shows info about the configuration of the bot on the server.

## Server admin commands
`wl~swiki` - Sets the global wiki for the server.

`wl~cwiki` - Sets the override wiki in the current channel.

`wl~bchan <value>` - Sets the broadcast channel of the server to the mentioned channel. Accepted values are:
*   A #channel mention
*   No value given - sets current channel as broadcast channel
*   off - disables broadcast channels for the current server

## Bot admin commands
`wl~restart` - Restarts the bot. **The bot *must* be run under a process manager such as PM2, otherwise this will just error out the bot!**

`wl~bc` - Broadcasts a message across all of the servers the bot is in - to the broadcast channel is set, or the general channel otherwise.

# Inviting it
Click the following link: <https://discordapp.com/oauth2/authorize?client_id=182146444357140480&scope=bot&permissions=3072>

The bot only has read message and send message permissions when added - additional permissions and limiting to channels must be done manually.

# Running it yourself
1.  Download the repository.
2.  Make sure you have NodeJS and NPM with all of its dependencies installed.
3.  `npm install`
4.  Make a `config.json` file; an example is provided. Fill the fields with:
  . `token` contains the token of the bot account used.
  . `admin_snowflake` contains the ID of the admin user. **REQUIRED FOR THE BOT TO START UP.**
  . `prefix` the prefix to activate commands.
5.  `node wikilinker.js` to run it!
