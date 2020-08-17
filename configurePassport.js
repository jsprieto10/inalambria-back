// This file contains all the needed functions in order to configure passport for authentication

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

// Mongo functions
const dbApi = require("./MongoUtils");

const bcrypt = require("bcrypt");
const saltRounds = 10;

// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(
    new LocalStrategy(function (username, password, cb) {
        console.log(username, password, cb, "passport");

        dbApi.findOne({ username: username }, "users", (user) => {
            if (user) {

                // Compare encrypted passwrods 
                bcrypt.compare(password, user.password).then(function (result) {
                    if (result) {
                        console.log("passport - right password");
                        cb(null, user);
                    } else {
                        console.log("passport - wrong password");
                        cb(null, false);
                    }
                });
            } else {
                console.log("passport - username doesn't exist");
                cb(null,null);
            }
        });
    })
);

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function (user, cb) {
    cb(null, user.username);
  });
  
  passport.deserializeUser(function (username, cb) {
    dbApi.findOne({ username: username }, "users", (user) => {
      if (user) {
        cb(null, user);
      } else {
        console.log("User not found");
        cb(new Error("User not found"));
      }
    });
  });


  const configurePassport = (app) => {
    // Use application-level middleware for common functionality, including
    // logging, parsing, and session handling.
    app.use(require("morgan")("combined"));
  
    app.use(
      require("express-session")({
        secret: process.env.secretKey || "inalambria",
        resave: false,
        saveUninitialized: false,
        cookie : {
          sameSite: 'strict', // THIS is the config you are looing for.
        }
      })
    );
  
    // Initialize Passport and restore authentication state, if any, from the
    // session.
    app.use(passport.initialize());
    app.use(passport.session());
  };
  module.exports = configurePassport;