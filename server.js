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
    #wss

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
        this.#http_server = http.createServer(app);

        this.#wss = new WebSocket.Server({clientTracking: false, noServer: true});

        this.#http_server.on('upgrade', (req, socket, head) => {
            session_parser(req, {}, () => {
                if (!req.session.passport || !req.session.passport.user) {
                    socket.destroy();
                    return;
                }
                this.#wss.handleUpgrade(req, socket, head, (ws) => {
                    this.#wss.emit('connection', ws, req);
                });
            });
        });
        
        this.ws_sessions = new Map();

        const ws_message_map = new Map();
        ws_message_map.set('stone_placement_request', (msg, ws) => {
            setTimeout(() => {
                // TODO where should this confirmation actually happen?
                ws.send(JSON.stringify({
                    type: 'stone_placement_request_approved',
                    stones: [msg.stone]
                }));
            }, 1500);
        });
        ws_message_map.set('viewport_coordinates', (msg, ws, user_id) => {
            this.ws_sessions.get(user_id).forEach((i) => {
                if (i != ws) {
                    i.send(JSON.stringify({
                        type: 'viewport_coordinates',
                        viewport: msg.viewport
                    }));
                }
            });
        });

        ws_message_map.max_type_length = 0;
        for (let i of ws_message_map.keys()) {
            ws_message_map.max_type_length = Math.max(i.length, ws_message_map.max_type_length);
        }

        this.#wss.on('connection', (ws, req) => {
            let user_id = req.session.passport.user;
            if (!this.ws_sessions.has(user_id)) {
                this.ws_sessions.set(user_id, []);
            }
            this.ws_sessions.get(user_id).push(ws); //TODO test, cleanup
            ws.on('message', (message) => {
                let msg = JSON.parse(message);
                if (typeof msg.type === 'string'
                    && msg.type.length <= ws_message_map.max_type_length
                    && ws_message_map.has(msg.type)) {
                    ws_message_map.get(msg.type)(msg, ws, user_id);
                }
            });
        });

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
            console.log(`Caught: ${e}`);
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
}

module.exports = {'Server': Server};

/** @typedef Users */
