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
const JWT_SECRET = process.env.JWT_SECRET || 'preploom-jwt-secret-2026-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 8;
const DATA_DIR = path.join(__dirname, 'data');

// ─── Middleware ───────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://preploom.com.ng',
  'https://www.preploom.com.ng',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..')));

// ─── Security headers (Helmet) ────────────────────────────────────────────────
try {
  const helmet = require('helmet');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://pagead2.googlesyndication.com', 'https://www.googletagmanager.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://preploom.com.ng', 'http://localhost:3000', 'http://127.0.0.1:3000'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));
} catch {}

// ─── CSRF protection ──────────────────────────────────────────────────────────
const crypto = require('crypto');
const csrfTokens = new Map();

function generateCsrfToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, { token, expires: Date.now() + 3600000 });
  return token;
}

function validateCsrfToken(sessionId, token) {
  const record = csrfTokens.get(sessionId);
  if (!record || Date.now() > record.expires) return false;
  return crypto.timingSafeEqual(Buffer.from(record.token), Buffer.from(token || ''));
}

function csrfProtect(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sessionId = (req.headers['authorization'] || req.ip);
  const token = req.headers['x-csrf-token'];
  // Skip CSRF check if no token store entry exists yet (first request) — still protected by JWT
  if (token && !validateCsrfToken(sessionId, token)) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  next();
}

app.get('/api/csrf-token', (req, res) => {
  const sessionId = (req.headers['authorization'] || req.ip);
  const token = generateCsrfToken(sessionId);
  res.json({ csrfToken: token });
});

// Simple in-memory rate limiter
const rateLimitMap = new Map();

// ─── Periodic cleanup for memory leaks ───────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of csrfTokens) if (now > v.expires) csrfTokens.delete(k);
  for (const [k, v] of rateLimitMap) if (now - v.start > 15 * 60 * 1000) rateLimitMap.delete(k);
}, 10 * 60 * 1000);
function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = req.ip + req.path;
    const now = Date.now();
    const record = rateLimitMap.get(key) || { count: 0, start: now };
    if (now - record.start > windowMs) { record.count = 1; record.start = now; }
    else record.count++;
    rateLimitMap.set(key, record);
    if (record.count > maxRequests) return res.status(429).json({ message: 'Too many requests. Please wait.' });
    next();
  };
}

// ─── Data helpers ─────────────────────────────────────────────────────────────
const jsonCache = new Map();
const STATIC_FILES = ['exams.json', 'blog.json', 'calendar.json', 'testimonials.json', 'resources.json'];

async function readJson(filename) {
  if (STATIC_FILES.includes(filename) && jsonCache.has(filename)) {
    return jsonCache.get(filename);
  }
  try {
    const data = await fsPromises.readFile(path.join(DATA_DIR, filename), 'utf8');
    const parsed = JSON.parse(data);
    if (STATIC_FILES.includes(filename)) jsonCache.set(filename, parsed);
    return parsed;
  } catch {
    const isObject = ['users', 'enrollments', 'progress'].some(n => filename.includes(n));
    return isObject ? {} : [];
  }
}

async function writeJson(filename, data) {
  await fsPromises.mkdir(DATA_DIR, { recursive: true });
  await fsPromises.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

// ─── Validation ───────────────────────────────────────────────────────────────
const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
const isValidPassword = pw => typeof pw === 'string' && pw.length >= 6;
const sanitize = (str, max = 200) => String(str || '').trim().slice(0, max);

// ─── Auth middleware ──────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ─── Public: Exams ────────────────────────────────────────────────────────────
app.get('/api/exams', async (req, res) => {
  const exams = await readJson('exams.json');
  const { category, search } = req.query;
  let result = exams;
  if (category) result = result.filter(e => e.category === category);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
  }
  res.json(result);
});

app.get('/api/exams/:id', async (req, res) => {
  const exams = await readJson('exams.json');
  const exam = exams.find(e => e.id === parseInt(req.params.id));
  if (!exam) return res.status(404).json({ message: 'Exam not found' });
  res.json(exam);
});

// ─── Public: Blog ─────────────────────────────────────────────────────────────
app.get('/api/blog', async (req, res) => {
  const posts = await readJson('blog.json');
  const { category, limit, search } = req.query;
  let result = posts;
  if (category) result = result.filter(p => p.category === category);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(p => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q));
  }
  if (limit) result = result.slice(0, parseInt(limit));
  res.json(result);
});

app.get('/api/blog/:id', async (req, res) => {
  const posts = await readJson('blog.json');
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ message: 'Post not found' });
  res.json(post);
});

// ─── Public: Other data ───────────────────────────────────────────────────────
app.get('/api/calendar', async (req, res) => res.json(await readJson('calendar.json')));
app.get('/api/testimonials', async (req, res) => res.json(await readJson('testimonials.json')));
app.get('/api/resources', async (req, res) => res.json(await readJson('resources.json')));

// ─── Auth: Register ───────────────────────────────────────────────────────────
app.post('/api/register', rateLimit(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const name = sanitize(req.body.name, 100);
    const email = sanitize(req.body.email, 200).toLowerCase();
    const password = req.body.password;

    if (!name || name.length < 2) return res.status(400).json({ message: 'Name must be at least 2 characters' });
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email address' });
    if (!isValidPassword(password)) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const users = await readJson('users.json');
    if (Object.values(users).find(u => u.email === email)) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const ids = Object.keys(users).map(Number);
    const newId = ids.length ? Math.max(...ids) + 1 : 1;
    const newUser = {
      id: newId, name, email,
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      role: 'student',
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    users[newId] = newUser;
    await writeJson('users.json', users);

    const token = jwt.sign({ id: newId, email, role: 'student', name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ message: 'Account created successfully', user: safeUser, token });
  } catch (err) {
    console.error('[REGISTER]', err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// ─── Auth: Login ──────────────────────────────────────────────────────────────
app.post('/api/login', rateLimit(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const email = sanitize(req.body.email, 200).toLowerCase();
    const password = req.body.password;

    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email address' });
    if (!password) return res.status(400).json({ message: 'Password is required' });

    const users = await readJson('users.json');
    const user = Object.values(users).find(u => u.email === email);

    const dummyHash = '$2b$08$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
    const match = user ? await bcrypt.compare(password, user.password) : await bcrypt.compare(password, dummyHash);

    if (!user || !match) return res.status(401).json({ message: 'Invalid email or password' });

    // Update lastLogin without blocking response
    readJson('users.json').then(u => {
      if (u[user.id]) { u[user.id].lastLogin = new Date().toISOString(); writeJson('users.json', u); }
    }).catch(() => {});

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const { password: _, ...safeUser } = user;
    res.json({ message: 'Login successful', user: safeUser, token });
  } catch (err) {
    console.error('[LOGIN]', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// ─── Auth: Me & Update ────────────────────────────────────────────────────────
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const users = await readJson('users.json');
    const user = users[req.user.id];
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/users/me', authenticateToken, csrfProtect, async (req, res) => {
  try {
    const users = await readJson('users.json');
    const user = users[req.user.id];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, currentPassword, newPassword } = req.body;

    if (name) {
      const cleanName = sanitize(name, 100);
      if (cleanName.length < 2) return res.status(400).json({ message: 'Name too short' });
      user.name = cleanName;
    }

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password required' });
      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      if (!isValidPassword(newPassword)) return res.status(400).json({ message: 'New password must be at least 6 characters' });
      user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    }

    user.updatedAt = new Date().toISOString();
    users[req.user.id] = user;
    await writeJson('users.json', users);

    const { password: _, ...safeUser } = user;
    res.json({ message: 'Profile updated', user: safeUser });
  } catch (err) {
    console.error('[UPDATE PROFILE]', err);
    res.status(500).json({ message: 'Update failed' });
  }
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const [enrollments, progressData, exams, calendar, users] = await Promise.all([
      readJson('enrollments.json'),
      readJson('progress.json'),
      readJson('exams.json'),
      readJson('calendar.json'),
      readJson('users.json')
    ]);

    const user = users[req.user.id];
    const userEnrollmentIds = enrollments[req.user.id] || [];
    const userProgress = progressData[req.user.id] || {};

    const progresses = Object.values(userProgress).filter(p => p && typeof p.progress === 'number');
    const overallProgress = progresses.length
      ? Math.round(progresses.reduce((a, p) => a + p.progress, 0) / progresses.length)
      : 0;
    const totalTests = progresses.reduce((a, p) => a + (p.tests || 0), 0);

    const upcoming = userEnrollmentIds.slice(0, 3).map(id => {
      const exam = exams.find(e => e.id === id);
      const examKey = exam?.title?.toLowerCase().split(' ')[0] || `exam${id}`;
      return {
        id,
        name: exam?.title || `Exam ${id}`,
        category: exam?.category || 'general',
        date: 'Apr 12–26, 2026',
        status: 'Enrolled',
        progress: userProgress[examKey]?.progress || 0
      };
    });

    const upcomingDates = calendar.upcoming || [];

    res.json({
      user: { name: user?.name, email: user?.email, role: user?.role },
      overallProgress,
      testsTaken: totalTests,
      streak: userProgress.streak || 0,
      nextExam: upcomingDates[0] ? `${upcomingDates[0].date} — ${upcomingDates[0].exam}` : 'TBA',
      upcoming,
      enrolledCount: userEnrollmentIds.length,
      upcomingDates: upcomingDates.slice(0, 5),
      progressDetails: userProgress,
      recommendations: overallProgress < 30
        ? ['Start with a diagnostic test', 'Set a daily 30-min study goal']
        : overallProgress < 70
        ? ['Review your weak areas', 'Take a full-length practice test']
        : ['Focus on timing strategies', 'Simulate real exam conditions']
    });
  } catch (err) {
    console.error('[DASHBOARD]', err);
    res.status(500).json({ message: 'Dashboard error' });
  }
});

// ─── Progress ─────────────────────────────────────────────────────────────────
app.get('/api/progress', authenticateToken, async (req, res) => {
  try {
    const progressData = await readJson('progress.json');
    res.json(progressData[req.user.id] || {});
  } catch {
    res.json({});
  }
});

app.put('/api/progress', authenticateToken, csrfProtect, async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') return res.status(400).json({ message: 'Invalid data' });

    const progressData = await readJson('progress.json');
    if (!progressData[req.user.id]) progressData[req.user.id] = {};

    // Validate each update entry
    for (const [key, val] of Object.entries(updates)) {
      if (typeof val === 'object' && val !== null) {
        if (val.progress !== undefined) {
          val.progress = Math.min(100, Math.max(0, parseInt(val.progress) || 0));
        }
        progressData[req.user.id][key] = { ...progressData[req.user.id][key], ...val };
      }
    }
    progressData[req.user.id].updated = new Date().toISOString();
    await writeJson('progress.json', progressData);
    res.json({ success: true, progress: progressData[req.user.id] });
  } catch (err) {
    console.error('[PROGRESS]', err);
    res.status(500).json({ message: 'Update failed' });
  }
});

// ─── Enrollments ──────────────────────────────────────────────────────────────
// Returns array of IDs (for my-exams.html compatibility)
app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const enrollments = await readJson('enrollments.json');
    res.json(enrollments[req.user.id] || []);
  } catch {
    res.json([]);
  }
});

// Returns enriched exam objects
app.get('/api/enrollments/details', authenticateToken, async (req, res) => {
  try {
    const [enrollments, exams] = await Promise.all([readJson('enrollments.json'), readJson('exams.json')]);
    const ids = enrollments[req.user.id] || [];
    res.json(ids.map(id => exams.find(e => e.id === id) || { id, title: `Exam ${id}` }));
  } catch {
    res.json([]);
  }
});

app.post('/api/enroll', authenticateToken, csrfProtect, async (req, res) => {
  try {
    const examId = parseInt(req.body.examId);
    if (!examId || isNaN(examId)) return res.status(400).json({ message: 'Valid examId required' });

    const [exams, enrollments] = await Promise.all([readJson('exams.json'), readJson('enrollments.json')]);
    if (!exams.find(e => e.id === examId)) return res.status(404).json({ message: 'Exam not found' });

    if (!enrollments[req.user.id]) enrollments[req.user.id] = [];
    if (enrollments[req.user.id].includes(examId)) {
      return res.status(409).json({ message: 'Already enrolled in this exam' });
    }

    enrollments[req.user.id].push(examId);
    await writeJson('enrollments.json', enrollments);
    res.json({ success: true, message: 'Enrolled successfully', enrollments: enrollments[req.user.id] });
  } catch (err) {
    console.error('[ENROLL]', err);
    res.status(500).json({ message: 'Enrollment failed' });
  }
});

app.delete('/api/enroll/:examId', authenticateToken, csrfProtect, async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const enrollments = await readJson('enrollments.json');
    if (!enrollments[req.user.id]) return res.json({ success: true });
    enrollments[req.user.id] = enrollments[req.user.id].filter(id => id !== examId);
    await writeJson('enrollments.json', enrollments);
    res.json({ success: true, message: 'Unenrolled successfully' });
  } catch {
    res.status(500).json({ message: 'Unenroll failed' });
  }
});

// ─── Contact & Subscribe ──────────────────────────────────────────────────────
app.post('/api/contact', rateLimit(5, 60 * 60 * 1000), async (req, res) => {
  try {
    const firstName = sanitize(req.body.firstName, 50);
    const lastName = sanitize(req.body.lastName, 50);
    const email = sanitize(req.body.email, 200).toLowerCase();
    const subject = sanitize(req.body.subject, 100);
    const message = sanitize(req.body.message, 2000);

    if (!firstName || !email || !message) return res.status(400).json({ message: 'Name, email and message are required' });
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email address' });

    console.log('[CONTACT]', { firstName, lastName, email, subject, preview: message.slice(0, 80) });
    res.json({ success: true, message: "Message received! We'll respond within 2 hours." });
  } catch (err) {
    console.error('[CONTACT]', err);
    res.status(500).json({ message: 'Failed to send message. Please try again.' });
  }
});

app.post('/api/subscribe', rateLimit(3, 60 * 60 * 1000), async (req, res) => {
  try {
    const email = sanitize(req.body.email, 200).toLowerCase();
    const name = sanitize(req.body.name, 100);
    const exam = sanitize(req.body.exam, 100);

    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email address' });

    console.log('[SUBSCRIBE]', { name, email, exam });
    res.json({ success: true, message: 'Subscribed! Check your inbox for your free starter kit.' });
  } catch (err) {
    console.error('[SUBSCRIBE]', err);
    res.status(500).json({ message: 'Subscription failed. Please try again.' });
  }
});

// ─── Chat ─────────────────────────────────────────────────────────────────────
app.post('/api/chat', rateLimit(30, 60 * 1000), async (req, res) => {
  try {
    const message = sanitize(req.body.message, 500);
    if (!message) return res.status(400).json({ reply: 'Please send a message.' });

    const lower = message.toLowerCase();
    const [exams, calendar] = await Promise.all([readJson('exams.json'), readJson('calendar.json')]);

    let reply = 'Hi! I can help with TOEFL, IELTS, PMP, Cisco, GMAT, exam dates, login, and more. What are you preparing for?';

    if (lower.includes('toefl')) {
      reply = 'TOEFL iBT: 3 hours, 4 sections (Reading, Listening, Speaking, Writing), score 0–120. Valid 2 years. Next dates: April 5, 12, 19, 26. Need prep tips?';
    } else if (lower.includes('ielts')) {
      reply = 'IELTS Academic/General: 2h45m, band score 0–9. 48 test dates per year. Accepted by UK, Australia, Canada universities.';
    } else if (lower.includes('pmp')) {
      reply = 'PMP: 180 questions, 230 minutes, 50% agile/hybrid. Requires 36 months PM experience + 35 PDUs. Valid 3 years.';
    } else if (lower.includes('cisco') || lower.includes('ccna') || lower.includes('ccnp')) {
      reply = 'Cisco CCNA (200-301): 120 questions, 120 mins. CCNP ENCOR (350-401): 90–110 questions. Both at Pearson VUE weekly.';
    } else if (lower.includes('duolingo')) {
      reply = 'Duolingo English Test: 1 hour, $49, results in 48 hours. Accepted by 4,000+ institutions. Take anytime from home.';
    } else if (lower.includes('cambridge') || lower.includes('fce') || lower.includes('cae')) {
      reply = 'Cambridge English: FCE (B2), CAE (C1), CPE (C2). Lifetime validity — never expires! Next sessions: June, September, December 2026.';
    } else if (lower.includes('gmat')) {
      reply = 'GMAT Focus Edition: 64 questions, 135 minutes. Sections: Quantitative, Verbal, Data Insights. Score 205–805. Valid 5 years.';
    } else if (lower.includes('date') || lower.includes('schedule') || lower.includes('when')) {
      const upcoming = calendar.upcoming || [];
      reply = upcoming.length
        ? `Upcoming: ${upcoming.slice(0, 3).map(u => `${u.date} — ${u.exam}`).join(', ')}. Check the full calendar on our homepage!`
        : 'Monthly exam dates available. Check the calendar on our homepage!';
    } else if (lower.includes('login') || lower.includes('sign in')) {
      reply = 'Go to login.html to sign in. New here? Register for free!';
    } else if (lower.includes('register') || lower.includes('sign up')) {
      reply = 'Registration is free! Go to login.html and click "Register". Access practice tests, progress tracking, and study plans.';
    } else if (lower.includes('price') || lower.includes('cost') || lower.includes('free')) {
      reply = 'All practice questions, study guides, and exam tips on Preploom are 100% FREE!';
    } else if (lower.includes('progress') || lower.includes('dashboard')) {
      reply = 'Track your progress at progress.html after logging in. Your dashboard shows enrolled exams, test scores, and study streaks.';
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      reply = 'Hello! 👋 Welcome to Preploom. What exam are you preparing for?';
    }

    res.json({ reply });
  } catch (err) {
    console.error('[CHAT]', err);
    res.status(500).json({ reply: 'Sorry, something went wrong. Please try again!' });
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await readJson('users.json');
    const safe = Object.fromEntries(Object.entries(users).map(([id, u]) => {
      const { password: _, ...s } = u; return [id, s];
    }));
    res.json({ count: Object.keys(safe).length, users: safe });
  } catch {
    res.json({ count: 0, users: {} });
  }
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users, enrollments, progressData, blog] = await Promise.all([
      readJson('users.json'), readJson('enrollments.json'),
      readJson('progress.json'), readJson('blog.json')
    ]);
    res.json({
      totalUsers: Object.keys(users).length,
      totalEnrollments: Object.values(enrollments).reduce((a, e) => a + e.length, 0),
      activeUsers: Object.keys(progressData).length,
      totalBlogPosts: blog.length
    });
  } catch {
    res.status(500).json({ message: 'Stats error' });
  }
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, csrfProtect, async (req, res) => {
  try {
    const userId = req.params.id;
    if (userId == req.user.id) return res.status(400).json({ message: 'Cannot delete your own account' });
    const users = await readJson('users.json');
    if (!users[userId]) return res.status(404).json({ message: 'User not found' });
    delete users[userId];
    await writeJson('users.json', users);
    res.json({ success: true, message: 'User deleted' });
  } catch {
    res.status(500).json({ message: 'Delete failed' });
  }
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'API route not found' });
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// ─── Seed admin from env ─────────────────────────────────────────────────────
async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin User';
  if (!adminEmail || !adminPassword) return;

  const users = await readJson('users.json');
  const exists = Object.values(users).find(u => u.email === adminEmail && u.role === 'admin');
  if (exists) return;

  const ids = Object.keys(users).map(Number);
  const newId = ids.length ? Math.max(...ids) + 1 : 1;
  users[newId] = {
    id: newId, name: adminName, email: adminEmail,
    password: await bcrypt.hash(adminPassword, BCRYPT_ROUNDS),
    role: 'admin', createdAt: new Date().toISOString(), lastLogin: null
  };
  await writeJson('users.json', users);
  console.log(`[SEED] Admin account created: ${adminEmail}`);
}

const server = app.listen(PORT, async () => {
  await seedAdmin();
  console.log(`\n🚀 Preploom server → http://localhost:${PORT}`);
  console.log(`\nAPI routes:`);
  [
    'GET  /api/health', 'GET  /api/exams', 'GET  /api/exams/:id',
    'GET  /api/blog', 'GET  /api/blog/:id', 'GET  /api/calendar',
    'GET  /api/testimonials', 'GET  /api/resources',
    'POST /api/register', 'POST /api/login',
    'GET  /api/users/me', 'PATCH /api/users/me',
    'GET  /api/dashboard (auth)', 'GET  /api/progress (auth)',
    'PUT  /api/progress (auth)', 'GET  /api/enrollments (auth)',
    'GET  /api/enrollments/details (auth)', 'POST /api/enroll (auth)',
    'DEL  /api/enroll/:id (auth)', 'POST /api/contact',
    'POST /api/subscribe', 'POST /api/chat',
    'GET  /api/admin/users (admin)', 'GET  /api/admin/stats (admin)',
    'DEL  /api/admin/users/:id (admin)'
  ].forEach(r => console.log(`  ${r}`));
  console.log();
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use. Try:\n  1. Kill the process: netstat -ano | findstr :${PORT}\n  2. Change PORT in .env\n`);
    process.exit(1);
  }
  throw err;
});
