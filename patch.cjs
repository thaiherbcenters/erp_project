const fs = require('fs');
let code = fs.readFileSync('src/components/TorBor1Form.jsx', 'utf8');

// 1. Imports
code = code.replace(
    /import \{ FileText, User, Building2, Globe, Check, ChevronRight, Plus, Trash2, Factory, Ship, Database, X \} from 'lucide-react';/,
    "import { FileText, User, Building2, Globe, Check, ChevronRight, Plus, Trash2, Factory, Ship, Database, X, Save } from 'lucide-react';"
);

// 2. State
code = code.replace(
    /const \[currentDocId, setCurrentDocId\] = useState\(documentId\);/,
    "const [currentDocId, setCurrentDocId] = useState(documentId);\n    const [linkedFormulaId, setLinkedFormulaId] = useState(null);\n    const [hasFormatChanges, setHasFormatChanges] = useState(false);"
);

// 3. Effect
code = code.replace(
    /const d = json\.data;\n\s*setForm\(prev => \(\{/,
    "const d = json.data;\n                    if (d.FormulaID) setLinkedFormulaId(d.FormulaID);\n                    setForm(prev => ({"
);

// 4. handleSelectFormula
code = code.replace(
    /const handleSelectFormula = \(formula\) => \{\n\s*if \(!formula \|\| !formula\.ingredients\) return;\n\s*const active = \[\];/,
    `const handleSelectFormula = (formula) => {
        if (!formula || !formula.ingredients) return;
        
        setLinkedFormulaId(formula.id);
        setHasFormatChanges(false);
        
        const active = [];`
);

// 5. handleSelectFormula end
code = code.replace(
    /        setForm\(prev => \(\{\n            \.\.\.prev,\n            RecipeActiveIngredients: active\.length > 0 \? active : \[\{ thaiName: '', engName: '', latinName: '', partUsed: '', quantity: '' \}\],\n            RecipeExtracts: extract\.length > 0 \? extract : \[\{ extractName: '', latinName: '', partUsed: '', solvent: '', ratio: '', quantity: '' \}\],\n            RecipeExcipients: inactive\.length > 0 \? inactive : \[\{ name: '', casNumber: '', function: '', quantity: '' \}\],\n            \n            \/\/ Map product details if they exist in instructions\n            ProductAppearance: hasInstructions \? \(instructions\.ProductAppearance \|\| ''\) : prev\.ProductAppearance,\n            ProductPackSize: hasInstructions \? \(instructions\.ProductPackSize \|\| ''\) : prev\.ProductPackSize,\n            ProductMfgProcess: hasInstructions \? \(instructions\.ProductMfgProcess \|\| ''\) : prev\.ProductMfgProcess,\n            ProductIndication: hasInstructions \? \(instructions\.ProductIndication \|\| ''\) : prev\.ProductIndication,\n            ProductDosage: hasInstructions \? \(instructions\.ProductDosage \|\| ''\) : prev\.ProductDosage,\n            ProductPreparation: hasInstructions \? \(instructions\.ProductPreparation \|\| ''\) : prev\.ProductPreparation,\n            ProductCondition: hasInstructions \? \(instructions\.ProductCondition \|\| ''\) : prev\.ProductCondition,\n            ProductStorage: hasInstructions \? \(instructions\.ProductStorage \|\| ''\) : prev\.ProductStorage,\n            ProductContraindication: hasInstructions \? \(instructions\.ProductContraindication \|\| ''\) : prev\.ProductContraindication,\n            ProductWarning: hasInstructions \? \(instructions\.ProductWarning \|\| ''\) : prev\.ProductWarning,\n            ProductPrecaution: hasInstructions \? \(instructions\.ProductPrecaution \|\| ''\) : prev\.ProductPrecaution,\n            ProductAdverseReaction: hasInstructions \? \(instructions\.ProductAdverseReaction \|\| ''\) : prev\.ProductAdverseReaction,\n            SalesChannel: hasInstructions \? \(instructions\.SalesChannel \|\| ''\) : prev\.SalesChannel,\n            ProductSummary: hasInstructions \? \(instructions\.ProductSummary \|\| ''\) : prev\.ProductSummary\n        \}\)\);\n        \n        setShowFormulaModal\(false\);\n        showAlert\('success', 'ดึงข้อมูลสูตรตำรับสำเร็จ'\);\n    \};/,
    `        setForm(prev => {
            const nextState = {
                ...prev,
                // Map product details if they exist in instructions
                ProductAppearance: hasInstructions ? (instructions.ProductAppearance || '') : prev.ProductAppearance,
                ProductPackSize: hasInstructions ? (instructions.ProductPackSize || '') : prev.ProductPackSize,
                ProductMfgProcess: hasInstructions ? (instructions.ProductMfgProcess || '') : prev.ProductMfgProcess,
                ProductIndication: hasInstructions ? (instructions.ProductIndication || '') : prev.ProductIndication,
                ProductDosage: hasInstructions ? (instructions.ProductDosage || '') : prev.ProductDosage,
                ProductPreparation: hasInstructions ? (instructions.ProductPreparation || '') : prev.ProductPreparation,
                ProductCondition: hasInstructions ? (instructions.ProductCondition || '') : prev.ProductCondition,
                ProductStorage: hasInstructions ? (instructions.ProductStorage || '') : prev.ProductStorage,
                ProductContraindication: hasInstructions ? (instructions.ProductContraindication || '') : prev.ProductContraindication,
                ProductWarning: hasInstructions ? (instructions.ProductWarning || '') : prev.ProductWarning,
                ProductPrecaution: hasInstructions ? (instructions.ProductPrecaution || '') : prev.ProductPrecaution,
                ProductAdverseReaction: hasInstructions ? (instructions.ProductAdverseReaction || '') : prev.ProductAdverseReaction,
                SalesChannel: hasInstructions ? (instructions.SalesChannel || '') : prev.SalesChannel,
                ProductSummary: hasInstructions ? (instructions.ProductSummary || '') : prev.ProductSummary
            };

            if (formula.torbor1Format && formula.torbor1Format.RecipeActiveIngredients) {
                nextState.RecipeActiveIngredients = formula.torbor1Format.RecipeActiveIngredients;
                nextState.RecipeExtracts = formula.torbor1Format.RecipeExtracts || [];
                nextState.RecipeExcipients = formula.torbor1Format.RecipeExcipients || [];
            } else {
                nextState.RecipeActiveIngredients = active.length > 0 ? active : [{ thaiName: '', engName: '', latinName: '', partUsed: '', quantity: '' }];
                nextState.RecipeExtracts = extract.length > 0 ? extract : [{ extractName: '', latinName: '', partUsed: '', solvent: '', ratio: '', quantity: '' }];
                nextState.RecipeExcipients = inactive.length > 0 ? inactive : [{ name: '', casNumber: '', function: '', quantity: '' }];
            }

            return nextState;
        });
        
        setShowFormulaModal(false);
        if (formula.torbor1Format) {
            showAlert('success', 'ดึงข้อมูลสูตรตำรับสำเร็จ (โหลดรูปแบบตารางที่เคยบันทึกไว้)');
        } else {
            showAlert('success', 'ดึงข้อมูลสูตรตำรับสำเร็จ');
        }
    };
    
    const handleSaveFormulaFormat = async () => {
        if (!linkedFormulaId) return;
        try {
            const torbor1Format = {
                RecipeActiveIngredients: form.RecipeActiveIngredients,
                RecipeExtracts: form.RecipeExtracts,
                RecipeExcipients: form.RecipeExcipients
            };
            
            const res = await fetch(\`\${API_BASE}/rnd/formulas/\${linkedFormulaId}/torbor1-format\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ torbor1Format })
            });
            const data = await res.json();
            if (data.success) {
                showAlert('success', 'บันทึกรูปแบบตารางกลับไปยังสูตรหลักสำเร็จแล้ว');
                setHasFormatChanges(false);
            } else {
                showAlert('error', 'เกิดข้อผิดพลาดในการบันทึกรูปแบบตาราง');
            }
        } catch (err) {
            console.error('Error saving formula format:', err);
            showAlert('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };`
);

// 6. Change handlers
const changeHandlers = [
    /setForm\(prev => \(\{ \.\.\.prev, RecipeActiveIngredients: \[\.\.\.\(prev\.RecipeActiveIngredients \|\| \[\]\), \{ thaiName: '', engName: '', latinName: '', partUsed: '', quantity: '' \}\] \}\)\);/g,
    /setForm\(prev => \(\{ \.\.\.prev, RecipeActiveIngredients: \(prev\.RecipeActiveIngredients \|\| \[\]\)\.filter\(\(_, i\) => i !== index\) \}\)\);/g,
    /setForm\(\{ \.\.\.form, RecipeActiveIngredients: list \}\);/g,
    /setForm\(prev => \(\{ \.\.\.prev, RecipeExtracts: \[\.\.\.\(prev\.RecipeExtracts \|\| \[\]\), \{ extractName: '', latinName: '', partUsed: '', solvent: '', ratio: '', quantity: '' \}\] \}\)\);/g,
    /setForm\(prev => \(\{ \.\.\.prev, RecipeExtracts: \(prev\.RecipeExtracts \|\| \[\]\)\.filter\(\(_, i\) => i !== index\) \}\)\);/g,
    /setForm\(\{ \.\.\.form, RecipeExtracts: list \}\);/g,
    /setForm\(prev => \(\{ \.\.\.prev, RecipeExcipients: \[\.\.\.\(prev\.RecipeExcipients \|\| \[\]\), \{ name: '', casNumber: '', function: '', quantity: '' \}\] \}\)\);/g,
    /setForm\(prev => \(\{ \.\.\.prev, RecipeExcipients: \(prev\.RecipeExcipients \|\| \[\]\)\.filter\(\(_, i\) => i !== index\) \}\)\);/g,
    /setForm\(\{ \.\.\.form, RecipeExcipients: list \}\);/g
];
changeHandlers.forEach(h => {
    code = code.replace(h, match => match + '\n        setHasFormatChanges(true);');
});

// 7. Button layout and widths
// Active ingredients width & button
code = code.replace(
    /(!readOnly && \(\n\s*)<button type="button" onClick=\{\(\) => setShowFormulaModal\(true\)\} style=\{\{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', border: 'none', background: colors\.primary, color: '#fff', cursor: 'pointer' \}\}>\n\s*<Database size=\{14\} \/> ดึงข้อมูลสูตรตำรับ \(R&D\)\n\s*<\/button>(\n\s*\))/g,
    `$1<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {linkedFormulaId && hasFormatChanges && (
                                    <button type="button" onClick={handleSaveFormulaFormat} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', border: \`1px solid \${colors.success}\`, background: '#fff', color: colors.success, cursor: 'pointer', boxShadow: '0 2px 4px -1px rgba(16, 185, 129, 0.1)' }}>
                                        <Save size={14} /> บันทึกรูปแบบตาราง (R&D)
                                    </button>
                                )}
                                <button type="button" onClick={() => setShowFormulaModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', border: 'none', background: colors.primary, color: '#fff', cursor: 'pointer' }}>
                                    <Database size={14} /> ดึงข้อมูลสูตรตำรับ (R&D)
                                </button>
                            </div>$2`
);

// Active ingredients grid widths
code = code.replace(
    /<div style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr 1\.5fr 1fr 1fr 50px', background: colors\.primary, color: '#fff' \}\}>/g,
    `<div style={{ display: 'grid', gridTemplateColumns: '1.8fr 2.2fr 2.8fr 1.1fr 1.1fr 50px', background: colors.primary, color: '#fff' }}>`
);
code = code.replace(
    /<div key=\{idx\} style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr 1\.5fr 1fr 1fr 50px', borderTop: \`1px solid \\\$\\{colors\.border\\}\`, background: idx % 2 === 0 \? '#fff' : '#fafbfc' \}\}>/g,
    `<div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.8fr 2.2fr 2.8fr 1.1fr 1.1fr 50px', borderTop: \`1px solid \${colors.border}\`, background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>`
);

// Extracts grid widths
code = code.replace(
    /<div style=\{\{ display: 'grid', gridTemplateColumns: '1\.5fr 1\.5fr 1fr 1fr 1fr 1fr 50px', background: colors\.primary, color: '#fff' \}\}>/g,
    `<div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 2fr 1.5fr 50px', background: colors.primary, color: '#fff' }}>`
);
code = code.replace(
    /<div key=\{idx\} style=\{\{ display: 'grid', gridTemplateColumns: '1\.5fr 1\.5fr 1fr 1fr 1fr 1fr 50px', borderTop: \`1px solid \\\$\\{colors\.border\\}\`, background: idx % 2 === 0 \? '#fff' : '#fafbfc' \}\}>/g,
    `<div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 2fr 1.5fr 50px', borderTop: \`1px solid \${colors.border}\`, background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>`
);

fs.writeFileSync('src/components/TorBor1Form.jsx', code);
console.log('Done patching!');
