const fs = require('fs');
let content = fs.readFileSync('src/pages/Sales.jsx', 'utf-8');
let changed = false;

// 1. Fix title - use indexOf for exact match
const titleTarget = "previewDocModal.type === 'SalesOrder' ? '\u0E1E\u0E23\u0E35\u0E27\u0E34\u0E27\u0E43\u0E1A\u0E2A\u0E31\u0E48\u0E07\u0E02\u0E32\u0E22' : \r\n                                 '\u0E1E\u0E23\u0E35\u0E27\u0E34\u0E27\u0E43\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E2B\u0E19\u0E35\u0E49/\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32'}";
const titleReplace = "previewDocModal.type === 'SalesOrder' ? '\u0E1E\u0E23\u0E35\u0E27\u0E34\u0E27\u0E43\u0E1A\u0E2A\u0E31\u0E48\u0E07\u0E02\u0E32\u0E22' : \r\n                                 previewDocModal.type === 'DeliveryOrder' ? '\u0E1E\u0E23\u0E35\u0E27\u0E34\u0E27\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32' :\r\n                                 '\u0E1E\u0E23\u0E35\u0E27\u0E34\u0E27\u0E43\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E2B\u0E19\u0E35\u0E49/\u0E43\u0E1A\u0E2A\u0E48\u0E07\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32'}";

let idx = content.indexOf(titleTarget);
if (idx !== -1) {
    content = content.substring(0, idx) + titleReplace + content.substring(idx + titleTarget.length);
    console.log('1. Fixed title - OK');
    changed = true;
} else {
    console.log('1. Title target not found, trying without \\r\\n');
    // Try without \r
    const titleTarget2 = titleTarget.replace(/\r\n/g, '\n');
    idx = content.indexOf(titleTarget2);
    if (idx !== -1) {
        const titleReplace2 = titleReplace.replace(/\r\n/g, '\n');
        content = content.substring(0, idx) + titleReplace2 + content.substring(idx + titleTarget2.length);
        console.log('1. Fixed title (LF) - OK');
        changed = true;
    } else {
        console.log('1. Title target not found at all');
    }
}

// 2. Add DeliveryOrder form block - insert after SalesOrder block
const formTarget = "                            )}\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n            )}\r\n        </div>\r\n    );\r\n};";
const formInsert = `                            )}
                            {previewDocModal.type === 'DeliveryOrder' && (
                                <DeliveryOrderForm
                                    editId={previewDocModal.id}
                                    viewOnly={true}
                                    isHistory={previewDocModal.isHistory || false}
                                    onBack={() => setPreviewDocModal(null)}
                                    onSave={() => setPreviewDocModal(null)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};`;

idx = content.indexOf(formTarget);
if (idx !== -1) {
    content = content.substring(0, idx) + formInsert + content.substring(idx + formTarget.length);
    console.log('2. Added DeliveryOrder form block - OK');
    changed = true;
} else {
    console.log('2. Form block target not found, trying LF');
    const formTarget2 = formTarget.replace(/\r\n/g, '\n');
    idx = content.indexOf(formTarget2);
    if (idx !== -1) {
        content = content.substring(0, idx) + formInsert + content.substring(idx + formTarget2.length);
        console.log('2. Added DeliveryOrder form block (LF) - OK');
        changed = true;
    } else {
        console.log('2. Form block target not found at all');
    }
}

if (changed) {
    fs.writeFileSync('src/pages/Sales.jsx', content, 'utf-8');
    console.log('File saved!');
} else {
    console.log('No changes made.');
}
