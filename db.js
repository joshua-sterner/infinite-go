const {Pool, Client} = require('pg');

/**
 * Database Connection Settings Definition
 *
 * @typedef {object} DBConnectionSettings
 * @property {string} database The name of the database.
 * @property {string} [user] The name of the database user.
 * @property {string} [password] The password for the database account.
 * @property {string} [host] The hostname of the database server.
 * @property {number} [port] The port the database is on.
 */

/**
 * Creates a postgres connection url from the database connection setttings.
 *
 * @param {DBConnectionSettings} db_connection_settings The details required to
 * log in to the database.
 * @returns {string} A url for the postgres server.
 */
function make_connection_url(db_connection_settings) {
    if (!db_connection_settings.database) {
        throw new Error('database field is required in DBConnectionSettings');
    }
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
    url += '/' + db_connection_settings.database;
    return url;
}

module.exports = {};
module.exports.Pool = Pool;
module.exports.Client = Client;
module.exports.make_connection_url = make_connection_url;
