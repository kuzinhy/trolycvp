const fs = require('fs');
const path = require('path');
const distPath = path.join(__dirname, 'dist', 'assets');
const files = fs.readdirSync(distPath).filter(f => f.endsWith('.js'));
for (const file of files) {
  const content = fs.readFileSync(path.join(distPath, file), 'utf-8');
  const regex = /.{0,40}(?:\w+\s*\[\s*(['"])fetch\1\s*\]|\w+\.fetch)\s*=[^=].{0,40}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
     if (match[0].includes('globalThis.fetch = fetch')) continue;
     console.log(`Found in ${file}:`, match[0]);
  }
}
