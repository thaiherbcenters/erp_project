const fs = require('fs');
const file = 'src/pages/Operator.jsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const rightPanelIdx = lines.findIndex(l => l.includes('{/* RIGHT PANEL */}'));
if (rightPanelIdx !== -1) {
    lines.splice(rightPanelIdx, 0, '                    </div>');
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log('Successfully inserted closing div!');
}
