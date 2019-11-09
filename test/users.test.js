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

describe('Users', function() {
    let db_connection_pool;
    before(() => {
        db_connection_pool = new Pool({
            user: '',
            host: 'localhost',
            database: 'infinite-go-users-test',
        });
    });

    beforeEach(() => {
        child_process.execSync('psql -d infinite-go-users-test -f test/users.test.pre.sql');
    });

    describe('#get_by_id', function() {
        it('Should retrieve pre-created user with id 1', function(done) {
            const users = new Users(db_connection_pool);
            users.get_by_id(1, (err, user) => {
                if (err) {
                    return done(err);
                }
                if (users_equal(user, test_user_1)) {
                    return done();
                }
                return done('Didn\'t retrieve expected user.');
            });
        });
        it('Should retrieve pre-created user with id 2', (done) => {
            const users = new Users(db_connection_pool);
            users.get_by_id(2, (err, user) => {
                if (err) {
                    return done(err);
                }
                if (!users_equal(user, test_user_2)) {
                    return done('Didn\'t retrieve expected user.');
                }
                return done();
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

