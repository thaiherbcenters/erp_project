const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const baseDir = path.join(__dirname, '../pdf_templates');
if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
}

// We will use memory storage to buffer files so we can clear the folder right before writing them
const upload = multer({ 
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.fieldname.startsWith('basePdf_') && file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed for basePdf'));
        }
        if (file.fieldname.startsWith('configJson_') && file.mimetype !== 'application/json') {
            return cb(new Error('Only JSON files are allowed for configJson'));
        }
        cb(null, true);
    }
});

router.post('/upload', upload.any(), (req, res) => {
    try {
        const docType = req.body.documentType;
        if (!docType || !/^[a-zA-Z0-9_-]+$/.test(docType)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing documentType' });
        }

        let layout = req.body.layout;
        if (layout) {
            try {
                layout = JSON.parse(layout);
            } catch(e) {
                return res.status(400).json({ success: false, message: 'Invalid layout JSON' });
            }
        } else {
            // Backward compatibility: If no layout is provided, treat all uploaded files as new sequential pages
            layout = [];
            if (req.files) {
                const uniqueIndexes = new Set();
                req.files.forEach(f => {
                    const match = f.fieldname.match(/_(.+)$/);
                    if (match) uniqueIndexes.add(match[1]);
                });
                Array.from(uniqueIndexes).forEach(idx => {
                    layout.push({ type: 'new', fileIndex: idx });
                });
            }
        }

        const dir = path.join(baseDir, docType);
        const tempDir = path.join(baseDir, docType + '_temp_' + Date.now());
        
        fs.mkdirSync(tempDir, { recursive: true });

        // Copy or Write files according to layout
        layout.forEach((item, newIndex) => {
            if (item.type === 'existing') {
                const oldPdfPath = path.join(dir, `page${item.originalIndex}_base.pdf`);
                const oldConfigPath = path.join(dir, `page${item.originalIndex}_config.json`);
                
                // Also check for legacy basePdf name
                const legacyPdfPath = path.join(dir, `${docType}_base.pdf`);
                const legacyConfigPath = path.join(dir, `${docType}_config.json`);

                if (fs.existsSync(oldPdfPath)) {
                    fs.copyFileSync(oldPdfPath, path.join(tempDir, `page${newIndex}_base.pdf`));
                } else if (fs.existsSync(legacyPdfPath)) {
                    fs.copyFileSync(legacyPdfPath, path.join(tempDir, `page${newIndex}_base.pdf`));
                }

                if (fs.existsSync(oldConfigPath)) {
                    fs.copyFileSync(oldConfigPath, path.join(tempDir, `page${newIndex}_config.json`));
                } else if (fs.existsSync(legacyConfigPath)) {
                    fs.copyFileSync(legacyConfigPath, path.join(tempDir, `page${newIndex}_config.json`));
                }

            } else if (item.type === 'new') {
                const pdfFile = req.files ? req.files.find(f => f.fieldname === `basePdf_${item.fileIndex}`) : null;
                const jsonFile = req.files ? req.files.find(f => f.fieldname === `configJson_${item.fileIndex}`) : null;

                if (pdfFile) {
                    fs.writeFileSync(path.join(tempDir, `page${newIndex}_base.pdf`), pdfFile.buffer);
                }
                if (jsonFile) {
                    fs.writeFileSync(path.join(tempDir, `page${newIndex}_config.json`), jsonFile.buffer);
                }
            }
        });

        // Swap directories safely
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        fs.renameSync(tempDir, dir);
        
        res.json({ 
            success: true, 
            message: 'Templates uploaded successfully',
            documentType: docType
        });
    } catch (err) {
        console.error('Error uploading templates:', err);
        res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
    }
});

// Endpoint to list existing templates
router.get('/list/:type', (req, res) => {
    const docType = req.params.type;
    const dir = path.join(baseDir, docType);
    let pages = [];
    
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        
        // Check for legacy single template
        if (files.includes(`${docType}_base.pdf`) && files.includes(`${docType}_config.json`)) {
            pages.push({
                originalIndex: 0,
                basePdfName: `${docType}_base.pdf`,
                configJsonName: `${docType}_config.json`
            });
        } else {
            // Find pageN_base.pdf
            const pdfFiles = files.filter(f => f.match(/^page\d+_base\.pdf$/));
            pdfFiles.sort((a, b) => {
                const numA = parseInt(a.match(/^page(\d+)_/)[1], 10);
                const numB = parseInt(b.match(/^page(\d+)_/)[1], 10);
                return numA - numB;
            });

            pages = pdfFiles.map(pdf => {
                const index = pdf.match(/^page(\d+)_/)[1];
                const configName = `page${index}_config.json`;
                return {
                    originalIndex: parseInt(index, 10),
                    basePdfName: pdf,
                    configJsonName: files.includes(configName) ? configName : null
                };
            });
        }
    }
    
    res.json({
        success: true,
        documentType: docType,
        pages: pages
    });
});

// Legacy check endpoint
router.get('/check/:type', (req, res) => {
    const docType = req.params.type;
    const dir = path.join(baseDir, docType);
    let pageCount = 0;
    
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const pdfFiles = files.filter(f => f.endsWith('_base.pdf'));
        pageCount = pdfFiles.length;
    }
    
    res.json({
        success: true,
        documentType: docType,
        pageCount: pageCount,
        exists: pageCount > 0
    });
});

module.exports = router;
