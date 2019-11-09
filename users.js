class Users {

    constructor(db_connection_pool) {
        this.db_connection_pool = db_connection_pool;
    }

    create(user, cb) {
    }

    get_by_id(id, cb) {

        this.db_connection_pool
            .query(`SELECT * FROM USERS WHERE ID = ${id}`)
            .then((res) => {
                cb(null, res.rows[0]);
                console.log(res.rows[0]);
            });
    }

    get_by_username(username, cb) {
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
