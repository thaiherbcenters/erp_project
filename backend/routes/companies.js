const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// GET /api/companies
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT CompanyID, CompanyName, TaxID, Address, IsActive 
            FROM Company 
            WHERE IsActive = 1
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching companies:', err);
        res.status(500).json({ message: 'Error fetching companies' });
    }
});

module.exports = router;
