const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');

class Server {

    constructor(args) {
        const app = express();
        this.app = app;

        passport.use(new LocalStrategy((username, password, done) => {
            args.users.get_by_username(username, (err, user) => {
                if (user) {
                    if (password == user.password) {
                        return done(null, user);
                    } else {
                        return done(new Error("Invalid password"), null);
                    }
                }
                done(err, user);
            });
        }));

        passport.serializeUser((user, done) => {
            done(null, user.id);
        });

        passport.deserializeUser((id, done) => {
            args.users.get_by_id(id, done);
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
        app.get('/register', (req, res, next) => {
            res.status(200).send('registration page');
        });
    }

}

module.exports = {'Server': Server};
