const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/signatures');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'sign-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/webp') {
            cb(null, true);
        } else {
            cb(new Error('Only PNG, JPG, and WEBP image formats are allowed.'));
        }
    }
});

// GET all active signatures
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT SignatureID, KeyName, FullName, ImagePath, IsActive, CreatedAt
            FROM Signatures
            WHERE IsActive = 1
            ORDER BY FullName ASC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching signatures:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch signatures', error: err.message });
    }
});

// POST new signature
router.post('/', upload.single('signatureImage'), async (req, res) => {
    try {
        const { fullName } = req.body;
        const file = req.file;

        if (!fullName || !file) {
            return res.status(400).json({ success: false, message: 'Name and Signature Image are required.' });
        }

        // Generate a simple unique key for the dropdown value
        const keyName = 'sig_' + Date.now().toString(36);
        const imagePath = '/api/uploads/signatures/' + file.filename;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('keyName', sql.NVarChar, keyName)
            .input('fullName', sql.NVarChar, fullName)
            .input('imagePath', sql.NVarChar, imagePath)
            .query(`
                INSERT INTO Signatures (KeyName, FullName, ImagePath)
                OUTPUT INSERTED.*
                VALUES (@keyName, @fullName, @imagePath)
            `);

        res.json({ success: true, message: 'Signature added successfully.', data: result.recordset[0] });
    } catch (err) {
        console.error('Error adding signature:', err);
        res.status(500).json({ success: false, message: 'Failed to add signature', error: err.message });
    }
});

// DELETE signature (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                UPDATE Signatures
                SET IsActive = 0, UpdatedAt = GETDATE()
                WHERE SignatureID = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Signature not found.' });
        }

        res.json({ success: true, message: 'Signature deleted successfully.' });
    } catch (err) {
        console.error('Error deleting signature:', err);
        res.status(500).json({ success: false, message: 'Failed to delete signature', error: err.message });
    }
});

module.exports = router;
