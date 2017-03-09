# RSWikiLinker
A Discord bot for linking RuneScape Wiki articles.

# Syntax
`[[<article name>]]` -> `http://rs.wikia.com/<article_name>`

`{{<template name>}}` -> `http://rs.wikia.com/Template:<template_name>`

`--<raw article>--` -> `http://rs.wikia.com/<raw_article>` (bypasses Wikia API)

## Admin commands
`%restart` - Restarts the bot. **The bot *must* be run under a process manager such as PM2, otherwise this will just error out the bot!**

# Inviting it
Click the following link: https://discordapp.com/oauth2/authorize?client_id=182146444357140480&scope=bot&permissions=3072

The bot only has read message and send message permissions when added - additional permissions and limiting to channels must be done manually.

# Running it yourself
1. Download the repository.
2. Make sure you have NodeJS and NPM with all of its dependencies installed.
3. `npm install`
4. Make a `config.json` file; an example is provided. Fill the fields with:
  * `token` contains the token of the bot account used.
  * `admin_snowflake` contains the ID of the admin user. **REQUIRED FOR THE BOT TO START UP.**
5. `node wikilinker.js` to run it!
