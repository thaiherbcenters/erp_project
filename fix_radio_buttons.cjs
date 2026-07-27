const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/src/components';
const formFiles = fs.readdirSync(dir).filter(f => f.endsWith('Form.jsx'));

const fixes = [
    { text: 'นาย', tag: 'นาย' },
    { text: 'นาง', tag: 'นาง' },
    { text: 'นางสาว', tag: 'นางสาว' },
    { text: 'นิติบุคคล', tag: 'นิติบุคคล' },
    { text: 'ไทย', tag: 'ไทย' },
    { text: 'ยาแผนไทย', tag: 'ยาแผนไทย' },
    { text: 'ยาแผนโบราณ', tag: 'ยาแผนโบราณ' },
    { text: 'ยาสามัญประจำบ้าน', tag: 'ยาสามัญประจำบ้าน' },
    { text: 'บุคคลธรรมดา', tag: 'บุคคลธรรมดา' },
];

formFiles.forEach(file => {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    // Fix radio buttons
    // e.g. <input type="radio" value='' checked={parsed.title === ''} onChange={handleTitleChange} /> นาย
    // e.g. <input type="radio" name="operatorPrefix" value='' checked={form.operatorPrefix === ''} onChange={handleChange} /> นาย
    
    // We will do a generic regex replace for each word
    fixes.forEach(({ text }) => {
        // Find: value='' checked={something === ''} (and arbitrary attrs in between) /> text
        // Note: the text might have leading spaces.
        const regex = new RegExp(`(value=['"]{2}.*?checked={[a-zA-Z0-9_.\\[\\]]+ \\s*===\\s*['"]{2}}[\\s\\S]*?>)\\s*${text}`, 'g');
        
        content = content.replace(regex, (match, p1) => {
            // Inside p1, replace value='' with value='text' and === '' with === 'text'
            let newP1 = p1.replace(/value=['"]{2}/, `value='${text}'`);
            newP1 = newP1.replace(/===\s*['"]{2}/, `=== '${text}'`);
            return newP1 + ` ${text}`;
        });
        
        // Also fix <option value=''>นิติบุคคล</option>
        const optionRegex = new RegExp(`<option value=['"]{2}>\\s*${text}\\s*</option>`, 'g');
        content = content.replace(optionRegex, `<option value="${text}">${text}</option>`);
    });
    
    fs.writeFileSync(path.join(dir, file), content, 'utf8');
    console.log(`Fixed ${file}`);
});
