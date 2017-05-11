#!/usr/bin/env node

const WebSocketServer = require('websocket').server;
const http = require('http');
const CoordinationServer = require('./build/CoordinationServer').default;

const server = http.createServer(function(request, response) {
  console.log((new Date()) + ' Received request for ' + request.url);
  response.writeHead(404);
  response.end();
});

server.listen(8080, function() {
  console.log((new Date()) + ' Server is listening on port 8080');
});

const CS = new CoordinationServer({
  wsServer: new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
  })
});
