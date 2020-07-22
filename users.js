/**
 * @typedef {object} Viewport
 * @property {number} top - The y coordinate of the top-most visible row of the
 * viewport (y axis is positive down).
 * @property {number} bottom - The y coordinate of the bottom visible row of the
 * viewport (y axis is positive down).
 * @property {number} left - The x coordinate of the left visible column of the
 * viewport.
 * @property {number} right - The x coordinate of the right visible column of
 * the viewport.
 */

/**
 * @typedef {object} User
 * @property {number} id - The user's account id.
 * @property {string} username - The user's username.
 * @property {string} email - The users's email address.
 * @property {string} password - The bcrypt-hashed password for this user account.
 * @property {string} date_created - The date the user account was created.
 * @property {Viewport} viewport - The active viewport of this user.
 */

/**
 * @param {object} db_user The user object as returned by a database query.
 * @returns {User} The user object in a more organized format.
 */
function db_user_to_user(db_user) {
    var user = {};
    user.id = db_user.id;
    user.username = db_user.username;
    user.email = db_user.email;
    user.password = db_user.password;
    user.date_created = db_user.date_created;
    user.viewport = {};
    user.viewport.top = db_user.viewport_top;
    user.viewport.right = db_user.viewport_right;
    user.viewport.bottom = db_user.viewport_bottom;
    user.viewport.left = db_user.viewport_left;
    return user;
}

//TODO db creation

/**
 * Retrieves and stores user account data to/from the database.
 *
 */
class Users {

    constructor(db_connection_pool) {
        //TODO Users.MAX_USERNAME_LENGTH should be defined in one place
        this.MAX_USERNAME_LENGTH = 127;
        this.db_connection_pool = db_connection_pool;
    }

    create(user) {
        return new Promise((resolve, reject) => {
            if (!user.viewport) {
                reject(new Error('user.viewport not provided'));
            }
            let date_created = user.date_created;
            if (!user.date_created) {
                date_created = (new Date()).toJSON();
            }
            if (user.id) {
                this.db_connection_pool
                    .query('INSERT INTO users (id, username, email, password, date_created, viewport_top, viewport_right, viewport_bottom, viewport_left) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [user.id, user.username, user.email, user.password, date_created, user.viewport.top, user.viewport.right, user.viewport.bottom, user.viewport.left])
                    .then(() => {
                        return resolve(user.id);
                    })
                    .catch(err => reject(err));
            } else {
                this.db_connection_pool
                    .query('INSERT INTO users (username, email, password, date_created, viewport_top, viewport_right, viewport_bottom, viewport_left) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [user.username, user.email, user.password, date_created, user.viewport.top, user.viewport.right, user.viewport.bottom, user.viewport.left])
                    .then((res) => {
                        return resolve(res.rows[0].id);
                    })
                    .catch(err => reject(err, null));
            }
        });
    }

    get_by_id(id) {
        return new Promise((resolve, reject) => {
            this.db_connection_pool
                .query('SELECT id, username, password, email, to_char(date_created, \'YYYY-MM-DD"T"HH24:MI:SS.MSZ\') AS date_created, viewport_top, viewport_right, viewport_bottom, viewport_left FROM users WHERE id=$1', [id])
                .then((res) => {
                    if (res.rows.length == 0) {
                        return resolve(null);
                    }
                    resolve(db_user_to_user(res.rows[0]));
                })
                .catch(err => reject(err));
        });
    }

    get_by_username(username) {
        return new Promise((resolve, reject) => {
            this.db_connection_pool
                .query('SELECT id, username, password, email, to_char(date_created, \'YYYY-MM-DD"T"HH24:MI:SS.MSZ\') AS date_created, viewport_top, viewport_right, viewport_bottom, viewport_left FROM users WHERE username=$1', [username])
                .then((res) => {
                    if (res.rows.length == 0) {
                        return resolve(null);
                    }
                    resolve(db_user_to_user(res.rows[0]));
                })
                .catch(err => reject(err));
        });
    }

    get_by_email(email) {
        return new Promise((resolve, reject) => {
            this.db_connection_pool
                .query('SELECT id, username, password, email, to_char(date_created, \'YYYY-MM-DD"T"HH24:MI:SS.MSZ\') AS date_created, viewport_top, viewport_right, viewport_bottom, viewport_left FROM users WHERE email=$1', [email])
                .then((res) => {
                    if (res.rows.length == 0) {
                        return resolve(null);
                    }
                    return resolve(db_user_to_user(res.rows[0]));
                })
                .catch(err => reject(err));
        });
    }

    update(user) {
        return new Promise((resolve, reject) => {
            if (!user.viewport) {
                return reject(new Error('user.viewport not provided'));
            }
            this.db_connection_pool
                .query('UPDATE users SET username=$2, email=$3, password=$4, date_created=$5, viewport_top=$6, viewport_right=$7, viewport_bottom=$8, viewport_left=$9 WHERE id=$1', [user.id, user.username, user.email, user.password, user.date_created, user.viewport.top, user.viewport.right, user.viewport.bottom, user.viewport.left])
                .then((res) => {
                    if (res.rowCount == 1) {
                        return resolve();
                    }
                    return reject(new Error('Failed to update user'));
                })
                .catch(err => reject(err));
        });
    }

    delete_by_id(id) {
        return new Promise((resolve, reject) => {
            this.db_connection_pool
                .query('DELETE FROM users WHERE id=$1', [id])
                .then((res) => {
                    if (res.rowCount == 1) {
                        return resolve();
                    }
                    return reject(new Error('Failed to delete user'));
                })
                .catch(err => reject(err));
        });
    }

    delete_by_username(username) {
        return new Promise((resolve, reject) => {
            this.db_connection_pool
                .query('DELETE FROM users WHERE username=$1', [username])
                .then((res) => {
                    if (res.rowCount == 1) {
                        return resolve();
                    }
                    return reject(new Error('Failed to delete user.'));
                })
                .catch(err => reject(err));
        });
    }

    async username_taken(username) {
        const user = await this.get_by_username(username);
        return (user !== null);
    }

    async email_taken(email) {
        const user = await this.get_by_email(email);
        return (user !== null);
    }

}

module.exports = {'Users': Users};
