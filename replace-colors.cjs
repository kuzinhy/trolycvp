const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace hardcoded slate blacks with dark blues
    content = content.replace(/bg-slate-950/g, 'bg-blue-950');
    content = content.replace(/bg-slate-900/g, 'bg-blue-950');
    content = content.replace(/shadow-slate-900/g, 'shadow-blue-950');
    content = content.replace(/shadow-slate-950/g, 'shadow-blue-950');
    
    // Also change some black strings
    content = content.replace(/bg-black/g, 'bg-blue-950');
    
    // Optional: slate-800 to blue-900 for hovered states
    content = content.replace(/bg-slate-800/g, 'bg-blue-950');
    content = content.replace(/hover:bg-slate-800/g, 'hover:bg-blue-900');
    content = content.replace(/hover:bg-black/g, 'hover:bg-blue-900');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
