require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Sanitize request body keys to prevent NoSQL operator injection
function sanitizeBody(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    clean[key] = typeof obj[key] === 'object' ? sanitizeBody(obj[key]) : obj[key];
  }
  return clean;
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Sanitize after body is parsed
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = sanitizeBody(req.body);
  next();
});
// Serve built React client if available
const clientDist = path.join(__dirname, 'client-dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// Attach io to each request so routes can emit
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/files', require('./routes/files'));
app.use('/api/shares', require('./routes/shares'));

// Error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Catch-all: serve React app for client-side routing (after API routes)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'client-dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Build the client first: cd client && npm run build');
  }
});

// Socket.IO auth
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Ensure upload dirs exist
['uploads/images', 'uploads/files'].forEach(dir => {
  fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
});

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  // Seed admin grid pattern on first run
  const Config = require('./models/Config');
  const existing = await Config.findOne({ key: 'gridHash' });
  if (!existing) {
    const seq = process.env.INITIAL_GRID_SEQUENCE || '1,5,9';
    const hash = await bcrypt.hash(seq, 12);
    await Config.create({ key: 'gridHash', value: hash });
    console.log(`Grid pattern seeded. Default sequence: ${seq}`);
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`drop2 running on http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
