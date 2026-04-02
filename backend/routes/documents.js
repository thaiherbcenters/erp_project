const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { poolPromise, sql } = require('../config/db');
const multer = require('multer');

// โฟลเดอร์ปลายทางสำหรับเก็บไฟล์เอกสารจริง (Windows Server)
const DOCUMENTS_ROOT = process.env.DOCUMENT_UPLOAD_ROOT || 'E:\\Documents';

// กำหนด storage สำหรับ multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!fs.existsSync(DOCUMENTS_ROOT)) {
                fs.mkdirSync(DOCUMENTS_ROOT, { recursive: true });
            }
        } catch (err) {
            console.error('Error ensuring DOCUMENTS_ROOT exists:', err);
        }
        cb(null, DOCUMENTS_ROOT);
    },
    filename: (req, file, cb) => {
        // Fix Thai filename encoding issue from multer
        const decodedName = file.originalname ? Buffer.from(file.originalname, 'latin1').toString('utf8') : 'document';
        const ext = path.extname(decodedName);

        // ถ้ามี custom_filename ให้ใช้ชื่อที่ผู้ใช้ตั้ง มิฉะนั้นใช้ doc_code + timestamp
        if (req.body.custom_filename && req.body.custom_filename.trim()) {
            const safeName = req.body.custom_filename.trim().replace(/[<>:"/\\|?*]/g, '_');
            cb(null, `${safeName}${ext}`);
        } else {
            const safeCode = (req.body.doc_code || 'DOC').replace(/[^A-Za-z0-9\u0E00-\u0E7F_-]/g, '_');
            const timestamp = Date.now();
            cb(null, `${safeCode}_${timestamp}${ext}`);
        }
    },
});

const upload = multer({ storage });

// ดึงรายการเอกสารทั้งหมด (โครงสร้างเหมาะกับ frontend DocumentControl)
// ใช้ตาราง normalize (DocumentStandards, Standards) แต่ response shape
// จะคล้ายกับ DOCUMENTS ใน frontend: id, name, category, typeTag, standard, date, status
router.get('/', async (req, res) => {
    try {
        const userId = req.query.user_id;
        const dataScope = req.query.data_scope || 'all'; // all, department, own
        const department = req.query.department; // Passed from frontend or determined by backend

        let condition = '1=1'; // default: get all data
        const pool = await poolPromise;
        const request = pool.request();

        console.log('[Documents GET] dataScope:', dataScope, '| userId:', userId, '| department:', department);

        if (dataScope === 'own' && userId) {
             condition = 'd.created_by = @user_id';
             request.input('user_id', sql.Int, userId);
        } else if (dataScope === 'department' && department) {
             condition = 'd.department = @department';
             request.input('department', sql.NVarChar, department);
        }
        // If department is empty, falls through to default (all)

        const result = await request.query(`
            SELECT
                d.doc_id,
                d.doc_code           AS id,
                d.doc_name           AS name,
                d.category,
                d.type_tag           AS typeTag,
                d.revision,
                d.effective_date     AS date,
                d.status,
                d.file_path,
                d.department,
                d.created_by,
                STRING_AGG(s.standard_code, ' / ') AS standard
            FROM dbo.Documents d
            LEFT JOIN dbo.DocumentStandards ds ON d.doc_id      = ds.doc_id
            LEFT JOIN dbo.Standards          s ON ds.standard_id = s.standard_id
            WHERE ${condition}
            GROUP BY
                d.doc_id,
                d.doc_code,
                d.doc_name,
                d.category,
                d.type_tag,
                d.revision,
                d.effective_date,
                d.status,
                d.file_path,
                d.department,
                d.created_by
            ORDER BY d.doc_id ASC;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching documents:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ดึงรายละเอียดเอกสารตาม doc_code (ใช้ shape ใกล้เคียงกับ list)
router.get('/by-code/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('doc_code', sql.NVarChar, code)
            .query(`
            SELECT
                    d.doc_id,
                    d.doc_code           AS id,
                    d.doc_name           AS name,
                    d.category,
                    d.type_tag           AS typeTag,
                    d.revision,
                    d.effective_date     AS date,
                    d.status,
                    d.file_path,
                    STRING_AGG(s.standard_code, ' / ') AS standard
                FROM dbo.Documents d
                LEFT JOIN dbo.DocumentStandards ds ON d.doc_id      = ds.doc_id
                LEFT JOIN dbo.Standards          s ON ds.standard_id = s.standard_id
                WHERE d.doc_code = @doc_code
                GROUP BY
                    d.doc_id,
                    d.doc_code,
                    d.doc_name,
                    d.category,
                    d.type_tag,
                    d.revision,
                    d.effective_date,
                    d.status,
                    d.file_path;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบเอกสารนี้ในระบบ' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching document details:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ดึงรายการมาตรฐานทั้งหมดจากตาราง Standards
router.get('/standards', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT standard_id, standard_code
            FROM dbo.Standards
            ORDER BY standard_code ASC;
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching standards:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// API สำหรับ ดู (View) และ ดาวน์โหลด (Download) ไฟล์เอกสาร
router.get('/:action/:code', async (req, res) => {
    try {
        const { action, code } = req.params;

        // ตรวจสอบ action ว่าถูกต้องหรือไม่
        if (action !== 'view' && action !== 'download') {
            return res.status(400).json({ message: 'Action ไม่ถูกต้อง (รองรับแค่ view หรือ download)' });
        }

        // 1. ค้นหาที่อยู่ไฟล์ (file_path) จาก Database
        const pool = await poolPromise;
        const result = await pool.request()
            .input('doc_code', sql.NVarChar, code)
            .query('SELECT file_path, doc_name FROM Documents WHERE doc_code = @doc_code');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบรหัสเอกสารนี้ในฐานข้อมูล' });
        }

        const document = result.recordset[0];
        const filePath = document.file_path;

        if (!filePath) {
            return res.status(404).json({ message: 'ไม่มีการระบุไฟล์สำหรับเอกสารนี้' });
        }

        // 2. ตรวจสอบว่ามีไฟล์อยู่จริงในเซิร์ฟเวอร์หรือไม่
        if (!fs.existsSync(filePath)) {
            // ส่งข้อความกลับไป พร้อมจำลองเหตุการณ์ในกรณีทดสอบ
            return res.status(404).json({
                message: 'ไม่พบไฟล์ในระบบ Server (ไฟล์อาจถูกลบหรือย้าย)',
                expectedPath: filePath
            });
        }

        // 3. ส่งไฟล์กลับไปยังหน้าเว็บ
        if (action === 'download') {
            // โหลดไฟล์ลงเครื่อง
            // สามารถระบุชื่อไฟล์ตอนโหลดได้ (เอาชื่อเอกสารมาตั้ง)
            const ext = path.extname(filePath);
            const downloadName = `${code} - ${document.doc_name}${ext}`;
            res.download(filePath, downloadName, (err) => {
                if (err) {
                    console.error('Error downloading file:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์' });
                    }
                }
            });
        } else if (action === 'view') {
            // เช็คว่ามีไฟล์ PDF ที่ตั้งชื่อเหมือนกันเป๊ะในโฟลเดอร์เดียวกันหรือไม่
            const dir = path.dirname(filePath);
            const ext = path.extname(filePath);
            const baseName = path.basename(filePath, ext);
            const pdfPath = path.join(dir, baseName + '.pdf');

            let fileToServe = filePath;
            if (fs.existsSync(pdfPath)) {
                // ถ้ามี PDF ให้เสิร์ฟ PDF แทน (หน้าตาเอกสารเป๊ะ เปิดบนเบราว์เซอร์ได้)
                fileToServe = pdfPath;
            }

            // ดูไฟล์บนเบราว์เซอร์
            res.sendFile(fileToServe, (err) => {
                if (err) {
                    console.error('Error sending file for view:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปิดไฟล์' });
                    }
                }
            });
        }

    } catch (err) {
        console.error('Error handling document file request:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// อัปโหลดเอกสารใหม่ + บันทึก meta ลงตาราง Documents
// รองรับ custom_filename สำหรับตั้งชื่อไฟล์ใหม่
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'กรุณาเลือกไฟล์เอกสาร' });
        }

        const {
            doc_code,
            doc_name,
            category,
            typeTag,
            revision,
            effective_date,
            status,
            standard,
            custom_filename,
        } = req.body;

        if (!doc_code || !doc_name || !category) {
            return res.status(400).json({ message: 'ต้องระบุรหัสเอกสาร ชื่อเอกสาร และหมวด' });
        }

        let filePath = req.file.path;
        const storedFileName = req.file.filename;
        const decodedOriginal = req.file.originalname ? Buffer.from(req.file.originalname, 'latin1').toString('utf8') : 'document';
        const ext = path.extname(decodedOriginal);

        // Safety rename: ถ้า multer ตั้งชื่อผิด (เพราะ field order) → rename ให้ถูก
        const expectedName = custom_filename
            ? custom_filename.trim().replace(/[<>:"/\\|?*]/g, '_') + ext
            : null;

        if (expectedName && storedFileName !== expectedName) {
            const newPath = path.join(DOCUMENTS_ROOT, expectedName);
            try {
                // ถ้ามีไฟล์ชื่อซ้ำ ให้เพิ่ม timestamp
                let finalPath = newPath;
                if (fs.existsSync(newPath)) {
                    const nameNoExt = expectedName.replace(/\.[^.]+$/, '');
                    finalPath = path.join(DOCUMENTS_ROOT, `${nameNoExt}_${Date.now()}${ext}`);
                }
                fs.renameSync(filePath, finalPath);
                filePath = finalPath;
                console.log(`[UPLOAD] Renamed: ${storedFileName} → ${path.basename(finalPath)}`);
            } catch (renameErr) {
                console.error('Failed to rename file:', renameErr.message);
                // ใช้ path เดิมถ้า rename ไม่ได้
            }
        }

        const pool = await poolPromise;

        await pool.request()
            .input('doc_code', sql.NVarChar, doc_code)
            .input('doc_name', sql.NVarChar, doc_name)
            .input('category', sql.NVarChar, category)
            .input('type_tag', sql.NVarChar, typeTag || null)
            .input('revision', sql.NVarChar, revision || '00')
            .input('effective_date', sql.Date, effective_date || null)
            .input('status', sql.NVarChar, status || 'ใช้งาน')
            .input('standard', sql.NVarChar, standard || null)
            .input('file_path', sql.NVarChar, filePath)
            .query(`
                INSERT INTO Documents (doc_code, doc_name, category, type_tag, revision, effective_date, status, standard, file_path)
                VALUES (@doc_code, @doc_name, @category, @type_tag, @revision, @effective_date, @status, @standard, @file_path);
            `);

        res.json({
            success: true,
            message: 'อัปโหลดเอกสารสำเร็จ',
            filePath,
            storedFileName: path.basename(filePath),
        });
    } catch (err) {
        console.error('Error uploading document:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปโหลดเอกสาร' });
    }
});

// ลบเอกสาร — ลบทั้งข้อมูลในฐานข้อมูลและไฟล์จริงบนเซิร์ฟเวอร์
router.delete('/:doc_code', async (req, res) => {
    try {
        const { doc_code } = req.params;
        const deletedBy = req.query.user || 'Unknown';

        const pool = await poolPromise;

        // 1. ดึงข้อมูลเอกสารก่อนลบ (เพื่อลบไฟล์จริง)
        const docResult = await pool.request()
            .input('doc_code', sql.NVarChar, doc_code)
            .query('SELECT doc_id, doc_code, doc_name, file_path FROM Documents WHERE doc_code = @doc_code');

        if (docResult.recordset.length === 0) {
            return res.status(404).json({ message: 'ไม่พบเอกสารนี้ในระบบ' });
        }

        const doc = docResult.recordset[0];

        // 2. ลบ DocumentStandards ที่เกี่ยวข้อง (ถ้ามี)
        try {
            await pool.request()
                .input('doc_id', sql.Int, doc.doc_id)
                .query('DELETE FROM DocumentStandards WHERE doc_id = @doc_id');
        } catch (err) {
            console.log('No DocumentStandards to delete or table not found:', err.message);
        }

        // 3. ลบข้อมูลเอกสารจากฐานข้อมูล
        await pool.request()
            .input('doc_code', sql.NVarChar, doc_code)
            .query('DELETE FROM Documents WHERE doc_code = @doc_code');

        // 4. ย้ายไฟล์ไปถังขยะแทนการลบถาวร (สำรองไว้กู้คืนได้)
        const TRASH_DIR = path.join(DOCUMENTS_ROOT, '_trash');
        if (doc.file_path) {
            try {
                if (fs.existsSync(doc.file_path)) {
                    if (!fs.existsSync(TRASH_DIR)) {
                        fs.mkdirSync(TRASH_DIR, { recursive: true });
                    }
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const trashName = `${timestamp}__${path.basename(doc.file_path)}`;
                    const trashPath = path.join(TRASH_DIR, trashName);
                    fs.renameSync(doc.file_path, trashPath);
                    console.log(`[DELETE] File moved to trash: ${trashPath}`);
                }
            } catch (fileErr) {
                console.error('Failed to move file to trash:', fileErr.message);
            }
        }

        console.log(`[DELETE] Document ${doc_code} deleted by ${deletedBy}`);

        res.json({
            success: true,
            message: `ลบเอกสาร "${doc.doc_name}" สำเร็จ`,
        });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบเอกสาร' });
    }
});

module.exports = router;
