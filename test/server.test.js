const request = require('supertest');
const Server = require('../server.js').Server;
const bcrypt = require('bcrypt');
const assert = require('assert');
const Users = require('../users.js').Users;
const sinon = require('sinon');
const WebSocket = require('ws');
const InfiniteGoAPI = require('../api.js');

const test_user_1 = {
    'id': 1,
    'username': 'first_user',
    'email': 'nobody@nonexistant.tld',
    'unencrypted_password': 'pw1',
    'password': bcrypt.hashSync('pw1', 10),
    'date_created': '2019-11-13T15:13:12.345Z',
    'viewport': {
        'top': 10,
        'right': 21,
        'bottom': 12,
        'left': 13
    }
};

function make_user(id) {
    return {
        id: id,
        username: `user_${id}`,
        email: `user_${id}@example.tld`,
        unencrypted_password: `password_${id}`,
        password: bcrypt.hashSync(`password_${id}`, 10),
        date_created: new Date(Date.now() + 6000*id).toISOString(),
        viewport: {
            top:  -10,
            right: 10,
            bottom: 32,
            left: -20
        }
    };
}

describe('Server', function() {

    let users;
    let server;
    let api;
    const default_viewport = {'top':10, 'right':9, 'bottom':-8, 'left':-7};
    beforeEach(function() {
        users = sinon.createStubInstance(Users);
        api = sinon.createStubInstance(InfiniteGoAPI);
        server = new Server({users:users, session_secret:'test session secret', default_viewport:default_viewport, api:api});
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
            .end((err, res) => {
                cb(err, agent, res);
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
        it('returns HTTP 500 when unable to retrieve user from db', function(done) {
            users.get_by_username.resolves(test_user_1);
            users.get_by_id.onCall(0).rejects();
            make_authenticated_agent(test_user_1, function(err, agent) {
                agent
                    .get('/')
                    .expect(500)
                    .expect('Location', '/login', done);
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

    describe('GET /logout', function() {
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
        it('deauths active session', function(done) {
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

    const with_auth_ws = function(cb, user) {
        users.get_by_username.resolves(user);
        users.get_by_id.resolves(user);
        make_authenticated_agent(user, (err, agent, res) => {
            let f = () => {
                const cookies = res.headers['set-cookie'];
                const session_cookie = cookies.filter((x) => x.startsWith('connect.sid'))[0];
                const ws = new WebSocket('ws://localhost:3001', {headers: {Cookie: session_cookie}});
                cb(ws);
            };
            if (!server.listening()) {
                server.listen(3001, () => {
                    f();
                });
            } else {
                f();
            }
        });
    };

    describe('Websocket', function() {
        it('Can open websocket connection when authenticated', function(done) {
            with_auth_ws((ws) => {
                ws.on('open', () => {
                    ws.close();
                    server.close(done);
                });
            }, test_user_1);
        });
        it('Calls api.connect with user_id on connection.', function(done) {
            with_auth_ws((ws) => {
                ws.on('open', () => {
                    ws.close();
                    if (!api.connect.calledWith(test_user_1.id)) {
                        server.close(() => {
                            done(new Error());
                        });
                    } else {
                        server.close(done);
                    }
                });
            }, test_user_1);
        });
        it('Calls api.call with message and user_id.', function(done) {
            with_auth_ws((ws) => {
                ws.on('open', () => {
                    const message = '{"test": 123}';
                    ws.send(message);
                    ws.close();
                    server.close(() => {
                        if (!api.call.calledWith(message, test_user_1.id)) {
                            done(new Error());
                        } else {
                            done();
                        }
                    });
                });
            }, test_user_1);
        });
        it('Calls api.disconnect on disconnect.', function(done) {
            with_auth_ws((ws) => {
                ws.on('open', () => {
                    ws.on('close', () => {
                        server.close(() => {
                            setTimeout(() => { //TODO Shouldn't need setTimeout here...
                                if (!api.disconnect.calledWith(test_user_1.id)) {
                                    done(new Error());
                                } else {
                                    done();
                                }
                            }, 10);
                        });
                    });
                    ws.close();
                    
                });
            }, test_user_1);
        });

        const with_auth_ws_connections = function(n, cb, cb_closed, connections_per_user=1) {
            let n_closed = 0;
            const f = function(n, i=1) {
                const id = (i - 1) % n + 1;
                const user = make_user(id);
                with_auth_ws((ws) => {
                    ws.on('open', () => {
                        if (i != n*connections_per_user) {
                            f(n, i+1);
                        }
                    });
                    ws.on('close', () => {
                        n_closed++;
                        if (n_closed == n*connections_per_user && cb_closed) {
                            cb_closed();
                        }
                    });
                    cb(ws, id, user, Math.floor((i - 1)/n));
                }, user);
            };
            f(n);
        };

        it('Calls api.connect with a unique connection_id.', function(done) {
            const n = 10;
            with_auth_ws_connections(n, (ws) => {
                ws.on('open', () => {
                    ws.close();
                });
            }, () => {
                server.close(() => {
                    const connection_ids = new Set();
                    for (let i = 0; i < api.connect.callCount; i++) {
                        connection_ids.add(api.connect.getCall(i).args[1]);
                    }
                    if (connection_ids.size == n) {
                        done();
                    } else {
                        done(new Error());
                    }
                });
            });
        });
        it('Calls api.disconnect with the same connection_ids as api.connect.', function(done) {
            const n = 10;
            with_auth_ws_connections(n, (ws) => {
                ws.on('open', () => {
                    ws.close();
                });
            }, () => {
                server.close(() => {
                    const connection_ids = new Map();
                    for (let i = 0; i < api.connect.callCount; i++) {
                        let [user_id, connection_id] = api.connect.getCall(i).args;
                        connection_ids.set(user_id, connection_id);
                    }
                    for (let i = 0; i < api.disconnect.callCount; i++) {
                        let [user_id, connection_id] = api.disconnect.getCall(i).args;
                        if (connection_id != connection_ids.get(user_id)) {
                            return done(new Error());
                        }
                    }
                    done();
                });
            });
        });
        it('Calls api.call with the same connection_id as api.connect.', function(done) {
            const n = 10;
            with_auth_ws_connections(n, (ws, i) => {
                ws.on('open', () => {
                    ws.send(`user ${i}`);
                    ws.close();
                });
            }, () => {
                server.close(() => {
                    const connection_ids = new Map();
                    for (let i = 0; i < api.connect.callCount; i++) {
                        let [user_id, connection_id] = api.connect.getCall(i).args;
                        connection_ids.set(user_id, connection_id);
                    }
                    for (let i = 0; i < api.call.callCount; i++) {
                        let [msg, user_id, connection_id] = api.call.getCall(i).args;
                        if (connection_id != connection_ids.get(user_id)) {
                            return done(new Error('Invalid Connection ID.'));
                        }
                        if (msg != `user ${user_id}`) {
                            return done(new Error('Incorrect message.'));
                        }
                        return done();
                    }
                });
            });
        });
        it('send hook sends a message to the correct user and connection.', function(done) {
            const send = api.set_hooks.firstCall.args[0];
            api.connect = function(user_id, connection_id) {
                send(user_id, connection_id, `message to user ${user_id}`);
            };
            const n = 3;
            const connections_per_user = 3;
            let correct_message_count = 0;
            let failed = false;
            with_auth_ws_connections(n, (ws, id) => {
                let recieved_correct_message = false;
                ws.on('message', (msg) => {
                    if (recieved_correct_message) {
                        failed = true; // should only recieve one correct message per user connection.
                    }
                    if (msg == `message to user ${id}`) {
                        recieved_correct_message = true;
                        correct_message_count++;
                    }
                    ws.close();
                });
            }, () => {
                server.close(() => {
                    if (!failed && correct_message_count == n * connections_per_user) {
                        return done();
                    }
                    return done(new Error());
                });
            }, connections_per_user);

        });
        it('close hook closes the correct connection.', function(done) {
            const close = api.set_hooks.firstCall.args[1];
            api.connect = function(user_id, connection_id) {
                close(user_id, connection_id);
            };
            const n = 3;
            const connections_per_user = 3;
            with_auth_ws_connections(n, () => {
            }, () => {
                server.close(() => {
                    return done();
                });
            }, connections_per_user);
        });
        it('Closes connection on unauthenticated connection attempt.', function(done) {
            users.get_by_username.resolves(test_user_1);
            users.get_by_id.resolves(test_user_1);
            server.listen(3001, () => {
                const ws = new WebSocket('ws://localhost:3001');
                let socket_hang_up = false;
                let closed = false;
                ws.on('error', (err) => {
                    if (err.message == 'socket hang up') {
                        socket_hang_up = true;
                        if (closed) {
                            server.close(done);
                        }
                    }
                });
                ws.on('close', () => {
                    closed = true;
                    if (socket_hang_up) {
                        server.close(done);
                    }
                });
            });
        });
    });
});
