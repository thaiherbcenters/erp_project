const fs = require('fs');
const path = require('path');

const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx') && !file.includes('CustomSelect.jsx')) {
            results.push(file);
        }
    });
    return results;
};

const componentsDir = path.join(__dirname, 'src', 'components');
const pagesDir = path.join(__dirname, 'src', 'pages');

const files = [...walk(componentsDir), ...walk(pagesDir)];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('<select') || content.includes('</select>')) {
        console.log(`Processing: ${file}`);
        
        // Add import statement if not exists
        if (!content.includes('import CustomSelect')) {
            // Determine relative path to components/CustomSelect.jsx
            // Use path.sep for OS neutrality, or just check the folder path
            const isComponent = file.includes(path.sep + 'components' + path.sep);
            const relativePath = isComponent ? './CustomSelect' : '../components/CustomSelect';
            const importStmt = `import CustomSelect from '${relativePath}';\n`;
            
            // Insert after the last import statement
            const importMatches = [...content.matchAll(/^import .* from .*;?[\r\n]/gm)];
            if (importMatches.length > 0) {
                const lastImport = importMatches[importMatches.length - 1];
                const insertPos = lastImport.index + lastImport[0].length;
                content = content.slice(0, insertPos) + importStmt + content.slice(insertPos);
            } else {
                content = importStmt + content;
            }
        }
        
        // Replace tags
        content = content.replace(/<select/g, '<CustomSelect');
        content = content.replace(/<\/select>/g, '</CustomSelect>');
        
        fs.writeFileSync(file, content);
    }
});
console.log('Done!');
