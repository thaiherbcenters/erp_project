const { PDFDocument, rgb } = require('pdf-lib');
const { drawThaiText, wrapThaiText } = require('./thaiShaper');

// A4 dimensions
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 60;
const CONTENT_WIDTH = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const LINE_COLOR = rgb(0.8, 0.8, 0.8);
const TEXT_COLOR = rgb(0, 0, 0);
const PRIMARY_COLOR = rgb(0.53, 0.13, 0.77); // Purple for pharmacist theme #8b21c6
const SUCCESS_COLOR = rgb(0.06, 0.72, 0.51); // #10b981 green
const ERROR_COLOR = rgb(0.93, 0.26, 0.26); // #ef4444 red

function drawHLine(page, x, y, width, color = LINE_COLOR) {
    page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 1, color });
}

function drawVLine(page, x, y1, y2, color = LINE_COLOR) {
    page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: 1, color });
}

async function generatePharmApprovePdf(pdfDoc, data, font, boldFont, logoBytes = null) {
    let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    let currentY = A4_HEIGHT - MARGIN_TOP;

    const { formula, qcTest } = data;

    // --- Header ---
    drawThaiText(page, 'ใบอนุมัติสูตรตำรับ', MARGIN_LEFT, currentY, 20, boldFont, PRIMARY_COLOR);
    drawThaiText(page, '(Pharmacist Formula Approval)', MARGIN_LEFT, currentY - 18, 14, font, PRIMARY_COLOR);
    
    // Draw Logo if exists
    if (logoBytes) {
        try {
            const logoImage = await pdfDoc.embedPng(logoBytes);
            const imgWidth = 150;
            const imgHeight = (logoImage.height / logoImage.width) * imgWidth;
            page.drawImage(logoImage, {
                x: A4_WIDTH - MARGIN_RIGHT - imgWidth,
                y: currentY + 10 - imgHeight, // align top of logo
                width: imgWidth,
                height: imgHeight,
            });
            drawThaiText(page, `วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}`, A4_WIDTH - MARGIN_RIGHT - 110, currentY + 10 - imgHeight - 20, 12, font, TEXT_COLOR);
        } catch (e) {
            drawThaiText(page, `วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}`, A4_WIDTH - MARGIN_RIGHT - 110, currentY, 12, font, TEXT_COLOR);
        }
    } else {
        drawThaiText(page, `วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}`, A4_WIDTH - MARGIN_RIGHT - 110, currentY, 12, font, TEXT_COLOR);
    }

    currentY -= 50;
    drawHLine(page, MARGIN_LEFT, currentY, CONTENT_WIDTH, PRIMARY_COLOR);
    currentY -= 20;

    // --- Formula Details ---
    const drawPair = (label, value, x1, x2, y, valFont = font) => {
        drawThaiText(page, label, x1, y, 12, boldFont, TEXT_COLOR);
        drawThaiText(page, value || '-', x2, y, 12, valFont, TEXT_COLOR);
    };

    drawPair('รหัสสูตร:', formula.FormulaID, MARGIN_LEFT, MARGIN_LEFT + 70, currentY);
    drawPair('หมวดหมู่:', formula.Category, MARGIN_LEFT + 250, MARGIN_LEFT + 310, currentY);
    currentY -= 20;

    drawPair('ชื่อสูตร:', formula.Name, MARGIN_LEFT, MARGIN_LEFT + 70, currentY);
    drawPair('เวอร์ชั่น:', formula.Version, MARGIN_LEFT + 250, MARGIN_LEFT + 310, currentY);
    currentY -= 20;

    drawPair('ขนาด Batch:', `${(formula.BatchSize || 0).toLocaleString()} กรัม`, MARGIN_LEFT, MARGIN_LEFT + 70, currentY);
    drawPair('ปริมาณบรรจุต่อชิ้น:', `${formula.UnitSize || 0} ${formula.Unit || ''}`, MARGIN_LEFT + 250, MARGIN_LEFT + 340, currentY);
    currentY -= 30;

    // --- Ingredients Table ---
    drawThaiText(page, `รายการวัตถุดิบ (${formula.ingredients.length} รายการ)`, MARGIN_LEFT, currentY, 14, boldFont, PRIMARY_COLOR);
    currentY -= 15;

    const rowHeight = 22;
    const colX = [MARGIN_LEFT, MARGIN_LEFT + 40, MARGIN_LEFT + 250, MARGIN_LEFT + 350];
    
    // Header Row
    drawThaiText(page, '#', colX[0] + 10, currentY - 15, 11, boldFont, TEXT_COLOR);
    drawThaiText(page, 'ชื่อวัตถุดิบ', colX[1] + 10, currentY - 15, 11, boldFont, TEXT_COLOR);
    drawThaiText(page, 'สัดส่วน (%)', colX[2] + 10, currentY - 15, 11, boldFont, TEXT_COLOR);
    drawThaiText(page, 'ปริมาณ (กรัม)', colX[3] + 10, currentY - 15, 11, boldFont, TEXT_COLOR);
    
    // Background for header
    page.drawRectangle({
        x: MARGIN_LEFT, y: currentY - 20, width: CONTENT_WIDTH, height: 25,
        color: rgb(0.95, 0.92, 0.98), // Very light purple
    });

    // Re-draw text over background
    drawThaiText(page, '#', colX[0] + 10, currentY - 15, 11, boldFont, PRIMARY_COLOR);
    drawThaiText(page, 'ชื่อวัตถุดิบ', colX[1] + 10, currentY - 15, 11, boldFont, PRIMARY_COLOR);
    drawThaiText(page, 'สัดส่วน (%)', colX[2] + 10, currentY - 15, 11, boldFont, PRIMARY_COLOR);
    drawThaiText(page, 'ปริมาณ (กรัม)', colX[3] + 10, currentY - 15, 11, boldFont, PRIMARY_COLOR);

    currentY -= 20;
    
    formula.ingredients.forEach((ing, index) => {
        if (currentY < MARGIN_BOTTOM + 150) {
            // New page if running out of space
            page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
            currentY = A4_HEIGHT - MARGIN_TOP;
        }

        const percent = parseFloat(ing.Qty || 0).toFixed(4);
        const amount = ((parseFloat(formula.BatchSize || 0) * parseFloat(ing.Qty || 0)) / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 4});
        
        // Strip HTML tags if any (e.g. <p>ข้าว</p> -> ข้าว)
        const cleanName = (ing.MaterialName || '').replace(/<[^>]*>?/gm, '').trim();

        drawThaiText(page, `${index + 1}`, colX[0] + 10, currentY - 15, 10, font, TEXT_COLOR);
        drawThaiText(page, cleanName, colX[1] + 10, currentY - 15, 10, font, TEXT_COLOR);
        drawThaiText(page, `${percent}%`, colX[2] + 10, currentY - 15, 10, font, TEXT_COLOR);
        drawThaiText(page, `${amount} กรัม`, colX[3] + 10, currentY - 15, 10, font, PRIMARY_COLOR);
        
        currentY -= rowHeight;
        drawHLine(page, MARGIN_LEFT, currentY, CONTENT_WIDTH, rgb(0.9, 0.9, 0.9));
    });

    currentY -= 30;

    // --- Approval Section ---
    if (currentY < MARGIN_BOTTOM + 200) {
        page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        currentY = A4_HEIGHT - MARGIN_TOP;
    }

    drawThaiText(page, 'ผลการตรวจสอบ (Approval Results)', MARGIN_LEFT, currentY, 14, boldFont, PRIMARY_COLOR);
    currentY -= 20;

    // Pharmacist Status Box
    page.drawRectangle({
        x: MARGIN_LEFT, y: currentY - 50, width: CONTENT_WIDTH, height: 40,
        borderColor: PRIMARY_COLOR, borderWidth: 1, color: rgb(0.98, 0.95, 1.0)
    });
    drawThaiText(page, 'สถานะการอนุมัติสูตร (Pharmacist Approval):', MARGIN_LEFT + 15, currentY - 20, 11, boldFont, TEXT_COLOR);
    
    let pharmStatus = 'รอการอนุมัติ';
    let pColor = TEXT_COLOR;
    if (formula.Status === 'อนุมัติ' || formula.Status === 'ทดลองผลิต') {
        pharmStatus = 'อนุมัติ (Approved)';
        pColor = SUCCESS_COLOR;
    } else if (formula.Status === 'เภสัชกรไม่อนุมัติ') {
        pharmStatus = 'ไม่อนุมัติ (Rejected)';
        pColor = ERROR_COLOR;
    }
    
    drawThaiText(page, pharmStatus, MARGIN_LEFT + 350, currentY - 20, 12, boldFont, pColor);
    drawThaiText(page, `เภสัชกร: ${formula.PharmApprovedBy || formula.ApprovedBy || '-'}  วันที่: ${formula.PharmApprovedDate ? new Date(formula.PharmApprovedDate).toLocaleDateString('th-TH') : (formula.ApprovedDate ? new Date(formula.ApprovedDate).toLocaleDateString('th-TH') : '-')}`, MARGIN_LEFT + 15, currentY - 40, 10, font, rgb(0.4, 0.4, 0.4));

    currentY -= 120;

    // --- Signatures ---
    const sigY = currentY;
    const sigWidth = 180;
    const sigX = MARGIN_LEFT + (CONTENT_WIDTH / 2) - (sigWidth / 2); // Center alignment
    
    drawHLine(page, sigX, sigY, sigWidth);
    drawThaiText(page, '(                                                              )', sigX - 5, sigY - 20, 12, font, TEXT_COLOR);
    drawThaiText(page, 'เภสัชกร (Pharmacist)', sigX + 40, sigY - 40, 12, font, TEXT_COLOR);
    drawThaiText(page, `วันที่: ${new Date().toLocaleDateString('th-TH')}`, sigX + 55, sigY - 60, 10, font, rgb(0.4, 0.4, 0.4));

}

module.exports = { generatePharmApprovePdf };
