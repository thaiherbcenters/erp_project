const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { poolPromise, sql } = require('../config/db');
const multer = require('multer');

// โฟลเดอร์ปลายทางสำหรับเก็บไฟล์เอกสารจริง (Windows Server)
const RECORDS_ROOT = process.env.DOCUMENT_RECORDS_ROOT || 'E:\\Documents\\records';

// กำหนด storage สำหรับ multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!fs.existsSync(RECORDS_ROOT)) {
                fs.mkdirSync(RECORDS_ROOT, { recursive: true });
            }
        } catch (err) {
            console.error('Error ensuring RECORDS_ROOT exists:', err);
        }
        cb(null, RECORDS_ROOT);
    },
    filename: (req, file, cb) => {
        const originalName = file.originalname || 'document';
        const ext = path.extname(originalName);
        const safeCode = (req.body.doc_code || 'DOC').replace(/[^A-Za-z0-9_-]/g, '_');
        const timestamp = Date.now();
        cb(null, `${safeCode}_${timestamp}${ext}`);
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
        } = req.body;

        if (!doc_code || !doc_name || !category) {
            return res.status(400).json({ message: 'ต้องระบุรหัสเอกสาร ชื่อเอกสาร และหมวด' });
        }

        const filePath = req.file.path;

        const pool = await poolPromise;

        await pool.request()
            .input('doc_code', sql.NVarChar, doc_code)
            .input('doc_name', sql.NVarChar, doc_name)
            .input('category', sql.NVarChar, category)
            .input('type_tag', sql.NVarChar, typeTag || null)
            .input('revision', sql.NVarChar, revision || null)
            .input('effective_date', sql.Date, effective_date || null)
            .input('status', sql.NVarChar, status || 'ใช้งาน')
            .input('file_path', sql.NVarChar, filePath)
            .query(`
                INSERT INTO Documents (doc_code, doc_name, category, type_tag, revision, effective_date, status, file_path)
                VALUES (@doc_code, @doc_name, @category, @type_tag, @revision, @effective_date, @status, @file_path);
            `);

        res.json({
            success: true,
            message: 'อัปโหลดเอกสารสำเร็จ',
            filePath,
        });
    } catch (err) {
        console.error('Error uploading document:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปโหลดเอกสาร' });
    }
});

module.exports = router;
