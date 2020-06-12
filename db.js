const {Pool, Client} = require('pg');

//TODO Test this...

/**
 * Creates a postgres connection url from the database connection setttings.
 *
 * @param db_connection_settings
 */
function make_connection_url(db_connection_settings) {
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

module.exports = {};
module.exports.Pool = Pool;
module.exports.Client = Client;
module.exports.make_connection_url = make_connection_url;
