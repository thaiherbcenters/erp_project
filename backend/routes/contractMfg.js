const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// GET all contract mfg documents
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;

        let whereClause = "WHERE Status != 'พรีวิว'";
        const request = pool.request();

        // Count total unique DocumentId (or ContractNo depending on logic)
        const countResult = await request.query(`
            SELECT COUNT(*) as total FROM (
                SELECT ROW_NUMBER() OVER(PARTITION BY ISNULL(ContractNo, CAST(documentId AS NVARCHAR(50))) ORDER BY Version DESC) as rn
                FROM ContractMfgDocuments
                ${whereClause}
            ) docs WHERE rn = 1
        `);
        const total = countResult.recordset[0].total;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limit);

        const result = await request.query(`
            SELECT * FROM (
                SELECT *, ROW_NUMBER() OVER(PARTITION BY ISNULL(ContractNo, CAST(documentId AS NVARCHAR(50))) ORDER BY Version DESC) as rn
                FROM ContractMfgDocuments
                ${whereClause}
            ) docs
            WHERE rn = 1
            ORDER BY CreatedAt DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);
        
        res.json({ 
            success: true, 
            data: result.recordset,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching contract mfg documents:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET single document
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const result = await pool.request()
            .input('documentId', sql.Int, id)
            .query(`SELECT * FROM ContractMfgDocuments WHERE documentId = @documentId`);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error('Error fetching document:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// POST new document
router.post('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const data = req.body;
        
        // Auto-cleanup: Delete 'พรีวิว' documents older than 24 hours in the background
        pool.request().query(`
            DELETE FROM ContractMfgDocuments 
            WHERE Status = 'พรีวิว' AND CreatedAt < DATEADD(hour, -24, GETDATE())
        `).catch(e => console.error('Cleanup error:', e));

        const request = pool.request();
        
        const insertQuery = `
            INSERT INTO ContractMfgDocuments (
                contractId, customerId, ContractNo, WrittenAt, DocumentDate,
                EmployerName, EmployerID, EmployerRep, EmployerRepID, EmployerAddress, EmployerRepAddress,
                ContractorName, ContractorID, ContractorRep, ContractorRepOf, ContractorLicense, ContractorAddress,
                ProductsData, Witness1, Witness2,
                Status, Version
            )
            OUTPUT INSERTED.*
            VALUES (
                @contractId, @customerId, @ContractNo, @WrittenAt, @DocumentDate,
                @EmployerName, @EmployerID, @EmployerRep, @EmployerRepID, @EmployerAddress, @EmployerRepAddress,
                @ContractorName, @ContractorID, @ContractorRep, @ContractorRepOf, @ContractorLicense, @ContractorAddress,
                @ProductsData, @Witness1, @Witness2,
                @Status, @Version
            )
        `;

        request.input('contractId', sql.Int, data.contractId || null);
        request.input('customerId', sql.Int, data.customerId || null);
        request.input('ContractNo', sql.NVarChar, data.ContractNo || null);
        request.input('WrittenAt', sql.NVarChar, data.WrittenAt || null);
        request.input('DocumentDate', sql.Date, data.DocumentDate || null);
        request.input('EmployerName', sql.NVarChar, data.EmployerName || null);
        request.input('EmployerID', sql.NVarChar, data.EmployerID || null);
        request.input('EmployerRep', sql.NVarChar, data.EmployerRep || null);
        request.input('EmployerRepID', sql.NVarChar, data.EmployerRepID || null);
        request.input('EmployerAddress', sql.NVarChar, data.EmployerAddress || null);
        request.input('EmployerRepAddress', sql.NVarChar, data.EmployerRepAddress || null);
        request.input('ContractorName', sql.NVarChar, data.ContractorName || 'วิสาหกิจชุมชน Thai Herb Centers');
        request.input('ContractorID', sql.NVarChar, data.ContractorID || null);
        request.input('ContractorRep', sql.NVarChar, data.ContractorRep || null);
        request.input('ContractorRepOf', sql.NVarChar, data.ContractorRepOf || null);
        request.input('ContractorLicense', sql.NVarChar, data.ContractorLicense || null);
        request.input('ContractorAddress', sql.NVarChar, data.ContractorAddress || null);
        request.input('ProductsData', sql.NVarChar, data.ProductsData ? JSON.stringify(data.ProductsData) : null);
        request.input('Witness1', sql.NVarChar, data.Witness1 || null);
        request.input('Witness2', sql.NVarChar, data.Witness2 || null);
        request.input('Status', sql.NVarChar, data.status || 'ร่าง');
        request.input('Version', sql.Int, 1);

        const result = await request.query(insertQuery);
        res.status(201).json({ success: true, documentId: result.recordset[0].documentId, data: result.recordset[0] });
    } catch (err) {
        console.error('Error creating document:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// PUT update document
router.put('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const data = req.body;
        
        // Fetch current document
        const currentDocResult = await pool.request()
            .input('documentId', sql.Int, id)
            .query(`SELECT * FROM ContractMfgDocuments WHERE documentId = @documentId`);
        if (currentDocResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        const oldDoc = currentDocResult.recordset[0];

        const request = pool.request();
        request.input('contractId', sql.Int, data.contractId || null);
        request.input('customerId', sql.Int, data.customerId || null);
        request.input('ContractNo', sql.NVarChar, data.ContractNo || oldDoc.ContractNo || null);
        request.input('WrittenAt', sql.NVarChar, data.WrittenAt || null);
        request.input('DocumentDate', sql.Date, data.DocumentDate || null);
        request.input('EmployerName', sql.NVarChar, data.EmployerName || null);
        request.input('EmployerID', sql.NVarChar, data.EmployerID || null);
        request.input('EmployerRep', sql.NVarChar, data.EmployerRep || null);
        request.input('EmployerRepID', sql.NVarChar, data.EmployerRepID || null);
        request.input('EmployerAddress', sql.NVarChar, data.EmployerAddress || null);
        request.input('EmployerRepAddress', sql.NVarChar, data.EmployerRepAddress || null);
        request.input('ContractorName', sql.NVarChar, data.ContractorName || 'วิสาหกิจชุมชน Thai Herb Centers');
        request.input('ContractorID', sql.NVarChar, data.ContractorID || null);
        request.input('ContractorRep', sql.NVarChar, data.ContractorRep || null);
        request.input('ContractorRepOf', sql.NVarChar, data.ContractorRepOf || null);
        request.input('ContractorLicense', sql.NVarChar, data.ContractorLicense || null);
        request.input('ContractorAddress', sql.NVarChar, data.ContractorAddress || null);
        request.input('ProductsData', sql.NVarChar, data.ProductsData ? JSON.stringify(data.ProductsData) : null);
        request.input('Witness1', sql.NVarChar, data.Witness1 || null);
        request.input('Witness2', sql.NVarChar, data.Witness2 || null);
        request.input('Status', sql.NVarChar, data.status || 'ร่าง');

        let queryStr = '';
        // ถ้าสถานะเป็น "ลูกค้าขอแก้ไข" → สร้างเวอร์ชันใหม่ทุกครั้งที่บันทึก
        if (data.status === 'ลูกค้าขอแก้ไข' && oldDoc.Status !== 'ลูกค้าขอแก้ไข') {
            const docNo = oldDoc.ContractNo || data.ContractNo;
            const maxVerResult = await pool.request()
                .input('VerDocNo', sql.NVarChar, docNo)
                .query(`SELECT MAX(Version) as maxVer FROM ContractMfgDocuments WHERE ContractNo = @VerDocNo`);
            const newVersion = (maxVerResult.recordset[0].maxVer || 1) + 1;
            request.input('Version', sql.Int, newVersion);

            queryStr = `
                INSERT INTO ContractMfgDocuments (
                    contractId, customerId, ContractNo, WrittenAt, DocumentDate,
                    EmployerName, EmployerID, EmployerRep, EmployerRepID, EmployerAddress, EmployerRepAddress,
                    ContractorName, ContractorID, ContractorRep, ContractorRepOf, ContractorLicense, ContractorAddress,
                    ProductsData, Witness1, Witness2,
                    Status, Version, CreatedAt, UpdatedAt
                )
                OUTPUT INSERTED.*
                VALUES (
                    @contractId, @customerId, @ContractNo, @WrittenAt, @DocumentDate,
                    @EmployerName, @EmployerID, @EmployerRep, @EmployerRepID, @EmployerAddress, @EmployerRepAddress,
                    @ContractorName, @ContractorID, @ContractorRep, @ContractorRepOf, @ContractorLicense, @ContractorAddress,
                    @ProductsData, @Witness1, @Witness2,
                    @Status, @Version, GETDATE(), GETDATE()
                )
            `;
        } else {
            request.input('documentId', sql.Int, id);
            request.input('Version', sql.Int, oldDoc.Version || 1);
            queryStr = `
                UPDATE ContractMfgDocuments
                SET 
                    contractId = @contractId, customerId = @customerId, ContractNo = @ContractNo, 
                    WrittenAt = @WrittenAt, DocumentDate = @DocumentDate,
                    EmployerName = @EmployerName, EmployerID = @EmployerID, EmployerRep = @EmployerRep, 
                    EmployerRepID = @EmployerRepID, EmployerAddress = @EmployerAddress, EmployerRepAddress = @EmployerRepAddress,
                    ContractorName = @ContractorName, ContractorID = @ContractorID, ContractorRep = @ContractorRep, ContractorRepOf = @ContractorRepOf, 
                    ContractorLicense = @ContractorLicense, ContractorAddress = @ContractorAddress,
                    ProductsData = @ProductsData, Witness1 = @Witness1, Witness2 = @Witness2,
                    Status = @Status, Version = @Version, UpdatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE documentId = @documentId
            `;
        }

        const result = await request.query(queryStr);
        const returnedId = result.recordset[0].documentId;
        res.json({ success: true, documentId: returnedId, data: result.recordset[0] });
    } catch (err) {
        console.error('Error updating document:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// DELETE document
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        await pool.request()
            .input('documentId', sql.Int, id)
            .query(`
                DECLARE @CNo NVARCHAR(50);
                SELECT @CNo = ContractNo FROM ContractMfgDocuments WHERE documentId = @documentId;
                IF @CNo IS NOT NULL
                    DELETE FROM ContractMfgDocuments WHERE ContractNo = @CNo;
                ELSE
                    DELETE FROM ContractMfgDocuments WHERE documentId = @documentId;
            `);
        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});


// GET history of a specific document number
router.get('/history/:documentNo', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { documentNo } = req.params;
        const result = await pool.request()
            .input('DocumentNo', require('mssql').NVarChar, documentNo)
            .query(`
                SELECT ${idCol} as DocumentID, ${noCol} as DocumentNo, Status, CreatedAt, Version ${docTypeSelect}
                FROM ${route.table}
                WHERE ${noCol} = @DocumentNo
                ORDER BY Version DESC
            `);
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching document history:', err);
        res.status(500).json({ success: false, message: 'Server error fetching document history', error: err.message });
    }
});


// GET history by Document ID
router.get('/history-by-id/:id', async (req, res) => {
    try {
        const { poolPromise, sql } = require('../config/db');
        const pool = await poolPromise;
        
        // Ensure DocumentType exists in table structure or mock it
        let docTypeField = 'DocumentType';
        if ('ContractMfgDocuments' === 'SafetyCertDocuments' || 'ContractMfgDocuments' === 'PdpaConsentDocuments') {
            docTypeField = 'NULL as DocumentType';
        }
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                DECLARE @RefID INT;
                SELECT @RefID = ISNULL(RefDocumentID, documentId) FROM ContractMfgDocuments WHERE documentId = @id;
                
                SELECT documentId as DocumentID, Status, CreatedAt, Version
                FROM ContractMfgDocuments
                WHERE documentId = @RefID OR RefDocumentID = @RefID
                ORDER BY Version DESC
            `);
        
        // Since some tables don't have DocumentType column, we just return the row
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching history by ID:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
