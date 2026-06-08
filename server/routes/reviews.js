const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/courses/:courseId/reviews
router.get('/:courseId/reviews', optionalAuth, (req, res) => {
  try {
    const { courseId } = req.params;
    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name
      FROM reviews r JOIN users u ON r.user_id = u.id
      WHERE r.course_id = ?
      ORDER BY r.created_at DESC
    `).all(courseId);

    const stats = db.prepare(`
      SELECT
        COUNT(*) as count,
        AVG(rating) as average,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as r5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as r4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as r3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as r2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as r1
      FROM reviews WHERE course_id = ?
    `).get(courseId);

    let userReview = null;
    if (req.user) {
      userReview = db.prepare('SELECT * FROM reviews WHERE course_id = ? AND user_id = ?')
        .get(courseId, req.user.id) || null;
    }

    res.json({ reviews, stats, userReview });
  } catch (err) {
    console.error('Reviews list error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/courses/:courseId/reviews — create or update (one per user)
router.post('/:courseId/reviews', authenticate, (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, comment } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be 1–5' });
    }

    const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const existing = db.prepare('SELECT * FROM reviews WHERE course_id = ? AND user_id = ?')
      .get(courseId, req.user.id);

    if (existing) {
      db.prepare(`
        UPDATE reviews SET rating = ?, comment = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(rating, comment || null, existing.id);
      const updated = db.prepare(`
        SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.id = ?
      `).get(existing.id);
      return res.json(updated);
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO reviews (id, course_id, user_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, courseId, req.user.id, rating, comment || null);

    const created = db.prepare(`
      SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.id = ?
    `).get(id);
    res.status(201).json(created);
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

// DELETE /api/courses/:courseId/reviews/:id
router.delete('/:courseId/reviews/:id', authenticate, (req, res) => {
  try {
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
