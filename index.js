'use strict';

var WebSocket = require('ws');
var request = require('request');
var jwt = require('jsonwebtoken');

//put the extension secret one level up to prevent accidental inclusion in repos
var secret = require('../secret');

var port = 9443;
var debug = true;

const wss = new WebSocket.Server({
  port: port
});

function logClient(client, message) {
  console.log('[' + client + '] ' + message);
}

function handleAuth(ws, client, token) {
  var payload = null;
  
  try {
    payload = jwt.verify(token, secret);
  } catch (err) {
    logClient(client, 'Invalid JWT; closing connection: ' + err);
    ws.send(JSON.stringify({id: 'error', data: {reason: 'auth', message: 'Invalid authorization token'}}));
    ws.close();
    return;
  }
  
  logClient(client, 'JWT verified, user: ' + payload.user_id + ', channel: ' + payload.channel_id);
}

wss.on('connection', (ws, req) => {
  //get remote client from proxy forwarding headers or if they're not set, the typical remote address.
  //This is originally running behind an apache proxy
  var client = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  
    
  ws.on('message', (m) => {
    
    var msg = JSON.parse(m);

    if (debug) {
      logClient(client, '(' + msg.id + ') ' + msg.data);
    }
    
    switch (msg.id) {
      case 'auth':  //sent immediately by client on connection. Data is JWT from Twitch
        handleAuth(ws, client, msg.data);
        break;
    }
  });
});

