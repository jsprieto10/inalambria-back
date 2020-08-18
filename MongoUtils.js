const mongodb = require("mongodb");
const bcrypt = require("bcrypt");
const multer = require('multer');

/**
 * Conexión con la base de datos. Este modulo se encarga de todas las conexiones y operaciones con Mongo
 */
const { Readable } = require('stream');

const saltRounds = 10;

const MongoUtils = {},
    dbName = "inalambria",
    uri = process.env.uri || "mongodb://localhost:1207";

/**
 * Registra un nuevo usuario en la base de datos y guarda su clave encriptada
 * object: JSON del usuario a registrar
 * colName: nombre de la colección de Usuarios
 * cbk: callback
 */
MongoUtils.Register = (object, colName, cbk) => {
    console.log("entra la base de datoss insertOne", object);
    MongoUtils.findOne({ username: object.username }, "users", (user) => {
        if (user) cbk({ error: "El userName ya existe" });
        else {
            const client = new mongodb.MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
            console.log("base de datos insert", object);
            client.connect((err) => {
                if (err) throw err;
                if (object == undefined) {
                    throw new Error("Object can't be null or udefined");
                }
                const collection = client.db(dbName).collection(colName);
                let encrypt = object.password;
                bcrypt.hash(encrypt, saltRounds).then(function (hash) {
                    object.password = hash;
                    // Store hash in your password DB.
                    collection.insertOne(object, (err, result) => {
                        if (err) throw err;
                        cbk(result.ops);
                        client.close();
                    });
                });
            });
        }
    });
};


/**
 * Encuentra el objeto en la base de datos
 * query: JSON del objeto a encontrar
 * colName: nombre de la colección en la cual buscar
 * cbk: callback
 */
MongoUtils.findOne = (query, colName, cbk) => {
    console.log("entra la base de datoss findOne", query);
    const client = new mongodb.MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect((err) => {
        if (err) throw err;
        const collection = client.db(dbName).collection(colName);

        if (query) {
            user = collection.findOne(query).then((user) => {
                cbk(user);
                client.close();
            });
        }
    });
};


/**
 * Sube una nueva canción a la base de datos
 * Se suben los bytes del audio a mongo
 */
MongoUtils.uploadSong = (req, res) => {
    const client = new mongodb.MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect((err) => {


        let db = client.db(dbName)


        const storage = multer.memoryStorage()
        const upload = multer({ storage: storage, limits: { fileSize: 16000000 } });
        upload.single('track')(req, res, (err) => {
            if (err) {
                console.log(err)
                return res.status(400).json({ message: "Upload Request Validation Failed" });
            } else if (!req.body.name) {
                return res.status(400).json({ message: "No track name in request body" });
            }

            let trackName = req.body.name;

            // Covert buffer to Readable Stream
            const readableTrackStream = new Readable();
            readableTrackStream.push(req.file.buffer);
            readableTrackStream.push(null);


            let bucket = new mongodb.GridFSBucket(db, {
                bucketName: 'tracks'
            });

            let uploadStream = bucket.openUploadStream(trackName);
            let id = uploadStream.id;
            readableTrackStream.pipe(uploadStream);

            uploadStream.on('error', (err) => {
                console.log(err)
                client.close()
                return res.status(500).json({ message: "Error uploading file" });
            });

            uploadStream.on('finish', () => {

                db.collection("tracks").insertOne({ username: req.user.username, name: trackName, artist: req.body.artist, _id: id }, (err) => {

                    if (err) throw err;
                    client.close()
                    return res.status(201).json({ message: "File uploaded successfully, stored under Mongo ObjectID: " + id });
                });


            });
        });
    })
}
/**
 * Extrae el audio guardado en la base de datos para reproducirlo
 */
MongoUtils.streaming = (req, res) => {
    console.log("entro aca")
    const client = new mongodb.MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect((err) => {

        console.log("se conecto")
        let db = client.db(dbName)
        try {
            var trackID = new mongodb.ObjectID(req.params.trackID);
        } catch (err) {
            console.log(err)
            return res.status(400).json({ message: "Invalid trackID in URL parameter. Must be a single String of 12 bytes or a string of 24 hex characters" });
        }
        res.set('content-type', 'audio/mp3');
        res.set('accept-ranges', 'bytes');

        console.log("intenta el bucket")
        let bucket = new mongodb.GridFSBucket(db, {
            bucketName: 'tracks'
        });
        console.log("creo el bucket")

        let downloadStream = bucket.openDownloadStream(trackID);

        downloadStream.on('data', (chunk) => {
            res.write(chunk);
        });

        downloadStream.on('error', (err) => {
            throw err
            res.sendStatus(500);
        });

        downloadStream.on('end', () => {
            res.end();
        });
    });
}

/**
 * Encuentra el objeto en la base de datos
 * object: JSON del objeto a encontrar
 * colName: nombre de la colección en la cual buscar
 
 */
MongoUtils.searchOneGeneric = async function (colName, object) {
    console.log(object, "llega vacio")
    const client = await new mongodb.MongoClient(uri, { useNewUrlParser: true }).connect();
    let find = await client.db(dbName).collection(colName).findOne(object)
    console.log(find, "se ejecuta")
    return find
}

/**
 * Crea el ObjectId para buscar en las colecciones usando el id
 * o: JSON del objeto a encontrar, tiene un atributo _id
 
 */
MongoUtils.createObjectId = (o) => {

    let object = { ...o }
    object._id = new mongodb.ObjectID(o._id);
    return object
}

/**
 * Agrega un objeto a la coleccion especificada
 * object: JSON del objeto a encontrar
 * colName: nombre de la colección en la cual buscar
 * cbk: callback
 
 */
MongoUtils.insertOneGeneric = (cbk, colName, object) => {
    const client = new mongodb.MongoClient(uri, { useNewUrlParser: true });
    console.log("base de datos insert", object);
    client.connect((err) => {
        if (err) throw err;
        if (object == undefined) {
            throw new Error("Object can't be null or udefined");
        }
        const collection = client.db(dbName).collection(colName);

        collection.insertOne(object, (err, result) => {
            if (err) throw err;
            cbk(result.ops);
            client.close();
        });
    });
};

/**
 * Retorna todos los objetos filtrados de la coleccion especificada
 * query: JSON del objeto a encontrar
 * colName: nombre de la colección en la cual buscar
 * cbk: callback
 */
MongoUtils.findAll = async function (cbk, colName, query) {

    const client = await new mongodb.MongoClient(uri, { useNewUrlParser: true }).connect();
    let finds = await client.db(dbName).collection(colName).find(query)
    let array = await finds.toArray()

    cbk(array)

}

/**
 * Agrega una canción a la lista especificada en el query
 * query: JSON con el id de la lista a agregar
 * colName: nombre de la colección de las playlist
 * object: canción a agregar a la playlist
 * cbk: callback
 */
MongoUtils.UpdateOne = (cbk, colName, query, object) => {

    const client = new mongodb.MongoClient(uri, { useNewUrlParser: true });
    console.log("base de datos insert", object);
    client.connect((err) => {
        if (err) throw err;
        if (object == undefined) {
            throw new Error("Object can't be null or udefined");
        }

        const collection = client.db(dbName).collection(colName);
        console.log(object, "antes de meter")
        collection.updateOne(query, { $push: { tracks: object } }, (err, result) => {
            if (err) throw err;
            //console.log(result)
            cbk()
            client.close()
        })
    })
}



module.exports = MongoUtils;