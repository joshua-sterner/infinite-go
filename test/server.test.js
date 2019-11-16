const request = require('supertest');
const Server = require('../server.js').Server;

class MockUsers {
    constructor() {
        this.user_1 = {
            'id': 1,
            'username': 'first_user',
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
        this.user_2 = {
            'id': 2,
            'username': 'second_user',
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
    }

    get_by_username(username, cb) {
        if (username == 'first_user') {
            return cb(null, this.user_1);
        } else if (username == 'second_user') {
            return cb(null, this.user_2);
        }
        return cb(new Error('user not found'), null);
    }

    get_by_id(id, cb) {
        if (id == 1) {
            return cb(null, this.user_1);
        }
        if (id == 2) {
            return cb(null, this.user_2);
        }
        return cb(new Error('user not found'), null);
    }
}

describe('Server', () => {

    let users;
    let server;
    beforeEach(() => {
        users = new MockUsers();
        server = new Server({users: users, session_secret:"test session secret"});
    });

    describe('GET /', () => {
        it('whlle not authenticated returns HTTP 302 to /login', (done) => {
            request(server.app)
                .get('/')
                .set('Cookie', [])
                .expect(302)
                .expect('Location', '/login', done);
        });
        it('while authenticated returns HTTP 200', (done) => {
            request(server.app)
                .post('/login')
                .type('form')
                .send({'username':'first_user', 'password':'pw1'})
                .end((err, res) => {
                    request(server.app)
                        .get('/')
                        .set('Cookie', res.headers['set-cookie'])
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
                .send({'username': 'first_user', 'password':'pw1'})
                .expect(302)
                .expect('Location', '/', done);
        });
    });

    describe('GET /register', () => {
        it('returns HTTP 200', (done) => {
            request(server.app)
                .get('/register')
                .expect(200, done);
        });
    });
    
    //describe('POST /register', () => {
    //    it('with valid account info returns HTTP 302 to /', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //    it('with valid account info provides authentication', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //    it('with missing username returns HTTP 400', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //    it('with duplicate username returns HTTP 400', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //    it('with missing email returns HTTP 400', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //    it('with duplicate email returns HTTP 400', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //    it('with invalid email returns HTTP 400', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //    it('with missing password returns HTTP 400', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //});
    //
    //describe('GET /logout', () => {
    //    it('returns HTTP 302 to /login when previously authenticated', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //    it('returns HTTP 302 to /login when not previously authenticated', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //    it('deauths active session', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //});
    //
    //describe('#register', () => {
    //    it('creates user in db', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //    it('password stored in db is encrypted', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //    it('password stored in db is salted using user id', (done) => {
    //        done(new Error('not implemented'));
    //    });
    //});
});
