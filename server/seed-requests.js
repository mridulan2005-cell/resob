// Additive seed for resource_requests + request_upvotes — does not delete other data.
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const users = db.prepare('SELECT id, name FROM users').all();
const courses = db.prepare('SELECT id, code, name FROM courses').all();

if (users.length === 0 || courses.length === 0) {
  console.error('Need users and courses seeded first. Run `node server/seed.js`.');
  process.exit(1);
}

const find = (code) => courses.find(c => c.code === code) || courses[0];

const samples = [
  { code: 'CS 213', title: 'PYQ for End-Sem 2024', type: 'pyq', exam_type: 'endsem', year: 2024, votes: 28 },
  { code: 'CS 207', title: 'Solutions to Tutorial 5 — Combinatorics',  type: 'tutorial', year: 2025, votes: 19 },
  { code: 'EE 224', title: 'Class notes — Sequential circuits week',   type: 'notes', year: 2025, votes: 14 },
  { code: 'MA 207', title: 'PYQ Mid-Sem 2023 with solutions',           type: 'pyq', exam_type: 'midsem', year: 2023, votes: 11 },
  { code: 'CS 309', title: 'Project ideas + previous reports',           type: 'notes', year: 2025, votes: 9 },
  { code: 'EE 325', title: 'Lecture slides for HMM unit',                type: 'slides', year: 2024, votes: 6 },
];

const insertReq = db.prepare(`
  INSERT OR IGNORE INTO resource_requests
    (id, course_id, user_id, title, type, year, exam_type, status, upvotes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, datetime('now', '-' || ? || ' days'))
`);
const insertVote = db.prepare('INSERT OR IGNORE INTO request_upvotes (request_id, user_id) VALUES (?, ?)');

// Wipe existing samples? No — just insert fresh.
let inserted = 0;
samples.forEach((s, i) => {
  const course = find(s.code);
  const requester = users[i % users.length];
  const reqId = uuidv4();
  insertReq.run(
    reqId, course.id, requester.id,
    s.title, s.type, s.year, s.exam_type || null,
    s.votes, i + 1
  );
  // Spread votes across users (capped to user count, including the requester's own implicit interest)
  const voters = users.slice(0, Math.min(users.length, s.votes));
  voters.forEach(u => insertVote.run(reqId, u.id));
  inserted++;
});

console.log(`Seeded ${inserted} resource requests with upvotes.`);
