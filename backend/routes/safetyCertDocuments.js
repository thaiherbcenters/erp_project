const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// GET all
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM (
                SELECT *, ROW_NUMBER() OVER(PARTITION BY ISNULL(RefDocumentID, documentId) ORDER BY Version DESC) as rn
                FROM SafetyCertDocuments 
            ) docs
            WHERE rn = 1
            ORDER BY CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching safety cert documents:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET by contractId
router.get('/contract/:contractId', async (req, res) => {
    try {
        const { contractId } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('contractId', sql.Int, contractId)
            .query('SELECT TOP 1 * FROM SafetyCertDocuments WHERE contractId = @contractId ORDER BY CreatedAt DESC');
            
        if (result.recordset.length === 0) {
            return res.json(null); // Return null instead of 404 for easier frontend handling
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching safety cert document by contract:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM SafetyCertDocuments WHERE documentId = @id');
            
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching safety cert document by ID:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST (Create)
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const pool = await poolPromise;
        
        const request = pool.request();
        
        request
            .input('contractId', sql.Int, data.contractId || null)
            .input('customerId', sql.Int, data.customerId || null)
            .input('WrittenAt', sql.NVarChar, data.writtenAt || null)
            .input('DocumentDate', sql.Date, data.documentDate || null)
            .input('OwnerPrefix', sql.NVarChar, data.ownerPrefix || null)
            .input('OwnerName', sql.NVarChar, data.ownerName || null)
            .input('ReqTypeRegistration', sql.Bit, data.reqTypeRegistration ? 1 : 0)
            .input('ReqTypeDetailNotification', sql.Bit, data.reqTypeDetailNotification ? 1 : 0)
            .input('ReqTypeNotification', sql.Bit, data.reqTypeNotification ? 1 : 0)
            .input('ProductName', sql.NVarChar, data.productName || null)
            .input('ReceiptNo', sql.NVarChar, data.receiptNo || null)
            .input('Status', sql.NVarChar, data.status || 'ร่าง');

        const insertQuery = `
            INSERT INTO SafetyCertDocuments (
                contractId, customerId, WrittenAt, DocumentDate,
                OwnerPrefix, OwnerName, ReqTypeRegistration, 
                ReqTypeDetailNotification, ReqTypeNotification,
                ProductName, ReceiptNo, Status, Version
            )
            OUTPUT inserted.*
            VALUES (
                @contractId, @customerId, @WrittenAt, @DocumentDate,
                @OwnerPrefix, @OwnerName, @ReqTypeRegistration,
                @ReqTypeDetailNotification, @ReqTypeNotification,
                @ProductName, @ReceiptNo, @Status, 1
            )
        `;
        
        const result = await request.query(insertQuery);
        res.status(201).json({ success: true, documentId: result.recordset[0].documentId, data: result.recordset[0] });
    } catch (err) {
        console.error('Error creating safety cert document:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT (Update)
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const pool = await poolPromise;
        
        // Fetch current document
        const currentDocResult = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT * FROM SafetyCertDocuments WHERE documentId = @id`);
        if (currentDocResult.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }
        const oldDoc = currentDocResult.recordset[0];

        const request = pool.request();
        
        request
            .input('contractId', sql.Int, data.contractId || null)
            .input('customerId', sql.Int, data.customerId || null)
            .input('WrittenAt', sql.NVarChar, data.writtenAt || null)
            .input('DocumentDate', sql.Date, data.documentDate || null)
            .input('OwnerPrefix', sql.NVarChar, data.ownerPrefix || null)
            .input('OwnerName', sql.NVarChar, data.ownerName || null)
            .input('ReqTypeRegistration', sql.Bit, data.reqTypeRegistration ? 1 : 0)
            .input('ReqTypeDetailNotification', sql.Bit, data.reqTypeDetailNotification ? 1 : 0)
            .input('ReqTypeNotification', sql.Bit, data.reqTypeNotification ? 1 : 0)
            .input('ProductName', sql.NVarChar, data.productName || null)
            .input('ReceiptNo', sql.NVarChar, data.receiptNo || null)
            .input('Status', sql.NVarChar, data.status || 'ร่าง');

        let queryStr = '';
        if (data.status === 'ลูกค้าขอแก้ไข' && oldDoc.Status !== 'ลูกค้าขอแก้ไข') {
            const refId = oldDoc.RefDocumentID || id;
            const maxVerResult = await pool.request()
                .input('refId', sql.Int, refId)
                .query(`SELECT MAX(Version) as maxVer FROM SafetyCertDocuments WHERE RefDocumentID = @refId OR documentId = @refId`);
            const newVersion = (maxVerResult.recordset[0].maxVer || 1) + 1;
            
            request.input('Version', sql.Int, newVersion);
            request.input('RefDocumentID', sql.Int, refId);

            queryStr = `
                INSERT INTO SafetyCertDocuments (
                    contractId, customerId, WrittenAt, DocumentDate,
                    OwnerPrefix, OwnerName, ReqTypeRegistration, 
                    ReqTypeDetailNotification, ReqTypeNotification,
                    ProductName, ReceiptNo, Status, Version, RefDocumentID
                )
                OUTPUT inserted.*
                VALUES (
                    @contractId, @customerId, @WrittenAt, @DocumentDate,
                    @OwnerPrefix, @OwnerName, @ReqTypeRegistration,
                    @ReqTypeDetailNotification, @ReqTypeNotification,
                    @ProductName, @ReceiptNo, @Status, @Version, @RefDocumentID
                )
            `;
        } else {
            request.input('id', sql.Int, id);
            request.input('Version', sql.Int, oldDoc.Version || 1);
            
            queryStr = `
                UPDATE SafetyCertDocuments SET
                    contractId = @contractId,
                    customerId = @customerId,
                    WrittenAt = @WrittenAt,
                    DocumentDate = @DocumentDate,
                    OwnerPrefix = @OwnerPrefix,
                    OwnerName = @OwnerName,
                    ReqTypeRegistration = @ReqTypeRegistration,
                    ReqTypeDetailNotification = @ReqTypeDetailNotification,
                    ReqTypeNotification = @ReqTypeNotification,
                    ProductName = @ProductName,
                    ReceiptNo = @ReceiptNo,
                    Status = @Status,
                    Version = @Version,
                    UpdatedAt = GETDATE()
                OUTPUT inserted.*
                WHERE documentId = @id
            `;
        }
        
        const result = await request.query(queryStr);
        const returnedId = result.recordset[0].documentId;
        
        res.status(200).json({ success: true, documentId: returnedId, data: result.recordset[0] });
    } catch (err) {
        console.error('Error updating safety cert document:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE by ID
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                DECLARE @RefID INT;
                SELECT @RefID = ISNULL(RefDocumentID, documentId) FROM SafetyCertDocuments WHERE documentId = @id;
                DELETE FROM SafetyCertDocuments WHERE documentId = @RefID OR RefDocumentID = @RefID;
            `);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting safety cert document:', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
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
        if ('SafetyCertDocuments' === 'SafetyCertDocuments' || 'SafetyCertDocuments' === 'PdpaConsentDocuments') {
            docTypeField = 'NULL as DocumentType';
        }
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                DECLARE @RefID INT;
                SELECT @RefID = ISNULL(RefDocumentID, documentId) FROM SafetyCertDocuments WHERE documentId = @id;
                
                SELECT documentId as DocumentID, Status, CreatedAt, Version
                FROM SafetyCertDocuments
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
