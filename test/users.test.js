const Users = require('../users.js').Users;
const child_process = require('child_process');
const db = require('./test_db.js');

const test_user_1 = {
    'id': 1,
    'username': 'first_test_user',
    'email': 'nobody@nonexistant.tld',
    'password': 'pw1',
    'viewport': {
        'top': 10,
        'right': 11,
        'bottom': 12,
        'left': 13
    }
}
const test_user_2 = {
    'id': 2,
    'username': 'second_test_user',
    'email': 'second@example.io',
    'password': 'pw2',
    'viewport': {
        'top': 6,
        'right': 11,
        'bottom': -6,
        'left': -11
    }
}

function users_equal(lhs, rhs) {
    return lhs.id === rhs.id &&
        lhs.username === rhs.username &&
        lhs.email === rhs.email &&
        lhs.password === rhs.password &&
        lhs.viewport && rhs.viewport &&
        lhs.viewport.top === rhs.viewport.top &&
        lhs.viewport.right === rhs.viewport.right &&
        lhs.viewport.bottom === rhs.viewport.bottom &&
        lhs.viewport.left === rhs.viewport.left;
    //TODO date_joined
}


//TODO date_joined tests

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
                console.log(user);
                console.log(test_user_1);
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
        let test_user;
        beforeEach(() => {
            test_user = {
                'id': 123,
                'username': 'custom_id_user',
                'email': 'another@email.com',
                'password': 'this_is_a_password',
                'viewport': {
                    'top': 1,
                    'right': 2,
                    'bottom': 3,
                    'left': 4
                }
            };
        });
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
        it('passes error when viewport not provided', (done) => {
            delete test_user.viewport;
            users.create(test_user, (err, id) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when viewport.top not provided', (done) => {
            delete test_user.viewport.top;
            users.create(test_user, (err, id) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when viewport.right not provided', (done) => {
            delete test_user.viewport.right;
            users.create(test_user, (err, id) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when viewport.bottom not provided', (done) => {
            delete test_user.viewport.bottom;
            users.create(test_user, (err, id) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when viewport.left not provided', (done) => {
            delete test_user.viewport.left;
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

    describe('#update', () => {
        let test_user;
        beforeEach(() => {
            test_user = {
                'id': 1,
                'username': 'updated_username',
                'email': 'updated@email.com',
                'password': 'updated_password',
                'viewport': {
                    'top': 1,
                    'right': 2,
                    'bottom': 3,
                    'left': 4
                }
            };
        });
        it('successfully updates user', (done) => {
            users.update(test_user, (err) => {
                users.get_by_id(1, (err, user) => {
                    if (users_equal(test_user, user)) {
                        return done();
                    }
                    return done('Failed to update user in db');
                });
            });
        });
        it('err null on successful update of user', (done) => {
            users.update(test_user, (err) => {
                if (err === null) {
                    return done();
                }
                return done('err is not null');
            });
        });
        it('passes error when id not provided', (done) => {
            delete test_user.id;
            users.update(test_user, (err) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when username not provided', (done) => {
            delete test_user.username;
            users.update(test_user, (err) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when email not provided', (done) => {
            delete test_user.email;
            users.update(test_user, (err) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when password not provided', (done) => {
            delete test_user.password;
            users.update(test_user, (err) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when viewport not provided', (done) => {
            delete test_user.viewport;
            users.update(test_user, (err) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when viewport.top not provided', (done) => {
            delete test_user.viewport.top;
            users.update(test_user, (err) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when viewport.right not provided', (done) => {
            delete test_user.viewport.right;
            users.update(test_user, (err) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when viewport.bottom not provided', (done) => {
            delete test_user.viewport.bottom;
            users.update(test_user, (err) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when viewport.left not provided', (done) => {
            delete test_user.viewport.left;
            users.update(test_user, (err) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error when user doesn\'t exist in db', (done) => {
            test_user.id = 123;
            users.update(test_user, (err) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error on query error', (done) => {
            let users = new Users(db.mock_throwing_pool);
            users.update(test_user, (err) => {
                expect_error_from_callback(err, done);
            });
        });
    });
    describe('#delete_by_id', () => {
        it('successfully deletes user from db', (done) => {
            users.delete_by_id(1, (err) => {
                users.get_by_id(1, (err, user) => {
                    expect_error_from_callback(err, done);
                });
            });
        });
        it('err is null on successful deletion of user', (done) => {
            users.delete_by_id(1, (err) => {
                if (err === null) {
                    return done();
                }
                return done('err is not null');
            });
        });
        it('passes error on invalid id', (done) => {
            users.delete_by_id(123, (err) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error on query error', (done) => {
            let users = new Users(db.mock_throwing_pool);
            users.delete_by_id(1, (err) => {
                expect_error_from_callback(err, done);
            });
        });
    });
    describe('#delete_by_username', () => {
        it('successfully deletes user from db', (done) => {
            users.delete_by_username(test_user_1.username, (err) => {
                users.get_by_username(test_user_1.username, (err, user) => {
                    expect_error_from_callback(err, done);
                });
            });
        });
        it('err is null on successful deletion of user', (done) => {
            users.delete_by_username(test_user_1.username, (err) => {
                if (err === null) {
                    return done();
                }
                return done('err is not null');
            });
        });
        it('passes error on invalid username', (done) => {
            users.delete_by_username('non_existant_username', (err) => {
                expect_error_from_callback(err, done);
            });
        });
        it('passes error on query error', (done) => {
            let users = new Users(db.mock_throwing_pool);
            users.delete_by_username(test_user_1.username, (err) => {
                expect_error_from_callback(err, done);
            });
        });
    });
    after(() => {
        db_connection_pool.end();
    });
});

//TODO abstract test for error on missing value
