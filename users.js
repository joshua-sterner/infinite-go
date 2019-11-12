class Users {

    constructor(db_connection_pool) {
        this.db_connection_pool = db_connection_pool;
    }

    create(user, cb) {
        if (user.id) {
            this.db_connection_pool
                .query('INSERT INTO users (id, username, email, password) VALUES ($1, $2, $3, $4)', [user.id, user.username, user.email, user.password])
                .then((res) => {
                    cb(null, user.id);
                })
                .catch(err => cb(err, null));
        } else {
            this.db_connection_pool
                .query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id', [user.username, user.email, user.password])
                .then((res) => {
                    cb(null, res.rows[0].id);
                })
                .catch(err => cb(err, null));
        }
    }

    get_by_id(id, cb) {

        this.db_connection_pool
            .query('SELECT * FROM users WHERE id=$1', [id])
            .then((res) => {
                if (res.rows.length == 0) {
                    return cb(new Error(`User with id ${id} does not exist in database`), null);
                }
                cb(null, res.rows[0]);
            })
            .catch(err => cb(err, null));
    }

    get_by_username(username, cb) {
        this.db_connection_pool
            .query('SELECT * FROM users WHERE username=$1', [username])
            .then((res) => {
                if (res.rows.length == 0) {
                    return cb(new Error(`User with username ${username} does not exist in database`), null);
                }
                cb(null, res.rows[0]);
            })
            .catch(err => cb(err, null));
    }

    update(user, cb) {
        this.db_connection_pool
            .query('UPDATE users SET username=$2, email=$3, password=$4 WHERE id=$1', [user.id, user.username, user.email, user.password])
            .then((res) => {
                if (res.rowCount == 1) {
                    return cb(null);
                }
                return cb(new Error('Failed to update user'));
            })
            .catch(err => cb(err, null));
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
            .catch(err => cb(err, null));
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
            .catch(err => cb(err, null));
    }

}

module.exports = {'Users': Users};
