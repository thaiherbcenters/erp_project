import fs from 'fs';

const filePath = 'c:/Users/thaih/Documents/GitHub/erp_project/backend/setup-documents-db.mjs';
let content = fs.readFileSync(filePath, 'utf8');

const standardsMap = {
    'IMS-MN-01': 'ทุกมาตรฐาน',
    'IMS-SMF-01': 'ASEAN GMP / GHP',
    'IMS-ORG-01': 'ISO 9001 / ทุกมาตรฐาน',
    'SOP-QA-01': 'ISO 9001 / ทุกมาตรฐาน',
    'FM-DC-01-01': 'ISO 9001 / ทุกมาตรฐาน',
    'FM-DC-01-02': 'ISO 9001',
    'FM-DC-01-03': 'ISO 9001',
    'FM-DC-01-04': 'ISO 9001'
};

content = content.replace(/\{ id: '([^']+)'(.*?)\}/g, (match, id, rest) => {
    let standard = standardsMap[id] || 'ISO 9001 / GMP';
    if(id.startsWith('SOP-HL') || id.startsWith('FM-HL')) standard = 'Halal / GMP';
    if(id.startsWith('SOP-ICS') || id.startsWith('FM-ICS') || id.startsWith('SOP-FA') || id.startsWith('FM-FA') || id.startsWith('FM-PU-04') || id.startsWith('SOP-PU-04')) standard = 'Organic / GMP';
    if(id.startsWith('SOP-TEA') || id.startsWith('FM-TEA')) standard = 'GMP / GHP';
    if(id.startsWith('SOP-IT') || id.startsWith('FM-IT') || id.startsWith('SOP-HR') || id.startsWith('FM-HR') || id.startsWith('SOP-AD') || id.startsWith('SOP-SS')) standard = 'ISO 9001';
    
    // Check if standard is already added
    if (rest.includes('standard:')) return match;
    
    return '{ id: \'' + id + '\'' + rest + ', standard: \'' + standard + '\' }';
});

content = content.replace('file_path      NVARCHAR(MAX) NULL,', 'file_path      NVARCHAR(MAX) NULL,\n                standard       NVARCHAR(255) NULL,');

content = content.replace('IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = \\\'Documents\\\')', 'IF EXISTS (SELECT * FROM sys.tables WHERE name = \\\'Documents\\\') DROP TABLE Documents;\n        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = \\\'Documents\\\')');

content = content.replace('INSERT INTO Documents (doc_code, doc_name, category, type, type_tag, revision, file_path, status, effective_date)', 'INSERT INTO Documents (doc_code, doc_name, category, type, type_tag, revision, file_path, standard, status, effective_date)');
content = content.replace('VALUES (@doc_code, @doc_name, @category, @type, @type_tag, @revision, @file_path, @status, @effective_date);', 'VALUES (@doc_code, @doc_name, @category, @type, @type_tag, @revision, @file_path, @standard, @status, @effective_date);');

content = content.replace('.input(\'file_path\', sql.NVarChar, filePath)', '.input(\'file_path\', sql.NVarChar, filePath)\n                .input(\'standard\', sql.NVarChar, doc.standard || \'ISO 9001\')');

fs.writeFileSync(filePath, content);
console.log('Successfully updated setup-documents-db.mjs');
