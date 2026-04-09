const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// ==========================================
// QC INCOMING MODULE
// ==========================================
// Get all incoming qc items
router.get('/incoming', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM QC_Incoming 
            ORDER BY CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching qc incoming:', err);
        res.status(500).json({ message: 'Error fetching qc incoming' });
    }
});

// Create new incoming qc
router.post('/incoming', async (req, res) => {
    try {
        const { lotNumber, itemName, supplierName, inspectorId, result_status, notes } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('LotNumber', sql.VarChar, lotNumber)
            .input('ItemName', sql.NVarChar, itemName)
            .input('SupplierName', sql.NVarChar, supplierName)
            .input('InspectorID', sql.VarChar, inspectorId)
            .input('Result', sql.VARCHAR, result_status)
            .input('Notes', sql.NVarChar, notes)
            .query(`
                INSERT INTO QC_Incoming (LotNumber, ItemName, SupplierName, InspectorID, Result, Notes)
                OUTPUT INSERTED.*
                VALUES (@LotNumber, @ItemName, @SupplierName, @InspectorID, @Result, @Notes)
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating incoming qc:', err);
        res.status(500).json({ message: 'Error creating incoming qc' });
    }
});


// ==========================================
// QC PRODUCTION MODULE (In-Process / Final)
// ==========================================
// Get all production qc requests
router.get('/requests', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM QC_Production 
            ORDER BY RequestedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching qc requests:', err);
        res.status(500).json({ message: 'Error fetching qc requests' });
    }
});

// Create a new production QC Request
router.post('/requests', async (req, res) => {
    try {
        const { requestID, taskID, jobOrderID, batchNo, formulaName, line, type, requestedAt, status } = req.body;
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('RequestID', sql.VarChar, requestID)
            .input('TaskID', sql.VarChar, taskID)
            .input('JobOrderID', sql.VarChar, jobOrderID)
            .input('BatchNo', sql.VarChar, batchNo)
            .input('FormulaName', sql.NVarChar, formulaName)
            .input('Line', sql.VarChar, line)
            .input('Type', sql.VarChar, type)
            .input('RequestedAt', sql.DateTime, new Date(requestedAt))
            .input('Status', sql.VarChar, status || 'รอตรวจ')
            .query(`
                INSERT INTO QC_Production (RequestID, TaskID, JobOrderID, BatchNo, FormulaName, Line, Type, RequestedAt, Status)
                OUTPUT INSERTED.*
                VALUES (@RequestID, @TaskID, @JobOrderID, @BatchNo, @FormulaName, @Line, @Type, @RequestedAt, @Status)
            `);
        
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating qc request:', err);
        res.status(500).json({ message: 'Error creating qc request' });
    }
});

// Update a production QC Request (QC performing the inspection)
router.put('/requests/:id', async (req, res) => {
    try {
        const { result_status, inspector, inspectedAt, notes } = req.body;
        const requestID = req.params.id;
        
        const pool = await poolPromise;
        const result = await pool.request()
            .input('RequestID', sql.VarChar, requestID)
            .input('Status', sql.VarChar, result_status)
            .input('Inspector', sql.VarChar, inspector)
            .input('InspectedAt', sql.DateTime, new Date(inspectedAt))
            .input('Notes', sql.NVarChar, notes)
            .query(`
                UPDATE QC_Production 
                SET Status = @Status, 
                    Inspector = @Inspector, 
                    InspectedAt = @InspectedAt, 
                    Notes = @Notes
                OUTPUT INSERTED.*
                WHERE RequestID = @RequestID
            `);
            
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'QC Request not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating qc request:', err);
        res.status(500).json({ message: 'Error updating qc request' });
    }
});


// ==========================================
// QC DEFECT / NCR MODULE
// ==========================================
router.get('/defect', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM QC_Defect_NCR 
            ORDER BY CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching qc defect:', err);
        res.status(500).json({ message: 'Error fetching qc defect' });
    }
});

module.exports = router;
