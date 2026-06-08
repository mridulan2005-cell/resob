const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize DB (creates tables)
require('./db');

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const resourceRoutes = require('./routes/resources');
const enrollmentRoutes = require('./routes/enrollments');
const requestRoutes = require('./routes/requests');
const reminderRoutes = require('./routes/reminders');
const eventRoutes = require('./routes/events');
const notificationRoutes = require('./routes/notifications');
const reviewRoutes = require('./routes/reviews');
const bookmarkRoutes = require('./routes/bookmarks');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: /^http:\/\/localhost:\d+$/, credentials: true }));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
// Reviews mount at /api/courses to match /api/courses/:id/reviews pattern
app.use('/api/courses', reviewRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ResoBin server running on http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api\n`);
});
