/**
 * Infinite Go Server
 *
 * @module server
 */
const express = require('express');
const Passport = require('passport').Passport;
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const http = require('http');
const WebSocket = require('ws');


/**
 * Creates a Passport instance for the server.
 *
 * @param {Users} users - The Users instance to authenticate users with.
 * @returns {Passport} A new Passport instance that authenticates users via the provided Users instance.
 */
function setup_passport(users) {
    let passport = new Passport();

    passport.use(new LocalStrategy((username, password, done) => {
        users.get_by_username(username)
            .then((user) => {
                if (!user) {
                    return done(null, null);
                }
                bcrypt.compare(password, user.password, (err, res) => {
                    if (res) {
                        return done(null, user);
                    }
                    return done(new Error('Invalid password'), null);
                });
            }).catch(err => done(err, null));
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        users.get_by_id(id)
            .then(user => done(null, user))
            .catch(err => done(err, null));
    });

    return passport;
}

/**
 * Creates an express instance for the server.
 *
 * @param {Passport} passport - The Passport object used for handling authentication.
 * @param {string} session_secret - The session secret.
 * @returns {object} The express object and the session parser.
 */
function setup_express(passport, session_secret) {
    let app = express();
    app.use(bodyParser.urlencoded({extended: false}));
    let session_parser = session({secret: session_secret, resave: false, saveUninitialized: false});
    app.use(session_parser);
    app.use(passport.initialize());
    app.use(passport.session());
    app.use((err, req, res, next) => {
        if (err) {
            req.logout();
            if (req.originalUrl == '/login') {
                next(); //TODO
            } else {
                res.redirect(500, '/login');
            }
        } else {
            next();
        }
    });
    return {app: app, session_parser: session_parser};
}

/**
 * Infinite-Go Server Instance.
 *
 * @class
 */
class Server {
    
    #users;
    #passport;
    #http_server;
    #wss;
    #session_parser;
    #api;

    /**
     * Constructs a new Infinite Go server instance.
     *
     * @class
     * @param {object} args - The info required to construct a new Server instance.
     * @param {Users} args.users - The Users instance that provides acesss to user accounts.
     * @param {string} args.secret - The session secret.
     * @param {object} args.default_viewport - The default viewport assigned to new users.
     * The x axis is positive to the right, and the y axis is positive to the top.
     * @param {number} args.default_viewport.top - The y position of the top of the viewport.
     * @param {number} args.default_viewport.bottom - The y position of the bottom of the viewport.
     * @param {number} args.default_viewport.left - The x position of the left of the viewport.
     * @param {number} args.default_viewport.right - The x position of the right of the viewport.
     * @param {InfiniteGoAPI} args.api - The Infinite Go API class.
     */
    constructor(args) {

        if (!args.users || !args.session_secret || !args.default_viewport) {
            throw new Error('invalid call to constructor');
        }

        this.default_viewport = args.default_viewport;

        const users = args.users;
        const passport = setup_passport(users);
        this.#users = users;
        this.#passport = passport;

        const {app, session_parser} = setup_express(passport, args.session_secret);
        this.app = app;
        this.#session_parser = session_parser;
        this.#http_server = http.createServer(app);
        this.#api = args.api;

        this._setup_websocket_server();

        //TODO enable/disable switch for static file serving
        app.use(express.static('static'));

        app.set('view engine', 'ejs');

        app.get('/', (req, res) => {
            if (req.isAuthenticated()) {
                return res.status(200).render('game');
            } else {
                return res.redirect(302, '/login');
            }
        });
        app.get('/login', (req, res) => {
            res.status(200).render('login', {authentication_failed: false});
        });
        app.post('/login', (req, res) => {
            this._handle_login_request(req, res);
        });
        app.get('/logout', (req, res) => {
            req.logout();
            return res.redirect(302, '/login');
        });
        app.get('/register', (req, res) => {
            res.status(200).render('registration');
        });

        app.post('/register', (req, res) => {
            this._handle_register_request(req, res);
        });
    }


    _setup_websocket_server() {
        this.ws_sessions = new Map();

        this.#api.set_hooks(
            (user_id, connection_id, json) => {
                this.ws_sessions.get(user_id).get(connection_id).send(json);
            },
            (user_id, connection_id) => {
                this.ws_sessions.get(user_id).get(connection_id).close();
            }
        );

        this.#wss = new WebSocket.Server({clientTracking: false, noServer: true});

        this.#http_server.on('upgrade', (req, socket, head) => {
            this.#session_parser(req, {}, () => { 
                if (!req.session.passport || !req.session.passport.user) {
                    socket.destroy();
                    return;
                }
                this.#wss.handleUpgrade(req, socket, head, (ws) => {
                    this.#wss.emit('connection', ws, req);
                });
            });
        });
        

        this.#wss.on('connection', (ws, req) => {
            let user_id = req.session.passport.user;
            if (!this.ws_sessions.has(user_id)) {
                this.ws_sessions.set(user_id, new Map()); //TODO make sure to clean up the session map on disconnect.
            }
            this.ws_sessions.get(user_id).set(req.sessionID, ws); //TODO clean up on disconnect.
            this.#api.connect(user_id, req.sessionID);
            ws.on('close', () => {
                this.#api.disconnect(user_id, req.sessionID);
            });
            ws.on('message', (message) => {
                this.#api.call(message, user_id, req.sessionID);
            });
        });
    }
    
    async _handle_register_request(req, res) {
        if (!req.body.username || !req.body.email || !req.body.password) {
            return res.status(400).send('Username, password and email are required.');
        }
        if (req.body.username.length > this.#users.MAX_USERNAME_LENGTH) {
            return res.status(400).send(`Username exceeds character limit of ${this.#users.MAX_USERNAME_LENGTH}.`);
        }
        try {
            if (await this.#users.username_taken(req.body.username)) {
                return res.status(400).send('Username taken');
            }

            if (await this.#users.email_taken(req.body.email)) {
                return res.status(400).send('Email taken');
            }
            let encrypted_password = await bcrypt.hash(req.body.password, 10);
            let new_user = {username:req.body.username, password:encrypted_password,
                email:req.body.email, viewport:this.default_viewport};
            const id = await this.#users.create(new_user);
            new_user.id = id;
            req.logIn(new_user, () => {
                return res.redirect(302, '/');
            });
        } catch (e) {
            return res.status(500).send('Database Error');
        }
    }

    _handle_login_request(req, res) {
        this.#passport.authenticate('local', (err, user) => {
            if (err) {
                if (err.message == 'Invalid password') {
                    return res.status(403).render('login', {authentication_failed: true});
                }
                return res.status(500).render('login', {authentication_failed: false});
            }
            if (!user) {
                return res.status(403).render('login', {authentication_failed: true});
            }
            req.logIn(user, () => {
                return res.redirect(302, '/');
            });
        })(req, res);
    }

    listen(port, cb) {
        this.#http_server.listen(port, cb);
    }

    close(cb) {
        this.#http_server.close(cb);
    }

    listening() {
        return this.#http_server.listening;
    }
}

module.exports = {'Server': Server};

/** @typedef Users */
