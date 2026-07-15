const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// GET all PDPA Consent Documents
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM PdpaConsentDocuments 
            ORDER BY CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching PDPA consent documents:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET by ID
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`SELECT * FROM PdpaConsentDocuments WHERE documentId = @id`);
            
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching PDPA consent document:', err);
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
            .input('ActName', sql.NVarChar, data.actName || null)
            .input('PersonPrefix', sql.NVarChar, data.personPrefix || null)
            .input('PersonPrefixOther', sql.NVarChar, data.personPrefixOther || null)
            .input('PersonName', sql.NVarChar, data.personName || null)
            .input('JuristicName', sql.NVarChar, data.juristicName || null)
            .input('PublicHealthProvince', sql.NVarChar, data.publicHealthProvince || null)
            .input('ActName2', sql.NVarChar, data.actName2 || null)
            .input('ActName3', sql.NVarChar, data.actName3 || null)
            .input('KeepYears', sql.Int, data.keepYears || null)
            .input('ContactGroup', sql.NVarChar, data.contactGroup || null)
            .input('IsConsent', sql.Bit, data.isConsent !== undefined ? data.isConsent : null)
            .input('Status', sql.NVarChar, data.status || 'ร่าง');

        const insertQuery = `
            INSERT INTO PdpaConsentDocuments (
                contractId, customerId, WrittenAt, DocumentDate,
                ActName, PersonPrefix, PersonPrefixOther, PersonName, JuristicName,
                PublicHealthProvince, ActName2, ActName3, KeepYears, ContactGroup, IsConsent, Status
            )
            OUTPUT inserted.documentId, inserted.*
            VALUES (
                @contractId, @customerId, @WrittenAt, @DocumentDate,
                @ActName, @PersonPrefix, @PersonPrefixOther, @PersonName, @JuristicName,
                @PublicHealthProvince, @ActName2, @ActName3, @KeepYears, @ContactGroup, @IsConsent, @Status
            )
        `;
        
        const result = await request.query(insertQuery);
        res.status(201).json({ success: true, documentId: result.recordset[0].documentId, data: result.recordset[0] });
    } catch (err) {
        console.error('Error creating PDPA consent document:', err);
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
            .input('ActName', sql.NVarChar, data.actName || null)
            .input('PersonPrefix', sql.NVarChar, data.personPrefix || null)
            .input('PersonPrefixOther', sql.NVarChar, data.personPrefixOther || null)
            .input('PersonName', sql.NVarChar, data.personName || null)
            .input('JuristicName', sql.NVarChar, data.juristicName || null)
            .input('PublicHealthProvince', sql.NVarChar, data.publicHealthProvince || null)
            .input('ActName2', sql.NVarChar, data.actName2 || null)
            .input('ActName3', sql.NVarChar, data.actName3 || null)
            .input('KeepYears', sql.Int, data.keepYears || null)
            .input('ContactGroup', sql.NVarChar, data.contactGroup || null)
            .input('IsConsent', sql.Bit, data.isConsent !== undefined ? data.isConsent : null)
            .input('Status', sql.NVarChar, data.status || 'ร่าง');

        const updateQuery = `
            UPDATE PdpaConsentDocuments
            SET 
                contractId = @contractId,
                customerId = @customerId,
                WrittenAt = @WrittenAt,
                DocumentDate = @DocumentDate,
                ActName = @ActName,
                PersonPrefix = @PersonPrefix,
                PersonPrefixOther = @PersonPrefixOther,
                PersonName = @PersonName,
                JuristicName = @JuristicName,
                PublicHealthProvince = @PublicHealthProvince,
                ActName2 = @ActName2,
                ActName3 = @ActName3,
                KeepYears = @KeepYears,
                ContactGroup = @ContactGroup,
                IsConsent = @IsConsent,
                Status = @Status,
                UpdatedAt = GETDATE()
            OUTPUT inserted.*
            WHERE documentId = @id
        `;
        
        const result = await request.query(updateQuery);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        res.json({ success: true, documentId: id, data: result.recordset[0] });
    } catch (err) {
        console.error('Error updating PDPA consent document:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
