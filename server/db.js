const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'resobin.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    roll_number TEXT,
    department  TEXT,
    year        INTEGER,
    avatar_url  TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS courses (
    id            TEXT PRIMARY KEY,
    code          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    department    TEXT NOT NULL,
    credits       INTEGER NOT NULL,
    l_t_p         TEXT,
    slot          TEXT,
    semester      TEXT,
    course_type   TEXT NOT NULL,
    description   TEXT,
    prerequisites TEXT,
    instructor    TEXT,
    lecture_hours TEXT,
    exam_date     TEXT,
    exam_time     TEXT,
    midsem_date   TEXT,
    midsem_time   TEXT,
    total_seats   INTEGER DEFAULT 120,
    filled_seats  INTEGER DEFAULT 0,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS grade_distribution (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id  TEXT NOT NULL REFERENCES courses(id),
    semester   TEXT NOT NULL,
    grade      TEXT NOT NULL,
    count      INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resources (
    id          TEXT PRIMARY KEY,
    course_id   TEXT NOT NULL REFERENCES courses(id),
    user_id     TEXT NOT NULL REFERENCES users(id),
    title       TEXT NOT NULL,
    type        TEXT NOT NULL,
    year        INTEGER,
    semester    TEXT,
    exam_type   TEXT,
    file_url    TEXT NOT NULL,
    description TEXT,
    votes       INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS votes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id TEXT NOT NULL REFERENCES resources(id),
    user_id     TEXT NOT NULL REFERENCES users(id),
    value       INTEGER NOT NULL,
    UNIQUE(resource_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL REFERENCES users(id),
    course_id   TEXT NOT NULL REFERENCES courses(id),
    enrolled_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, course_id)
  );

  CREATE TABLE IF NOT EXISTS resource_requests (
    id                    TEXT PRIMARY KEY,
    course_id             TEXT NOT NULL REFERENCES courses(id),
    user_id               TEXT NOT NULL REFERENCES users(id),
    title                 TEXT NOT NULL,
    type                  TEXT,
    year                  INTEGER,
    semester              TEXT,
    exam_type             TEXT,
    description           TEXT,
    status                TEXT NOT NULL DEFAULT 'open',
    fulfilled_resource_id TEXT REFERENCES resources(id),
    fulfilled_by_user_id  TEXT REFERENCES users(id),
    fulfilled_at          TEXT,
    upvotes               INTEGER DEFAULT 0,
    created_at            TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS request_upvotes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id  TEXT NOT NULL REFERENCES resource_requests(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id),
    UNIQUE(request_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id),
    course_id    TEXT REFERENCES courses(id),
    title        TEXT NOT NULL,
    description  TEXT,
    due_at       TEXT NOT NULL,
    completed    INTEGER DEFAULT 0,
    completed_at TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    course_id   TEXT REFERENCES courses(id),
    title       TEXT NOT NULL,
    description TEXT,
    location    TEXT,
    starts_at   TEXT NOT NULL,
    ends_at     TEXT,
    repeat_rule TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT,
    link       TEXT,
    read       INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id         TEXT PRIMARY KEY,
    course_id  TEXT NOT NULL REFERENCES courses(id),
    user_id    TEXT NOT NULL REFERENCES users(id),
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    UNIQUE(course_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL REFERENCES users(id),
    course_id  TEXT NOT NULL REFERENCES courses(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, course_id)
  );

  CREATE INDEX IF NOT EXISTS idx_resources_course ON resources(course_id);
  CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
  CREATE INDEX IF NOT EXISTS idx_requests_status ON resource_requests(status);
  CREATE INDEX IF NOT EXISTS idx_requests_course ON resource_requests(course_id);
  CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id, due_at);
  CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, starts_at);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
  CREATE INDEX IF NOT EXISTS idx_reviews_course ON reviews(course_id);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
`);

module.exports = db;
