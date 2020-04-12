const express = require('express');
const Passport = require('passport').Passport;
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');


function setup_passport(users) {
    passport = new Passport();

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
                    return done(new Error("Invalid password"), null);
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

function setup_express(passport, session_secret) {
    let app = express();
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(session({secret: session_secret, resave: false, saveUninitialized: false}));
    app.use(passport.initialize());
    app.use(passport.session());
    return app;
}

class Server {

    constructor(args) {

        if (!args.users || !args.session_secret || !args.default_viewport) {
            throw new Error('invalid call to constructor');
        }

        const users = args.users;
        const passport = setup_passport(users);

        const app = setup_express(passport, args.session_secret);
        this.app = app;

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
        app.post('/login', (req, res, next) => {
            passport.authenticate('local', (err, user, info) => {
                if (err) {
                    if (err.message == "Invalid password") {
                        return res.status(403).render('login', {authentication_failed: true});
                    }
                    return res.status(500).render('login', {authentication_failed: false});
                }
                if (!user) {
                    return res.status(403).render('login', {authentication_failed: true});
                }
                req.logIn(user, (err) => {
                    return res.redirect(302, '/');
                });
            })(req, res);
        });
        app.get('/logout', (req, res, next) => {
            req.logout();
            return res.redirect(302, '/login');
        });
        app.get('/register', (req, res, next) => {
            res.status(200).render('registration');
        });


        async function is_username_taken(username) {
            const user = await users.get_by_username(username);
            return (user !== null);
        }

        async function is_email_taken(email) {
            const user = await users.get_by_email(email);
            return (user !== null);
        }

        app.post('/register', async function (req, res, next) {
            if (!req.body.username || !req.body.email || !req.body.password) {
                return res.status(400).send('Username, password and email are required.');
            }
            if (req.body.username.length > users.MAX_USERNAME_LENGTH) {
                return res.status(400).send(`Username exceeds character limit of ${users.MAX_USERNAME_LENGTH}.`);
            }
            
            try {
                if (await is_username_taken(req.body.username)) {
                    return res.status(400).send('Username taken');
                }

                if (await is_email_taken(req.body.email)) {
                    return res.status(400).send('Email taken');
                }
                let encrypted_password = await bcrypt.hash(req.body.password, 10);
                let new_user = {username:req.body.username, password:encrypted_password, email:req.body.email, viewport:args.default_viewport};
                const id = await users.create(new_user);
                new_user.id = id;
                req.logIn(new_user, (err) => {
                    return res.redirect(302, '/');
                });
            } catch {
                return res.status(500).send('Database Error');
            }
        });
    }
}

module.exports = {'Server': Server};
