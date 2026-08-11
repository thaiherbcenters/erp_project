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
const PRIMARY_COLOR = rgb(0.13, 0.77, 0.37); // Light green for herbal theme
const WARNING_COLOR = rgb(0.96, 0.62, 0.04); // #f59e0b orange
const SUCCESS_COLOR = rgb(0.06, 0.72, 0.51); // #10b981 green

function drawHLine(page, x, y, width, color = LINE_COLOR) {
    page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 1, color });
}

function drawVLine(page, x, y1, y2, color = LINE_COLOR) {
    page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: 1, color });
}

async function generateQcTestReportPdf(pdfDoc, data, font, boldFont, logoBytes = null) {
    let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    let currentY = A4_HEIGHT - MARGIN_TOP;

    const { formula, testResult } = data;

    // --- Header ---
    drawThaiText(page, 'ใบรายงานผลทดสอบสูตร', MARGIN_LEFT, currentY, 20, boldFont, PRIMARY_COLOR);
    drawThaiText(page, '(QC Formula Test Report)', MARGIN_LEFT, currentY - 18, 14, font, PRIMARY_COLOR);
    
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

    // --- Formula Info ---
    const drawInfo = (label, value, x, y, boldLabel = true) => {
        const labelFont = boldLabel ? boldFont : font;
        drawThaiText(page, label, x, y, 14, labelFont, TEXT_COLOR);
        drawThaiText(page, value || '-', x + labelFont.widthOfTextAtSize(label, 14) + 10, y, 14, font, TEXT_COLOR);
    };

    drawInfo('รหัสสูตร:', formula.id, MARGIN_LEFT, currentY);
    drawInfo('หมวดหมู่:', formula.category || 'ทั่วไป', MARGIN_LEFT + 250, currentY);
    currentY -= 25;
    
    drawInfo('ชื่อสูตร:', formula.name, MARGIN_LEFT, currentY);
    drawInfo('เวอร์ชั่น:', formula.version || '1.0', MARGIN_LEFT + 250, currentY);
    currentY -= 25;

    drawInfo('ขนาดต่อ Batch:', `${formula.batchSize ? formula.batchSize.toLocaleString() : '-'} กรัม`, MARGIN_LEFT, currentY);
    drawInfo('ปริมาณบรรจุต่อชิ้น:', `${formula.unitSize || '-'}`, MARGIN_LEFT + 250, currentY);
    currentY -= 35;

    // --- Test Results ---
    drawThaiText(page, 'ผลการตรวจสอบคุณภาพ (Quality Control Results)', MARGIN_LEFT, currentY, 16, boldFont, PRIMARY_COLOR);
    currentY -= 20;

    drawInfo('ค่า pH:', testResult.pH || '-', MARGIN_LEFT, currentY, false);
    drawInfo('ความหนืด (Viscosity):', testResult.viscosity || '-', MARGIN_LEFT + 250, currentY, false);
    currentY -= 25;
    
    drawInfo('สี (Color):', testResult.color || '-', MARGIN_LEFT, currentY, false);
    drawInfo('กลิ่น (Smell):', testResult.smell || '-', MARGIN_LEFT + 250, currentY, false);
    currentY -= 25;
    
    drawInfo('ความคงตัว (Stability):', testResult.stability || '-', MARGIN_LEFT, currentY, false);
    drawInfo('จุลินทรีย์ (Microbial):', testResult.microbial || '-', MARGIN_LEFT + 250, currentY, false);
    currentY -= 35;

    // --- Ingredients Table ---
    const ingredients = formula.ingredients || [];
    drawThaiText(page, `รายการวัตถุดิบ (${ingredients.length} รายการ)`, MARGIN_LEFT, currentY, 16, boldFont, PRIMARY_COLOR);
    currentY -= 20;

    const colX = [MARGIN_LEFT, MARGIN_LEFT + 40, MARGIN_LEFT + 260, MARGIN_LEFT + 380];
    const rowHeight = 25;

    // Table Header
    page.drawRectangle({
        x: MARGIN_LEFT,
        y: currentY - rowHeight + 5,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: rgb(0.95, 0.95, 0.95),
    });

    drawThaiText(page, '#', colX[0] + 10, currentY - 13, 14, boldFont, TEXT_COLOR);
    drawThaiText(page, 'ชื่อวัตถุดิบ', colX[1] + 10, currentY - 13, 14, boldFont, TEXT_COLOR);
    drawThaiText(page, 'สัดส่วน (%)', colX[2] + 10, currentY - 13, 14, boldFont, TEXT_COLOR);
    drawThaiText(page, 'ปริมาณ (กรัม)', colX[3] + 10, currentY - 13, 14, boldFont, PRIMARY_COLOR);

    currentY -= rowHeight;
    drawHLine(page, MARGIN_LEFT, currentY + 5, CONTENT_WIDTH);

    // Table Rows
    ingredients.forEach((item, idx) => {
        const cleanName = item.name ? String(item.name).replace(/<[^>]+>/g, ' ') : '';
        const wrappedNameLines = wrapThaiText(cleanName, 200, 12, boldFont);
        const dynamicRowHeight = Math.max(rowHeight, 10 + (wrappedNameLines.length * 15));

        // Pagination check
        if (currentY - dynamicRowHeight < MARGIN_BOTTOM + 20) {
            page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
            currentY = A4_HEIGHT - MARGIN_TOP;
            
            // Re-draw header on new page
            page.drawRectangle({
                x: MARGIN_LEFT,
                y: currentY - rowHeight + 5,
                width: CONTENT_WIDTH,
                height: rowHeight,
                color: rgb(0.95, 0.95, 0.95),
            });
            drawThaiText(page, '#', colX[0] + 10, currentY - 13, 14, boldFont, TEXT_COLOR);
            drawThaiText(page, 'ชื่อวัตถุดิบ', colX[1] + 10, currentY - 13, 14, boldFont, TEXT_COLOR);
            drawThaiText(page, 'สัดส่วน (%)', colX[2] + 10, currentY - 13, 14, boldFont, TEXT_COLOR);
            drawThaiText(page, 'ปริมาณ (กรัม)', colX[3] + 10, currentY - 13, 14, boldFont, PRIMARY_COLOR);
            currentY -= rowHeight;
            drawHLine(page, MARGIN_LEFT, currentY + 5, CONTENT_WIDTH);
        }

        drawThaiText(page, `${idx + 1}`, colX[0] + 10, currentY - 15, 12, font, TEXT_COLOR);
        
        wrappedNameLines.forEach((line, lineIdx) => {
            drawThaiText(page, line, colX[1] + 10, currentY - 15 - (lineIdx * 15), 12, boldFont, TEXT_COLOR);
        });

        drawThaiText(page, `${Number(item.percent).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`, colX[2] + 10, currentY - 15, 12, font, TEXT_COLOR);
        
        const qtyGrams = (formula.batchSize * Number(item.percent)) / 100;
        drawThaiText(page, `${qtyGrams.toLocaleString(undefined, { maximumFractionDigits: 2 })} กรัม`, colX[3] + 10, currentY - 15, 12, boldFont, PRIMARY_COLOR);

        currentY -= dynamicRowHeight;
        drawHLine(page, MARGIN_LEFT, currentY + 5, CONTENT_WIDTH);
    });

    currentY -= 30;

    // --- Notes ---
    if (testResult.notes) {
        if (currentY < MARGIN_BOTTOM + 200) {
            page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
            currentY = A4_HEIGHT - MARGIN_TOP;
        }
        drawThaiText(page, 'รายละเอียดเพิ่มเติม (Notes):', MARGIN_LEFT, currentY, 14, boldFont, TEXT_COLOR);
        currentY -= 20;
        
        // Very basic multi-line
        const lines = testResult.notes.split('\n');
        lines.forEach(line => {
            drawThaiText(page, line, MARGIN_LEFT + 20, currentY, 12, font, TEXT_COLOR);
            currentY -= 16;
        });
        currentY -= 10;
    }

    // --- Signatures ---
    // Ensure there's space for signature
    if (currentY < MARGIN_BOTTOM + 150) {
        page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        currentY = A4_HEIGHT - MARGIN_TOP;
    }

    currentY -= 30;
    
    // Result Box
    let resultText = 'ไม่ระบุ';
    let resultColor = rgb(0.5, 0.5, 0.5);
    let bgColor = rgb(0.95, 0.95, 0.95);

    if (testResult.overallResult === 'ผ่าน') {
        resultText = 'ผ่าน (Pass)';
        resultColor = SUCCESS_COLOR;
        bgColor = rgb(0.9, 1.0, 0.95);
    } else if (testResult.overallResult === 'ไม่ผ่าน') {
        resultText = 'ไม่ผ่าน (Fail)';
        resultColor = rgb(0.93, 0.26, 0.26); // Red
        bgColor = rgb(1.0, 0.9, 0.9);
    }

    page.drawRectangle({
        x: MARGIN_LEFT,
        y: currentY - 40,
        width: 170,
        height: 60,
        color: bgColor,
        borderColor: resultColor,
        borderWidth: 1.5,
    });
    drawThaiText(page, 'สรุปผลการทดสอบ:', MARGIN_LEFT + 15, currentY - 5, 14, boldFont, TEXT_COLOR);
    drawThaiText(page, resultText, MARGIN_LEFT + 15, currentY - 28, 16, boldFont, resultColor);

    // Signature
    const signX = A4_WIDTH - MARGIN_RIGHT - 200;
    drawThaiText(page, 'ผู้บันทึกผลการทดสอบ', signX, currentY, 14, font, TEXT_COLOR);
    
    currentY -= 40;
    drawHLine(page, signX, currentY, 180, TEXT_COLOR);
    
    currentY -= 25;
    const testerName = testResult?.testedBy ? `(${testResult.testedBy})` : '(......................................................)';
    const nameWidth = font.widthOfTextAtSize(testerName, 14);
    drawThaiText(page, testerName, signX + (180 - nameWidth) / 2, currentY, 14, font, TEXT_COLOR);
    
    currentY -= 20;
    drawThaiText(page, 'แผนกควบคุมคุณภาพ (QC)', signX + 25, currentY, 14, font, TEXT_COLOR);

    currentY -= 20;
    const dateStr = testResult?.date ? new Date(testResult.date).toLocaleDateString('th-TH') : '......./......./.......';
    drawThaiText(page, `วันที่: ${dateStr}`, signX + 45, currentY, 14, font, TEXT_COLOR);

}

module.exports = { generateQcTestReportPdf };
