"use strict";

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
    resave: true
}

// Middlewares
app.use(express.static(chemin.root));
app.use(session(options));


// Routes
app.get('/', (req, res) => {
    req.session.uuid = userID;
    res.render('/index.html', options);
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

    // Envoie données barre joueur et bille
    socket.emit("bille", monObjet, tableauJoueurs);

    // Envoie des données de changement
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


    // liste joueurs
    socket.on('listeJoueurs', () => {
        MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
            if (err) {
                return;
            }    
            
            let db = client.db(dbName);
            let collection = db.collection('sessions');
            let name = db.collection('sessions').name;
            collection.find(name).toArray()
            .then(items => {
                console.log(`Successfully found ${items.length} documents.`)
                socket.emit('addListPlayer', items)
              })
            .catch(err => console.error(`Failed to find documents: ${err}`))
        })
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
                    MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
                        if (err) {
                            return;
                        }
                        let db = client.db(dbName);
                        let collection = db.collection('sessions');
                        let insertion = {};
                        insertion.name = usernameWanted;
                        insertion.uuid = userID;
                        console.log(insertion.uuid)
                
                        
                        collection.insertOne(insertion, function (err) {
                            client.close();
                        })
                    })
                    usernames[socket.id] = usernameWanted;
                    tableauJoueurs.push({name: usernameWanted, id: socket.id});
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
            
            delete usernames[socket.id];

            if (nom === tableauJoueurs[0].name) {
                tableauJoueurs.shift(tableauJoueurs);
                socket.broadcast.emit('actualisationPlayer', tableauJoueurs, nom);
                socket.emit('resetDeconnexion', haut, cote);
                socket.broadcast.emit('resetDeconnexion', haut, cote);
            } else {
                tableauJoueurs.pop(tableauJoueurs);
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
server.listen(process.env.PORT || 5234, () => console.log("Serveur ouvert sur le port 5234"));

// Renvoie un array contenant uniquement les usernames sans index
function getUsernames() {
    let users = [];
    for ( let socketid in usernames) {
        users.push(usernames[socketid]);
    }
    return users;
}