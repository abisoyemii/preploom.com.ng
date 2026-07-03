const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'backend') continue;
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      htmlFiles.push(full);
    }
  }
}
walk(root);

const privateFiles = new Set(['admin.html', 'dashboard.html', 'login.html', 'my-exams.html', 'progress.html']);
const slugFor = (rel) => {
  if (rel === 'index.html') return 'https://preploom.com.ng/';
  if (rel === 'blog.html') return 'https://preploom.com.ng/blog';
  if (rel.startsWith('blog/')) {
    const base = path.basename(rel, '.html');
    return `https://preploom.com.ng/blog/${base}`;
  }
  const base = path.basename(rel, '.html');
  return `https://preploom.com.ng/${base}`;
};

for (const file of htmlFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  let html = fs.readFileSync(file, 'utf8');

  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    html = html.replace(/<meta charset="UTF-8">/i, '<meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover">');
  }

  if (!/<meta[^>]+name=["']robots["']/i.test(html)) {
    const robotsContent = privateFiles.has(rel) ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
    html = html.replace(/<\/head>/i, `    <meta name="robots" content="${robotsContent}">\n</head>`);
  }

  if (!/<link[^>]+rel=["']canonical["']/i.test(html)) {
    html = html.replace(/<\/head>/i, `    <link rel="canonical" href="${slugFor(rel)}">\n</head>`);
  } else {
    html = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${slugFor(rel)}">`);
  }

  if (!/<meta[^>]+property=["']og:type["']/i.test(html)) {
    html = html.replace(/<\/head>/i, `    <meta property="og:type" content="website">\n</head>`);
  }
  if (!/<meta[^>]+property=["']og:locale["']/i.test(html)) {
    html = html.replace(/<\/head>/i, `    <meta property="og:locale" content="en_NG">\n</head>`);
  }
  if (!/<meta[^>]+property=["']og:site_name["']/i.test(html)) {
    html = html.replace(/<\/head>/i, `    <meta property="og:site_name" content="PrepLoom Institute">\n</head>`);
  }

  if (rel === 'google.html') {
    html = html.replace(/<title>[^<]*<\/title>/i, '<title>Google Professional Certificates Prep 2026 | PrepLoom</title>');
  }
  if (rel === 'ielts.html') {
    html = html.replace(/<title>[^<]*<\/title>/i, '<title>IELTS Preparation & Success Stories | PrepLoom</title>');
  }
  if (rel === 'my-exams.html') {
    html = html.replace(/<title>[^<]*<\/title>/i, '<title>My Exams | PrepLoom</title>');
  }
  if (rel === 'about.html') {
    html = html.replace(/<title>[^<]*<\/title>/i, '<title>About PrepLoom Institute | TOEFL IELTS PMP Prep Nigeria</title>');
  }

  html = html.replace(/<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-3990291332288915"[^>]*><\/script>/g, '');
  html = html.replace(/guaranteed score improvement/gi, 'structured score improvement support');
  html = html.replace(/guaranteed/gi, 'supported');
  html = html.replace(/\b95% pass rate\b/gi, 'strong pass rate');
  html = html.replace(/\b98% pass rate\b/gi, 'strong pass rate');
  html = html.replace(/\b60% pass rate\b/gi, 'strong pass rate');
  html = html.replace(/\b#1\b/gi, 'leading');
  html = html.replace(/instant results/gi, 'rapid feedback');

  fs.writeFileSync(file, html, 'utf8');
}

console.log(`Refactored ${htmlFiles.length} HTML files.`);
