

/**
 * NPM Module dependencies.
 */
var bodyParser = require("body-parser");
var express = require("express");
var passport = require("passport");



var ensureLoggedIn = (req, res, next) => {
    console.log(req.user)
    if (req.user) {
        next();
    } else {
        res.statusCode = 401
        res.send({ "Fail": "Not autorized" })
    }
}

const trackRoute = express.Router();
var app = express();

var cors = require('cors');





app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const configPassport = require("./configurePassport.js");
configPassport(app);

app.use(cors({ credentials: true, origin: "http://localhost:8080" || process.env.origin }));

app.use('/tracks', trackRoute);

const dbApi = require("./MongoUtils");
const MongoUtils = require("./MongoUtils");

app.post("/register", (req, res) => {
    user = req.body;
    dbApi.Register(user, "users", (user) => {
        res.send(user);
    });
});

app.get("/current", (req, res) => {

    res.send({ "user": req.user })
})

app.post(
    "/login",
    passport.authenticate("local", { failureRedirect: "/fail" }),
    (req, res) => {
        res.send({ user: req.user });
    }
);

app.get('/createList/:name', ensureLoggedIn, (req, res) => {
    try {
        dbApi.insertOneGeneric((ans) => res.send(ans), "playList", { owner: req.user.username, name: req.params.name })
    } catch (err) {
        res.statusCode = 500;
        res.send({ error: err })
    }
})

app.post('/addToList/', ensureLoggedIn, (req, res) => {

    try {
        dbApi.searchOneGeneric("tracks", { "_id": req.body.trackId }).then(track => dbApi.UpdateOne((ans) => res.send({ code: "ok" }), "playList", { _id: req.body.playlist }, track))
    } catch (err) {
        res.statusCode = 500;
        res.send({ error: err })
    }
})

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
trackRoute.get('/:trackID', ensureLoggedIn, (req, res) => {
    try {
        console.log("que pasa 1")
        dbApi.streaming(req, res);
    } catch (err) {
        console.log(err)
        res.statusCode = 500;
        res.send({ error: err })
    }
});






app.listen(process.env.PORT || 3000, () => {
    console.log("Listening on:3001");
});


