/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

var api = require('./api');
var http = require('http');
var crypto = require('crypto');
 
'use strict';

var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var app = express();
var router = express.Router();
// this session will be used to save the oAuth token
app.use(cookieParser());
app.set('trust proxy', 1) // trust first proxy - HTTPS on Heroku 
app.use(session({
    secret: 'autodeskforge',
    cookie: {
        httpOnly: true,
        secure: (process.env.NODE_ENV === 'production'),
        maxAge: 1000 * 60 * 60 // 1 hours to expire the session and avoid memory leak
    },
    resave: false,
    saveUninitialized: true
}));

//var express = require('express');
var api = require('./api');
var http = require('http');
var crypto = require('crypto');

//#################Adams Code#############################
//###############################################################
// prepare server routing
app.use('/', express.static(__dirname + '/html')); // redirect static calls
//app.use('/js', express.static(__dirname + '/html/js')); // redirect static calls
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect static calls
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect static calls
app.use('/js', express.static(__dirname + '/node_modules/jstree/dist')); // redirect static calls
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect static calls
app.use('/fonts', express.static(__dirname + '/node_modules/bootstrap/dist/fonts')); // redirect static calls
//app.set('port', process.env.PORT || 3000); // main port// Already using port 5000
// CONFIG

////////////////////////////////

////////////////////////////////
///*
// prepare our API endpoint routing
//var forgeapis = require('forge-apis');
var oauth = require('./oauth');
var dm = require('./data.management');
var md = require('./model.derivative');
app.use('/', oauth); // redirect oauth API calls
app.use('/dm', dm); // redirect our Data Management API calls
app.use('/md', md); // redirect our Data Management API calls

module.exports = app;


var port = process.env.PORT || 3000;
var forgeapis = require('forge-apis');
//############################### OAuth code ######################

//###############################################################

//############### Keans code ####################

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    next();
});
//var port = process.env.PORT || 5000;
//loading index2.html 
//adam app.use('/', express.static(__dirname + '/html'));
//adam app.use('/v2', express.static(__dirname + '/html/index2.html'));

app.get('/api/token', api.getToken);
app.get('/api/uploadtoken', api.getUploadToken);
app.get('/api/sessionId', function(req, res) {  
    var sessionId;  
    do {
        sessionId = randomValueBase64(6);
        console.log("generated session id: " + sessionId);
    }
    while (sessionIds.indexOf(sessionId) > -1);  
    res.json(sessionId);
});

app.get('/join', function(req, res) {
  var id = req.query.id;
  res.redirect('/participant.html?session=' + id);
});

// Currently only return the URN - could also return
// the various explode, zoom factors, etc.
app.get('/api/getSession/:id', function(req, res) {  
    var sessionId = req.params.id;
    var idx = sessionIds.indexOf(sessionId);
    res.json(idx < 0 ? "" : models[idx]);
});

var server = http.createServer(app);
server.listen(port);
console.log('Listening on port ' + port + '...');

var sessionIds = [];
var models = [];
var zoomFactors = [];
var explodeFactors = [];
var isolateIds = [];
var hideIds = [];
var showIds = [];
var sectionPlanes = [];

var defZoom = null;
var defExplode = 0;
var defIsolate = [];
var defHide = [];
var defShow = [];
var defSection = [];

// WEB SOCKETS
var io = require('socket.io')(server);
io.on('connection', function(socket) {
    console.log('a user connected (id=' + socket.id +')');

    socket.on('create-session', function(session) {
        console.log('session created (id=' + session.id +')');
        // Add our session info to the beginning of our various arrays
        sessionIds.unshift(session.id);
        models.unshift(null);
        zoomFactors.unshift(defZoom);
        explodeFactors.unshift(defExplode);
        isolateIds.unshift(defIsolate);
        hideIds.unshift(defHide);
        showIds.unshift(defShow);
        sectionPlanes.unshift(defSection);
    });
    
    socket.on('join-session', function(session) {
        console.log('user joined session (id=' + session.id +')');
        var idx = sessionIds.indexOf(session.id);
        if (idx > -1) {
            
            // Add our user to the room for this session
            socket.join(session.id);
            
            if (models[idx]) {
                // Bring this user up to speed with the state of the session
                emitDirectAndLog(socket, { name: 'load', value: models[idx] });
                if (zoomFactors[idx] !== defZoom) {
                    emitDirectAndLog(socket, { name: 'zoom', value: zoomFactors[idx] });
                }
                if (explodeFactors[idx] > defExplode) {
                    emitDirectAndLog(socket, { name: 'explode', value: explodeFactors[idx] });
                }
                if (isolateIds[idx] !== defIsolate) {
                    emitDirectAndLog(socket, { name: 'isolate', value: isolateIds[idx] });
                }
                if (hideIds[idx] !== defHide) {
                    emitDirectAndLog(socket, { name: 'hide', value: hideIds[idx] });
                }
                if (showIds[idx] !== defShow) {
                    emitDirectAndLog(socket, { name: 'show', value: showIds[idx] });
                }
                if (sectionPlanes[idx] !== defSection) {
                    emitDirectAndLog(socket, { name: 'section', value: sectionPlanes[idx] });
                }
            }
        }
        else {
            console.log('could not find session (id=' + session.id +')');
            emitDirectAndLog(socket, { name: 'load' });
        }
    });

    socket.on('close-session', function(session) {        
        var idx = sessionIds.indexOf(session.id);
        if (idx > -1) {
            // Clear the model for participants
            emitToGroupAndLog({ session: session.id, name: 'load', value: '' });
            
            // Clean up state
            sessionIds.splice(idx, 1);
            models.splice(idx, 1);
            zoomFactors.splice(idx, 1);
            explodeFactors.splice(idx, 1);
            isolateIds.splice(idx, 1);
            hideIds.splice(idx, 1);
            showIds.splice(idx, 1);
            sectionPlanes.splice(idx, 1);

            console.log('session closed (id=' + session.id +')');
        }
    });
    
    socket.on('disconnect', function() {
        console.log('a user disconnected (id=' + socket.id +')');
    });

    socket.on('lmv-command', function(command) {
        var idx = sessionIds.indexOf(command.session);
        if (idx > -1) {
            if (command.name === 'load') {
                // Create our default settings for the model
                models[idx] = command.value;
                zoomFactors[idx] = defZoom;
                explodeFactors[idx] = defExplode;
                isolateIds[idx] = defIsolate;
                hideIds[idx] = defHide;
                showIds[idx] = defShow;
                sectionPlanes[idx] = defSection;

                // Emit the load command
                emitToGroupAndLog(command);

                // Emit the defaults to the group participants (no need for hide/show)
                emitToGroupAndLog({ session: command.session, name: 'zoom', value: defZoom });
                emitToGroupAndLog({ session: command.session, name: 'explode', value: defExplode });
                emitToGroupAndLog({ session: command.session, name: 'isolate', value: defIsolate });
                emitToGroupAndLog({ session: command.session, name: 'section', value: defSection });                
            }
            else {
                if (command.name === 'zoom') {
                    zoomFactors[idx] = command.value;
                }
                else if (command.name === 'explode') {
                    explodeFactors[idx] = command.value;
                }
                else if (command.name === 'isolate') {
                    isolateIds[idx] = command.value;
                    if (command.value == defIsolate) {
                        hideIds[idx] = defHide;
                        showIds[idx] = defShow;
                    }
                }
                else if (command.name === 'hide') {
                    hideIds[idx] = hideIds[idx].concat(command.value);
                    showIds[idx] = stripIds(showIds[idx], command.value);
                }
                else if (command.name === 'show') {
                    showIds[idx] = showIds[idx].concat(command.value);
                    hideIds[idx] = stripIds(hideIds[idx], command.value);
                }
                else if (command.name === 'section') {
                    sectionPlanes[idx] = command.value;
                }
                emitToGroupAndLog(command);
            }
        }
        else {
            console.log('could not find session (id=' + command.session +')');
        }
    });
});

function stripIds(existing, ids) {
    for (var i = 0; i < ids.length; i++) {
        var idx = existing.indexOf(ids[i]);
        if (idx > -1) {
            existing.splice(idx, 1);
        }
    }
    return existing;
}

function emitDirectAndLog(socket, command) {
    socket.emit('lmv-command', command);
    console.log(command);
}

function emitToGroupAndLog(command) {
    io.to(command.session).emit('lmv-command', command);
    console.log(command);
}

function randomValueBase64 (len) {
    return crypto.randomBytes(Math.ceil(len * 3 / 4))
        .toString('base64')   // convert to base64 format
        .slice(0, len)        // return required number of characters
        .replace(/\+/g, '0')  // replace '+' with '0'
        .replace(/\//g, '0'); // replace '/' with '0'
}