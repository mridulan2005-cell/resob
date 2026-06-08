const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/enrollments
router.get('/', authenticate, (req, res) => {
  try {
    const enrollments = db.prepare(`
      SELECT e.id as enrollment_id, e.enrolled_at, c.*
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY c.code ASC
    `).all(req.user.id);

    const formatted = enrollments.map(row => ({
      enrollment_id: row.enrollment_id,
      enrolled_at: row.enrolled_at,
      course: {
        id: row.id,
        code: row.code,
        name: row.name,
        department: row.department,
        credits: row.credits,
        l_t_p: row.l_t_p,
        slot: row.slot,
        semester: row.semester,
        course_type: row.course_type,
        instructor: row.instructor,
        lecture_hours: row.lecture_hours,
        exam_date: row.exam_date,
        exam_time: row.exam_time,
        midsem_date: row.midsem_date,
        midsem_time: row.midsem_time,
        total_seats: row.total_seats,
        filled_seats: row.filled_seats,
      },
    }));

    const total_credits = formatted.reduce((sum, e) => sum + (e.course.credits || 0), 0);

    res.json({
      enrollments: formatted,
      total_credits,
      course_count: formatted.length,
    });
  } catch (err) {
    console.error('Enrollments list error:', err);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// POST /api/enrollments
router.post('/', authenticate, (req, res) => {
  try {
    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ error: 'course_id is required' });

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(course_id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const existing = db.prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, course_id);
    if (existing) return res.status(409).json({ error: 'Already enrolled in this course' });

    db.prepare('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)').run(req.user.id, course_id);

    // Increment filled_seats
    db.prepare('UPDATE courses SET filled_seats = filled_seats + 1 WHERE id = ?').run(course_id);

    res.status(201).json({ success: true, message: 'Enrolled successfully' });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

// DELETE /api/enrollments/:course_id
router.delete('/:course_id', authenticate, (req, res) => {
  try {
    const enrollment = db.prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, req.params.course_id);
    if (!enrollment) return res.status(404).json({ error: 'Not enrolled in this course' });

    db.prepare('DELETE FROM enrollments WHERE id = ?').run(enrollment.id);

    // Decrement filled_seats
    db.prepare('UPDATE courses SET filled_seats = MAX(0, filled_seats - 1) WHERE id = ?').run(req.params.course_id);

    res.json({ success: true, message: 'Course dropped' });
  } catch (err) {
    console.error('Drop error:', err);
    res.status(500).json({ error: 'Drop failed' });
  }
});

module.exports = router;
