const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { poolPromise } = require('../config/db');

// GET /check-template/:documentType
// ตรวจสอบว่ามีแฟ้มแม่แบบสำหรับประเภทเอกสารนี้หรือไม่
router.get('/check-template/:documentType', (req, res) => {
    const { documentType } = req.params;
    if (!documentType || !/^[a-zA-Z0-9_-]+$/.test(documentType)) {
        return res.json({ exists: false, error: 'Invalid document type' });
    }
    
    const dir = path.join(__dirname, `../pdf_templates/${documentType}`);
    const exists = fs.existsSync(dir);
    res.json({ exists });
});

router.post('/', async (req, res) => {
    let pool;
    try {
        let { documentType, documentId } = req.body;

        if (documentId) {
            documentId = parseInt(documentId, 10);
            if (isNaN(documentId)) {
                return res.status(400).json({ error: 'Invalid documentId' });
            }
        }

        if (!documentType || !/^[a-zA-Z0-9_-]+$/.test(documentType)) {
            return res.status(400).json({ error: 'Invalid or missing documentType' });
        }

        const dir = path.join(__dirname, `../pdf_templates/${documentType}`);
        if (!fs.existsSync(dir)) {
            return res.status(404).json({ error: 'Template directory not found' });
        }

        // Find all pages
        const files = fs.readdirSync(dir);
        let pages = [];

        // Support backward compatibility for [docType]_base.pdf
        if (files.includes(`${documentType}_base.pdf`) && files.includes(`${documentType}_config.json`)) {
            pages.push({
                pdfPath: path.join(dir, `${documentType}_base.pdf`),
                configPath: path.join(dir, `${documentType}_config.json`)
            });
        } else {
            // Find all pageN_base.pdf
            const pdfFiles = files.filter(f => f.match(/^page\d+_base\.pdf$/));
            // Sort by page number
            pdfFiles.sort((a, b) => {
                const numA = parseInt(a.match(/^page(\d+)_/)[1], 10);
                const numB = parseInt(b.match(/^page(\d+)_/)[1], 10);
                return numA - numB;
            });

            for (const pdfFile of pdfFiles) {
                const match = pdfFile.match(/^page(\d+)_/);
                const index = match[1];
                const configFile = `page${index}_config.json`;
                if (files.includes(configFile)) {
                    pages.push({
                        pdfPath: path.join(dir, pdfFile),
                        configPath: path.join(dir, configFile)
                    });
                }
            }
        }

        if (pages.length === 0) {
            return res.status(404).json({ error: 'No configuration or PDF files found' });
        }

        pool = await poolPromise;

        // Font Loading (Cache to avoid re-fetching per page)
        const fontUrls = {
            'Sarabun': 'https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf',
            'Kanit': 'https://github.com/google/fonts/raw/main/ofl/kanit/Kanit-Regular.ttf',
            'Prompt': 'https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-Regular.ttf'
        };

        const neededFonts = new Set();
        // Read all configs to find all needed fonts
        for (const page of pages) {
            const configData = JSON.parse(fs.readFileSync(page.configPath, 'utf-8'));
            const templateFontFamily = (configData.templateConfig && configData.templateConfig.defaultFontFamily) || 'Sarabun';
            neededFonts.add(templateFontFamily);
            for (const f of configData.fields) {
                if (f.fontFamily && fontUrls[f.fontFamily]) neededFonts.add(f.fontFamily);
            }
        }

        const fontBytesCache = {};
        for (const family of neededFonts) {
            const url = fontUrls[family] || fontUrls['Sarabun'];
            const response = await fetch(url);
            fontBytesCache[family] = await response.arrayBuffer();
        }

        // Final Merged PDF
        const mergedPdf = await PDFDocument.create();

        // Process each page
        for (const page of pages) {
            const configData = JSON.parse(fs.readFileSync(page.configPath, 'utf-8'));
            const pdfBytes = fs.readFileSync(page.pdfPath);
            
            const pdfDoc = await PDFDocument.load(pdfBytes);
            pdfDoc.registerFontkit(fontkit);
            
            const dingbatsFont = await pdfDoc.embedFont(StandardFonts.ZapfDingbats);

            const templateConfig = configData.templateConfig || {};
            const templateFontFamily = templateConfig.defaultFontFamily || 'Sarabun';
            const defaultFontSize = templateConfig.defaultFontSize || 14;

            const loadedFonts = {};
            for (const family of neededFonts) {
                if (fontBytesCache[family]) {
                    loadedFonts[family] = await pdfDoc.embedFont(fontBytesCache[family]);
                }
            }

            for (const field of configData.fields) {
                if (!field.query) continue;

                let queryStr = field.query;
                if (documentId) {
                    let tableName = 'LegalDocuments';
                    if (documentType === 'herbal_cert') {
                        tableName = 'HerbalCertDocuments';
                    }
                    queryStr = queryStr.replace(/FROM\s+[A-Za-z_]+[\s\S]*$/i, `FROM ${tableName} WHERE DocumentID = ${documentId}`);
                }

                const result = await pool.request().query(queryStr);
                
                if (result.recordset.length > 0) {
                    const firstRow = result.recordset[0];
                    const key = Object.keys(firstRow)[0];
                    let rawValue = firstRow[key];
                    
                    if (rawValue instanceof Date) {
                        rawValue = new Intl.DateTimeFormat('th-TH', { 
                            day: 'numeric', month: 'long', year: 'numeric' 
                        }).format(rawValue);
                    } else if (typeof rawValue === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(rawValue)) {
                        const dateObj = new Date(rawValue);
                        if (!isNaN(dateObj)) {
                            rawValue = new Intl.DateTimeFormat('th-TH', { 
                                day: 'numeric', month: 'long', year: 'numeric' 
                            }).format(dateObj);
                        }
                    }
                    
                    let value = String(rawValue || '');
                    
                    if (!value) continue;

                    const pageIndex = (field.pageIndex || 1) - 1;
                    const pdfPage = pdfDoc.getPage(pageIndex);
                    const { width, height } = pdfPage.getSize();

                    const boxWidth = (field.widthPct / 100) * width;
                    const boxHeight = (field.heightPct / 100) * height;
                    const x = (field.xPercent / 100) * width;
                    const y = height - ((field.yPercent / 100) * height);
                    
                    let fieldFontSize = field.fontSize || defaultFontSize;
                    if (fieldFontSize < 10) {
                        fieldFontSize = fieldFontSize * 1.43;
                    }
                    
                    const fieldFontFamily = field.fontFamily || templateFontFamily;
                    const activeFont = loadedFonts[fieldFontFamily] || loadedFonts[templateFontFamily];

                    const adjustedY = y + 3;

                    if (field.type === 'checkbox') {
                        if (value.toLowerCase() === 'true' || value === '1') {
                            pdfPage.drawText('\u2714', {
                                x: x + 2,
                                y: y + 2,
                                size: fieldFontSize * 1.1,
                                font: dingbatsFont,
                                color: rgb(0, 0, 0),
                            });
                        }
                    } else if (field.type === 'comb' && (field.combCount || field.combFormat)) {
                        const chars = value.replace(/\s+/g, '').split('');
                        let boxes = [];
                        
                        if (field.combFormat) {
                            const groups = field.combFormat.split(/[-_ ,/]+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0);
                            const N = groups.reduce((a, b) => a + b, 0);
                            const G = Math.max(0, groups.length - 1);
                            if (N > 0) {
                                const GAP_RATIO = field.charSpacingEm !== undefined && field.charSpacingEm !== 0 ? field.charSpacingEm : 0.85; 
                                const totalUnits = N + (G * GAP_RATIO);
                                const cellWidth = boxWidth / totalUnits;
                                let currentBoxIdx = 0;
                                
                                for (let g = 0; g < groups.length; g++) {
                                    for (let k = 0; k < groups[g]; k++) {
                                        boxes.push({
                                            x: x + ((currentBoxIdx + (g * GAP_RATIO)) * cellWidth),
                                            width: cellWidth
                                        });
                                        currentBoxIdx++;
                                    }
                                }
                            }
                        }
                        
                        if (boxes.length === 0) {
                            const count = field.combCount || 10;
                            const cellWidth = boxWidth / count;
                            for (let i = 0; i < count; i++) {
                                boxes.push({ x: x + (i * cellWidth), width: cellWidth });
                            }
                        }
                        
                        for (let i = 0; i < Math.min(chars.length, boxes.length); i++) {
                            const charWidth = activeFont.widthOfTextAtSize(chars[i], fieldFontSize);
                            const centerX = boxes[i].x + (boxes[i].width - charWidth) / 2;
                            
                            pdfPage.drawText(chars[i], {
                                x: centerX,
                                y: adjustedY,
                                size: fieldFontSize,
                                font: activeFont,
                                color: rgb(0.15, 0.15, 0.15),
                            });
                        }
                    } else if (field.charSpacingEm && field.charSpacingEm > 0) {
                        const spacing = fieldFontSize * field.charSpacingEm;
                        let currentX = x;
                        const chars = value.split('');
                        for (let i = 0; i < chars.length; i++) {
                            pdfPage.drawText(chars[i], {
                                x: currentX,
                                y: adjustedY,
                                size: fieldFontSize,
                                font: activeFont,
                                color: rgb(0.15, 0.15, 0.15),
                            });
                            currentX += activeFont.widthOfTextAtSize(chars[i], fieldFontSize) + spacing;
                        }
                    } else {
                        // Fix for Thai Sara Am and Tone Marks in pdf-lib (Sarabun font)
                        // This intercepts clusters like น้ำ and draws นำ first to maintain kerning,
                        // then explicitly overlays the tone mark ้ at the correct X coordinate.
                        const amToneRegex = /([ก-ฮ][ัิ-ู]?)([\u0E48-\u0E4C])\u0E33|([ก-ฮ][ัิ-ู]?)\u0E33([\u0E48-\u0E4C])/g;
                        if (amToneRegex.test(value)) {
                            amToneRegex.lastIndex = 0;
                            let currentX = x;
                            let lastIndex = 0;
                            let match;
                            
                            while ((match = amToneRegex.exec(value)) !== null) {
                                // Draw preceding text normally
                                const beforeStr = value.substring(lastIndex, match.index);
                                if (beforeStr) {
                                    pdfPage.drawText(beforeStr, { x: currentX, y: adjustedY, size: fieldFontSize, font: activeFont, color: rgb(0.15, 0.15, 0.15) });
                                    currentX += activeFont.widthOfTextAtSize(beforeStr, fieldFontSize);
                                }
                                
                                const base = match[1] || match[3];
                                const tone = match[2] || match[4];
                                
                                // Draw base + ำ (e.g. นำ) to preserve the negative left bearing kerning of ำ
                                const baseAm = base + '\u0E33';
                                pdfPage.drawText(baseAm, { x: currentX, y: adjustedY, size: fieldFontSize, font: activeFont, color: rgb(0.15, 0.15, 0.15) });
                                
                                // Tone marks have negative left bearings in Thai TTF fonts.
                                // Drawing it at currentX + width(base) places it perfectly over the base.
                                const toneX = currentX + activeFont.widthOfTextAtSize(base, fieldFontSize);
                                // Shift Tone Mark UP by 25% of font size to avoid vertical overlap with Sara Am's circle
                                const toneY = adjustedY + (fieldFontSize * 0.25);
                                pdfPage.drawText(tone, { x: toneX, y: toneY, size: fieldFontSize, font: activeFont, color: rgb(0.15, 0.15, 0.15) });
                                
                                currentX += activeFont.widthOfTextAtSize(baseAm, fieldFontSize);
                                lastIndex = amToneRegex.lastIndex;
                            }
                            
                            const remaining = value.substring(lastIndex);
                            if (remaining) {
                                pdfPage.drawText(remaining, { x: currentX, y: adjustedY, size: fieldFontSize, font: activeFont, color: rgb(0.15, 0.15, 0.15) });
                            }
                        } else {
                            // Standard rendering
                            pdfPage.drawText(value, {
                                x: x,
                                y: adjustedY,
                                size: fieldFontSize,
                                font: activeFont,
                                color: rgb(0.15, 0.15, 0.15),
                            });
                        }
                    }
                }
            }

            // Copy filled pages from pdfDoc to mergedPdf
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((p) => mergedPdf.addPage(p));
        }

        const pdfBytesOut = await mergedPdf.save();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="printed_document.pdf"`);
        res.send(Buffer.from(pdfBytesOut));

    } catch (err) {
        console.error("Print API Error:", err);
        res.status(500).send(err.message);
    }
});

module.exports = router;
