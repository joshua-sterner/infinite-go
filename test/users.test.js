const Users = require('../users.js').Users;
const child_process = require('child_process');
const db = require('./test_db.js');
const assert = require('assert');

const test_user_1 = {
    'id': 1,
    'username': 'first_test_user',
    'email': 'nobody@nonexistant.tld',
    'password': 'pw1',
    'date_created': '2019-11-13T15:13:12.345Z',
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
    'date_created': '2012-01-23T12:34:56.789Z',
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
        lhs.date_created === rhs.date_created &&
        lhs.viewport && rhs.viewport &&
        lhs.viewport.top === rhs.viewport.top &&
        lhs.viewport.right === rhs.viewport.right &&
        lhs.viewport.bottom === rhs.viewport.bottom &&
        lhs.viewport.left === rhs.viewport.left;
}

function timestamps_equal(lhs, rhs) {
    const max_time_delta = 4; // milliseconds
    const ms_lhs = new Date(lhs).getTime();
    const ms_rhs = new Date(rhs).getTime();
    const time_delta = Math.abs(ms_lhs - ms_rhs);
    return time_delta < max_time_delta;
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
        it('Should retrieve pre-created user with id 1', async function() {
            const user = await users.get_by_id(1);
            await assert(users_equal(user, test_user_1));
        });
        it('Should retrieve pre-created user with id 2', async function() {
            const user = await users.get_by_id(2);
            await assert(users_equal(user, test_user_2));
        });
        it('Should resolve to null on non-existent id', async function() {
            const user = await users.get_by_id(123);
            assert(user === null);
        });
        it('Should reject on query error', async function() {
            let users = new Users(db.mock_throwing_pool);
            await assert.rejects(async function() {
                await users.get_by_id(1);
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
        it('Should pass null error and user on non-existent user', (done) => {
            users.get_by_username('nonexistent', (err, user) => {
                if (err === null && user === null) {
                    return done();
                }
                return done('err and user must be null.');
            });
        });
        it('Should pass error on query error', (done) => {
            let users = new Users(db.mock_throwing_pool);
            users.get_by_username('first_test_user', (err, user) => {
                expect_error_from_callback(err, done);
            });
        });
        it('Should pass null to user parameter on query error', (done) => {
            let users = new Users(db.mock_throwing_pool);
            users.get_by_username(test_user_1.username, (err, user) => {
                if (user === null) {
                    return done();
                }
                return done('user must be null.');
            });
        });
    });
    describe('#get_by_email', () => {
        it('Should retrieve pre-created user', (done) => {
            users.get_by_email(test_user_1.email, (err, user) => {
                if (!users_equal(user, test_user_1)) {
                    return done('Didn\'t retrieve expected user.');
                }
                return done();
            });
        });
        it('Should pass null to error parameter on successful retrieval', (done) => {
            users.get_by_email(test_user_1.email, (err, user) => {
                if (err === null) {
                    return done();
                }
                return done('err must be null.');
            });
        });
        it('Should pass null error and user on non-existent user', (done) => {
            users.get_by_email('nonexistent', (err, user) => {
                if (err === null && user === null) {
                    return done();
                }
                return done('err and user must be null.');
            });
        });
        it('Should pass error on query error', (done) => {
            let users = new Users(db.mock_throwing_pool);
            users.get_by_email(test_user_1.email, (err, user) => {
                expect_error_from_callback(err, done);
            });
        });
        it('Should pass null to user parameter on query error', (done) => {
            let users = new Users(db.mock_throwing_pool);
            users.get_by_email(test_user_1.email, (err, user) => {
                if (user === null) {
                    return done();
                }
                return done('user must be null.');
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
                'date_created': '4321-01-23T12:34:56.789Z',
                'viewport': {
                    'top': 1,
                    'right': 2,
                    'bottom': 3,
                    'left': 4
                }
            };
        });
        it('successfully creates user with custom id', async function() {
            const id = await users.create(test_user);
            const user = await users.get_by_id(test_user.id);
            assert(users_equal(user, test_user));
        });
        it('successful creation of user with custom id returns provided id', async function() {
            const id = await users.create(test_user);
            if (id !== test_user.id) {
                throw new Error('unexpected id');
            }
        });
        it('successfully creates user without supplied id', async function() {
            delete test_user.id;
            const id = await users.create(test_user);
            return new Promise((resolve, reject) => {
                users.get_by_username(test_user.username, (err, user) => {
                    // ignore missing id for this comparison
                    test_user.id = user.id;
                    if (!users_equal(user, test_user)) {
                        return reject(new Error('Created user does not match.'));
                    }
                    resolve();
                });
            });
        });
        it('successful creation of user without supplied id returns correct id', async function() {
            delete test_user.id;
            const id = await users.create(test_user);
            const user = await users.get_by_id(id);
            test_user.id = user.id;
            assert(users_equal(user, test_user));
        });
        it('successful creation of user without supplied date_created', async function() {
            delete test_user.date_created;
            const id = await users.create(test_user);
            const user = await users.get_by_id(id);
            test_user.date_created = user.date_created;
            assert(users_equal(user, test_user));
        });
        it('user created without supplied date_created uses current time when id provided', async function() {
            delete test_user.date_created;
            const now = new Date();
            const id = await users.create(test_user);
            const user = await users.get_by_id(id);
            assert(timestamps_equal(user.date_created, now.toJSON()));
        });
        it('user created without supplied date_created uses current time when id not provided', async function() {
            delete test_user.id;
            delete test_user.date_created;
            const now = new Date();
            const id = await users.create(test_user);
            const user = await users.get_by_id(id);
            assert(timestamps_equal(user.date_created, now.toJSON()));
        });
        it('rejects when provided user id is not unique', async function() {
            // user with id 1 already exists in test database
            test_user.id = 1;
            await assert.rejects(async function() {
                await users.create(test_user);
            });
        });
        describe('rejects when provided username is not unique', () => {
            it('user has custom id', async function() {
                // test_user_1 already exists in db
                test_user.username = test_user_1.username;
                await assert.rejects(async function() {
                    await users.create(test_user);
                });
            });
            it('user does not have custom id', async function() {
                delete test_user.id;
                // test_user_1 already exists in db
                test_user.username = test_user_1.username;
                await assert.rejects(async function() {
                    await users.create(test_user);
                });
            });
        });
        describe('rejects when provided email is not unique', () => {
            it('user has custom id', async function() {
                // test_user_1 already exists in db
                test_user.email = test_user_1.email;
                await assert.rejects(async function() {
                    await users.create(test_user);
                });
            });
            it('user does not have custom id', async function() {
                delete test_user.id;
                // test_user_1 already exists in db
                test_user.email = test_user_1.email;
                await assert.rejects(async function() {
                    await users.create(test_user);
                });
            });
        });
        ['username', 'email', 'password', 'viewport',
        'viewport.top', 'viewport.right', 'viewport.left',
        'viewport.bottom'].forEach((field) => {
            it(`rejects when ${field} not provided`, async function() {
                eval('delete test_user.'+field);
                await assert.rejects(async function() {
                    await users.create(test_user);
                });
            });
        });
        it('rejects on query error', async function() {
            let users = new Users(db.mock_throwing_pool);
            await assert.rejects(async function() {
                await users.create(test_user);
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
                'date_created': '4321-01-23T12:34:56.789Z',
                'viewport': {
                    'top': 1,
                    'right': 2,
                    'bottom': 3,
                    'left': 4
                }
            };
        });
        it('successfully updates user when date_created is provided', (done) => {
            users.update(test_user, (err) => {
                users.get_by_id(1).then((user) => {
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
        ['id', 'username', 'email', 'password', 'date_created', 'viewport',
        'viewport.top', 'viewport.right', 'viewport.left',
        'viewport.bottom'].forEach((field) => {
            it(`passes error when ${field} not provided`, (done) => {
                eval('delete test_user.'+field);
                users.update(test_user, err => expect_error_from_callback(err, done));
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
                users.get_by_id(1).then((user) => {
                    if (user === null) {
                        return done();
                    }
                    return done('user not removed from db');
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
                    if (user === null) {
                        return done();
                    }
                    return done('user not removed from db.');
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
