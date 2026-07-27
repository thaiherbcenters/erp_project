const fs = require('fs');
const path = require('path');

function updateFonts(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            updateFonts(fullPath);
        } else if (file.endsWith('.json')) {
            const data = fs.readFileSync(fullPath, 'utf8');
            let config = JSON.parse(data);
            if (config.templateConfig && config.templateConfig.defaultFontFamily === 'Sarabun') {
                config.templateConfig.defaultFontFamily = 'THSarabunNew';
                fs.writeFileSync(fullPath, JSON.stringify(config, null, 2), 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

updateFonts(path.join(__dirname, 'pdf_templates'));
console.log('Done!');
