const fs = require('fs');

const file = 'c:\\Users\\thaih\\OneDrive\\เอกสาร\\GitHub\\erp_project\\src\\pages\\Operator.jsx';
let content = fs.readFileSync(file, 'utf8');

// Find the line that closes the op-qc-history div.
const searchStr = `                                {historyEvents.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8' }}>ยังไม่มีประวัติการทำงาน</div>}
                            </div>
                        </div>`;

const replaceStr = `                                {historyEvents.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8' }}>ยังไม่มีประวัติการทำงาน</div>}
                            </div>
                        </div>
                        )}`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully closed the condition');
} else {
    console.log('String not found');
}
