

/**
 * NPM Module dependencies.
 */
var bodyParser = require("body-parser");
var express = require("express");
var passport = require("passport");



var ensureLoggedIn = (req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.statusCode = 401
        res.send({ "Fail": "Not autorized" })
    }
}

const trackRoute = express.Router();
var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const configPassport = require("./configurePassport.js");
configPassport(app);

app.use('/tracks', trackRoute);

const dbApi = require("./MongoUtils");

app.post("/register", (req, res) => {
    user = req.body;
    dbApi.Register(user, "users", (user) => {
        res.send(user);
    });
});

app.post(
    "/login",
    passport.authenticate("local", { failureRedirect: "/fail" }),
    (req, res) => {
        res.send({ user: req.user });
    }
);


trackRoute.post('/', ensureLoggedIn, (req, res) => {
    try {
        dbApi.uploadSong(req, res);
    }
    catch (err) {
        res.statusCode = 500;
        res.send({ error: err })
    }
});

/**
 * GET /tracks/:trackID
 */
trackRoute.get('/:trackID', ensureLoggedIn,(req, res) => {
    try {
        dbApi.streaming(req,res);
    } catch (err) {
        console.log(err)
        res.statusCode = 500;
        res.send({ error: err })
    }
});






app.listen( process.env.PORT || 3000, () => {
    console.log("Listening on:3001");
});


