const fs = require('fs');

function replaceFlex(file, containerClass, cardClass, width) {
    let content = fs.readFileSync(file, 'utf8');
    
    const containerRegex = new RegExp('\\\\.' + containerClass + '\\\\s*\\\\{[\\\\s\\\\S]*?grid-template-columns:[^;]+;[\\\\s\\\\S]*?\\\\}');
    const newContainer = '.' + containerClass + ' {\\n    display: flex;\\n    overflow-x: auto;\\n    gap: 16px;\\n    padding-bottom: 12px;\\n}';
    content = content.replace(containerRegex, newContainer);
    
    const cardRegex = new RegExp('(\\\\.' + cardClass + '\\\\s*\\\\{[\\\\s\\\\S]*?)(?:\\\\})');
    content = content.replace(cardRegex, (match, p1) => {
        if(p1.includes('flex: 0 0 auto')) return match;
        return p1 + '    flex: 0 0 auto;\\n    width: ' + width + ';\\n}';
    });
    
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
}

replaceFlex('src/pages/Planning.css', 'plan-formula-grid', 'plan-formula-card', '280px');
replaceFlex('src/pages/QC.css', 'qc-pending-grid', 'qc-pending-card', '340px');
replaceFlex('src/pages/Packaging.css', 'pkg-active-grid', 'pkg-active-card', '320px');
replaceFlex('src/pages/Operator.css', 'op-jo-group-list', 'op-jo-group-card', '350px');
replaceFlex('src/pages/Operator.css', 'op-active-grid', 'op-active-card', '400px');

