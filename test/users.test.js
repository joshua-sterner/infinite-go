const Users = require('../users.js').Users;
const child_process = require('child_process');
const db = require('./test_db.js');

const test_user_1 = {
    'id': 1,
    'username': 'first_test_user',
    'email': 'nobody@nonexistant.tld',
    'password': 'pw1'
}
const test_user_2 = {
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

function expect_error_from_callback(obj, done) {
    if (obj instanceof Error) {
        return done();
    }
    return done('Did not pass Error to callback.');
}

describe('Users', () => {
    let db_connection_pool;
    let users;
    before(() => {
        db_connection_pool = new db.Pool(db.connection_settings);
    });

    beforeEach(() => {
        child_process.execSync(`psql ${db.connection_url} -f test/users.test.pre.sql`);
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
                expect_error_from_callback(err, done);
            });
        });
        it('Should pass error on query error', (done) => {
            let users = new Users(db.mock_throwing_pool);
            users.get_by_id(1, (err, user) => {
                expect_error_from_callback(err, done);
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
                expect_error_from_callback(err, done);
            });
        });
        it('Should pass error on query error', (done) => {
            let users = new Users(db.mock_throwing_pool);
            users.get_by_username('first_test_user', (err, user) => {
                expect_error_from_callback(err, done);
            });
        });
    });
    describe('#create', () => {
        let test_user = {
            'id': 123,
            'username': 'custom_id_user',
            'email': 'another@email.com',
            'password': 'this_is_a_password'
        };
        it('successfully creates user with custom id', (done) => {
            users.create(test_user, (err, id) => {
                users.get_by_id(test_user.id, (err, user) => {
                    if (users_equal(user, test_user)) {
                        return done();
                    }
                    return done('Created user does not match.');
                });
            });
                
        });
        it('successful creation of user with custom id passes provided id', (done) => {
            users.create(test_user, (err, id) => {
                if (id === test_user.id) {
                    return done();
                }
                return done('unexpected id');
            });
        });
        it('err is null on successful creation of user w/ custom id', (done) => {
            users.create(test_user, (err, id) => {
                if (err === null) {
                    return done();
                }
                return done('err is not null');
            });
        });
        it('successfully creates user without supplied id', (done) => {
            delete test_user.id;
            users.create(test_user, (err, id) => {
                users.get_by_username(test_user.username, (err, user) => {
                    // ignore missing id for this comparison
                    test_user.id = user.id;
                    if (users_equal(user, test_user)) {
                        return done();
                    }
                    return done('Created user does not match.');
                });
            });
        });
        it('successful creation of user without supplied id passes correct id', (done) => {
            delete test_user.id;
            users.create(test_user, (err, id) => {
                users.get_by_id(id, (err, user) => {
                    // ignore missing id for this comparison
                    test_user.id = user.id;
                    if (users_equal(user, test_user)) {
                        return done();
                    }
                    return done('Return user id does not match correct user.');
                });
            });
        });
        it('err is null on successful creation of user without supplied id', (done) => {
            users.create(test_user, (err, id) => {
                if (err === null) {
                    return done();
                }
                return done('err is not null');
            });
        });
        it('passes error when provided user id is not unique', (done) => {
            // user with id 1 already exists in test database
            test_user.id = 1;
            users.create(test_user, (err, id) => {
                expect_error_from_callback(err, done);
            });
        });
        describe('passes error when provided username is not unique', () => {
            it('user has custom id', (done) => {
                // test_user_1 already exists in db
                test_user.username = test_user_1.username;
                users.create(test_user, (err, id) => {
                    expect_error_from_callback(err, done);
                });
            });
            it('user does not have custom id', (done) => {
                delete test_user.id;
                // test_user_1 already exists in db
                test_user.username = test_user_1.username;
                users.create(test_user, (err, id) => {
                    expect_error_from_callback(err, done);
                });
            });
        });
        describe('passes error when provided email is not unique', () => {
            it('user has custom id', (done) => {
                // test_user_1 already exists in db
                test_user.email = test_user_1.email;
                users.create(test_user, (err, id) => {
                    expect_error_from_callback(err, done);
                });
            });
            it('user does not have custom id', (done) => {
                delete test_user.id;
                // test_user_1 already exists in db
                test_user.email = test_user_1.email;
                users.create(test_user, (err, id) => {
                    expect_error_from_callback(err, done);
                });
            });
        });
        it('passes error when username not provided', (done) => {
            delete test_user.username;
            users.create(test_user, (err, id) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when email not provided', (done) => {
            delete test_user.email;
            users.create(test_user, (err, id) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when password not provided', (done) => {
            delete test_user.password;
            users.create(test_user, (err, id) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error on query error', (done) => {
            let users = new Users(db.mock_throwing_pool);
            users.create(test_user, (err, id) => {
                expect_error_from_callback(err, done);
            });
        });
    });

    after(() => {
        db_connection_pool.end();
    });
});

