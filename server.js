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

var channels = ["General", "ARD", "ZDF", "RTL", "KABEL1", "PRO7"];
var userList = [];


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
app.get('/channels', function (req, res) {
    //Find
    res.json(channels);
});


/*This is the socket logic,
 all web socket connection settings are made here*/

io.on('connection', function (socket) {
    //Emit the channels array

    userNameList = [];

    for (i = 0, len = userList.length; i < len; i++) {
        user = userList[i];
        userNameList.push(user.username);
    }


    data = {'userlist': userNameList, 'channels': channels}
    socket.emit('setup', data);

    //Listens for new user
    socket.on('new user', function (data) {
        console.log("new user: " + data.username + "/" + data.channel);

        userList.push({'username': data.username, 'currentRoom': data.channel, 'socket': socket});
        socket.join(data.channel);
        //Tell all those in the channel that a new user joined
        io.in(data.channel).emit('user joined', data);
    });

    //Listens for switch channel
    socket.on('switch channel', function (data) {
        //Handles joining and leaving channels
        console.log(data);
        socket.leave(data.oldChannel);
        socket.join(data.newChannel);
        io.in(data.oldChannel).emit('user left', data);
        io.in(data.newChannel).emit('user joined', data);

    });

    //Listens for a new chat message
    socket.on('new message', function (data) {
        console.log(data);
        io.in(data.channel).emit('message created', data);
    });

    //Listens for disconnect
    socket.on('disconnect', function (data) {
        console.log(userList);
        for (var i = 0, len = userList.length; i < len; i++) {
            if(socket.id == userList[i].socket.id){
                console.log(userList[i].username + ' disconnected from server');
                io.in(userList[i].currentRoom).emit('user disconnected', userList[i].username);
                userList.splice(i,1);
                break;
            }
        }
    });
});


// General server settings
server.listen(PORT);
console.log('TVChat WebSocket online on port ' +  PORT);
