const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { poolPromise, sql } = require('../config/db');

// Physical storage path for Document Library
const LIBRARY_ROOT = process.env.DOCUMENT_RECORDS_ROOT || 'E:\\Documents\\records';

// Setup multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!fs.existsSync(LIBRARY_ROOT)) {
                fs.mkdirSync(LIBRARY_ROOT, { recursive: true });
            }
        } catch (err) {
            console.error('Error ensuring LIBRARY_ROOT exists:', err);
        }
        cb(null, LIBRARY_ROOT);
    },
    filename: (req, file, cb) => {
        // Fix Thai filename encoding issue from multer
        const decodedName = file.originalname ? Buffer.from(file.originalname, 'latin1').toString('utf8') : 'uploaded_doc';
        const ext = path.extname(decodedName);
        const baseName = path.basename(decodedName, ext).replace(/[^A-Za-z0-9ก-๙_-]/g, '_');
        const timestamp = Date.now();
        cb(null, `${baseName}_${timestamp}${ext}`);
    },
});

const upload = multer({ storage });

// =============================================================================
// FOLDER ENDPOINTS
// =============================================================================

// GET /api/library/folders?parent_id= — List folders under a parent (null = root)
router.get('/folders', async (req, res) => {
    try {
        const parentId = req.query.parent_id || null;
        const dataScope = req.query.data_scope || 'all';
        const userId = req.query.user_id;

        const pool = await poolPromise;

        // Base query with counts
        let queryStr = `
            SELECT f.id, f.folder_name, f.parent_id, f.created_by, f.created_date,
                (SELECT COUNT(*) FROM DocumentLibraryFolders sub WHERE sub.parent_id = f.id) AS sub_folder_count,
                (SELECT COUNT(*) FROM DocumentLibrary d WHERE d.folder_id = f.id) AS file_count
            FROM DocumentLibraryFolders f
            WHERE f.parent_id ${parentId ? '= @parent_id' : 'IS NULL'}
        `;

        // Apply Data Scope for Folders
        // Assume 'created_by' in folders maps to username. If we only have user_id, we need to join or assume 'own' means we shouldn't restrict folders if we want users to see the structure, OR restrict folders created by them. Let's keep folders visible to 'all' as standard practice, but maybe restrict files? Or restrict folders by created_by.
        // The prompt says "view only their own data or data from their department". It might be safer to let the structure be visible but restrict the files, OR restrict folders too. Since user_id is integer and created_by is NVarChar (username), filtering folders by 'own' might be tricky without a join unless created_by holds user_id. Let's look at how folder creation is done: created_by receives 'Unknown' or req.body.username.
        // Actually, let's just filter the files and keep folder structure visible to everyone, as folders might be shared. Let me check the ERD or previous instructions. For DocumentControl, we filtered documents. For DocumentLibrary, we should filter files (DocumentLibrary table) rather than Folders, or both. Let's assume Folders are global for now to avoid breaking navigation, but if we need to restrict Folders we'll need to join Users on f.created_by = u.username. Let's NOT restrict Folders for now as it's a shared drive metaphor, and just restrict Files.
        // Wait, I will just leave the Folders endpoint as is and only restrict the Files endpoint.
        
        let result;
        if (parentId) {
            result = await pool.request()
                .input('parent_id', sql.Int, parseInt(parentId))
                .query(queryStr + ` ORDER BY f.folder_name ASC;`);
        } else {
            result = await pool.request()
                .query(queryStr + ` ORDER BY f.folder_name ASC;`);
        }
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching folders:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET /api/library/folders/:id/path — Get full breadcrumb path for a folder
router.get('/folders/:id/path', async (req, res) => {
    try {
        const folderId = parseInt(req.params.id);
        const pool = await poolPromise;

        // Walk up the parent chain to build breadcrumb
        const breadcrumb = [];
        let currentId = folderId;

        while (currentId) {
            const result = await pool.request()
                .input('id', sql.Int, currentId)
                .query('SELECT id, folder_name, parent_id FROM DocumentLibraryFolders WHERE id = @id');

            if (result.recordset.length === 0) break;
            const folder = result.recordset[0];
            breadcrumb.unshift({ id: folder.id, name: folder.folder_name });
            currentId = folder.parent_id;
        }

        res.json(breadcrumb);
    } catch (err) {
        console.error('Error fetching folder path:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// POST /api/library/folders — Create a new folder
router.post('/folders', async (req, res) => {
    try {
        const { folder_name, parent_id, created_by } = req.body;
        if (!folder_name || !folder_name.trim()) {
            return res.status(400).json({ message: 'กรุณาระบุชื่อโฟลเดอร์' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('folder_name', sql.NVarChar, folder_name.trim())
            .input('parent_id', sql.Int, parent_id || null)
            .input('created_by', sql.NVarChar, created_by || 'Unknown')
            .query(`
                INSERT INTO DocumentLibraryFolders (folder_name, parent_id, created_by, created_date)
                OUTPUT INSERTED.id, INSERTED.folder_name, INSERTED.parent_id, INSERTED.created_by, INSERTED.created_date
                VALUES (@folder_name, @parent_id, @created_by, GETDATE());
            `);

        // Audit Log
        await pool.request()
            .input('action_type', sql.NVarChar, 'CREATE_FOLDER')
            .input('doc_original_name', sql.NVarChar, folder_name.trim())
            .input('action_by', sql.NVarChar, created_by || 'Unknown')
            .input('details', sql.NVarChar, `Created folder: ${folder_name.trim()} (parent_id: ${parent_id || 'root'})`)
            .query(`
                INSERT INTO DocumentLibraryLogs (action_type, doc_original_name, action_by, action_date, details)
                VALUES (@action_type, @doc_original_name, @action_by, GETDATE(), @details);
            `);

        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error('Error creating folder:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างโฟลเดอร์' });
    }
});

// PUT /api/library/folders/:id — Rename a folder
router.put('/folders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { folder_name } = req.body;
        if (!folder_name || !folder_name.trim()) {
            return res.status(400).json({ message: 'กรุณาระบุชื่อโฟลเดอร์ใหม่' });
        }

        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('folder_name', sql.NVarChar, folder_name.trim())
            .query('UPDATE DocumentLibraryFolders SET folder_name = @folder_name WHERE id = @id');

        res.json({ success: true, message: 'เปลี่ยนชื่อโฟลเดอร์สำเร็จ' });
    } catch (err) {
        console.error('Error renaming folder:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปลี่ยนชื่อโฟลเดอร์' });
    }
});

// DELETE /api/library/folders/:id — Delete a folder (must be empty)
router.delete('/folders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBy = req.query.user || 'Unknown User';
        const pool = await poolPromise;

        // Check: has sub-folders?
        const subFolders = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT COUNT(*) AS cnt FROM DocumentLibraryFolders WHERE parent_id = @id');
        if (subFolders.recordset[0].cnt > 0) {
            return res.status(400).json({ message: 'ไม่สามารถลบโฟลเดอร์ที่มีโฟลเดอร์ย่อยอยู่ภายในได้ กรุณาลบโฟลเดอร์ย่อยก่อน' });
        }

        // Check: has files?
        const files = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT COUNT(*) AS cnt FROM DocumentLibrary WHERE folder_id = @id');
        if (files.recordset[0].cnt > 0) {
            return res.status(400).json({ message: 'ไม่สามารถลบโฟลเดอร์ที่มีไฟล์อยู่ภายในได้ กรุณาลบไฟล์ก่อน' });
        }

        // Get folder name for log
        const folderRes = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT folder_name FROM DocumentLibraryFolders WHERE id = @id');
        const folderName = folderRes.recordset[0]?.folder_name || 'Unknown';

        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM DocumentLibraryFolders WHERE id = @id');

        // Audit Log
        await pool.request()
            .input('action_type', sql.NVarChar, 'DELETE_FOLDER')
            .input('doc_original_name', sql.NVarChar, folderName)
            .input('action_by', sql.NVarChar, deletedBy)
            .input('details', sql.NVarChar, `Deleted folder: ${folderName}`)
            .query(`
                INSERT INTO DocumentLibraryLogs (action_type, doc_original_name, action_by, action_date, details)
                VALUES (@action_type, @doc_original_name, @action_by, GETDATE(), @details);
            `);

        res.json({ success: true, message: 'ลบโฟลเดอร์สำเร็จ' });
    } catch (err) {
        console.error('Error deleting folder:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบโฟลเดอร์' });
    }
});

// =============================================================================
// FILE ENDPOINTS (enhanced with folder support)
// =============================================================================

// 1. GET /api/library — List files (optionally filter by folder_id)
router.get('/', async (req, res) => {
    try {
        const folderId = req.query.folder_id;
        const dataScope = req.query.data_scope || 'all';
        const userId = req.query.user_id;
        const department = req.query.department || '';
        
        const pool = await poolPromise;

        let queryStr = `
            SELECT d.id, d.original_name, d.stored_name, d.file_path, d.description,
                   d.uploaded_by, d.upload_date, d.file_size, d.folder_id
            FROM dbo.DocumentLibrary d
        `;

        if (dataScope === 'own' && userId) {
            // Match uploaded_by against username OR display_name for robustness
            queryStr += `
                INNER JOIN dbo.Users u ON (d.uploaded_by = u.username OR d.uploaded_by = u.display_name)
                WHERE u.user_id = @user_id
            `;
        } else if (dataScope === 'department' && department) {
            queryStr += `
                INNER JOIN dbo.Users u ON (d.uploaded_by = u.username OR d.uploaded_by = u.display_name)
                WHERE u.department = @department
            `;
        } else {
            // 'all' or missing params
            queryStr += ` WHERE 1=1 `;
        }
        
        if (folderId) {
            queryStr += ` AND d.folder_id = @folder_id `;
        } else {
            queryStr += ` AND d.folder_id IS NULL `;
        }
        
        queryStr += ` ORDER BY d.upload_date DESC; `;

        console.log('[Library GET] dataScope:', dataScope, 'userId:', userId, 'department:', department, 'folderId:', folderId);

        const request = pool.request();
        if (userId) request.input('user_id', sql.Int, parseInt(userId));
        if (department) request.input('department', sql.NVarChar, department);
        if (folderId) request.input('folder_id', sql.Int, parseInt(folderId));

        const result = await request.query(queryStr);
        console.log('[Library GET] returned', result.recordset.length, 'files');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching document library:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 2. POST /api/library/upload — Upload file (with optional folder_id)
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'กรุณาเลือกไฟล์' });
        }

        const { description, uploaded_by, folder_id } = req.body;
        // Fix Thai filename encoding issue
        const originalName = req.file.originalname ? Buffer.from(req.file.originalname, 'latin1').toString('utf8') : 'uploaded_doc';
        const storedName = req.file.filename;
        const filePath = req.file.path;
        const fileSize = req.file.size;
        const uploader = uploaded_by || 'Unknown User';

        const pool = await poolPromise;

        const insertResult = await pool.request()
            .input('original_name', sql.NVarChar, originalName)
            .input('stored_name', sql.NVarChar, storedName)
            .input('file_path', sql.NVarChar, filePath)
            .input('description', sql.NVarChar, description || '')
            .input('uploaded_by', sql.NVarChar, uploader)
            .input('file_size', sql.BigInt, fileSize)
            .input('folder_id', sql.Int, (folder_id && folder_id !== 'null' && folder_id !== 'undefined') ? parseInt(folder_id) : null)
            .query(`
                INSERT INTO dbo.DocumentLibrary (original_name, stored_name, file_path, description, uploaded_by, file_size, folder_id, upload_date)
                OUTPUT INSERTED.id, INSERTED.upload_date
                VALUES (@original_name, @stored_name, @file_path, @description, @uploaded_by, @file_size, @folder_id, GETDATE());
            `);

        const newDoc = insertResult.recordset[0];

        // Audit Log
        await pool.request()
            .input('action_type', sql.NVarChar, 'UPLOAD')
            .input('doc_original_name', sql.NVarChar, originalName)
            .input('action_by', sql.NVarChar, uploader)
            .input('details', sql.NVarChar, `Uploaded file: ${storedName} (${fileSize} bytes) to folder_id: ${folder_id || 'root'}`)
            .query(`
                INSERT INTO dbo.DocumentLibraryLogs (action_type, doc_original_name, action_by, action_date, details)
                VALUES (@action_type, @doc_original_name, @action_by, GETDATE(), @details);
            `);

        res.json({
            success: true,
            message: 'อัปโหลดเอกสารสำเร็จ',
            data: {
                id: newDoc.id,
                original_name: originalName,
                upload_date: newDoc.upload_date
            }
        });
    } catch (err) {
        console.error('Error uploading to library:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปโหลดเอกสาร' });
    }
});

// 3. GET /api/library/action/:action/:id — View or Download
router.get('/action/:action/:id', async (req, res) => {
    try {
        const { action, id } = req.params;

        if (action !== 'view' && action !== 'download') {
            return res.status(400).json({ message: 'Action ไม่ถูกต้อง' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT original_name, stored_name, file_path FROM dbo.DocumentLibrary WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบเอกสารในฐานข้อมูล' });
        }

        const doc = result.recordset[0];
        const filePath = doc.file_path;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'ไม่พบไฟล์จริงในเครื่องเซิร์ฟเวอร์ (ไฟล์อาจถูกลบหรือย้าย)' });
        }

        if (action === 'download') {
            res.download(filePath, doc.original_name, (err) => {
                if (err) {
                    console.error('Error downloading file:', err);
                    if (!res.headersSent) res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์' });
                }
            });
        } else if (action === 'view') {
            res.sendFile(filePath, (err) => {
                if (err) {
                    console.error('Error sending file for view:', err);
                    if (!res.headersSent) res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปิดไฟล์' });
                }
            });
        }
    } catch (err) {
        console.error('Error handling library action:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 4. DELETE /api/library/:id — Delete document
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBy = req.query.user || 'Unknown User';

        const pool = await poolPromise;

        const docResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT original_name, stored_name, file_path FROM dbo.DocumentLibrary WHERE id = @id');

        if (docResult.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบเอกสารในฐานข้อมูล' });
        }

        const doc = docResult.recordset[0];

        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM dbo.DocumentLibrary WHERE id = @id');

        // Audit Log
        await pool.request()
            .input('action_type', sql.NVarChar, 'DELETE')
            .input('doc_original_name', sql.NVarChar, doc.original_name)
            .input('action_by', sql.NVarChar, deletedBy)
            .input('details', sql.NVarChar, `Deleted file: ${doc.stored_name}`)
            .query(`
                INSERT INTO dbo.DocumentLibraryLogs (action_type, doc_original_name, action_by, action_date, details)
                VALUES (@action_type, @doc_original_name, @action_by, GETDATE(), @details);
            `);

        // Delete physical file
        try {
            if (fs.existsSync(doc.file_path)) {
                fs.unlinkSync(doc.file_path);
            }
        } catch (fileErr) {
            console.error('Failed to delete physical file:', fileErr);
        }

        res.json({ success: true, message: 'ลบเอกสารสำเร็จ' });
    } catch (err) {
        console.error('Error deleting library document:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบเอกสาร' });
    }
});

// 5. GET /api/library/logs — Audit logs
router.get('/logs', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT TOP 100 log_id, action_type, doc_original_name, action_by, action_date, details
            FROM dbo.DocumentLibraryLogs
            ORDER BY action_date DESC;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching library logs:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
