const Server = require('./server.js').Server;
const Users = require('./users.js').Users;
const db = require('./db.js');
const child_process = require('child_process');
const fs = require('fs');


//TODO rewrite this...
const db_connection_settings_filename = 'test/test_db_connection.json';
const db_connection_settings = JSON.parse(fs.readFileSync(db_connection_settings_filename));
const db_connection_url = db.make_connection_url(db_connection_settings);
console.log(db_connection_url);
child_process.execSync(`psql ${db_connection_url} -f test/users.test.pre.sql`);

const db_connection_pool = new db.Pool(db_connection_settings);

const users = new Users(db_connection_pool);

const default_viewport = {'top':10, 'right':9, 'bottom':-8, 'left':-7};

const server = new Server({users:users, session_secret:'test session secret', default_viewport:default_viewport});

server.app.listen(3000, () => console.log('Server running'));