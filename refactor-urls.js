/**
 * URL Refactoring Script
 * Converts all internal .html links to clean URLs
 * Run with: node refactor-urls.js
 */

const fs = require('fs');
const path = require('path');

// Map of .html files to clean URLs
const urlMap = {
  'index.html': '/',
  'about.html': '/about',
  'admin.html': '/admin',
  'blog.html': '/blog',
  'cambridge.html': '/cambridge',
  'cisco.html': '/cisco',
  'contact.html': '/contact',
  'dashboard.html': '/dashboard',
  'duolingo.html': '/duolingo',
  'gmat.html': '/gmat',
  'google.html': '/google',
  'ielts.html': '/ielts',
  'ielts-listening.html': '/ielts-listening',
  'language-exams.html': '/language-exams',
  'login.html': '/login',
  'my-exams.html': '/my-exams',
  'pmp.html': '/pmp',
  'privacy-policy.html': '/privacy-policy',
  'professional-exams.html': '/professional-exams',
  'progress.html': '/progress',
  'resources.html': '/resources',
  'terms.html': '/terms',
  'testimonials.html': '/testimonials',
  'toefl.html': '/toefl'
};

// Get all HTML files in current directory
const htmlFiles = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.html'));

let totalReplacements = 0;

htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let fileReplacements = 0;

  // Replace each .html reference with clean URL
  Object.entries(urlMap).forEach(([oldUrl, newUrl]) => {
    // Match href="filename.html" (with quotes)
    const regex1 = new RegExp(`href=["']${oldUrl}["']`, 'g');
    const matches1 = content.match(regex1) || [];
    content = content.replace(regex1, `href="${newUrl}"`);
    fileReplacements += matches1.length;

    // Match href='filename.html' (single quotes)
    const regex2 = new RegExp(`href='${oldUrl}'`, 'g');
    const matches2 = content.match(regex2) || [];
    content = content.replace(regex2, `href='${newUrl}'`);
    fileReplacements += matches2.length;

    // Match onclick="location.href='filename.html'"
    const regex3 = new RegExp(`location\\.href\\s*=\\s*["']${oldUrl}["']`, 'g');
    const matches3 = content.match(regex3) || [];
    content = content.replace(regex3, `location.href='${newUrl}'`);
    fileReplacements += matches3.length;

    // Match window.location.href = 'filename.html'
    const regex4 = new RegExp(`window\\.location\\.href\\s*=\\s*["']${oldUrl}["']`, 'g');
    const matches4 = content.match(regex4) || [];
    content = content.replace(regex4, `window.location.href = '${newUrl}'`);
    fileReplacements += matches4.length;
  });

  // Special case: Keep index.html as root when it's the logo link
  content = content.replace(/href=["']\/["']/g, 'href="/"');

  if (fileReplacements > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${file}: ${fileReplacements} replacements`);
    totalReplacements += fileReplacements;
  } else {
    console.log(`- ${file}: No changes needed`);
  }
});

console.log(`\n✅ Complete! Total replacements: ${totalReplacements}`);
console.log('\n📝 Note: .html files are NOT deleted - they remain for server routing.');
console.log('🚀 Your site now uses clean URLs!');
