const fs = require('fs');
const path = require('path');

const helperStr = `
// Helper to format date in local timezone to prevent UTC timezone shifts
const formatDateLocal = (dateObj) => {
    if (!dateObj) return null;
    // If it's a string, parse it first
    if (typeof dateObj === 'string') dateObj = new Date(dateObj);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return \`\${year}-\${month}-\${day}\`;
};
`;

const processFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add helper if it doesn't exist and the file uses toISOString for dates
    if (content.includes('toISOString') && !content.includes('formatDateLocal')) {
        // Insert after imports
        content = content.replace(/const { poolPromise, sql } = require\('\.\.\/config\/db'\);/, 
            `const { poolPromise, sql } = require('../config/db');\n${helperStr}`);
    }

    // Replace f.CreatedDate ? f.CreatedDate.toISOString().split('T')[0] : null 
    // and similar patterns with formatDateLocal(f.CreatedDate)
    
    // Match pattern: obj.Prop ? obj.Prop.toISOString().split('T')[0] : null
    content = content.replace(/([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\s*\?\s*\1\.toISOString\(\)\.split\('T'\)\[0\]\s*:\s*null/g, 'formatDateLocal($1)');
    
    // Match pattern: new Date(row.DueDate).toISOString().split('T')[0]
    content = content.replace(/new Date\(([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\)\.toISOString\(\)\.split\('T'\)\[0\]/g, 'formatDateLocal($1)');
    
    fs.writeFileSync(filePath, content, 'utf8');
};

const dir = path.join(__dirname, 'routes');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
for (const file of files) {
    if (file === 'planner.js') continue; // already fixed manually
    processFile(path.join(dir, file));
}
console.log("Done patching date timezone shifts.");
