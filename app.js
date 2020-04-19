// Module
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const striptags = require('striptags');
const uuidv5 = require('uuid/v5');

// Constantes
const app = express();
const server = http.Server(app);
const io = socketio(server);
const chemin = {
    root: __dirname + '/views'
};

// Variables globales
let usernames = [];
let tableauJoueurs = [];
let tableauJoueursMongo = [];
let userID = uuidv5.DNS;


// Mongodb
var MongoClient = require('mongodb').MongoClient;
const session = require('express-session');
const connectMongo = require('connect-mongo');
const dbName = 'session-joueur';
const url = 'mongodb+srv://admin:Alex002@cluster0-yisoi.mongodb.net/test?retryWrites=true&w=majority';
const client = new MongoClient(url);
const MongoStore = connectMongo(session);
const options = {
    store: new MongoStore({
        url: "mongodb+srv://admin:Alex002@cluster0-yisoi.mongodb.net/session?retryWrites=true&w=majority"
    }),
    secret: "blablabla",
    saveUninitialized: true,
    resave: false
}

// Middlewares
app.use(express.static(chemin.root));
app.use(session(options));


// Routes
app.get('/', (req, res) => {
    // req.session.uuid = userID;
    // console.log('je suis la')
    // MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
    //     if (err) {
    //         return;
    //     }
    //     let db = client.db(dbName);
    //     let collection = db.collection('sessions');
    //     let insertion = {};
    //     insertion.uuid = userID;

    //     collection.insertOne(insertion, function (err, data) {
    //         tableauJoueursMongo.push(data);
    //         client.close();
            res.sendFile('/index.html', chemin, {data: tableauJoueursMongo});
        // })
    // })
})


// IO
io.on('connection', function (socket) {
    console.log('a user connected ' + socket.id);

    // partie bille et barreJoueur
    var barreJoueur1 = {
        top: 42,
        left: 2
    }

    var barreJoueur2 = {
        top: 42,
        left: 98
    }

    var bille = {
        top: 50,
        left: 49.75
    }

    var monObjet = {
        bille: bille,
        barreJoueur1: barreJoueur1,
        barreJoueur2: barreJoueur2
    }

    socket.emit("bille", monObjet, tableauJoueurs);

    socket.on("deplacementBille", function (haut, cote) {
        socket.emit("deplacementBille", haut, cote);
        socket.broadcast.emit("deplacementBille", haut, cote);
    })

    socket.on("deplacementHautJ1", function (haut) {
        socket.emit("deplacementHautJ1", haut);
        socket.broadcast.emit("deplacementHautJ1", haut);
    })

    socket.on("deplacementBasJ1", function (haut) {
        socket.emit("deplacementBasJ1", haut);
        socket.broadcast.emit("deplacementBasJ1", haut);
    })

    socket.on("deplacementHautJ2", function (haut) {
        socket.emit("deplacementHautJ2", haut);
        socket.broadcast.emit("deplacementHautJ2", haut);
    })

    socket.on("deplacementBasJ2", function (haut) {
        socket.emit("deplacementBasJ2", haut);
        socket.broadcast.emit("deplacementBasJ2", haut);
    })

    socket.on("scoreJoueur1", function (scoreJ1) {
        socket.emit("scoreJoueur1", scoreJ1);
        socket.broadcast.emit("scoreJoueur1", scoreJ1);
    })

    socket.on("scoreJoueur2", function (scoreJ2) {
        socket.emit("scoreJoueur2", scoreJ2);
        socket.broadcast.emit("scoreJoueur2", scoreJ2);
    })

    socket.on("reset", function (haut, cote) {
        socket.emit("reset", haut, cote);
        socket.broadcast.emit("reset", haut, cote);
    })

    // Traitement pour l'assignation d'un username
    socket.on('setUsername', (usernameWanted) => {
        // traitement de la chaine de caractère
        usernameWanted = striptags(usernameWanted.trim());

        // Vérification de l'unicité de l'username
        let usernameTaken = false;
        for (let socketid in usernames) {
            if (usernames[socketid] == usernameWanted) {
                usernameTaken = true;
            }
        }

        let timeFakeLoading = 0;
        setTimeout(() => {
            // Traitement final
            if (usernameTaken) {
                socket.emit('rejectUsername', usernameWanted);
            } else if (usernameWanted == '') {
                socket.emit('emptyUsername', usernameWanted);
            } else if (tableauJoueurs.length == 2) {
                socket.emit('playerMax', tableauJoueurs);
            } else {
                socket.join('users', () => {
                    usernames[socket.id] = usernameWanted;
                    tableauJoueurs.push({name: usernameWanted, id: socket.id});
                    console.log(tableauJoueurs);
                    socket.emit('acceptUsername', usernameWanted, tableauJoueurs, getUsernames());
                    socket.broadcast.emit('acceptUsername', usernameWanted, tableauJoueurs, getUsernames());
                    socket.to('users').emit('newUser', usernameWanted, getUsernames());
                    socket.emit("tableauJoueurs", tableauJoueurs);
                    socket.broadcast.emit("tableauJoueurs", tableauJoueurs);
                });
            }
        }, timeFakeLoading);
    })

    socket.on('changementNom', (tableauJoueurs) => {
        socket.to('users').emit('changementJoueur2', tableauJoueurs)
    })

    // Déconnexion de l'utilisateur
    socket.on('disconnect', (haut, cote) => {
        console.log('disconnected ' + socket.id);
        if (usernames[socket.id]) {
            let nom = usernames[socket.id].trim();
            console.log(usernames[socket.id]);
            console.log(tableauJoueurs[0].name)
            delete usernames[socket.id];

            if (nom === tableauJoueurs[0].name) {
                tableauJoueurs.shift(tableauJoueurs);
                console.log('suppression du j1')
                console.log(tableauJoueurs);
                socket.broadcast.emit('actualisationPlayer', tableauJoueurs, nom);
                socket.emit('resetDeconnexion', haut, cote);
                socket.broadcast.emit('resetDeconnexion', haut, cote);
            } else {
                tableauJoueurs.pop(tableauJoueurs);
                console.log('suppression du j2')
                console.log(tableauJoueurs);
                socket.broadcast.emit('actualisationPlayer', tableauJoueurs, nom);
                socket.emit('resetDeconnexion', haut, cote);
                socket.broadcast.emit('resetDeconnexion', haut, cote);
            }

            socket.to('users').emit('leftUser', getUsernames());
            console.log('username deleted');
        }
    })
})

// Lancement de l'application
server.listen(5234, () => console.log("Serveur ouvert sur le port 5234"));

// Renvoie un array contenant uniquement les usernames sans index
function getUsernames() {
    let users = [];
    for ( let socketid in usernames) {
        users.push(usernames[socketid]);
    }
    return users;
}