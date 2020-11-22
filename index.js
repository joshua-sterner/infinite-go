const Server = require('./server.js').Server;
const Users = require('./users.js').Users;
const db = require('./db.js');
const child_process = require('child_process');
const fs = require('fs');
const InfiniteGoAPI = require('./api.js');
const Goban = require('./goban.js').Goban;
const Stones = require('./stones.js').Stones;


//TODO rewrite this...
const db_connection_settings_filename = 'test/test_db_connection.json';
const db_connection_settings = JSON.parse(fs.readFileSync(db_connection_settings_filename));
const db_connection_url = db.make_connection_url(db_connection_settings);
console.log(db_connection_url);
child_process.execSync(`psql -f test/users.test.pre.sql ${db_connection_url}`);

const db_connection_pool = new db.Pool(db_connection_settings);

const users = new Users(db_connection_pool);

const default_viewport = {'top':10, 'right':9, 'bottom':-8, 'left':-7};

const stones = new Stones(db_connection_pool);

const goban = new Goban(stones);

const api = new InfiniteGoAPI(users, goban);

const server = new Server({users:users, session_secret:'test session secret', default_viewport:default_viewport, api: api});

server.listen(3000, () => console.log('Server running'));
