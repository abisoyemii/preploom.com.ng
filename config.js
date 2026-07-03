// API base URL
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ''  // local: use relative paths (backend serves frontend)
  : '';  // production: backend API calls use relative paths via Vercel rewrites
