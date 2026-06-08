const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer
const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

// GET /api/resources
router.get('/', optionalAuth, (req, res) => {
  try {
    const { course_id, type, year, semester, search, sort, limit, offset } = req.query;
    let sql = `
      SELECT r.*, u.name as uploader_name, c.code as course_code, c.name as course_name, c.department as course_department
      FROM resources r
      JOIN users u ON r.user_id = u.id
      JOIN courses c ON r.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (course_id) { sql += ' AND r.course_id = ?'; params.push(course_id); }
    if (type) { sql += ' AND r.type = ?'; params.push(type); }
    if (year) { sql += ' AND r.year = ?'; params.push(parseInt(year)); }
    if (semester) { sql += ' AND r.semester = ?'; params.push(semester); }
    if (search) {
      const q = `%${search}%`;
      sql += ' AND (r.title LIKE ? OR r.description LIKE ? OR c.code LIKE ? OR c.name LIKE ?)';
      params.push(q, q, q, q);
    }

    // Sort: 'top' = hot (votes weighted by recency), 'new', 'votes'
    const sortMode = sort || 'top';
    if (sortMode === 'new') {
      sql += ' ORDER BY r.created_at DESC';
    } else if (sortMode === 'votes') {
      sql += ' ORDER BY r.votes DESC, r.created_at DESC';
    } else {
      // hot: votes / (hours_since_post + 2)^1.2 — Reddit-style
      sql += ` ORDER BY (r.votes * 1.0) / POWER((julianday('now') - julianday(r.created_at)) * 24 + 2, 1.2) DESC, r.created_at DESC`;
    }

    const lim = Math.min(parseInt(limit) || 50, 100);
    const off = parseInt(offset) || 0;
    sql += ' LIMIT ? OFFSET ?';
    params.push(lim, off);

    const resources = db.prepare(sql).all(...params);

    if (req.user) {
      resources.forEach(r => {
        const vote = db.prepare('SELECT value FROM votes WHERE resource_id = ? AND user_id = ?').get(r.id, req.user.id);
        r.user_vote = vote ? vote.value : 0;
      });
    }

    res.json({ resources, count: resources.length });
  } catch (err) {
    console.error('Resources list error:', err);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// POST /api/resources (upload)
router.post('/', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { course_id, title, type, year, semester, exam_type, description } = req.body;
    if (!course_id || !title || !type) {
      return res.status(400).json({ error: 'course_id, title, and type are required' });
    }

    const id = uuidv4();
    const file_url = `/uploads/${req.file.filename}`;

    db.prepare(`
      INSERT INTO resources (id, course_id, user_id, title, type, year, semester, exam_type, file_url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, course_id, req.user.id, title, type, year ? parseInt(year) : null, semester || null, exam_type || null, file_url, description || null);

    const resource = db.prepare('SELECT r.*, u.name as uploader_name FROM resources r JOIN users u ON r.user_id = u.id WHERE r.id = ?').get(id);
    res.status(201).json(resource);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE /api/resources/:id
router.delete('/:id', authenticate, (req, res) => {
  try {
    const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    if (resource.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    // Delete file
    const filePath = path.join(uploadsDir, path.basename(resource.file_url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.prepare('DELETE FROM votes WHERE resource_id = ?').run(resource.id);
    db.prepare('DELETE FROM resources WHERE id = ?').run(resource.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// POST /api/resources/:id/vote
router.post('/:id/vote', authenticate, (req, res) => {
  try {
    const { value } = req.body;
    if (value !== 1 && value !== -1) return res.status(400).json({ error: 'Value must be 1 or -1' });

    const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    const existing = db.prepare('SELECT * FROM votes WHERE resource_id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (existing) {
      if (existing.value === value) {
        // Same vote — remove it (toggle off)
        db.prepare('DELETE FROM votes WHERE id = ?').run(existing.id);
      } else {
        // Different vote — switch
        db.prepare('UPDATE votes SET value = ? WHERE id = ?').run(value, existing.id);
      }
    } else {
      // New vote
      db.prepare('INSERT INTO votes (resource_id, user_id, value) VALUES (?, ?, ?)').run(req.params.id, req.user.id, value);
    }

    // Recalculate total votes
    const total = db.prepare('SELECT COALESCE(SUM(value), 0) as total FROM votes WHERE resource_id = ?').get(req.params.id);
    db.prepare('UPDATE resources SET votes = ? WHERE id = ?').run(total.total, req.params.id);

    // Get current user's vote
    const userVote = db.prepare('SELECT value FROM votes WHERE resource_id = ? AND user_id = ?').get(req.params.id, req.user.id);

    res.json({ votes: total.total, user_vote: userVote ? userVote.value : 0 });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Vote failed' });
  }
});

module.exports = router;
