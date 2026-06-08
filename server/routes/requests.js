const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { notify } = require('../notify');

const router = express.Router();

// GET /api/requests
router.get('/', optionalAuth, (req, res) => {
  try {
    const { course_id, status, search, sort } = req.query;
    let sql = `
      SELECT rr.*, u.name as requester_name,
             c.code as course_code, c.name as course_name, c.department as course_department,
             fu.name as fulfilled_by_name
      FROM resource_requests rr
      JOIN users u ON rr.user_id = u.id
      JOIN courses c ON rr.course_id = c.id
      LEFT JOIN users fu ON rr.fulfilled_by_user_id = fu.id
      WHERE 1=1
    `;
    const params = [];

    if (course_id) { sql += ' AND rr.course_id = ?'; params.push(course_id); }
    if (status)    { sql += ' AND rr.status = ?'; params.push(status); }
    if (search) {
      const q = `%${search}%`;
      sql += ' AND (rr.title LIKE ? OR rr.description LIKE ? OR c.code LIKE ? OR c.name LIKE ?)';
      params.push(q, q, q, q);
    }

    if (sort === 'new') {
      sql += ' ORDER BY rr.created_at DESC';
    } else {
      sql += " ORDER BY (rr.status = 'open') DESC, rr.upvotes DESC, rr.created_at DESC";
    }

    const requests = db.prepare(sql).all(...params);

    if (req.user) {
      requests.forEach(rq => {
        const up = db.prepare('SELECT id FROM request_upvotes WHERE request_id = ? AND user_id = ?')
          .get(rq.id, req.user.id);
        rq.user_upvoted = !!up;
      });
    }

    res.json({ requests, count: requests.length });
  } catch (err) {
    console.error('Requests list error:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// POST /api/requests
router.post('/', authenticate, (req, res) => {
  try {
    const { course_id, title, type, year, semester, exam_type, description } = req.body;
    if (!course_id || !title) {
      return res.status(400).json({ error: 'course_id and title are required' });
    }

    const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(course_id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO resource_requests (id, course_id, user_id, title, type, year, semester, exam_type, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, course_id, req.user.id, title, type || null,
           year ? parseInt(year) : null, semester || null, exam_type || null, description || null);

    const created = db.prepare(`
      SELECT rr.*, u.name as requester_name, c.code as course_code, c.name as course_name
      FROM resource_requests rr
      JOIN users u ON rr.user_id = u.id
      JOIN courses c ON rr.course_id = c.id
      WHERE rr.id = ?
    `).get(id);

    res.status(201).json(created);
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// POST /api/requests/:id/upvote
router.post('/:id/upvote', authenticate, (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM resource_requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const existing = db.prepare('SELECT id FROM request_upvotes WHERE request_id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (existing) {
      db.prepare('DELETE FROM request_upvotes WHERE id = ?').run(existing.id);
    } else {
      db.prepare('INSERT INTO request_upvotes (request_id, user_id) VALUES (?, ?)')
        .run(req.params.id, req.user.id);
    }

    const total = db.prepare('SELECT COUNT(*) as c FROM request_upvotes WHERE request_id = ?')
      .get(req.params.id);
    db.prepare('UPDATE resource_requests SET upvotes = ? WHERE id = ?').run(total.c, req.params.id);

    res.json({ upvotes: total.c, user_upvoted: !existing });
  } catch (err) {
    console.error('Upvote request error:', err);
    res.status(500).json({ error: 'Upvote failed' });
  }
});

// POST /api/requests/:id/fulfill
// Body: { resource_id: <id of resource that fulfills it> }
router.post('/:id/fulfill', authenticate, (req, res) => {
  try {
    const { resource_id } = req.body;
    if (!resource_id) return res.status(400).json({ error: 'resource_id is required' });

    const request = db.prepare('SELECT * FROM resource_requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status === 'fulfilled') return res.status(409).json({ error: 'Already fulfilled' });

    const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(resource_id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    db.prepare(`
      UPDATE resource_requests
      SET status = 'fulfilled', fulfilled_resource_id = ?, fulfilled_by_user_id = ?, fulfilled_at = datetime('now')
      WHERE id = ?
    `).run(resource_id, req.user.id, req.params.id);

    if (request.user_id !== req.user.id) {
      notify(request.user_id, {
        type: 'request_fulfilled',
        title: 'Your request was fulfilled',
        body: `${request.title}`,
        link: `/resources/${resource_id}`,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Fulfill error:', err);
    res.status(500).json({ error: 'Fulfill failed' });
  }
});

// DELETE /api/requests/:id (only by owner)
router.delete('/:id', authenticate, (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM resource_requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    db.prepare('DELETE FROM request_upvotes WHERE request_id = ?').run(request.id);
    db.prepare('DELETE FROM resource_requests WHERE id = ?').run(request.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete request error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
