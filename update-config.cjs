const fs = require('fs');
const file = 'backend/pdf_templates/contract_mfg/page0_config.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.fields.forEach(f => {
    if (['Auto Field 37', 'Auto Field 43', 'Auto Field 61'].includes(f.name)) {
        f.query = "SELECT COALESCE(NULLIF(EmployerRep, ''), EmployerName) FROM ContractMfgDocuments";
    }
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Updated JSON mapping for fallback signatures.');
