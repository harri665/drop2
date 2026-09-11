const { Server } = require('socket.io');
const { verifyToken, tokenFromCookieHeader } = require('./auth');

let io = null;

function attach(httpServer) {
  io = new Server(httpServer, { path: '/api/socket.io', serveClient: false });

  io.use((socket, next) => {
    if (verifyToken(tokenFromCookieHeader(socket.handshake.headers.cookie))) return next();
    next(new Error('unauthorized'));
  });
}

// Every signed-in device gets every change, so a drop on one shows up on the others instantly.
function broadcast(event, payload) {
  io?.emit(event, payload);
}

function close() {
  io?.close();
}

module.exports = { attach, broadcast, close };
