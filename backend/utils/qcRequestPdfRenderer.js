const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const { drawThaiText, wrapThaiText } = require('./thaiShaper');

async function generateQcRequestPdf(data) {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);

    // Load Font (THSarabunNew)
    const fontPath = path.join(__dirname, '../fonts/THSarabunNew.ttf');
    let fontBytes;
    try {
        fontBytes = fs.readFileSync(fontPath);
    } catch (e) {
        throw new Error('Font file not found: ' + fontPath);
    }
    const font = await doc.embedFont(fontBytes);
    
    // Load Bold Font if available, otherwise fallback to normal
    let boldFont = font;
    try {
        const boldFontPath = path.join(__dirname, '../fonts/THSarabunNew-Bold.ttf');
        if (fs.existsSync(boldFontPath)) {
            const boldFontBytes = fs.readFileSync(boldFontPath);
            boldFont = await doc.embedFont(boldFontBytes);
        }
    } catch (e) {}

    const fontSize = 16;
    const titleSize = 24;

    const page = doc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    let y = height - 50; 
    const margin = 50;

    // Load and draw logo
    let logoDims = null;
    try {
        const logoPath = path.join(__dirname, '../../public/images/logos/logo-thc.png');
        if (fs.existsSync(logoPath)) {
            const logoBytes = fs.readFileSync(logoPath);
            const logoImage = await doc.embedPng(logoBytes);
            const scale = 65 / logoImage.height;
            logoDims = logoImage.scale(scale);
            const titleCenterY = y + (titleSize / 3);
            page.drawImage(logoImage, {
                x: margin,
                y: titleCenterY - (logoDims.height / 2),
                width: logoDims.width,
                height: logoDims.height,
            });
        }
    } catch (e) {
        console.error('Error drawing logo in PDF:', e);
    }

    // Title
    drawThaiText(page, 'ใบส่งตรวจวิเคราะห์ (QC Lab Request)', width / 2 - 120, y, titleSize, boldFont, rgb(0, 0, 0));
    
    y -= 70; // Move down to Section 1

    // Section 1: Task Info
    drawThaiText(page, 'ส่วนที่ 1: ข้อมูลการผลิต (สำหรับฝ่ายผลิต)', margin, y, 18, boldFont, rgb(0, 0, 0.5));

    // Date and Request ID at the right side (aligned with Section 1 header)
    const dateStr = data.requestedAt ? new Date(data.requestedAt).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH');
    drawThaiText(page, `เลขที่คำขอ: ${data.requestID || '-'}`, width - 200, y + 18, fontSize, font, rgb(0, 0, 0));
    drawThaiText(page, `วันที่: ${dateStr}`, width - 200, y, fontSize, font, rgb(0, 0, 0));

    y -= 25;

    // We can draw a rectangle around Section 1
    const sec1StartY = y + 15;
    const lineSpacing = 22;

    const typeStr = data.type === 'qc_inprocess' ? 'วิเคราะห์กึ่งสำเร็จรูป (WIP)' : 
                    data.type === 'qc_final' ? 'วิเคราะห์สำเร็จรูป (FG)' : 
                    data.type === 'qc_lab' ? 'วิเคราะห์วัตถุดิบ (Lab)' : (data.type || '-');

    drawThaiText(page, `รหัสใบสั่งผลิต (Job Order): ${data.jobOrderID || data.taskID || '-'}`, margin + 10, y, fontSize, font, rgb(0, 0, 0));
    drawThaiText(page, `ประเภทการตรวจ: ${typeStr}`, margin + 250, y, fontSize, font, rgb(0, 0, 0));
    y -= lineSpacing;
    
    drawThaiText(page, `ชื่อผลิตภัณฑ์/สูตร: ${data.formulaName || '-'}`, margin + 10, y, fontSize, font, rgb(0, 0, 0));
    y -= lineSpacing;
    
    drawThaiText(page, `เลขที่ผลิต (Batch No): ${data.batchNo || '-'}`, margin + 10, y, fontSize, font, rgb(0, 0, 0));
    drawThaiText(page, `จำนวน/ปริมาณ: ${data.qty || '...........................................'}`, margin + 250, y, fontSize, font, rgb(0, 0, 0));
    y -= lineSpacing;

    drawThaiText(page, `ผู้ส่งตรวจ: ${data.requesterName || '...........................................'}`, margin + 10, y, fontSize, font, rgb(0, 0, 0));
    drawThaiText(page, `สายการผลิต: ${data.line || '-'}`, margin + 250, y, fontSize, font, rgb(0, 0, 0));
    y -= lineSpacing;

    // Draw box for section 1
    page.drawRectangle({
        x: margin,
        y: y - 5,
        width: width - margin * 2,
        height: sec1StartY - (y - 5),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });
    
    y -= 40;

    // Section 2: QC Result
    drawThaiText(page, 'ส่วนที่ 2: ผลการตรวจวิเคราะห์ (สำหรับฝ่ายควบคุมคุณภาพ QC)', margin, y, 18, boldFont, rgb(0, 0, 0.5));
    y -= 20;

    const sec2StartY = y + 10;
    
    // --- Render Checklist (if available) ---
    if (data.checklist && data.checklist.length > 0) {
        // Table Header
        drawThaiText(page, `รายการที่ตรวจสอบ`, margin + 10, y, 12, boldFont, rgb(0, 0, 0));
        drawThaiText(page, `เกณฑ์อ้างอิง (Spec)`, margin + 200, y, 12, boldFont, rgb(0, 0, 0));
        drawThaiText(page, `ผล (Result)`, margin + 420, y, 12, boldFont, rgb(0, 0, 0));
        y -= 15;
        
        page.drawLine({
            start: { x: margin + 5, y: y + 12 },
            end: { x: width - margin - 5, y: y + 12 },
            thickness: 0.5,
            color: rgb(0.5, 0.5, 0.5),
        });

        y -= 5;
        // Table Rows
        for (const item of data.checklist) {
            let checkName = item.CheckItem || '';
            if (checkName.length > 40) checkName = checkName.substring(0, 37) + '...';
            drawThaiText(page, `- ${checkName}`, margin + 10, y, 12, font, rgb(0, 0, 0));
            
            // Limit standard requirement length for display
            let specStr = item.StandardRequirement || '';
            if (specStr.length > 45) specStr = specStr.substring(0, 42) + '...';
            drawThaiText(page, specStr, margin + 200, y, 12, font, rgb(0.3, 0.3, 0.3));

            const isPass = item.IsPass === 1 || item.IsPass === true;
            const resColor = isPass ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0);
            drawThaiText(page, isPass ? 'ผ่าน' : 'ไม่ผ่าน', margin + 430, y, 12, boldFont, resColor);
            
            if (item.ActualValue && item.ActualValue.trim() !== '') {
                drawThaiText(page, `ค่าที่วัดได้: ${item.ActualValue}`, margin + 200, y - 14, 12, font, rgb(0, 0, 0));
                y -= 28;
            } else {
                y -= 18;
            }
        }
        y -= 5;
        page.drawLine({
            start: { x: margin + 5, y: y + 12 },
            end: { x: width - margin - 5, y: y + 12 },
            thickness: 0.5,
            color: rgb(0.5, 0.5, 0.5),
        });
        y -= 15;
    }

    const qcStatusStr = data.status === 'ผ่าน' || data.status === 'QC ผ่าน' ? 'ผ่าน (Pass)' : 
                        data.status === 'ไม่ผ่าน' || data.status === 'QC ไม่ผ่าน' ? 'ไม่ผ่าน (Fail)' : 
                        '...........................................';
                        
    drawThaiText(page, `ผลการตรวจสอบรวม: `, margin + 10, y, fontSize, boldFont, rgb(0, 0, 0));
    
    let statusColor = rgb(0, 0, 0);
    if (data.status === 'ผ่าน' || data.status === 'QC ผ่าน') statusColor = rgb(0, 0.5, 0);
    else if (data.status === 'ไม่ผ่าน' || data.status === 'QC ไม่ผ่าน') statusColor = rgb(0.8, 0, 0);
    
    drawThaiText(page, qcStatusStr, margin + 105, y, fontSize, boldFont, statusColor);
    
    y -= lineSpacing;

    const qcNotes = data.qcNotes || '';
    drawThaiText(page, `ข้อเสนอแนะ / หมายเหตุเพิ่มเติม:`, margin + 10, y, fontSize, font, rgb(0, 0, 0));
    
    y -= lineSpacing;
    if (qcNotes && qcNotes.trim() !== '') {
        const wrappedNotes = wrapThaiText(qcNotes, width - margin * 2 - 20, fontSize, font);
        for (const line of wrappedNotes) {
            drawThaiText(page, line, margin + 20, y, fontSize, font, rgb(0, 0, 0));
            y -= lineSpacing;
        }
    } else if (data.status === 'ผ่าน' || data.status === 'QC ผ่าน' || data.status === 'ไม่ผ่าน' || data.status === 'QC ไม่ผ่าน') {
        drawThaiText(page, `-`, margin + 20, y, fontSize, font, rgb(0, 0, 0));
        y -= (lineSpacing); // Reduced gap
    } else {
        drawThaiText(page, `...................................................................................................................................................`, margin + 20, y, fontSize, font, rgb(0, 0, 0));
        y -= lineSpacing;
        drawThaiText(page, `...................................................................................................................................................`, margin + 20, y, fontSize, font, rgb(0, 0, 0));
        y -= lineSpacing;
    }

    y -= 10;
    drawThaiText(page, `ผู้ตรวจสอบ: ${data.inspectedBy || '...........................................'}`, margin + 10, y, fontSize, font, rgb(0, 0, 0));
    const qcDateStr = data.inspectedAt ? new Date(data.inspectedAt).toLocaleDateString('th-TH') : '...........................................';
    drawThaiText(page, `วันที่ตรวจ: ${qcDateStr}`, margin + 300, y, fontSize, font, rgb(0, 0, 0));
    
    y -= lineSpacing;

    // Draw box for section 2
    page.drawRectangle({
        x: margin,
        y: y - 5,
        width: width - margin * 2,
        height: sec2StartY - (y - 5),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });

    return await doc.save();
}

module.exports = { generateQcRequestPdf };
