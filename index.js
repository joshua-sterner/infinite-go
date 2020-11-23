const Server = require('./server.js').Server;
const Users = require('./users.js').Users;
const db = require('./db.js');
const fs = require('fs');
const InfiniteGoAPI = require('./api.js');
const Goban = require('./goban.js').Goban;
const Stones = require('./stones.js').Stones;
const crypto = require('crypto');

const settings_filename = 'settings.json';
let settings = JSON.parse(fs.readFileSync(settings_filename));

if (settings.dev_build == undefined) {
    settings.dev_build = false;
}
if (settings.port == undefined) {
    settings.port = 3000;
}

const db_connection_pool = new db.Pool(settings.db);

const start_server = () => {
    const users = new Users(db_connection_pool);
    const default_viewport = {'top':10, 'right':9, 'bottom':-8, 'left':-7};
    const stones = new Stones(db_connection_pool);
    const goban = new Goban(stones);
    const api = new InfiniteGoAPI(users, goban);
    const session_secret = settings.session_secret || crypto.randomBytes(128).toString('base64');
    const server = new Server({users:users, session_secret: session_secret, default_viewport:default_viewport, api: api, dev_build: settings.dev_build});
    server.listen(settings.port, () => console.log('Server running'));
};

// Attempt to initialize db
const setup_sql = fs.readFileSync('setup_database.sql', 'utf8');
db_connection_pool.query(setup_sql)
    .then(() => {
        start_server();
    })
    .catch(() => {
        // db already initialized
        start_server();
    });

