const mongodb = require("mongodb");
const bcrypt = require("bcrypt");
const multer = require('multer');

/**
 * NodeJS Module dependencies.
 */
const { Readable } = require('stream');

const saltRounds = 10;

const MongoUtils = {},
    dbName = "inalambria",
    uri = process.env.uri || "mongodb+srv://admin:htmlcap27@cluster.cgnmp.mongodb.net/inalambria?retryWrites=true&w=majority";;


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



MongoUtils.uploadSong = (req, res) => {
    const client = new mongodb.MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect((err) => {


        let db = client.db(dbName)


        const storage = multer.memoryStorage()
        const upload = multer({ storage: storage, limits: { fileSize: 6000000 } });
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


MongoUtils.searchOneGeneric = async function (colName, object) {
    console.log(object, "llega vacio")
    const client = await new mongodb.MongoClient(uri, { useNewUrlParser: true }).connect();
    let find = await client.db(dbName).collection(colName).findOne(object)
    console.log(find, "se ejecuta")
    return find
}

MongoUtils.createObjectId = (o) => {

    let object = {...o}
    object._id = new mongodb.ObjectID(o._id);
    return object
}

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


MongoUtils.UpdateOne = (cbk, colName, query, object) => {

    const client = new mongodb.MongoClient(uri, { useNewUrlParser: true });
    console.log("base de datos insert", object);
    client.connect((err) => {
        if (err) throw err;
        if (object == undefined) {
            throw new Error("Object can't be null or udefined");
        }

        const collection = client.db(dbName).collection(colName);

        collection.updateOne(query, { $push: { tracks: object } }, () => {
            cbk()
            client.close()
        })
    })
}



module.exports = MongoUtils;