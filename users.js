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

class Users {

    constructor(db_connection_pool) {
        this.db_connection_pool = db_connection_pool;
    }

    create(user, cb) {
        if (!user.viewport) {
            cb(new Error('user.viewport not provided'), null);
        }
        let date_created = user.date_created;
        if (!user.date_created) {
            date_created = (new Date()).toJSON();
        }
        if (user.id) {
            this.db_connection_pool
                .query('INSERT INTO users (id, username, email, password, date_created, viewport_top, viewport_right, viewport_bottom, viewport_left) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [user.id, user.username, user.email, user.password, date_created, user.viewport.top, user.viewport.right, user.viewport.bottom, user.viewport.left])
                .then((res) => {
                    cb(null, user.id);
                })
                .catch(err => cb(err, null));
        } else {
            this.db_connection_pool
                .query('INSERT INTO users (username, email, password, date_created, viewport_top, viewport_right, viewport_bottom, viewport_left) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [user.username, user.email, user.password, date_created, user.viewport.top, user.viewport.right, user.viewport.bottom, user.viewport.left])
                .then((res) => {
                    return cb(null, res.rows[0].id);
                })
                .catch(err => cb(err, null));
        }
    }

    get_by_id(id, cb) {

        this.db_connection_pool
            .query('SELECT id, username, password, email, to_char(date_created, \'YYYY-MM-DD"T"HH24:MI:SS.MSZ\') AS date_created, viewport_top, viewport_right, viewport_bottom, viewport_left FROM users WHERE id=$1', [id])
            .then((res) => {
                if (res.rows.length == 0) {
                    return cb(new Error(`User with id ${id} does not exist in database`), null);
                }
               cb(null, db_user_to_user(res.rows[0]));
            })
            .catch(err => cb(err, null));
    }

    get_by_username(username, cb) {
        this.db_connection_pool
            .query('SELECT id, username, password, email, to_char(date_created, \'YYYY-MM-DD"T"HH24:MI:SS.MSZ\') AS date_created, viewport_top, viewport_right, viewport_bottom, viewport_left FROM users WHERE username=$1', [username])
            .then((res) => {
                if (res.rows.length == 0) {
                    return cb(new Error(`User with username ${username} does not exist in database`), null);
                }
                cb(null, db_user_to_user(res.rows[0]));
            })
            .catch(err => cb(err, null));
    }

    update(user, cb) {
        if (!user.viewport) {
            cb(new Error('user.viewport not provided'), null);
        }
        this.db_connection_pool
            .query('UPDATE users SET username=$2, email=$3, password=$4, date_created=$5, viewport_top=$6, viewport_right=$7, viewport_bottom=$8, viewport_left=$9 WHERE id=$1', [user.id, user.username, user.email, user.password, user.date_created, user.viewport.top, user.viewport.right, user.viewport.bottom, user.viewport.left])
            .then((res) => {
                if (res.rowCount == 1) {
                    return cb(null);
                }
                return cb(new Error('Failed to update user'));
            })
            .catch(err => cb(err));
    }

    delete_by_id(id, cb) {
        this.db_connection_pool
            .query('DELETE FROM users WHERE id=$1', [id])
            .then((res) => {
                if (res.rowCount == 1) {
                    return cb(null);
                }
                return cb(new Error('Failed to delete user'));
            })
            .catch(err => cb(err));
    }

    delete_by_username(username, cb) {
        this.db_connection_pool
            .query('DELETE FROM users WHERE username=$1', [username])
            .then((res) => {
                if (res.rowCount == 1) {
                    return cb(null);
                }
                return cb(new Error('Failed to delete user.'));
            })
            .catch(err => cb(err));
    }

}

module.exports = {'Users': Users};
