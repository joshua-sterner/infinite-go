const express = require('express');
const Passport = require('passport').Passport;
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

class Server {

    constructor(args) {
        const app = express();
        this.app = app;
        const passport = new Passport();
        const users = args.users;

        passport.use(new LocalStrategy((username, password, done) => {
            users.get_by_username(username, (err, user) => {
                if (user) {
                    bcrypt.compare(password, user.password, (err, res) => {
                        console.log(password);
                        console.log(user.password);
                        console.log(res);
                        if (res) {
                            return done(null, user);
                        }
                        return done(new Error("Invalid password"), null);
                    });
                } else {
                    done(err, user);
                }
            });
        }));

        passport.serializeUser((user, done) => {
            done(null, user.id);
        });

        passport.deserializeUser((id, done) => {
            users.get_by_id(id, done);
        });

        app.use(bodyParser.urlencoded({extended: false}));
        app.use(session({secret: args.session_secret, resave: false, saveUninitialized: false}));
        app.use(passport.initialize());
        app.use(passport.session());
        app.get('/', (req, res) => {
            if (req.isAuthenticated()) {
                return res.status(200).send('/');
            } else {
                return res.redirect(302, '/login');
            }
        });
        app.get('/login', (req, res) => {
            res.status(200).send('login page');
        });
        app.post('/login', (req, res, next) => {
            passport.authenticate('local', (err, user, info) => {
                if (err || !user) {
                    return res.status(403).send('login page');
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
            res.status(200).send('registration page');
        });
        app.post('/register', (req, res, next) => {
            if (!req.body.username || !req.body.email || !req.body.password) {
                return res.status(400).send('username required');
            }
            users.get_by_username(req.body.username, (err, user) => {
                if (user) {
                    return res.status(400).send('Username taken');
                }
                users.get_by_email(req.body.email, (err, user) => {
                    if (user) {
                        return res.status(400).send(`User with email ${user.email} already exists`);
                    }
                    let new_user = {};
                    new_user.username = req.body.username;
                    bcrypt.hash(req.body.password, 10, (err, hash) => {
                        new_user.password = hash;
                        new_user.email = req.body.email;
                        new_user.viewport = args.default_viewport;
                        users.create(new_user, (err, id) => {
                            new_user.id = id;
                            req.logIn(new_user, (err) => {
                                return res.redirect(302, '/');
                            });
                        });
                    });
                });
            });
        });
    }

}

module.exports = {'Server': Server};
