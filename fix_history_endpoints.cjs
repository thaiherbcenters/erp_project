const fs = require('fs');
const path = require('path');

const routes = [
    { file: 'legalDocuments.js', table: 'LegalDocuments', pk: 'DocumentID' },
    { file: 'herbalCertDocuments.js', table: 'HerbalCertDocuments', pk: 'DocumentID' },
    { file: 'torbor1Documents.js', table: 'TorBor1Documents', pk: 'DocumentID' },
    { file: 'contractMfg.js', table: 'ContractMfgDocuments', pk: 'documentId' },
    { file: 'pdpaConsentDocuments.js', table: 'PdpaConsentDocuments', pk: 'documentId' },
    { file: 'safetyCertDocuments.js', table: 'SafetyCertDocuments', pk: 'documentId' },
    { file: 'corpRepDocuments.js', table: 'CorpRepDocuments', pk: 'documentId' }
];

const basePath = path.join(__dirname, 'backend', 'routes');

routes.forEach(route => {
    const filePath = path.join(basePath, route.file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        if (!content.includes('/history-by-id/:id')) {
            const historyCode = `
// GET history by Document ID
router.get('/history-by-id/:id', async (req, res) => {
    try {
        const { poolPromise, sql } = require('../config/db');
        const pool = await poolPromise;
        
        // Ensure DocumentType exists in table structure or mock it
        let docTypeField = 'DocumentType';
        if ('${route.table}' === 'SafetyCertDocuments' || '${route.table}' === 'PdpaConsentDocuments') {
            docTypeField = 'NULL as DocumentType';
        }
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(\`
                DECLARE @RefID INT;
                SELECT @RefID = ISNULL(RefDocumentID, ${route.pk}) FROM ${route.table} WHERE ${route.pk} = @id;
                
                SELECT ${route.pk} as DocumentID, Status, CreatedAt, Version
                FROM ${route.table}
                WHERE ${route.pk} = @RefID OR RefDocumentID = @RefID
                ORDER BY Version DESC
            \`);
        
        // Since some tables don't have DocumentType column, we just return the row
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching history by ID:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;`;
            
            content = content.replace(/module\.exports\s*=\s*router;/, historyCode);
            fs.writeFileSync(filePath, content);
            console.log('Updated ' + route.file);
        } else {
            console.log('Already updated ' + route.file);
        }
    } else {
        console.log('Not found ' + route.file);
    }
});
