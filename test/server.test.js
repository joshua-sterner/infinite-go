const request = require('supertest');
const Server = require('../server.js').Server;
const bcrypt = require('bcrypt');
const assert = require('assert');
const Users = require('../users.js').Users;
const sinon = require('sinon');

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

describe('Server', () => {

    let users;
    let server;
    const default_viewport = {'top':10, 'right':9, 'bottom':-8, 'left':-7};
    beforeEach(function() {
        users = sinon.createStubInstance(Users);
        server = new Server({users:users, session_secret:'test session secret', default_viewport:default_viewport});
    });

    describe('Server Constructor', function() {
        it('throws when called without users object', function() {
            assert.throws(function() {
                new Server({session_secret:'test session secret',
                    default_viewport:default_viewport});
            });
        });
        it('throws when called without session_secret', function() {
            assert.throws(function() {
                new Server({users:users, default_viewport:default_viewport});
            });
        });
        it('throws when called without default_viewport', function() {
            assert.throws(function() {
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

    describe('GET /', function() {
        it('whlle not authenticated returns HTTP 302 to /login', function(done) {
            request(server.app)
                .get('/')
                .set('Cookie', [])
                .expect(302)
                .expect('Location', '/login', done);
        });
        it('while authenticated returns HTTP 200', function (done) {
            users.get_by_username.resolves(test_user_1);
            users.get_by_id.resolves(test_user_1);
            make_authenticated_agent(test_user_1, function(err, agent) {
                agent
                    .get('/')
                    .expect(200, done);
            });
        });
    });

    describe('GET /login', function() {
        it('returns HTTP 200', function(done) {
            request(server.app)
                .get('/login')
                .expect(200, done);
        });
    });

    describe('POST /login', function() {
        it('with invalid username returns HTTP 403', function (done) {
            users.get_by_username.resolves(null);
            request(server.app)
                .post('/login')
                .type('form')
                .send({'username': 'nobody', 'password':'pw1'})
                .expect(403, done);
        });
        it('with invalid password returns HTTP 403', function (done) {
            users.get_by_username.resolves(test_user_1);
            request(server.app)
                .post('/login')
                .type('form')
                .send({'username': test_user_1.username, 'password':'wrong'})
                .expect(403, done);
        });
        it('with valid credentials returns HTTP 302 to /', function (done) {
            users.get_by_username.resolves(test_user_1);
            request(server.app)
                .post('/login')
                .type('form')
                .send({'username':test_user_1.username, 'password':test_user_1.unencrypted_password})
                .expect(302)
                .expect('Location', '/', done);
        });
        it('when db error occurs returns HTTP 500', function (done) {
            users.get_by_username.rejects();
            request(server.app)
                .post('/login')
                .type('form')
                .send({'username':test_user_1.username, 'password':test_user_1.unencrypted_password})
                .expect(500, done);
        });
    });

    describe('GET /register', function() {
        it('returns HTTP 200', function(done) {
            request(server.app)
                .get('/register')
                .expect(200, done);
        });
    });
    
    describe('POST /register', () => {
        it('with valid account info returns HTTP 302 to /', function (done) {
            users.username_taken.resolves(false);
            users.email_taken.resolves(false);
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .expect(302)
                .expect('Location', '/', done);
        });
        it('with valid account info authenticates user', function (done) {
            users.username_taken.resolves(false);
            users.email_taken.resolves(false);
            users.create.resolves(123); // user id
            users.get_by_id.resolves({id: 123, username:'new_user'});
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


        it('with valid account info creates user in db', function (done) {
            users.username_taken.resolves(false);
            users.email_taken.resolves(false);
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .end(() => {
                    assert(users.create.calledOnce);
                    return done();
                });
        });
        it('with valid account info creates user with correct username', function(done) {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .end(() => {
                    const user = users.create.firstCall.args[0];
                    if (user.username == 'new_user') {
                        return done();
                    }
                    return done(new Error('username mismatch'));
                });
        });
        it('with valid account info creates user with correct email', function(done) {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .end(() => {
                    const user = users.create.firstCall.args[0];
                    if (user.email == 'new@user.com') {
                        return done();
                    }
                    return done(new Error('email mismatch'));
                });
        });
        it('with valid account info creates user with correct viewport', function(done) {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .end(() => {
                    const user = users.create.firstCall.args[0];
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
        it('with valid accout info stores password using bcrypt', function(done) {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw', 'email':'new@user.com'})
                .end(() => {
                    const user = users.create.firstCall.args[0];
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


        it('returns HTTP 302 to / when username is max length', function (done) {
            let username = 'a'.repeat(Users.MAX_USERNAME_LENGTH);
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':username, 'password':'new_pw', 'email':'new@user.com'})
                .expect(302)
                .expect('Location', '/', done);
        });
        it('returns HTTP 400 when username one character too long', function (done) {
            users.MAX_USERNAME_LENGTH = Users.MAX_USERNAME_LENGTH;
            let username = 'a'.repeat(users.MAX_USERNAME_LENGTH+1);
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':username , 'password':'new_pw', 'email':'new@user.com'})
                .expect(400, done);
        });
        it('with missing username returns HTTP 400', function(done) {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'password':'new_pw', 'email':'new@user.com'})
                .expect(400, done);
        });
        it('with duplicate username returns HTTP 400', function (done) {
            users.username_taken.resolves(true);
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'first_user', 'password':'new_pw', 'email':'new@user.com'})
                .expect(400, () => {
                    assert(users.username_taken.calledWith('first_user'));
                    done();
                });
        });
        it('with missing email returns HTTP 400', function(done) {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'password':'new_pw'})
                .expect(400, done);
        });
        it('with duplicate email returns HTTP 400', function (done) {
            users.email_taken.resolves(true);
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'email':'test@email.com', 'password':'new_pw'})
                .expect(400, () => {
                    assert(users.email_taken.calledWith('test@email.com'));
                    done();
                });
        });
        it('with invalid email returns HTTP 400');
        it('sends confirmation email');
        it('with missing password returns HTTP 400', function(done) {
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'email':'new@user.com'})
                .expect(400, done);
        });
        it('returns http 500 on error from username_taken', function(done) {
            users.username_taken.rejects();
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'email':'new@user.com', 'password':'new_pw'})
                .expect(500, done);
        });
        it('returns http 500 on error from email_taken', function(done) {
            users.email_taken.rejects();
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'email':'new@user.com', 'password':'new_pw'})
                .expect(500, done);
        });
        it('returns http 500 on error from users.create', function(done) {
            users.create.rejects();
            request(server.app)
                .post('/register')
                .type('form')
                .send({'username':'new_user', 'email':'new@user.com', 'password':'new_pw'})
                .expect(500, done);
        });
        //TODO captcha?
    });

    describe('GET /logout', () => {
        it('returns HTTP 302 to /login when previously authenticated', function (done) {
            users.get_by_username.resolves(test_user_1);
            users.get_by_id.resolves(test_user_1);
            make_authenticated_agent(test_user_1, (err, agent) => {
                agent.get('/logout')
                    .expect(302)
                    .expect('Location', '/login', done);
            });
        });
        it('returns HTTP 302 to /login when not previously authenticated', function(done) {
            request(server.app)
                .get('/logout')
                .expect(302)
                .expect('Location', '/login', done);
        });
        it('deauths active session', function (done) {
            users.get_by_username.resolves(test_user_1);
            users.get_by_id.resolves(test_user_1);
            make_authenticated_agent(test_user_1, (err, agent) => {
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
