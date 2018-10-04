const sql = require('sqlite');
sql.open('./db.sqlite').then(() => {
    sql.run('ALTER TABLE guilds ADD COLUMN disableInline INTEGER').then(() => { console.log('DB alter succeeded'); }).catch(err => { console.log('Error: ' + err); });
});