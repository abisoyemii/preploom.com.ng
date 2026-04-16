const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fsPromises = require('fs').promises;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Security middleware (comment if deps missing)
try {
  const helmet = require('helmet');
  app.use(helmet());
} catch {}

const JWT_SECRET = process.env.JWT_SECRET || '-super-secret-key-change-in-prod';

// Helper: Async JSON file read/write
const DATA_DIR = path.join(__dirname, 'data');
async function asyncReadJson(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.log(`File ${filename} not found, returning empty`);
    return {};
  }
}

async function asyncWriteJson(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  next();
};

// Public API Routes (async now)
app.get('/api/exams', async (req, res) => res.json(await asyncReadJson('exams.json')));
app.get('/api/blog', async (req, res) => res.json(await asyncReadJson('blog.json')));
app.get('/api/calendar', async (req, res) => res.json(await asyncReadJson('calendar.json')));
app.get('/api/testimonials', async (req, res) => res.json(await asyncReadJson('testimonials.json')));
app.get('/api/resources', async (req, res) => res.json(await asyncReadJson('resources.json')));

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const users = await asyncReadJson('users.json');
    if (users.find(u => u.email === email)) return res.status(400).json({ message: 'User exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Object.keys(users).length ? Math.max(...Object.values(users).map(u => u.id)) + 1 : 1,
      name, email, password: hashedPassword, role: 'student', createdAt: new Date().toISOString()
    };

    users[newUser.id] = newUser;
    await asyncWriteJson('users.json', users);

    const token = jwt.sign({ id: newUser.id, email, role: newUser.role, name }, JWT_SECRET, { expiresIn: '7d' });
    delete newUser.password;
    res.status(201).json({ message: 'Registered', user: newUser, token });
  } catch (error) {
    console.error('[REGISTER]', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email/password required' });

    const users = await asyncReadJson('users.json');
    const user = Object.values(users).find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userResponse } = user;
    res.json({ message: 'Login OK', user: userResponse, token });
  } catch (error) {
    console.error('[LOGIN]', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const users = await asyncReadJson('users.json');
    const user = users[req.user.id];
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected: Real dashboard (computed from enrollments/progress)
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const enrollments = await asyncReadJson('enrollments.json');
    const progressData = await asyncReadJson('progress.json');
    const exams = await asyncReadJson('exams.json');
    const calendar = await asyncReadJson('calendar.json');

    const userEnrollments = enrollments[req.user.id] || [];
    const userProgress = progressData[req.user.id] || {};

    // Compute aggregates
    const enrolledExams = userEnrollments.map(id => exams.find(e => e.id === id)?.title || `Exam ${id}`);
    const progresses = Object.values(userProgress);
    const overallProgress = progresses.length ? Math.round(progresses.reduce((a, p) => a + p.progress, 0) / progresses.length) : 0;
    const totalTests = progresses.reduce((a, p) => a + (p.tests || 0), 0);

    // Mock streak/next (enhance later)
    const dashboardData = {
      overallProgress,
      testsTaken: totalTests,
      streak: 7,
      nextExam: calendar[0]?.date || 'TBA',
      upcoming: userEnrollments.slice(0,3).map(id => ({
        id,
        name: exams.find(e => e.id === id)?.title || 'Exam',
        date: 'Apr 12-26',
        status: 'Enrolled',
        progress: userProgress[`exam${id}`] || 0
      })),
      enrolledExams,
      recommendations: ['Review weak areas', 'Take practice test']
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('[DASHBOARD]', error);
    res.status(500).json({ message: 'Dashboard error' });
  }
});

// Progress: GET/PUT
app.get('/api/progress', authenticateToken, async (req, res) => {
  try {
    const progressData = await asyncReadJson('progress.json');
    res.json(progressData[req.user.id] || {});
  } catch {
    res.json({});
  }
});

app.put('/api/progress', authenticateToken, async (req, res) => {
  try {
    const updates = req.body; // { examId: {progress: 80, ...} }
    const progressData = await asyncReadJson('progress.json');
    if (!progressData[req.user.id]) progressData[req.user.id] = {};
    
    Object.assign(progressData[req.user.id], updates);
    progressData[req.user.id].updated = new Date().toISOString();
    
    await asyncWriteJson('progress.json', progressData);
    res.json({ success: true, progress: progressData[req.user.id] });
  } catch (error) {
    console.error('[PROGRESS UPDATE]', error);
    res.status(500).json({ message: 'Update failed' });
  }
});

// Enrollments: POST/GET/DELETE
app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const enrollments = await asyncReadJson('enrollments.json');
    res.json(enrollments[req.user.id] || []);
  } catch {
    res.json([]);
  }
});

app.post('/api/enroll', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.body;
    if (!examId) return res.status(400).json({ message: 'examId required' });

    const enrollments = await asyncReadJson('enrollments.json');
    if (!enrollments[req.user.id]) enrollments[req.user.id] = [];
    if (!enrollments[req.user.id].includes(examId)) {
      enrollments[req.user.id].push(examId);
      await asyncWriteJson('enrollments.json', enrollments);
    }
    res.json({ success: true, message: 'Enrolled', enrollments: enrollments[req.user.id] });
  } catch (error) {
    res.status(500).json({ message: 'Enroll failed' });
  }
});

app.delete('/api/enroll/:examId', authenticateToken, async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const enrollments = await asyncReadJson('enrollments.json');
    if (!enrollments[req.user.id]) return res.json({ success: true });

    enrollments[req.user.id] = enrollments[req.user.id].filter(id => id !== examId);
    await asyncWriteJson('enrollments.json', enrollments);
    res.json({ success: true, message: 'Unenrolled' });
  } catch (error) {
    res.status(500).json({ message: 'Unenroll failed' });
  }
});

// Forms (unchanged)
app.post('/api/subscribe', (req, res) => {
  console.log('[SUBSCRIBE]', req.body);
  res.json({ success: true, message: 'Subscribed!' });
});

app.post('/api/contact', (req, res) => {
  console.log('[CONTACT]', req.body);
  res.json({ success: true, message: 'Sent!' });
});

// Chat API - Rule-based responses enhanced with data
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: 'Send a message!' });

    const lowerMsg = message.toLowerCase();
    const exams = await asyncReadJson('exams.json');
    const calendar = await asyncReadJson('calendar.json');

    let reply = 'Thanks for chatting! Ask about TOEFL, PMP, dates, login etc.';

    if (lowerMsg.includes('toefl') || lowerMsg.includes('ibt')) {
      const toefl = exams.find(e => e.exams?.includes('TOEFL iBT')) || exams[0];
      reply = `TOEFL iBT: ${toefl.description}. Dates via /api/calendar. Need prep tips? 🎓`;
    } else if (lowerMsg.includes('ielts')) {
      reply = 'IELTS Academic/General: 48 dates/year. Check language-exams.html!';
    } else if (lowerMsg.includes('pmp')) {
      const pro = exams.find(e => e.exams?.includes('PMP')) || exams[1];
      reply = `PMP: ${pro.meta.duration}, ${pro.meta.mode}, ${pro.meta.validity}. Enroll after login!`;
    } else if (lowerMsg.includes('login') || lowerMsg.includes('demo')) {
      reply = 'Demo: student@eliteexam.com / pass123. Go to login.html!';
    } else if (lowerMsg.includes('date') || lowerMsg.includes('schedule') || lowerMsg.includes('calendar')) {
      const upcoming = Object.keys(calendar).slice(0, 3).join(', ') || 'Monthly dates available';
      reply = `Upcoming: ${upcoming}. Full calendar: http://localhost:3000/api/calendar`;
    } else if (lowerMsg.includes('enroll')) {
      reply = '1. Login 2. Dashboard 3. Enroll exams. POST /api/enroll {examId:1}';
    } else if (lowerMsg.includes('progress')) {
      reply = 'Track at progress.html or GET /api/progress (login required)';
    }

    console.log(`[CHAT] "${message}" → "${reply}"`);
    res.json({ reply });
  } catch (error) {
    console.error('[CHAT]', error);
    res.status(500).json({ reply: 'Oops! Try again or ask something else.' });
  }
});

// Admin: List users
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await asyncReadJson('users.json');
    const safeUsers = Object.fromEntries(
      Object.entries(users).map(([id, u]) => [id, { ...u, password: undefined }])
    );
    res.json(safeUsers);
  } catch {
    res.json({});
  }
});

// SPA fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
  console.log(`📋 New APIs: /api/progress (PUT), /api/enrollments, /api/enroll POST/DEL`);
});
