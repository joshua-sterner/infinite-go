const Server = require('./server.js').Server;
const Users = require('./users.js').Users;
const db = require('./db.js');
const child_process = require('child_process');
const fs = require('fs');
const InfiniteGoAPI = require('./api.js');
const Goban = require('./goban.js').Goban;
const Stones = require('./stones.js').Stones;
const crypto = require('crypto');


const settings_filename = 'settings.json';
let settings;
try {
    settings = JSON.parse(fs.readFileSync(settings_filename));
} catch {
    settings = {db: {database: 'infinite-go'}};
}

if (settings.db.database == undefined) {
    settings.db.database = 'infinite-go';
    settings.db.host = 'localhost';
    settings.db.user = 'root';
}

const db_connection_url = db.make_connection_url(settings.db);
console.log(db_connection_url);
child_process.execSync(`psql -f setup_database.sql ${db_connection_url}`);

const db_connection_pool = new db.Pool(settings.db);

const users = new Users(db_connection_pool);

const default_viewport = {'top':10, 'right':9, 'bottom':-8, 'left':-7};

const stones = new Stones(db_connection_pool);

const goban = new Goban(stones);

const api = new InfiniteGoAPI(users, goban);

const session_secret = settings.session_secret || crypto.randomBytes(128).toString('base64');

const server = new Server({users:users, session_secret: session_secret, default_viewport:default_viewport, api: api});

server.listen(3000, () => console.log('Server running'));
