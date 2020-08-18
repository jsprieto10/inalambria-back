

/**
 * NPM Module dependencies.
 */
var bodyParser = require("body-parser");
var express = require("express");
var passport = require("passport");
var cors = require('cors');

/**
 * Verifica si hay un usuario loggeado para acceder a los recursos
 */
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


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Configuración de passport
const configPassport = require("./configurePassport.js");
configPassport(app);

app.use(cors({ credentials: true, origin: process.env.origin || "http://localhost:8080" }));

// Creación de las rutas
app.use('/tracks', trackRoute);

const dbApi = require("./MongoUtils");

/**
 * Registra un nuevo usuario en la aplicación
 */
app.post("/register", (req, res) => {
    user = req.body;
    dbApi.Register(user, "users", (user) => {
        res.send(user);
    });
});

/**
 * Dar usuario actual, retorna undefined si no hay ninguno
 */
app.get("/current", (req, res) => {

    res.send({ "user": req.user })
})

/**
 * Loggearse
 */
app.post(
    "/login",
    passport.authenticate("local", { failureRedirect: "/fail" }),
    (req, res) => {
        res.send({ user: req.user });
    }
);

/**
 * Crear una nueva playlist
 * name: nombre de la nueva lista
 */
app.get('/createList/:name', ensureLoggedIn, (req, res) => {
    try {
        dbApi.insertOneGeneric((ans) => res.send(ans), "playList", { owner: req.user.username, name: req.params.name, tracks: [] })
    } catch (err) {
        res.statusCode = 500;
        res.send({ error: err })
    }
})

/**
 * Agregar canción a la playlist
 */
app.post('/addToList/', ensureLoggedIn, (req, res) => {

    try {
        let object = dbApi.createObjectId({ "_id": req.body.trackId })
        dbApi.searchOneGeneric("tracks", object).then(track => dbApi.UpdateOne((ans) => res.send({ code: "ok" }), "playList", dbApi.createObjectId({ _id: req.body.playlist }), track))
    } catch (err) {
        res.statusCode = 500;
        res.send({ error: err })
    }
})

/**
 * Agregar una canción
 */
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
 * Get generico a la base de datos
 */
app.post('/getData', ensureLoggedIn, (req, res) => {
    try {

        dbApi.findAll((data) => res.send(data), req.body.collection, req.body.query)

    } catch (err) {
        res.statusCode = 500;
        res.send({ error: err })
    }
})


/**
 * Reproducir una canción
 * trackID: Id de la canción a reproducir
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


