import fs from 'fs';
import path from 'path';

const srcDir = './src';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk(srcDir);
files.forEach(file => {
    let original = fs.readFileSync(file, 'utf8');
    let content = original;

    // Replace single quotes: 'http://61.7.209.84:5000/api/users' -> `${import.meta.env.VITE_API_URL}/users`
    content = content.replace(/'http:\/\/61\.7\.209\.84:5000\/api(.*?)'/g, '`${import.meta.env.VITE_API_URL}$1`');
    
    // Replace backticks: `http://61.7.209.84:5000/api/users/${id}` -> `${import.meta.env.VITE_API_URL}/users/${id}`
    content = content.replace(/`http:\/\/61\.7\.209\.84:5000\/api(.*?)`/g, '`${import.meta.env.VITE_API_URL}$1`');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Fixed:', file);
    }
});
