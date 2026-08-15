const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// --- 4. Traceability API ---
router.get('/traceability', async (req, res) => {
    try {
        const { type, query } = req.query; // type: 'batch' | 'lot', query: 'string'
        if (!query) return res.status(400).json({ message: 'Missing query parameter' });

        const pool = await poolPromise;
        let backward = [];
        let forward = [];
        let itemInfo = null;

        if (type === 'batch') {
            // BACKWARD from a production batch (What went into this batch?)
            const backRes = await pool.request()
                .input('BatchNo', sql.VarChar, query)
                .query(`
                    SELECT 
                        UsageID, TaskID, BatchNo, ItemID, ItemName, ItemCategory, 
                        LotNo, QtyUsed, Unit, UsedAt, UsedBy 
                    FROM Production_Material_Usage 
                    WHERE BatchNo = @BatchNo
                    ORDER BY UsedAt DESC
                `);
            backward = backRes.recordset;

            // FORWARD from a production batch (What did this batch produce and where did it go?)
            // 1. Did it produce WIP?
            const wipRes = await pool.request()
                .input('BatchNo', sql.VarChar, query)
                .query(`SELECT * FROM WIP_Lots WHERE LotNo = 'WIP-' + @BatchNo`);
            
            // 2. Did it produce Packaging/FG?
            const fgRes = await pool.request()
                .input('BatchNo', sql.VarChar, query)
                .query(`SELECT * FROM Packaging_Tasks WHERE BatchNo = @BatchNo`);

            forward = {
                wipProduced: wipRes.recordset,
                fgProduced: fgRes.recordset
            };
            
            itemInfo = { targetType: 'Batch', targetId: query };

        } else if (type === 'lot') {
            // FORWARD from a Lot (Which batches used this Lot?)
            const fwdRes = await pool.request()
                .input('LotNo', sql.VarChar, query)
                .query(`
                    SELECT 
                        UsageID, TaskID, BatchNo, ItemID, ItemName, ItemCategory, 
                        LotNo, QtyUsed, Unit, UsedAt, UsedBy 
                    FROM Production_Material_Usage 
                    WHERE LotNo = @LotNo
                    ORDER BY UsedAt DESC
                `);
            forward = fwdRes.recordset;

            // BACKWARD from a Lot (How was this Lot received/produced?)
            // If it's a WIP lot (WIP-BatchNo), we can look at its BatchNo
            if (query.startsWith('WIP-')) {
                const batchNo = query.substring(4);
                const backRes = await pool.request()
                    .input('BatchNo', sql.VarChar, batchNo)
                    .query(`
                        SELECT 
                            UsageID, TaskID, BatchNo, ItemID, ItemName, ItemCategory, 
                            LotNo, QtyUsed, Unit, UsedAt, UsedBy 
                        FROM Production_Material_Usage 
                        WHERE BatchNo = @BatchNo
                        ORDER BY UsedAt DESC
                    `);
                backward = backRes.recordset;
            } else {
                // Raw Material / PM lot - look at Receiving logs
                const rmRes = await pool.request()
                    .input('LotNo', sql.VarChar, query)
                    .query(`
                        SELECT * FROM Stock_Lots WHERE LotNo = @LotNo
                    `);
                backward = rmRes.recordset;
            }
            
            itemInfo = { targetType: 'Lot', targetId: query };
        }

        res.json({
            success: true,
            info: itemInfo,
            backward,
            forward
        });

    } catch (error) {
        console.error('Error fetching traceability:', error);
        res.status(500).json({ success: false, message: 'Error fetching traceability data' });
    }
});

module.exports = router;
