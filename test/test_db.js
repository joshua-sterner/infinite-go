const fs = require('fs');
const {Pool, Client} = require('pg');

// Connection information for the test database.
// Valid fields: user, host, database, password, port.
// Omission of a field will result in the use of the default value for that field.
db_connection_settings_filename = 'test/test_db_connection.json';

const db_connection_settings = JSON.parse(fs.readFileSync(db_connection_settings_filename));

/**
 * @param db_connection_settings
 */
function make_db_connection_url(db_connection_settings) {
    let url = 'postgresql://';
    if (db_connection_settings.user) { 
        url += db_connection_settings.user;
    }
    if (db_connection_settings.password) {
        url += ':' + db_connection_settings.password;
    }
    if (db_connection_settings.host) {
        url += '@' + db_connection_settings.host;
    }
    if (db_connection_settings.port) {
        url += ':' + db_connection_settings.port;
    }
    if (!db_connection_settings.database) {
        throw new Error(`database field is required in ${db_connection_settings_filename}`);
    }
    url += '/' + db_connection_settings.database;
    return url;
}

const db_connection_url = make_db_connection_url(db_connection_settings);

const mock_throwing_db_connection_pool = {};
mock_throwing_db_connection_pool.query = () => {
    const err = new Error('Could not complete query.');
    if (arguments.length == 0 || typeof(arguments[arguments.length-1]) != 'function') {
        return new Promise((resolve, reject) => {
            reject(err);
        });
    } else {
        const callback = arguments[arguments.length-1];
        callback(err, null);
    }
};

module.exports = {};
module.exports.Pool = Pool;
module.exports.Client = Client;
module.exports.connection_settings = db_connection_settings;
module.exports.connection_url = db_connection_url;
module.exports.mock_throwing_pool = mock_throwing_db_connection_pool;
