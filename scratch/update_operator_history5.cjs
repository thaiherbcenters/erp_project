const fs = require('fs');
const file = 'src/pages/Operator.jsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const idx = lines.findIndex(l => l.includes('historyEvents.length === 0'));
if (idx !== -1) {
    // The line with historyEvents.length is idx.
    // idx + 1 is </div>
    // idx + 2 is </div>
    // idx + 3 is </div> (closes the left panel, wait, let's look at the dump)
    
    // Dump:
    // idx:                                 {historyEvents.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8' }}>ยังไม่มีประวัติการทำงาน</div>}
    // idx+1:                             </div>
    // idx+2:                         </div>
    // idx+3:                     </div>
    
    // We want to insert `)}` after idx+2.
    lines.splice(idx + 3, 0, '                        )}');
    
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log('Successfully inserted closing brace!');
} else {
    console.log('Not found');
}
