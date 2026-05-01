import fs from 'fs';
import path from 'path';

function findMaps(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findMaps(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, i) => {
                if (line.includes('.map(') && !line.includes('index') && !line.includes('idx') && !line.includes('i)')) {
                    if (line.includes('key={') || Object.values(lines).slice(i, i+3).some(l => l.includes('key={'))) {
                      // print
                    }
                }
            });
        }
    }
}
findMaps('./src');
console.log('done');
