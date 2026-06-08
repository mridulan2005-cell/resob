const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/events
router.get('/', authenticate, (req, res) => {
  try {
    const events = db.prepare(`
      SELECT e.*, c.code as course_code, c.name as course_name
      FROM events e LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.starts_at ASC
    `).all(req.user.id);
    res.json({ events });
  } catch (err) {
    console.error('Events list error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/events
router.post('/', authenticate, (req, res) => {
  try {
    const { title, description, location, starts_at, ends_at, repeat_rule, course_id } = req.body;
    if (!title || !starts_at) return res.status(400).json({ error: 'title and starts_at are required' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO events (id, user_id, course_id, title, description, location, starts_at, ends_at, repeat_rule)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, course_id || null, title, description || null,
           location || null, starts_at, ends_at || null, repeat_rule || null);

    const created = db.prepare(`
      SELECT e.*, c.code as course_code, c.name as course_name
      FROM events e LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.id = ?
    `).get(id);
    res.status(201).json(created);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PATCH /api/events/:id
router.patch('/:id', authenticate, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const fields = ['title', 'description', 'location', 'starts_at', 'ends_at', 'repeat_rule', 'course_id'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
    }
    if (!updates.length) return res.json(event);
    params.push(req.params.id);
    db.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare(`
      SELECT e.*, c.code as course_code, c.name as course_name
      FROM events e LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.id = ?
    `).get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Patch event error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', authenticate, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
