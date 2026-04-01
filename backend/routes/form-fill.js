const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFName } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit'); // ต้องมี fontkit เพื่อฝังฟอนต์ภาษาไทย

const TEMPLATES_DIR = 'E:\\Templates';
const FONTS_DIR = path.join(__dirname, '..', 'fonts');

// POST /api/forms/fill/:templateId
// รับข้อมูลฟอร์มจาก body แล้วเติมลงใน PDF Template
router.post('/fill/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        const formData = req.body;

        // หา template file
        const templatePath = path.join(TEMPLATES_DIR, `${templateId}_template.pdf`);

        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({
                message: `ไม่พบไฟล์ template: ${templateId}_template.pdf`,
                expectedPath: templatePath
            });
        }

        // อ่าน PDF template
        const existingPdfBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes, {
            ignoreEncryption: true,
        });

        // Register fontkit สำหรับฟอนต์ภาษาไทย
        pdfDoc.registerFontkit(fontkit);

        // โหลดฟอนต์ THSarabunNew
        const fontPath = path.join(FONTS_DIR, 'THSarabunNew.ttf');
        let customFont = null;
        if (fs.existsSync(fontPath)) {
            const fontBytes = fs.readFileSync(fontPath);
            customFont = await pdfDoc.embedFont(fontBytes);
        } else {
            console.warn(`[Warning] ไม่พบไฟล์ฟอนต์ภาษาไทยที่ ${fontPath}`);
        }

        const form = pdfDoc.getForm();

        // เติมข้อมูลลงในฟิลด์ต่างๆ
        const fieldMappings = formData.fields || {};
        let filledCount = 0;
        const errors = [];

        for (const [fieldName, value] of Object.entries(fieldMappings)) {
            try {
                const field = form.getTextField(fieldName);
                if (field) {
                    const textValue = String(value || '');

                    // ถ้าหาฟอนต์ไทยเจอ ให้ใช้ฟอนต์ไทย เพื่อป้องกัน WinAnsi error
                    if (customFont) {
                        try {
                            field.setText(textValue);
                            field.defaultUpdateAppearances(customFont);
                            field.setFontSize(16); // บังคับขนาดฟอนต์เป็น 16 ตามที่ระบุ
                            field.updateAppearances(customFont);
                        } catch (e) {
                            console.error(`Font error on ${fieldName}:`, e);
                        }
                    } else {
                        field.setText(textValue); // อาจจะ error ถ้าพิมพ์ไทยแล้วไม่มีฟอนต์
                    }
                    filledCount++;
                }
            } catch (err) {
                // ลองเป็น checkbox
                try {
                    const checkbox = form.getCheckBox(fieldName);
                    if (checkbox) {
                        if (value) {
                            checkbox.check();
                        } else {
                            checkbox.uncheck();
                        }
                        filledCount++;
                    }
                } catch (err2) {
                    // ลองเป็นรูปภาพ (Signature) โดยปกติจะเป็น Button field ใน PDF
                    try {
                        const button = form.getButton(fieldName);
                        if (button) {
                            if (value && typeof value === 'string' && fs.existsSync(value)) {
                                // โหลดไฟล์รูปภาพ
                                const imageBytes = fs.readFileSync(value);
                                let embeddedImage;

                                // เช็คนามสกุลเพื่อเลือกวิธีฝังรูป
                                if (value.toLowerCase().endsWith('.png')) {
                                    embeddedImage = await pdfDoc.embedPng(imageBytes);
                                } else if (value.toLowerCase().match(/\.(jpeg|jpg)$/)) {
                                    embeddedImage = await pdfDoc.embedJpg(imageBytes);
                                }

                                if (embeddedImage) {
                                    button.setImage(embeddedImage);
                                    filledCount++;
                                }
                            } else if (value && typeof value === 'string' && value.trim() !== '') {
                                // มีข้อมูลส่งมา แต่หาไฟล์ไม่เจอ ให้แจ้ง Error
                                console.error(`[PDF Image] Error: Image file not found at path: ${value}`);
                                errors.push(`ไม่พบฟิลด์หรือไฟล์รูปภาพ: ${fieldName}`);
                            } else {
                                // กรณีไม่มีข้อมูลส่งมา (ตั้งใจปล่อยว่าง) 
                                // เนื่องจาก pdf-lib หาวิธีลบแบบ 100% ยากและมักจะค้างเป็นกล่องสีเทาเมื่อ Flatten
                                // การใช้รูปภาพโปร่งใส 1x1 Pixel ปะทับลงไปจะเป็นการลบกล่องที่ได้ผลดีที่สุด
                                const TRANSPARENT_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                                const transparentImageBytes = Buffer.from(TRANSPARENT_PNG_B64, 'base64');
                                const transparentImage = await pdfDoc.embedPng(transparentImageBytes);
                                button.setImage(transparentImage);
                                filledCount++;
                            }
                        }
                    } catch (err3) {
                        console.error(`[PDF Image] Exception on field ${fieldName}: ${err3.message}`);
                        errors.push(`ไม่พบฟิลด์: ${fieldName}`);
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // สแกนหา Button fields ทั้งหมดที่ยังไม่ได้ถูกตั้งค่ารูปภาพ
        // แล้วปะรูปโปร่งใส (Transparent PNG) ลงไป เพื่อป้องกันกล่องสีเทาเมื่อ Flatten
        // ═══════════════════════════════════════════════════════════════
        const TRANSPARENT_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        const allFields = form.getFields();
        const filledButtonNames = new Set(
            Object.entries(fieldMappings)
                .filter(([, v]) => v && typeof v === 'string' && v.trim() !== '' && fs.existsSync(v))
                .map(([k]) => k)
        );

        for (const field of allFields) {
            if (field.constructor.name === 'PDFButton') {
                const name = field.getName();
                if (!filledButtonNames.has(name)) {
                    try {
                        const btn = form.getButton(name);
                        const transparentImageBytes = Buffer.from(TRANSPARENT_PNG_B64, 'base64');
                        const transparentImage = await pdfDoc.embedPng(transparentImageBytes);
                        btn.setImage(transparentImage);

                        // ลบสีพื้นหลัง (BG) และเส้นขอบ (BC) ออกจาก Widget
                        // ซึ่งเป็นสาเหตุหลักที่ทำให้เห็นกล่องสีเทาเมื่อ Flatten
                        const widgets = btn.acroField.getWidgets();
                        for (const widget of widgets) {
                            const mk = widget.dict.get(PDFName.of('MK'));
                            if (mk) {
                                mk.delete(PDFName.of('BG'));
                                mk.delete(PDFName.of('BC'));
                            }
                            widget.dict.delete(PDFName.of('BS'));
                            widget.dict.delete(PDFName.of('Border'));
                        }
                    } catch (e) {
                        console.warn(`[PDF] Could not clear button ${name}: ${e.message}`);
                    }
                }
            }
        }

        // Flatten ฟอร์ม (ทำให้ข้อมูลฝังลงใน PDF ถาวร)
        form.flatten();

        // สร้าง PDF ใหม่
        const pdfBytes = await pdfDoc.save();

        // ส่งกลับเป็น PDF
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${templateId}_filled.pdf"`,
            'Content-Length': pdfBytes.length,
        });
        res.send(Buffer.from(pdfBytes));

    } catch (err) {
        console.error('Error filling PDF form:', err);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการเติมข้อมูลลง PDF: ' + err.message,
        });
    }
});

// GET /api/forms/fields/:templateId
// ดึงรายชื่อฟิลด์ทั้งหมดจาก PDF Template (สำหรับ debug/ตรวจสอบ)
router.get('/fields/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        const templatePath = path.join(TEMPLATES_DIR, `${templateId}_template.pdf`);

        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({
                message: `ไม่พบไฟล์ template: ${templateId}_template.pdf`,
            });
        }

        const existingPdfBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes, {
            ignoreEncryption: true,
        });
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        const fieldInfo = fields.map(field => ({
            name: field.getName(),
            type: field.constructor.name,
        }));

        res.json({
            templateId,
            totalFields: fieldInfo.length,
            fields: fieldInfo,
        });
    } catch (err) {
        console.error('Error reading PDF fields:', err);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการอ่านฟิลด์: ' + err.message,
        });
    }
});

module.exports = router;
