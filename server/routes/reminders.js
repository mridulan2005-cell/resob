const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/reminders
router.get('/', authenticate, (req, res) => {
  try {
    const { include_completed } = req.query;
    let sql = `
      SELECT r.*, c.code as course_code, c.name as course_name
      FROM reminders r
      LEFT JOIN courses c ON r.course_id = c.id
      WHERE r.user_id = ?
    `;
    const params = [req.user.id];
    if (!include_completed) {
      sql += ' AND r.completed = 0';
    }
    sql += ' ORDER BY r.due_at ASC';
    const reminders = db.prepare(sql).all(...params);
    res.json({ reminders });
  } catch (err) {
    console.error('Reminders list error:', err);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// POST /api/reminders
router.post('/', authenticate, (req, res) => {
  try {
    const { title, description, due_at, course_id } = req.body;
    if (!title || !due_at) return res.status(400).json({ error: 'title and due_at are required' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO reminders (id, user_id, course_id, title, description, due_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, course_id || null, title, description || null, due_at);

    const created = db.prepare(`
      SELECT r.*, c.code as course_code, c.name as course_name
      FROM reminders r LEFT JOIN courses c ON r.course_id = c.id
      WHERE r.id = ?
    `).get(id);
    res.status(201).json(created);
  } catch (err) {
    console.error('Create reminder error:', err);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// PATCH /api/reminders/:id
router.patch('/:id', authenticate, (req, res) => {
  try {
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id);
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
    if (reminder.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const { title, description, due_at, completed, course_id } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined)       { updates.push('title = ?');       params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (due_at !== undefined)      { updates.push('due_at = ?');      params.push(due_at); }
    if (course_id !== undefined)   { updates.push('course_id = ?');   params.push(course_id); }
    if (completed !== undefined) {
      updates.push('completed = ?', 'completed_at = ?');
      params.push(completed ? 1 : 0, completed ? new Date().toISOString() : null);
    }

    if (!updates.length) return res.json(reminder);
    params.push(req.params.id);
    db.prepare(`UPDATE reminders SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare(`
      SELECT r.*, c.code as course_code, c.name as course_name
      FROM reminders r LEFT JOIN courses c ON r.course_id = c.id
      WHERE r.id = ?
    `).get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Patch reminder error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/reminders/:id
router.delete('/:id', authenticate, (req, res) => {
  try {
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id);
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
    if (reminder.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete reminder error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
