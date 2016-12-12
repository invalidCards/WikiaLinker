# RSWikiLinker
A Discord bot for linking RuneScape Wiki articles.

# Syntax
`[[<article name>]]` -> `http://rs.wikia.com/<article_name>?action=view`

eg. `[[Corporeal beast]]` -> `http://rs.wikia.com/Corporeal_beast?action=view`

## Admin commands
`%restart` - Restarts the bot. **The bot *must* be run under a process manager such as PM2, otherwise this will just error out the bot!**

# Inviting it
Click the following link (**Must be the owner of the channel**): *The bot is offline and no longer hosted by me. Feel free to clone the source and host it yourself.*

Note that it has no permissions when added, and must be done manually by changing the bot's role.

# Running it yourself
1. Download the repository.
2. Make sure you have NodeJS and NPM with all of its dependencies installed.
3. `npm install`
4. Make a `config.json` file; an example is provided. Fill the fields with:
  * `token` contains the token of the bot account used.
  * `admin_snowflake` contains the ID of the admin user. **REQUIRED FOR THE BOT TO START UP.**
5. `node wikilinker.js` to run it!
