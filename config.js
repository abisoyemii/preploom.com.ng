// API base URL — update RAILWAY_URL after deploying backend to Railway
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ''  // local: use relative paths (backend serves frontend)
  : 'https://RAILWAY_URL.up.railway.app';  // production: replace with your Railway URL
