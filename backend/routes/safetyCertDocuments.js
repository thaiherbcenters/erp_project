const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// GET all
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM SafetyCertDocuments ORDER BY CreatedAt DESC');
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
                ProductName, ReceiptNo, Status
            )
            OUTPUT inserted.documentId, inserted.*
            VALUES (
                @contractId, @customerId, @WrittenAt, @DocumentDate,
                @OwnerPrefix, @OwnerName, @ReqTypeRegistration,
                @ReqTypeDetailNotification, @ReqTypeNotification,
                @ProductName, @ReceiptNo, @Status
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
        
        const request = pool.request();
        
        request
            .input('id', sql.Int, id)
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

        const updateQuery = `
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
                UpdatedAt = GETDATE()
            OUTPUT inserted.*
            WHERE documentId = @id
        `;
        
        const result = await request.query(updateQuery);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }
        
        res.status(200).json({ success: true, documentId: id, data: result.recordset[0] });
    } catch (err) {
        console.error('Error updating safety cert document:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
