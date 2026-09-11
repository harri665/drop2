const http = require('http');
const express = require('express');
const multer = require('multer');
const config = require('./config');
const db = require('./db');
const auth = require('./auth');
const realtime = require('./realtime');
const itemsRouter = require('./routes/items');
const shareRouter = require('./routes/share');

const app = express();
app.set('trust proxy', config.TRUST_PROXY);
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', auth.router);
app.use('/api/share', shareRouter);
app.use('/api/items', auth.requireAuth, itemsRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res
      .status(tooBig ? 413 : 400)
      .json({ error: tooBig ? `Files must be under ${config.MAX_UPLOAD_MB} MB` : err.message });
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Too large' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });

  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const server = http.createServer(app);
realtime.attach(server);

server.listen(config.PORT, () => {
  console.log(`Drop server listening on http://localhost:${config.PORT}`);
});

function shutdown() {
  realtime.close();
  server.close();
  db.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
