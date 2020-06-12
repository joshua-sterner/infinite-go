const request = require('supertest');
const Server = require('../server.js').Server;
const bcrypt = require('bcrypt');
const assert = require('assert');
const test_user_1 = {
    'id': 1,
    'username': 'first_user',
    'email': 'nobody@nonexistant.tld',
    'unencrypted_password': 'pw1',
    'password': bcrypt.hashSync('pw1', 10),
    'date_created': '2019-11-13T15:13:12.345Z',
    'viewport': {
        'top': 10,
        'right': 11,
        'bottom': 12,
        'left': 13
    }
};
const test_user_2 = {
    'id': 2,
    'username': 'second_user',
    'email': 'second@example.io',
    'unencrypted_password': 'pw2',
    'password': bcrypt.hashSync('pw2', 10),
    'date_created': '2012-01-23T12:34:56.789Z',
    'viewport': {
        'top': 6,
        'right': 11,
        'bottom': -6,
        'left': -11
    }
};

class MockUsers {
    constructor() {
        this.MAX_USERNAME_LENGTH = 127;
        this.user_1 = test_user_1;
        this.user_2 = test_user_2;
        this.users_passed_to_create = [];
    }

    create(user) {
        return new Promise((resolve, reject) => {
            if (this._create_error) {
                return reject(this._create_error);
            }
            this.users_passed_to_create.push(user);
            resolve(this.users_passed_to_create.length + 2);
        });
    }

    pass_error_from_get_by_username(should_pass_error) {
        let error = null;
        if (should_pass_error) {
            error = new Error('some db error');
        }
        this._get_by_username_error = error;
    }

    pass_error_from_get_by_email(should_pass_error) {
        let error = null;
        if (should_pass_error) {
            error = new Error('some db error');
        }
        this._get_by_email_error = error;
    }

    pass_error_from_create(should_pass_error) {
        let error = null;
        if (should_pass_error) {
            error = new Error('some db error');
        }
        this._create_error = error;
    }

    get_by_username(username) {
        return new Promise((resolve, reject) => {
            if (this._get_by_username_error) {
                return reject(this._get_by_username_error);
            }
            if (username == 'first_user') {
                return resolve(this.user_1);
            } else if (username == 'second_user') {
                return resolve(this.user_2);
            }
            return resolve(null);
        });
    }

    get_by_id(id) {
        return new Promise((resolve) => {
            if (id == 1) {
                return resolve(this.user_1);
            }
            if (id == 2) {
                return resolve(this.user_2);
            }
            let user = this.users_passed_to_create[0];
            if (user && id == user.id) {
                return resolve(user);
            }
            return resolve(null);
        });
    }
    get_by_email(email) {
        return new Promise((resolve, reject) => {
            if (this._get_by_email_error) {
                return reject(this._get_by_email_error);
            }
            if (email == this.user_1.email) {
                return resolve(this.user_1);
            }
            if (email == this.user_2.email) {
                return resolve(this.user_2);
            }
            return resolve(null);
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

describe('Server', () => {

    let users;
    let server;
    const default_viewport = {'top':10, 'right':9, 'bottom':-8, 'left':-7};
    beforeEach(() => {
        users = new MockUsers();
        server = new Server({users:users, session_secret:'test session secret', default_viewport:default_viewport});
    });

    describe('Server Constructor', () => {
        it('throws when called without users object', () => {
            assert.throws(() => {
                new Server({session_secret:'test session secret',
                    default_viewport:default_viewport});
            });
        });
        it('throws when called without session_secret', () => {
            assert.throws(() => {
                new Server({users:users, default_viewport:default_viewport});
            });
        });
        it('throws when called without default_viewport', () => {
            assert.throws(() => {
                new Server({users:users, session_secret:'test session secret'});
            });
        });
    });

    const make_authenticated_agent = (user, cb) => {
        const agent = request.agent(server.app);
        agent
            .post('/login')
            .type('form')
            .send({'username':user.username, 'password':user.unencrypted_password})
            .end((err) => {
                cb(err, agent);
            });
    };

    describe('GET /', () => {
        it('whlle not authenticated returns HTTP 302 to /login', (done) => {
            request(server.app)
                .get('/')
                .set('Cookie', [])
                .expect(302)
                .expect('Location', '/login', done);
        });
        it('while authenticated returns HTTP 200', (done) => {
            make_authenticated_agent(users.user_1, (err, agent) => {
                agent
                    .get('/')
                    .expect(200, done);
            });
        });
    });

    describe('GET /login', () => {
        it('returns HTTP 200', (done) => {
            request(server.app)
                .get('/login')
                .expect(200, done);
        });
    });

    describe('POST /login', () => {
        it('with invalid username returns HTTP 403', (done) => {
            request(server.app)
                .post('/login')
                .type('form')
                .send({'username': 'nobody', 'password':'pw1'})
                .expect(403, done);
        });
        it('with invalid password returns HTTP 403', (done) => {
            request(server.app)
                .post('/login')
                .type('form')
                .send({'username': 'first_user', 'password':'wrong'})
                .expect(403, done);
        });
        it('with valid credentials returns HTTP 302 to /', (done) => {
            request(server.app)
                .post('/login')
                .type('form')
                .send({'username':users.user_1.username, 'password':users.user_1.unencrypted_password})
                .expect(302)
                .expect('Location', '/', done);
        });
        it('when db error occurs returns HTTP 500', (done) => {
            users.pass_error_from_get_by_username(true);
            users.pass_error_from_get_by_email(true);
            request(server.app)
                .post('/login')
                .type('form')
                .send({'username':users.user_1.username, 'password':users.user_1.unencrypted_password})
                .expect(500, done);
        });
    });

    describe('GET /register', () => {
        it('returns HTTP 200', (done) => {
            request(server.app)
                .get('/register')
                .expect(200, done);
        });
    });
    
    describe('POST /register', () => {
        it('with valid account info returns HTTP 302 to /', (done) => {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .expect(302)
                .expect('Location', '/', done);
        });
        it('with valid account info authenticates user', (done) => {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .end((err, res) => {
                    request(server.app)
                        .get('/')
                        .set('Cookie', res.headers['set-cookie'])
                        .expect(200, done);
                });
        });
        it('with valid account info creates user in db', (done) => {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .end(() => {
                    const created_users = users.users_passed_to_create;
                    if (created_users.length != 1) {
                        return done(`registration created ${created_users.length} users`);
                    }
                    return done();
                });
        });
        it('with valid account info creates user with correct username', (done) => {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .end(() => {
                    const user = users.users_passed_to_create[0];
                    if (user.username == 'new_user') {
                        return done();
                    }
                    return done(new Error('username mismatch'));
                });
        });
        it('with valid account info creates user with correct email', (done) => {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .end(() => {
                    const user = users.users_passed_to_create[0];
                    if (user.email == 'new@user.com') {
                        return done();
                    }
                    return done(new Error('email mismatch'));
                });
        });
        it('with valid account info creates user with correct viewport', (done) => {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .end(() => {
                    const user = users.users_passed_to_create[0];
                    if (user.viewport &&
                        user.viewport.top == default_viewport.top &&
                        user.viewport.right == default_viewport.right &&
                        user.viewport.bottom == default_viewport.bottom &&
                        user.viewport.left == default_viewport.left) {
                        return done();
                    }
                    return done(new Error(`invalid viewport: ${user.viewport}`));
                });
        });
        it('with valid accout info stores password using bcrypt', (done) => {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .end(() => {
                    const user = users.users_passed_to_create[0];
                    if (user.password.substr(0,4) != '$2b$') {
                        return done(new Error('password not stored as valid bcrypt string'));
                    }
                    const cost_factor = user.password.substr(4).split('$')[0];
                    const salt = user.password.substr(4).split('$')[1].substr(0,22);
                    bcrypt.hash('new_pw', '$2b$'+cost_factor+'$'+salt, (err, hash) => {
                        if (user.password == hash) {
                            return done();
                        }
                        return done(new Error('Failed to validate bcrypt password'));
                    });
                });
        });
        it('returns HTTP 302 to / when username is max length', (done) => {
            let username = 'a'.repeat(users.MAX_USERNAME_LENGTH);
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':username , 'password':'new_pw', 'email':'new@user.com'})
                .expect(302)
                .expect('Location', '/', done);
        });
        it('returns HTTP 400 when username one character too long', (done) => {
            let username = 'a'.repeat(users.MAX_USERNAME_LENGTH+1);
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':username , 'password':'new_pw', 'email':'new@user.com'})
                .expect(400, done);
        });
        it('with missing username returns HTTP 400', (done) => {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'password':'new_pw', 'email':'new@user.com'})
                .expect(400, done);
        });
        it('with duplicate username returns HTTP 400', (done) => {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'first_user', 'password':'new_pw', 'email':'new@user.com'})
                .expect(400, done);
        });
        it('with missing email returns HTTP 400', (done) => {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw'})
                .expect(400, done);
        });
        it('with duplicate email returns HTTP 400', (done) => {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'email':users.user_1.email, 'password':'new_pw'})
                .expect(400, done);
        });
        //it('with invalid email returns HTTP 400', (done) => {
        //    request(server.app)
        //        .post('/register')
        //        .type('form')
        //        .send({'username':'new_user', 'email':'invalid_email', 'password':'new_pw'})
        //        .expect(400, done);
        //});
        //TODO send confirmation email
        it('with missing password returns HTTP 400', (done) => {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'email':'new@user.com'})
                .expect(400, done);
        });
        it('returns http 500 on error from get_by_username', (done) => {
            users.pass_error_from_get_by_username(true);
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'email':'new@user.com', 'password':'new_pw'})
                .expect(500, done);
        });
        it('returns http 500 on error from get_by_email', (done) => {
            users.pass_error_from_get_by_email(true);
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'email':'new@user.com', 'password':'new_pw'})
                .expect(500, done);
        });
        it('returns http 500 on error from users.create', (done) => {
            users.pass_error_from_create(true);
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'email':'new@user.com', 'password':'new_pw'})
                .expect(500, done);
        });
        //TODO captcha?
    });

    describe('GET /logout', () => {
        it('returns HTTP 302 to /login when previously authenticated', (done) => {
            make_authenticated_agent(users.user_1, (err, agent) => {
                agent.get('/logout')
                    .expect(302)
                    .expect('Location', '/login', done);
            });
        });
        it('returns HTTP 302 to /login when not previously authenticated', (done) => {
            request(server.app)
                .get('/logout')
                .expect(302)
                .expect('Location', '/login', done);
        });
        it('deauths active session', (done) => {
            make_authenticated_agent(users.user_1, (err, agent) => {
                agent.get('/logout')
                    .end(() => {
                        agent.get('/')
                            .expect(302)
                            .expect('Location', '/login', done);
                    });
            });
        });
    });
});
