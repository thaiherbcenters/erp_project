import fs from 'fs';

const files = [
    './src/pages/Settings.jsx',
    './src/pages/PermissionManager.jsx',
    './src/pages/DocumentLibrary.jsx',
    './src/pages/DocumentControl.jsx',
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Step 1: Remove old VITE_API_URL-based const declarations
    content = content.replace(/const API_BASE = .*VITE_API_URL.*;\n/g, '');
    content = content.replace(/const API = .*VITE_API_URL.*;\n/g, '');

    // Step 2: Replace all inline ${(import.meta.env.VITE_API_URL || '...')} with ${API_BASE}
    content = content.replace(/\$\{[\s]*\(import\.meta\.env\.VITE_API_URL \|\| '[^']*'\)\s*\}/g, '${API_BASE}');

    // Step 3: Add import at top (after last import line)
    if (!content.includes("import API_BASE from")) {
        // Find the last import statement
        const lines = content.split('\n');
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ') || lines[i].startsWith("import '")) {
                lastImportIndex = i;
            }
        }
        if (lastImportIndex >= 0) {
            lines.splice(lastImportIndex + 1, 0, "import API_BASE from '../config';");
            content = lines.join('\n');
        }
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Fixed:', file);
    } else {
        console.log('No changes:', file);
    }
});
