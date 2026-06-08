const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

const csv = (s) => (s ? String(s).split(',').map(x => x.trim()).filter(Boolean) : []);

// GET /api/courses
router.get('/', optionalAuth, (req, res) => {
  try {
    const {
      search,
      department, departments,         // legacy single + multi
      type, types,                     // legacy single + multi
      semester,                        // legacy exact match
      semester_term,                   // 'Autumn' | 'Spring' (LIKE prefix)
      slots,
      credit_min, credit_max,
      running, avoid_clash, half_sem,
      sort,
    } = req.query;

    // user_id used by LEFT JOINs to surface is_bookmarked/is_enrolled for the current user.
    // '__none__' is a sentinel that won't match any real user id when not authenticated.
    const userId = req.user?.id || '__none__';
    let sql = `
      SELECT c.id, c.code, c.name, c.department, c.credits, c.l_t_p, c.slot, c.semester,
             c.course_type, c.instructor, c.total_seats, c.filled_seats,
             (b.id IS NOT NULL) AS is_bookmarked,
             (e.id IS NOT NULL) AS is_enrolled
      FROM courses c
      LEFT JOIN bookmarks   b ON c.id = b.course_id   AND b.user_id = ?
      LEFT JOIN enrollments e ON c.id = e.course_id   AND e.user_id = ?
      WHERE 1=1
    `;
    const params = [userId, userId];

    if (search) {
      sql += ' AND (code LIKE ? OR name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // department(s)
    const deptList = departments ? csv(departments) : (department ? [department] : []);
    if (deptList.length) {
      sql += ` AND department IN (${deptList.map(() => '?').join(',')})`;
      params.push(...deptList);
    }

    // type(s) / course tag
    const typeList = types ? csv(types) : (type ? [type] : []);
    if (typeList.length) {
      sql += ` AND course_type IN (${typeList.map(() => '?').join(',')})`;
      params.push(...typeList);
    }

    // semester exact (legacy)
    if (semester) {
      sql += ' AND semester = ?';
      params.push(semester);
    }
    // semester_term — match courses whose semester column starts with the term
    if (semester_term) {
      sql += ' AND semester LIKE ?';
      params.push(`${semester_term}%`);
    }

    // slot(s)
    const slotList = csv(slots);
    if (slotList.length) {
      sql += ` AND slot IN (${slotList.map(() => '?').join(',')})`;
      params.push(...slotList);
    }

    // credit range
    if (credit_min) {
      sql += ' AND credits >= ?';
      params.push(parseInt(credit_min));
    }
    if (credit_max) {
      sql += ' AND credits <= ?';
      params.push(parseInt(credit_max));
    }

    // running courses only — interpret as has open seats
    if (running === '1' || running === 'true') {
      sql += ' AND total_seats > 0 AND filled_seats < total_seats';
    }

    // avoid slot clash — exclude slots the authenticated user is already enrolled in
    if ((avoid_clash === '1' || avoid_clash === 'true') && req.user) {
      const userSlots = db.prepare(`
        SELECT DISTINCT c.slot FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ? AND c.slot IS NOT NULL AND c.slot <> ''
      `).all(req.user.id).map(r => r.slot);
      if (userSlots.length) {
        sql += ` AND (slot IS NULL OR slot NOT IN (${userSlots.map(() => '?').join(',')}))`;
        params.push(...userSlots);
      }
    }

    // half-semester filter — heuristic: credits ≤ 3 (placeholder until a dedicated flag exists)
    if (half_sem === '1' || half_sem === 'true') {
      sql += ' AND credits <= 3';
    }

    const sortCol = ['code', 'name', 'credits'].includes(sort) ? sort : 'code';
    sql += ` ORDER BY ${sortCol} ASC`;

    const courses = db.prepare(sql).all(...params);
    res.json({ courses, total: courses.length });
  } catch (err) {
    console.error('Courses list error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET /api/courses/departments
// Returns [{ name, count, credits_total }] grouped by department.
// Must be declared BEFORE /:id so the router doesn't treat 'departments' as an id.
router.get('/departments', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT department AS name,
             COUNT(*)     AS count,
             SUM(credits) AS credits_total
      FROM courses
      WHERE department IS NOT NULL AND department <> ''
      GROUP BY department
      ORDER BY name ASC
    `).all();
    res.json({ departments: rows });
  } catch (err) {
    console.error('Departments list error:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// GET /api/courses/:id
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const grades = db.prepare('SELECT * FROM grade_distribution WHERE course_id = ? ORDER BY semester DESC, grade ASC').all(course.id);

    const resources = db.prepare(`
      SELECT r.*, u.name as uploader_name
      FROM resources r
      JOIN users u ON r.user_id = u.id
      WHERE r.course_id = ?
      ORDER BY r.votes DESC, r.created_at DESC
    `).all(course.id);

    // Check if current user is enrolled and/or has bookmarked this course
    let is_enrolled = false;
    let is_bookmarked = false;
    if (req.user) {
      const enrollment = db.prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, course.id);
      is_enrolled = !!enrollment;
      const bookmark = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND course_id = ?').get(req.user.id, course.id);
      is_bookmarked = !!bookmark;
    }

    // Add user_vote to each resource
    if (req.user) {
      resources.forEach(r => {
        const vote = db.prepare('SELECT value FROM votes WHERE resource_id = ? AND user_id = ?').get(r.id, req.user.id);
        r.user_vote = vote ? vote.value : 0;
      });
    }

    res.json({ course, grades, resources, is_enrolled, is_bookmarked });
  } catch (err) {
    console.error('Course detail error:', err);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

module.exports = router;
