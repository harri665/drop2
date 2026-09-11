const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { PIN, JWT_SECRET, TOKEN_DAYS } = require('./config');

const COOKIE_NAME = 'drop_token';
const TOKEN_TTL_S = TOKEN_DAYS * 24 * 60 * 60;

function loadSecret() {
  if (JWT_SECRET) return JWT_SECRET;
  let secret = db.getSetting('jwt_secret');
  if (!secret) {
    secret = crypto.randomBytes(48).toString('hex');
    db.setSetting('jwt_secret', secret);
  }
  return secret;
}

// Folding the PIN into the signing key means changing DROP_PIN signs out every device.
const signingKey = crypto.createHmac('sha256', loadSecret()).update(PIN).digest();

const sha256 = (value) => crypto.createHash('sha256').update(value).digest();

function pinMatches(candidate) {
  return typeof candidate === 'string' && crypto.timingSafeEqual(sha256(candidate), sha256(PIN));
}

function verifyToken(token) {
  try {
    return jwt.verify(token, signingKey, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

function issueToken(req, res) {
  const token = jwt.sign({ sub: 'owner' }, signingKey, { algorithm: 'HS256', expiresIn: TOKEN_TTL_S });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: TOKEN_TTL_S * 1000,
    path: '/',
  });
}

function tokenFromCookieHeader(header = '') {
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === COOKIE_NAME) return decodeURIComponent(value.join('='));
  }
  return null;
}

function requireAuth(req, res, next) {
  const claims = verifyToken(tokenFromCookieHeader(req.headers.cookie));
  if (!claims) return res.status(401).json({ error: 'Not signed in' });
  req.auth = claims;
  next();
}

// --- Brute-force protection -------------------------------------------------
// A 6-digit PIN only has a million combinations, so wrong guesses are throttled
// per IP, with a global ceiling so rotating IPs doesn't help. Devices already
// holding a token are unaffected by a lockout.

const MAX_FAILS_PER_IP = 5;
const IP_LOCK_MS = 15 * 60 * 1000;
const GLOBAL_MAX_FAILS = 100;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;

const failsByIp = new Map(); // ip -> { count, windowStart, lockedUntil }
let globalFails = []; // timestamps of recent failures

function lockRemaining(ip, now) {
  globalFails = globalFails.filter((t) => now - t < GLOBAL_WINDOW_MS);
  const globalWait = globalFails.length >= GLOBAL_MAX_FAILS ? globalFails[0] + GLOBAL_WINDOW_MS - now : 0;
  const ipWait = Math.max(0, (failsByIp.get(ip)?.lockedUntil ?? 0) - now);
  return Math.max(globalWait, ipWait);
}

// Returns how many attempts this IP has left before it is locked out.
function recordFailure(ip, now) {
  globalFails.push(now);
  let entry = failsByIp.get(ip);
  if (!entry || now - entry.windowStart > IP_LOCK_MS) {
    entry = { count: 0, windowStart: now, lockedUntil: 0 };
    failsByIp.set(ip, entry);
  }
  entry.count += 1;
  if (entry.count >= MAX_FAILS_PER_IP) {
    entry.lockedUntil = now + IP_LOCK_MS;
    entry.count = 0;
    entry.windowStart = entry.lockedUntil;
  }
  return MAX_FAILS_PER_IP - entry.count;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of failsByIp) {
    if (entry.lockedUntil < now && now - entry.windowStart > IP_LOCK_MS) failsByIp.delete(ip);
  }
}, 10 * 60 * 1000).unref();

// --- Routes -----------------------------------------------------------------

const router = express.Router();

router.post('/login', (req, res) => {
  const now = Date.now();
  let wait = lockRemaining(req.ip, now);
  if (wait > 0) {
    return res.status(429).json({ error: 'Too many attempts', retryAfter: Math.ceil(wait / 1000) });
  }

  if (!pinMatches(req.body?.pin)) {
    const attemptsLeft = recordFailure(req.ip, now);
    wait = lockRemaining(req.ip, now);
    if (wait > 0) {
      return res.status(429).json({ error: 'Too many attempts', retryAfter: Math.ceil(wait / 1000) });
    }
    return res.status(401).json({ error: 'Wrong PIN', attemptsLeft });
  }

  failsByIp.delete(req.ip);
  issueToken(req, res);
  res.json({ ok: true });
});

// Also slides the expiry forward, so a device in regular use never has to re-enter the PIN.
router.get('/me', requireAuth, (req, res) => {
  if (req.auth.exp * 1000 - Date.now() < (TOKEN_TTL_S * 1000) / 2) issueToken(req, res);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

module.exports = { router, requireAuth, verifyToken, tokenFromCookieHeader };
