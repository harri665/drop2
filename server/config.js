const path = require('path');

try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  // No server/.env — rely on the real environment (e.g. docker-compose).
}

const PIN = process.env.DROP_PIN ?? '';
if (!/^\d{6}$/.test(PIN)) {
  console.error('DROP_PIN must be set to a 6-digit number. See .env.example.');
  process.exit(1);
}

// Express "trust proxy": a hop count ("1" behind the bundled nginx), true/false, or a subnet list.
function parseTrustProxy(value) {
  if (!value) return 'loopback';
  if (/^\d+$/.test(value)) return Number(value);
  if (value === 'true' || value === 'false') return value === 'true';
  return value;
}

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));

module.exports = {
  PORT: Number(process.env.PORT) || 3001,
  PIN,
  JWT_SECRET: process.env.JWT_SECRET || '',
  TOKEN_DAYS: Number(process.env.TOKEN_DAYS) || 30,
  MAX_UPLOAD_MB: Number(process.env.MAX_UPLOAD_MB) || 500,
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),
  DATA_DIR,
  UPLOAD_DIR: path.join(DATA_DIR, 'uploads'),
};
