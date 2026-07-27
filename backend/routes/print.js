const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { poolPromise } = require('../config/db');
const { drawThaiText, wrapThaiText } = require('../utils/thaiShaper');
const { renderTorbor1Page3, renderTorbor1Page4And5, renderRelatedManufacturersOnPage2 } = require('../utils/torbor1PdfRenderer');
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
            'Sarabun': { regular: 'https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf', bold: 'https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Bold.ttf' },
            'Kanit': { regular: 'https://github.com/google/fonts/raw/main/ofl/kanit/Kanit-Regular.ttf', bold: 'https://github.com/google/fonts/raw/main/ofl/kanit/Kanit-Bold.ttf' },
            'Prompt': { regular: 'https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-Regular.ttf', bold: 'https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-Bold.ttf' },
            'THSarabunNew': { local: true, path: path.join(__dirname, '../fonts/THSarabunNew.ttf') }
        };

        const neededFonts = { regular: new Set(), bold: new Set() };
        // Read all configs to find all needed fonts
        for (const page of pages) {
            const configData = JSON.parse(fs.readFileSync(page.configPath, 'utf-8'));
            const templateFontFamily = (configData.templateConfig && configData.templateConfig.defaultFontFamily) || 'Sarabun';
            const templateFontWeight = (configData.templateConfig && configData.templateConfig.defaultFontWeight) || 'normal';
            neededFonts['regular'].add(templateFontFamily);
            neededFonts['bold'].add(templateFontFamily); // Always load bold font for the template font
            
            for (const f of configData.fields) {
                const fFamily = f.fontFamily || templateFontFamily;
                const fWeight = f.fontWeight || (f.isBold ? 'bold' : templateFontWeight);
                if (fontUrls[fFamily]) {
                    neededFonts[fWeight === 'bold' || fWeight === '700' ? 'bold' : 'regular'].add(fFamily);
                }
            }
        }

        const fontBytesCache = { regular: {}, bold: {} };
        for (const style of ['regular', 'bold']) {
            for (const family of neededFonts[style]) {
                if (fontUrls[family] && fontUrls[family].local) {
                    let localPath = fontUrls[family].path;
                    if (style === 'bold' && !fs.existsSync(localPath.replace('.ttf', '-Bold.ttf'))) {
                        // Fallback to Sarabun Bold from Google Fonts if local bold font is missing
                        const url = fontUrls['Sarabun'].bold;
                        const response = await fetch(url);
                        fontBytesCache[style][family] = await response.arrayBuffer();
                    } else {
                        // Use local font
                        const actualPath = style === 'bold' ? localPath.replace('.ttf', '-Bold.ttf') : localPath;
                        if (fs.existsSync(actualPath)) {
                            const fontBytes = fs.readFileSync(actualPath);
                            fontBytesCache[style][family] = new Uint8Array(fontBytes);
                        }
                    }
                } else {
                    const url = fontUrls[family] ? fontUrls[family][style] : fontUrls['Sarabun'][style];
                    const response = await fetch(url);
                    fontBytesCache[style][family] = await response.arrayBuffer();
                }
            }
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
            const defaultFontSize = templateConfig.defaultFontSize || 16;
            const templateFontFamily = templateConfig.defaultFontFamily || 'Sarabun';

            const templateFontWeight = templateConfig.defaultFontWeight || 'normal';

            const loadedFonts = { regular: {}, bold: {} };
            for (const style of ['regular', 'bold']) {
                for (const family of neededFonts[style]) {
                    if (fontBytesCache[style][family]) {
                        loadedFonts[style][family] = await pdfDoc.embedFont(fontBytesCache[style][family]);
                    }
                }
            }

            // ── TorBor1 Special: Filter out page 3 dynamic table fields ──
            let fieldsToRender = configData.fields;
            if (documentType === 'torbor1') {
                fieldsToRender = configData.fields.filter(field => {
                    if (!field.query) return true;
                    // Skip all hardcoded JSON_VALUE fields for dynamic tables
                    if (field.query.includes('JSON_VALUE(RecipeActiveIngredients') ||
                        field.query.includes('JSON_VALUE(RecipeExtracts') ||
                        field.query.includes('JSON_VALUE(RecipeExcipients') ||
                        field.query.includes('JSON_VALUE(RelatedManufacturers')) {
                        return false;
                    }
                    // Skip scalar fields on page 3 (they'll be drawn by the renderer)
                    if (field.pageIndex === 3) return false;
                    return true;
                });
            }

            for (const field of fieldsToRender) {
                if (!field.query) continue;

                let queryStr = field.query;
                if (documentId) {
                    let tableName = 'LegalDocuments';
                    if (documentType === 'herbal_cert') {
                        tableName = 'HerbalCertDocuments';
                    } else if (documentType === 'torbor1') {
                        tableName = 'TorBor1Documents';
                    } else if (documentType === 'contract_mfg') {
                        tableName = 'ContractMfgDocuments';
                    } else if (documentType === 'pdpa_consent') {
                        tableName = 'PdpaConsentDocuments';
                    } else if (documentType === 'corp_rep') {
                        tableName = 'CorpRepDocuments';
                    } else if (documentType === 'safety_cert') {
                        tableName = 'SafetyCertDocuments';
                    }
                    queryStr = queryStr.replace(/FROM\s+[A-Za-z_0-9_]+(\s+WHERE\s+.*)?$/i, `FROM ${tableName} WHERE DocumentID = ${documentId}`);
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
                    const fieldWeight = field.fontWeight || (field.isBold ? 'bold' : templateFontWeight);
                    const isBold = fieldWeight === 'bold' || fieldWeight === '700';
                    const activeFont = loadedFonts[isBold ? 'bold' : 'regular'][fieldFontFamily] || loadedFonts[isBold ? 'bold' : 'regular'][templateFontFamily];

                    // Set adjustedY to y + 1 to give a tiny bit of breathing room from the bottom line
                    const adjustedY = y + 1;

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
                    } else if (field.type === 'strikeout') {
                        if (value.toLowerCase() === 'true' || value === '1') {
                            pdfPage.drawLine({
                                start: { x: x, y: y + (boxHeight / 2) },
                                end: { x: x + boxWidth, y: y + (boxHeight / 2) },
                                thickness: 1,
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
                                color: rgb(0, 0, 0),
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
                                color: rgb(0, 0, 0),
                            });
                            currentX += activeFont.widthOfTextAtSize(chars[i], fieldFontSize) + spacing;
                        }
                    } else {
                        // Check if field is explicitly marked as multiline in the JSON template
                        const isMultiline = field.type === 'multi-line' || field.type === 'multiline' || field.multiline === true;
                        
                        // For single-line fields, replace newlines with spaces to avoid rendering glitches
                        const finalValue = isMultiline ? value : value.replace(/\r?\n/g, ' ');
                        
                        if (isMultiline && boxWidth > 0) {
                            // Wrap the text line by line
                            let currentFontSize = fieldFontSize;
                            let lines = wrapThaiText(finalValue, boxWidth, currentFontSize, activeFont);
                            let lineHeight = currentFontSize * 1.2;
                            let totalHeight = lines.length * lineHeight;
                            
                            // Auto-shrink font size if multiline text exceeds box height
                            if (boxHeight > 0) {
                                while (totalHeight > boxHeight && currentFontSize > 2) {
                                    currentFontSize -= 0.5;
                                    lines = wrapThaiText(finalValue, boxWidth, currentFontSize, activeFont);
                                    lineHeight = currentFontSize * 1.2;
                                    totalHeight = lines.length * lineHeight;
                                }
                            }
                            
                            // adjustedY is typically the bottom of the box. 
                            // For multiline, we should start rendering from the top of the box.
                            const startLineY = (adjustedY + boxHeight) - lineHeight;
                            
                            for (let i = 0; i < lines.length; i++) {
                                const lineY = startLineY - (i * lineHeight);
                                drawThaiText(pdfPage, lines[i], x, lineY, currentFontSize, activeFont, rgb(0, 0, 0));
                            }
                        } else {
                            // Auto-shrink font size if text overflows the bounding box for single line
                            const textWidth = activeFont.widthOfTextAtSize(finalValue, fieldFontSize);
                            if (textWidth > boxWidth && boxWidth > 0) {
                                fieldFontSize = fieldFontSize * (boxWidth / textWidth);
                            }

                            // Apply Custom Thai Renderer to fix Sara Am, floating vowels, and tone marks
                            drawThaiText(pdfPage, finalValue, x, adjustedY, fieldFontSize, activeFont, rgb(0, 0, 0));
                        }
                    }
                }
            }

            // ── TorBor1 Special: Replace page 3 with dynamically generated pages ──
            if (documentType === 'torbor1' && documentId) {
                try {
                    // Fetch full document data for dynamic rendering
                    const docResult = await pool.request()
                        .input('docId', documentId)
                        .query('SELECT * FROM TorBor1Documents WHERE DocumentID = @docId');
                    
                    if (docResult.recordset.length > 0) {
                        const docData = docResult.recordset[0];
                        
                        // Handle RelatedManufacturers on page 2 (index 1)
                        if (pdfDoc.getPageCount() > 1) {
                            const page2 = pdfDoc.getPage(1);
                            const { width: p2w, height: p2h } = page2.getSize();
                            const regularFont = loadedFonts.regular[templateFontFamily] || loadedFonts.regular['Sarabun'];
                            const boldFontObj = loadedFonts.bold[templateFontFamily] || loadedFonts.bold['Sarabun'] || regularFont;
                            renderRelatedManufacturersOnPage2(page2, regularFont, boldFontObj, docData, p2w, p2h);
                        }
                        
                        // Create a temporary PDFDocument for the dynamic pages
                        const { PDFDocument: PDFDoc2 } = require('pdf-lib');
                        const tempPdf = await PDFDoc2.create();
                        tempPdf.registerFontkit(fontkit);
                        
                        // Embed fonts in the temp document
                        const tempRegularFont = fontBytesCache.regular[templateFontFamily] 
                            ? await tempPdf.embedFont(fontBytesCache.regular[templateFontFamily])
                            : await tempPdf.embedFont(Object.values(fontBytesCache.regular)[0]);
                        const tempBoldFont = fontBytesCache.bold[templateFontFamily]
                            ? await tempPdf.embedFont(fontBytesCache.bold[templateFontFamily])
                            : tempRegularFont;
                        
                        // Also embed dingbats in tempPdf
                        const { StandardFonts } = require('pdf-lib');
                        const tempDingbatsFont = await tempPdf.embedFont(StandardFonts.ZapfDingbats);
                        
                        // Render dynamic page 3
                        renderTorbor1Page3(tempPdf, tempRegularFont, tempBoldFont, docData);
                        
                        // Render dynamic pages 4 and 5
                        renderTorbor1Page4And5(tempPdf, tempRegularFont, tempBoldFont, tempDingbatsFont, docData);
                        
                        // Now build the final merged PDF:
                        // Copy pages 1-2 from original template (indices 0,1)
                        const templatePageCount = pdfDoc.getPageCount();
                        
                        if (templatePageCount >= 3) {
                            // Copy pages before page 3 (pages 1 & 2 = indices 0, 1)
                            const beforePages = await mergedPdf.copyPages(pdfDoc, [0, 1]);
                            beforePages.forEach(p => mergedPdf.addPage(p));
                            
                            // Copy dynamic pages (3, 4, 5...) from tempPdf
                            const tempPageIndices = tempPdf.getPageIndices();
                            const dynamicCopied = await mergedPdf.copyPages(tempPdf, tempPageIndices);
                            dynamicCopied.forEach(p => mergedPdf.addPage(p));
                            
                            // Copy pages after page 5 (pages 6+ = indices 5, 6, ...)
                            if (templatePageCount > 5) {
                                const afterIndices = [];
                                for (let i = 5; i < templatePageCount; i++) afterIndices.push(i);
                                const afterPages = await mergedPdf.copyPages(pdfDoc, afterIndices);
                                afterPages.forEach(p => mergedPdf.addPage(p));
                            }
                        } else {
                            // Fallback: copy all pages normally
                            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                            copiedPages.forEach((p) => mergedPdf.addPage(p));
                        }
                    } else {
                        // No doc data found, copy pages normally
                        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                        copiedPages.forEach((p) => mergedPdf.addPage(p));
                    }
                } catch (torbor1Err) {
                    console.error('TorBor1 dynamic rendering error:', torbor1Err);
                    // Fallback: copy all pages normally
                    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                    copiedPages.forEach((p) => mergedPdf.addPage(p));
                }
            } else {
                // Standard flow for non-torbor1 documents
                const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                copiedPages.forEach((p) => mergedPdf.addPage(p));
            }
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
