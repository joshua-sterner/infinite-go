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
            .query(`SELECT * FROM users WHERE id = ${id}`)
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
            .query(`SELECT * FROM users WHERE username = \'${username}\'`)
            .then((res) => {
                if (res.rows.length == 0) {
                    return cb(new Error(`User with username ${username} does not exist in database`), null);
                }
                cb(null, res.rows[0]);
            })
            .catch(err => cb(err, null));
    }

    update(user, cb) {
    }

    delete_by_id(id, cb) {
    }

    delete_by_username(username, cb) {
    }

}

function is_valid_user_create(user) {
    console.log("is_valid_user_create");
}

module.exports = {'Users': Users};
