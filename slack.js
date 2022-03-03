const express = require('express');
const app = express();
const socketio = require('socket.io');

let namespaces = require('./data/namespaces');

app.use(express.static(__dirname + '/public'));

app.use('/', (req, res) => {
    res.redirect('/chat.html')
})

const PORT = process.env.PORT || 9000

const expressServer = app.listen(PORT);
console.log(`Listening on ${PORT}`)

const io = socketio(expressServer);

io.on('connection', (socket) => {
    // build an array to send back with the img and endpoint for each namespace
    let nsData = namespaces.map(ns => ({ img: ns.img, endpoint: ns.endpoint }))

    // Send the nsData to the client. We need to use the socket, NOT io, because we want it to
    // go to just this client
    socket.emit('nsList', nsData)
})

// loop through all namespaces and listen for a connection
namespaces.forEach((namespace) => {
    io.of(namespace.endpoint).on('connection', (nsSocket) => {
        const username = nsSocket.handshake.query.username
        // A socket has connect to one of our namespaces send that group info back
        nsSocket.emit('nsRoomLoad', namespace.rooms)
        nsSocket.on('joinRoom', (roomToJoin, numberOfUsersCallback) => {
            const roomToLeave = Object.keys(nsSocket.rooms)[1]
            nsSocket.leave(roomToLeave)
            updateUsersInRoom(namespace, roomToLeave)
            nsSocket.join(roomToJoin)
            // io.of(namespace.endpoint).in(roomToJoin).clients((err, clients) => {
            //     numberOfUsersCallback(clients.length)
            // })
            const nsRoom = namespace.rooms.find((room) => {
                return room.roomTitle === roomToJoin
            })
            nsSocket.emit('historyCatchup', nsRoom.history)
            updateUsersInRoom(namespace, roomToJoin)
            // nsSocket.in(roomToJoin).on('disconnect', (reason) => {
            //     io.of(namespace.endpoint).in(roomToJoin).clients((err, clients) => {
            //         io.of(namespace.endpoint).in(roomToJoin).emit('updateMembers', clients.length)
            //     })
            // })
        })
        nsSocket.on('newMessageToServer', (msg) => {
            const fullMsg = {
                text: msg.text,
                time: Date.now(),
                username,
                avatar: "https://via.placeholder.com/30"
            }

            // Send this message to all the rooms that this socket is in

            // User will always be in the second room in the object list
            // this is because the socket always joins it's own room on connection
            // get the keys
            const roomTitle = Object.keys(nsSocket.rooms)[1]
            // We need to find the room object for this room
            const nsRoom = namespace.rooms.find((room) => {
                return room.roomTitle === roomTitle
            })
            nsRoom.addMessage(fullMsg)
            io.of(namespace.endpoint).to(roomTitle).emit('messageToClients', fullMsg)
        })
    })
})

function updateUsersInRoom(namespace, roomToJoin) {
    // Send back number of users connected to all sockets connected
    io.of(namespace.endpoint).in(roomToJoin).clients((err, clients) => {
        io.of(namespace.endpoint).in(roomToJoin).emit('updateMembers', clients.length)
    })
}
