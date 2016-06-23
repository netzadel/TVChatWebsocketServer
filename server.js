/*
 This is the server side web socket part of the TVChat application.
 It is written in NodeJS and uses Socket.io as web socket enhancement, express as lightweight
 web server and backbone as model structure tool
 */


//Basic configurations

var PORT = 8087;

var request = require('request');
var cheerio = require('cheerio');
//var URL = require('url-parse');

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


//This route produces a list of channels from hoerzu, creates an array and sends it back.
app.get('/channels', function (req, res) {
    var allLinkedChannels = [];
    var pageToVisit = "http://www.hoerzu.de/text/tv-programm/jetzt.php";
    request(pageToVisit, function (error, response, body) {
        if (error) {
            console.log("Error: " + error);
        }
        // Check status code (200 is HTTP OK)
        if (response.statusCode === 200) {
            // Parse the document body
            var $ = cheerio.load(body);
            var txt = cheerio.text($('body'));
            var untaggedLinks = txt.split('\n');
            //enhance the String class with an additional function called contains()
            String.prototype.contains = function(it) { return this.indexOf(it) != -1; };
            for (var i = 0; i < untaggedLinks.length; i++) {
                var channelInfo = untaggedLinks[i];
                if (channelInfo.contains('*')) {
                    var channelTime = channelInfo.split(',').pop().substring(1);
                    var channelName = channelInfo.split(',').shift().substring(2);
                    var channelProgram = channelInfo.split(',').slice(1, -1).toString().substring(1);
                    allLinkedChannels.push({
                        'channelName:': channelName,
                        'channelProgram': channelProgram,
                        'channelTime': channelTime
                    });
                }
            }
            res.json(allLinkedChannels);
        }
    });
});


/*This is the socket logic,
 all web socket connection settings are made here*/
io.on('connection', function (socket) {
    //Emit the channels array
    var userNameList = [];
    for (i = 0, len = userList.length; i < len; i++) {
        var user = userList[i];
        userNameList.push(user.username);
    }
    var data = {'userlist': userNameList, 'channels': channels};
    socket.emit('setup', data);


    //Listens for new user
    socket.on('new user', function (data) {
        console.log("new user: " + data.username + "/" + data.channel);
        userList.push({'username': data.username, 'currentRoom': data.channel, 'socket': socket});
        socket.join(data.channel);
        io.in(data.channel).emit('user joined', data);
    });


    //Listen to channel user request request
    socket.on('channel user', function (data) {
        var userNameList = [];
        for (i = 0, len = userList.length; i < len; i++) {
            var user = userList[i];
            if (user.currentRoom == data.channel) {
                userNameList.push(user.username);
            }
        }
        var response = {'userlist': userNameList};
        socket.emit('user in channel', response);
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
        for (var i = 0, len = userList.length; i < len; i++) {
            if (socket.id == userList[i].socket.id) {
                console.log(userList[i].username + ' disconnected from server. ' + userList.length + ' users remaining.');
                io.in(userList[i].currentRoom).emit('user disconnected', userList[i].username);
                userList.splice(i, 1);
                break;
            }
        }
    });
});


// General server settings
server.listen(PORT);
console.log('TVChat WebSocket online on port ' + PORT);
