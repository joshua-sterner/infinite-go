var Users = require('../users.js').Users;
var child_process = require('child_process');
const {Pool, Client} = require('pg');

test_user_1 = {
    'id': 1,
    'username': 'first_test_user',
    'email': 'nobody@nonexistant.tld',
    'password': 'pw1'
}
test_user_2 = {
    'id': 2,
    'username': 'second_test_user',
    'email': 'second@example.io',
    'password': 'pw2'
}

function users_equal(lhs, rhs) {
    return lhs.id === rhs.id &&
        lhs.username === rhs.username &&
        lhs.email === rhs.email &&
        lhs.password === rhs.password;
    //TODO viewport, date_joined
}

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
}

describe('Users', () => {
    let db_connection_pool;
    let users;
    before(() => {
        db_connection_pool = new Pool({
            user: '',
            host: 'localhost',
            database: 'infinite-go-users-test',
        });
    });

    beforeEach(() => {
        child_process.execSync('psql -d infinite-go-users-test -f test/users.test.pre.sql');
        users = new Users(db_connection_pool);
    });

    describe('#get_by_id', () => {
        it('Should retrieve pre-created user with id 1', (done) => {
            users.get_by_id(1, (err, user) => {
                if (users_equal(user, test_user_1)) {
                    return done();
                }
                return done('Didn\'t retrieve expected user.');
            });
        });
        it('Should retrieve pre-created user with id 2', (done) => {
            users.get_by_id(2, (err, user) => {
                if (!users_equal(user, test_user_2)) {
                    return done('Didn\'t retrieve expected user.');
                }
                return done();
            });
        });
        it('Should pass null to error parameter on successful retrieval', (done) => {
            users.get_by_id(1, (err, user) => {
                if (err === null) {
                    return done();
                }
                return done('err was not null');
            });
        });
        it('Should pass error on non-existent id', (done) => {
            users.get_by_id(123, (err, user) => {
                if (err instanceof Error) {
                    return done();
                }
                return done('Did not pass Error to callback.');
            });
        });
        it('Should pass error on query error', (done) => {
            let users = new Users(mock_throwing_db_connection_pool);
            users.get_by_id(1, (err, user) => {
                if (err instanceof Error) {
                    return done();
                }
                return done('Did not pass Error to callback.');
            });
        });
    });
    describe('#get_by_username', () => {
        it('Should retrieve pre-created user with username first_test_user', (done) => {
            users.get_by_username('first_test_user', (err, user) => {
                if (!users_equal(user, test_user_1)) {
                    return done('Didn\'t retrieve expected user.');
                }
                return done();
            });
        });
        it('Should pass null to error parameter on successful retrieval', (done) => {
            users.get_by_username('first_test_user', (err, user) => {
                if (err === null) {
                    return done();
                }
                return done('err was not null.');
            });
        });
        it('Should pass error on non-existent user', (done) => {
            users.get_by_username('nonexistent', (err, user) => {
                if (err instanceof Error) {
                    return done();
                }
                return done('Did not pass Error to callback.');
            });
        });
        it('Should pass error on query error', (done) => {
            let users = new Users(mock_throwing_db_connection_pool);
            users.get_by_username('first_test_user', (err, user) => {
                if (err instanceof Error) {
                    return done();
                }
                return done('Did not pass Error to callback.');
            });
        });
    });

    afterEach(() => {
        child_process.execSync('psql -d infinite-go-users-test -f test/users.test.post.sql');
    });

    after(() => {
        db_connection_pool.end();
    });
});

