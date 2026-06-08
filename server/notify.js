const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function notify(userId, { type, title, body, link }) {
  if (!userId) return;
  const id = uuidv4();
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body, link)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, type, title, body || null, link || null);
  return id;
}

module.exports = { notify };
