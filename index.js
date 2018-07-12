'use strict';

var WebSocket = require('ws');
var request = require('request');
var JWT = require('jsonwebtoken');

//put the extension secret one level up to prevent accidental inclusion in repos
var secret = require('../secret');

var port = 9443;
var debug = true;

var allConns = [];

const wss = new WebSocket.Server({
  port: port
});

function noop() {}

//constructor function for connections
function Conn(ws, req) {
  //get remote client from proxy forwarding headers or if they're not set, the typical remote address.
  //This is originally running behind an apache proxy
  var client = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  var _this = this;
  
  var jwt = null;
  
  this.close = function() {
    ws.close();
  }
  
  this.log = function(message) {
    console.log('[' + client + '] ' + message);
  }
  
  this.send = function(id, data) {
    ws.send(JSON.stringify({id: id, data: data}));
  }
  
  this.user = function() {
    if (jwt) {
      return jwt.user_id;
    }
    
    return null;
  }
  
  this.channel = function() {
    if (jwt) {
      return jwt.channel_id;
    }
    
    return null;
  }
  
  function trySetJWT(token) {
    try {
      jwt = JWT.verify(token, Buffer.from(secret, 'base64'));
    } catch (err) {
      jwt = null;
      
      _this.log('Invalid JWT; closing connection: ' + err);
      _this.send('error', {reason: 'auth', message: 'Invalid authorization token'});
      ws.close();
      return false;
    }
    
    _this.log('JWT verified, user: ' + _this.user() + ', channel: ' + _this.channel());
    return true;
  }
  
  function onMessage(m) {
    var msg = JSON.parse(m);

    if (debug) {
      _this.log(client, '"' + msg.id + '" ' + msg.data);
    }
    
    switch (msg.id) {
      case 'auth':  //sent immediately by client on connection. Data is JWT from Twitch
        trySetJWT(msg.data);
        break;
    }
  }
  
  ws.on('message', onMessage);
}

wss.on('connection', (ws, req) => {
  
  var conn = new Conn(ws, req);
  allConns.push(conn);
  
  ws.on('close', function() {
    allConns.splice(allConns.indexOf(conn), 1);
  }
  
});

