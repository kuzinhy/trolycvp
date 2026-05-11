const fs = require('fs');
const path = require('path');
const distPath = path.join(__dirname, 'dist', 'assets');
if (!fs.existsSync(distPath)) { console.log('no dist'); process.exit(0); }
const files = fs.readdirSync(distPath).filter(f => f.endsWith('.js'));
for (const file of files) {
  const content = fs.readFileSync(path.join(distPath, file), 'utf-8');
  const matches = content.match(/.{0,30}[A-Za-z0-9_.]*fetch\s*=[^=].{0,30}/g);
  if (matches) {
    console.log(`\n--- ${file} ---`);
    matches.forEach(m => console.log(m));
  }
}


