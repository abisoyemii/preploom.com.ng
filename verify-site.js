const fs = require('fs');
const path = require('path');
const root = process.cwd();
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'backend'].includes(entry.name)) continue;
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
}
walk(root);
let checked = 0;
const missing = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file).replace(/\\/g, '/');
  checked++;
  if (!/<title>[^<]+<\/title>/i.test(text)) missing.push({ file: rel, issue: 'missing title' });
  if (!/<meta[^>]+name=["']description["'][^>]*content=["'][^"']+["']/i.test(text)) missing.push({ file: rel, issue: 'missing description' });
  if (!/<link[^>]+rel=["']canonical["']/i.test(text)) missing.push({ file: rel, issue: 'missing canonical' });
  if (!/<h1[^>]*>/i.test(text)) missing.push({ file: rel, issue: 'missing h1' });
}
console.log(JSON.stringify({ checkedFiles: checked, missing }, null, 2));
