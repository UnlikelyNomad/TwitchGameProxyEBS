'use strict';

var WebSocket = require('ws');
var port = 9443;

const wss = new WebSocket.Server({
  port: port
});

wss.on('connection', (ws, req) => {
  ws.on('message', (msg) => {
    var client = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log('[' + client + '] ' + msg);
  });
});

