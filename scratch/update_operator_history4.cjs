const fs = require('fs');
const file = 'c:\\Users\\thaih\\OneDrive\\เอกสาร\\GitHub\\erp_project\\src\\pages\\Operator.jsx';
const content = fs.readFileSync(file, 'utf8');

const strToFind = `                                {historyEvents.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8' }}>ยังไม่มีประวัติการทำงาน</div>}
                            </div>
                        </div>`;

const strToReplace = `                                {historyEvents.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8' }}>ยังไม่มีประวัติการทำงาน</div>}
                            </div>
                        </div>
                        )}`;

let newContent = content.replace(strToFind, strToReplace);
if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log("Replaced successfully (exact match).");
} else {
    // Try relaxing whitespace
    const regex = /\{historyEvents\.length === 0.*?\n\s*<\/div>\n\s*<\/div>/;
    const match = content.match(regex);
    if (match) {
        newContent = content.replace(match[0], match[0] + '\n                        )}');
        fs.writeFileSync(file, newContent, 'utf8');
        console.log("Replaced successfully (regex match).");
    } else {
        console.log("Still no match");
    }
}
