# Preploom Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables
Create `backend/.env` on the server with:
```
PORT=3000
NODE_ENV=production
JWT_SECRET=<generate-strong-random-secret>
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
ALLOWED_ORIGIN=https://preploom.com.ng
ADMIN_EMAIL=admin@preploom.com.ng
ADMIN_PASSWORD=<strong-password>
ADMIN_NAME=Admin User
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Install Dependencies
```bash
cd backend
npm install --production
```

### 3. HTTPS Setup
- Obtain SSL certificate (Let's Encrypt recommended)
- Configure reverse proxy (nginx/Apache) to:
  - Redirect HTTP → HTTPS
  - Proxy `/api/*` to `localhost:3000`
  - Serve static files from project root

**Example nginx config:**
```nginx
server {
    listen 80;
    server_name preploom.com.ng www.preploom.com.ng;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name preploom.com.ng www.preploom.com.ng;

    ssl_certificate /etc/letsencrypt/live/preploom.com.ng/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/preploom.com.ng/privkey.pem;

    root /var/www/preploom;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Process Manager (PM2)
```bash
npm install -g pm2
cd backend
pm2 start server.js --name preploom-api
pm2 startup
pm2 save
```

### 5. Firewall
```bash
# Allow only 80, 443, and SSH
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 6. File Permissions
```bash
chmod 600 backend/.env
chown -R www-data:www-data /var/www/preploom
```

### 7. Test Endpoints
- `https://preploom.com.ng` → index.html loads
- `https://preploom.com.ng/api/health` → `{"status":"ok"}`
- `https://preploom.com.ng/login.html` → login page loads
- Register a test account → verify JWT token works
- Login as admin → verify admin panel access

## Post-Deployment

### Monitor Logs
```bash
pm2 logs preploom-api
tail -f backend/server.log
```

### Backup Strategy
- Daily backup of `backend/data/*.json`
- Weekly backup of entire project
- Store backups off-site

### Security Hardening
- [ ] Change default admin password immediately
- [ ] Enable rate limiting (already configured)
- [ ] Review CSP headers in server.js
- [ ] Set up fail2ban for SSH
- [ ] Enable automatic security updates

## Troubleshooting

**Port 3000 already in use:**
```bash
pm2 stop preploom-api
# or
lsof -ti:3000 | xargs kill -9
```

**CORS errors:**
- Check `ALLOWED_ORIGIN` in `.env` matches your domain
- Verify nginx proxy headers are set correctly

**CSRF token errors:**
- Frontend must fetch `/api/csrf-token` before protected requests
- Check browser console for token fetch failures

**Admin can't login:**
- Check `backend/data/users.json` has admin user
- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`
- Server auto-creates admin on first start

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| PORT | 3000 | 3000 (behind nginx) |
| NODE_ENV | development | production |
| BCRYPT_ROUNDS | 8 | 12 |
| HTTPS | Optional | Required |
| CSP | Relaxed | Strict |
| Logs | Console | File + PM2 |

## API Endpoints

### Public
- `GET /api/health` - Health check
- `GET /api/exams` - List exams
- `GET /api/blog` - Blog posts
- `POST /api/register` - Create account
- `POST /api/login` - Login
- `POST /api/contact` - Contact form
- `POST /api/subscribe` - Newsletter

### Authenticated (requires JWT)
- `GET /api/users/me` - Current user
- `PATCH /api/users/me` - Update profile (CSRF)
- `GET /api/dashboard` - Dashboard data
- `GET /api/progress` - User progress
- `PUT /api/progress` - Update progress (CSRF)
- `GET /api/enrollments` - User enrollments
- `POST /api/enroll` - Enroll in exam (CSRF)
- `DELETE /api/enroll/:id` - Unenroll (CSRF)

### Admin Only
- `GET /api/admin/stats` - Platform stats
- `GET /api/admin/users` - All users
- `DELETE /api/admin/users/:id` - Delete user (CSRF)

## Support

For issues, check:
1. Server logs: `pm2 logs preploom-api`
2. Browser console (F12)
3. Network tab for failed API calls
4. `backend/server.log` for detailed errors
