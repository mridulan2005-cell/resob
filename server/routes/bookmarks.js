const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/bookmarks — list user's saved courses
router.get('/', authenticate, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.*, b.created_at as bookmarked_at
      FROM bookmarks b
      JOIN courses c ON b.course_id = c.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user.id);
    res.json({ bookmarks: rows, count: rows.length });
  } catch (err) {
    console.error('Bookmarks list error:', err);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// POST /api/bookmarks/toggle/:courseId — toggle save/unsave
router.post('/toggle/:courseId', authenticate, (req, res) => {
  try {
    const { courseId } = req.params;
    const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const existing = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND course_id = ?')
      .get(req.user.id, courseId);
    if (existing) {
      db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id);
      return res.json({ bookmarked: false });
    }
    db.prepare('INSERT INTO bookmarks (user_id, course_id) VALUES (?, ?)').run(req.user.id, courseId);
    res.json({ bookmarked: true });
  } catch (err) {
    console.error('Bookmark toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

module.exports = router;
