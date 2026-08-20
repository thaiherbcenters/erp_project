const fs = require('fs');
const files = [
    'src/pages/Operator.jsx',
    'src/pages/OperatorWIP.jsx',
    'src/pages/RnD.jsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace('const { user,', 'const { currentUser: user,');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
});
