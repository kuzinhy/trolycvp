import fs from 'fs';
import path from 'path';

function walkDir(dir: string, callback: (path: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const replaceInFile = (filePath: string) => {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('gemini-3.5-flash') || content.includes('gemini-2.5-pro')) {
    const newContent = content.replace(/gemini-3\.5-flash/g, 'gemini-3.1-pro-preview').replace(/gemini-2\.5-pro/g, 'gemini-3.1-pro-preview');
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
};

walkDir('./src', replaceInFile);
