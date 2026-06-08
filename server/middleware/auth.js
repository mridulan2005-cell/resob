// Authentication has been removed. Every request is silently treated as
// the default seeded user so existing routes that read `req.user` keep
// working without any code changes. JWT helpers are kept for compatibility
// with the (now-unused) /auth routes but are never required.

const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'resobin_secret_key_2026';

// Resolve a default user once at startup. Falls back to a stub if the
// users table is empty so the server still boots.
let DEFAULT_USER = null;
try {
  DEFAULT_USER = db.prepare(
    "SELECT id, email, name, roll_number, department, year FROM users ORDER BY created_at ASC LIMIT 1"
  ).get();
} catch {
  /* table may not exist yet — fall back below */
}
if (!DEFAULT_USER) {
  DEFAULT_USER = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'guest@iitb.ac.in',
    name: 'Guest',
    roll_number: '00B00000',
    department: 'Computer Science',
    year: 3,
  };
}

function authenticate(req, _res, next) {
  req.user = DEFAULT_USER;
  next();
}

const optionalAuth = authenticate; // identical behaviour now

module.exports = { authenticate, optionalAuth, JWT_SECRET };
