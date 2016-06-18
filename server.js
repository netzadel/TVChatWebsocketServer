/*
 This is the server side web socket part of the TVChat application.
 It is written in NodeJS and uses Socket.io as web socket enhancement, express as lightweight
 web server and backbone as model structure tool
 */


//Basic configurations

var PORT = 8087;

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);


//Logic relevant variables

var defaultRoom = 'General';
var rooms = ["General", "ARD", "ZDF", "RTL", "KABEL1", "PRO7"];


//Security settings

app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
    if (req.method == 'OPTIONS') {
        res.status(200).end();
    } else {
        next();
    }
});

//URL configuration

app.get('/', function (req, res) {
    //send the index.html in our public directory
    res.sendFile('hello.html', {root: __dirname + '/public'});
});

//This route produces a list of chat as filtered by 'room' query
app.get('/rooms', function (req, res) {
    //Find
    res.json(rooms);
});


/*This is the socket logic,
 all web socket connection settings are made here*/

io.on('connection', function (socket) {
    //Emit the rooms array
    socket.emit('setup', {
        rooms: rooms
    });

    //Listens for new user
    socket.on('new user', function (data) {
        console.log("new user: " + data.username + "/" + data.channel);
        //New user joins the default room
        socket.join(data.channel);
        //Tell all those in the room that a new user joined
        io.in(data.channel).emit('user joined', data);
    });

    //Listens for switch channel
    socket.on('switch room', function (data) {
        //Handles joining and leaving rooms
        //console.log(data);
        socket.leave(data.oldRoom);
        socket.join(data.newRoom);
        io.in(data.oldRoom).emit('user left', data);
        io.in(data.newRoom).emit('user joined', data);

    });

    //Listens for a new chat message
    socket.on('new message', function (data) {
        //Create message
        // var newMsg = new Chat({
        //     username: data.username,
        //     content: data.message,
        //     room: data.room.toLowerCase(),
        //     created: new Date()
        // });
        // //Save it to database
        // newMsg.save(function(err, msg){
        //     //Send message to those connected in the room
        //     io.in(msg.room).emit('message created', msg);
        // });
        console.log(data);
        io.in(data.channel).emit('message created', data);
    });
});


server.listen(PORT);
console.log('TVChat WebSocket online on port ' +  PORT);
