const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const { drawThaiText } = require('./thaiShaper');

async function generateRequisitionPdf(data) {
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
            // Assuming logo-thc.png has some size, scale it to fit height ~65
            const scale = 65 / logoImage.height;
            logoDims = logoImage.scale(scale);
            const titleCenterY = y + (titleSize / 3); // approximate visual center of Thai text
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
    drawThaiText(page, 'ใบขอเบิกวัตถุดิบ (Material Requisition)', width / 2 - 120, y, titleSize, font, rgb(0, 0, 0));
    
    // adjust y
    y -= 65;

    // Header Info
    const dateStr = data.date || new Date().toLocaleDateString('th-TH');
    const refId = data.batchNo || data.taskId || '-';
    const reqNo = data.taskId || '-';

    drawThaiText(page, `เลขที่ใบเบิก: ${reqNo}`, margin, y, fontSize, font, rgb(0, 0, 0));
    drawThaiText(page, `เลขที่อ้างอิงงานผลิต: ${data.jobOrderId || '-'} / ${refId}`, width / 2, y, fontSize, font, rgb(0, 0, 0));
    y -= 25;
    drawThaiText(page, `วันที่: ${dateStr}`, margin, y, fontSize, font, rgb(0, 0, 0));
    drawThaiText(page, `จำนวนที่ผลิต: ${data.expectedQty || '-'} ${data.unit || '-'}`, width / 2, y, fontSize, font, rgb(0, 0, 0));
    y -= 25;
    drawThaiText(page, `สูตรที่ต้องการผลิต: ${data.formulaName || '-'}`, margin, y, fontSize, font, rgb(0, 0, 0));
    y -= 35;

    // Table Header
    const colX = [margin, margin + 40, margin + 300, margin + 400]; // No, Name, Qty, Unit
    const tableTop = y;
    
    // Draw Table Header Background & Borders
    page.drawRectangle({
        x: margin, y: y - 25, width: width - margin * 2, height: 25,
        color: rgb(0.9, 0.9, 0.9),
        borderColor: rgb(0, 0, 0), borderWidth: 1
    });

    drawThaiText(page, 'ลำดับ', colX[0] + 5, y - 18, fontSize, font, rgb(0, 0, 0));
    drawThaiText(page, 'รหัส/ชื่อวัตถุดิบ', colX[1] + 5, y - 18, fontSize, font, rgb(0, 0, 0));
    drawThaiText(page, 'จำนวนที่เบิก', colX[2] + 5, y - 18, fontSize, font, rgb(0, 0, 0));
    drawThaiText(page, 'หน่วย', colX[3] + 5, y - 18, fontSize, font, rgb(0, 0, 0));
    y -= 25;

    // Table Rows
    const items = data.items || [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowH = 25;

        const qtyToDisplay = item.displayQty != null ? item.displayQty : item.deductQty;
        const qtyFormatted = qtyToDisplay != null ? Number(qtyToDisplay).toLocaleString('th-TH', { maximumFractionDigits: 4 }) : '';

        // Draw borders for row
        page.drawRectangle({
            x: margin, y: y - rowH, width: width - margin * 2, height: rowH,
            borderColor: rgb(0, 0, 0), borderWidth: 1
        });

        drawThaiText(page, `${i + 1}`, colX[0] + 10, y - 18, fontSize, font, rgb(0, 0, 0));
        drawThaiText(page, `${item.name || ''}`, colX[1] + 5, y - 18, fontSize, font, rgb(0, 0, 0));
        drawThaiText(page, `${qtyFormatted}`, colX[2] + 5, y - 18, fontSize, font, rgb(0, 0, 0));
        drawThaiText(page, `${item.displayUnit || item.unit || ''}`, colX[3] + 5, y - 18, fontSize, font, rgb(0, 0, 0));

        y -= rowH;
        
        // Handle page break
        if (y < 150 && i < items.length - 1) {
            // Minimal logic for page break if there are too many items
            // Just for completeness
        }
    }

    // Draw vertical lines for the table
    const tableBottom = y;
    for (let i = 1; i < colX.length; i++) {
        page.drawLine({
            start: { x: colX[i], y: tableTop },
            end: { x: colX[i], y: tableBottom },
            thickness: 1, color: rgb(0, 0, 0)
        });
    }

    y -= 60;

    // Footer Signatures
    const sigY = y - 30;
    
    const drawCenteredText = (p, text, centerX, yPos, size, f, c) => {
        const textWidth = f.widthOfTextAtSize(text, size);
        drawThaiText(p, text, centerX - (textWidth / 2), yPos, size, f, c);
    };

    // Requester
    const requesterStr = data.requesterName && data.requesterName !== 'ไม่ระบุ' ? `( ${data.requesterName} )` : '(.........................................................)';
    const reqDateStr = data.date ? `วันที่ ${data.date}` : 'วันที่........./........./.........';
    
    // approximate center of the dotted line
    const requesterCenterX = margin + 125; 

    drawThaiText(page, 'ลงชื่อ.........................................................ผู้ขอเบิก', margin + 30, sigY, fontSize, font, rgb(0, 0, 0));
    drawCenteredText(page, requesterStr, requesterCenterX, sigY - 20, fontSize, font, rgb(0, 0, 0));
    drawCenteredText(page, reqDateStr, requesterCenterX, sigY - 40, fontSize, font, rgb(0, 0, 0));

    // Issuer
    const issuerStr = data.issuerName && data.issuerName !== 'ไม่ระบุ' ? `( ${data.issuerName} )` : '(.........................................................)';
    const issDateStr = data.issueDate ? `วันที่ ${data.issueDate}` : 'วันที่........./........./.........';

    const issuerCenterX = width / 2 + 105;

    drawThaiText(page, 'ลงชื่อ.........................................................ผู้อนุมัติ/จ่ายของ', width / 2 + 10, sigY, fontSize, font, rgb(0, 0, 0));
    drawCenteredText(page, issuerStr, issuerCenterX, sigY - 20, fontSize, font, rgb(0, 0, 0));
    drawCenteredText(page, issDateStr, issuerCenterX, sigY - 40, fontSize, font, rgb(0, 0, 0));

    const pdfBytes = await doc.save();
    return pdfBytes;
}

module.exports = {
    generateRequisitionPdf
};
