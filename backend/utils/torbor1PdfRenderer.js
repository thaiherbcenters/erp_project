/**
 * TorBor1 Dynamic PDF Renderer
 * 
 * Renders dynamic tables (RecipeActiveIngredients, RecipeExtracts, RecipeExcipients,
 * RelatedManufacturers) for the ทบ.๑ form with unlimited row support and auto-pagination.
 * 
 * Uses drawThaiText from thaiShaper.js for proper Thai text rendering.
 */

const { rgb } = require('pdf-lib');
const { drawThaiText, wrapThaiText, wrapThaiTextRich } = require('./thaiShaper');

// ── A4 Page Constants ──
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN_LEFT = 56;
const MARGIN_RIGHT = 56;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 50;
const CONTENT_WIDTH = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const LINE_COLOR = rgb(0, 0, 0);
const HEADER_BG = rgb(0.93, 0.93, 0.93);
const TEXT_COLOR = rgb(0, 0, 0);

// ── Helper: Draw a horizontal line ──
function drawHLine(page, x, y, width) {
    page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.5, color: LINE_COLOR });
}

// ── Helper: Draw a dotted horizontal line ──
function drawDottedLine(page, x, y, width) {
    page.drawLine({ 
        start: { x, y }, 
        end: { x: x + width, y }, 
        thickness: 0.5, 
        color: LINE_COLOR,
        dashArray: [1, 2]
    });
}

// ── Helper: Draw a vertical line ──
function drawVLine(page, x, y1, y2) {
    page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: 0.5, color: LINE_COLOR });
}

// ── Helper: Draw a rectangle outline ──
function drawRect(page, x, y, w, h) {
    drawHLine(page, x, y + h, w);       // top
    drawHLine(page, x, y, w);           // bottom
    drawVLine(page, x, y, y + h);       // left
    drawVLine(page, x + w, y, y + h);   // right
}

// ── Helper: Draw filled rectangle ──
function drawFilledRect(page, x, y, w, h, color) {
    page.drawRectangle({ x, y, width: w, height: h, color });
}

// ── Helper: Draw multiline text in a cell ──
function drawCellTextMultiline(page, lines, x, y, cellWidth, cellHeight, font, fontSize, boldFont) {
    if (!lines || lines.length === 0) return;
    
    const padding = 3;
    let totalTextHeight = 0;
    const lineInfo = [];
    
    for (const line of lines) {
        let maxLineSize = fontSize;
        if (line && typeof line === 'object' && !Array.isArray(line) && line.chunks) {
            for (const chunk of line.chunks) {
                if (chunk.size && chunk.size > maxLineSize) maxLineSize = chunk.size;
            }
        } else if (Array.isArray(line)) {
            for (const chunk of line) {
                if (chunk.size && chunk.size > maxLineSize) maxLineSize = chunk.size;
            }
        }
        const lh = maxLineSize * 1.3;
        lineInfo.push({ maxLineSize, lh });
        totalTextHeight += lh;
    }
    
    let textY = y + (cellHeight / 2) + (totalTextHeight / 2) - lineInfo[0].lh + (lineInfo[0].maxLineSize * 0.15);
    
    if (totalTextHeight > cellHeight - padding * 2) {
        textY = y + cellHeight - padding - (lineInfo[0].maxLineSize * 0.85);
    }
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lh = lineInfo[i].lh;
        
        if (typeof line === 'string') {
            const str = line;
            let actualSize = fontSize;
            const maxWidth = cellWidth - (padding * 2);
            const textWidth = font.widthOfTextAtSize(str, fontSize);
            if (textWidth > maxWidth && maxWidth > 0) {
                actualSize = fontSize * (maxWidth / textWidth);
            }
            const textX = x + padding;
            drawThaiText(page, str, textX, textY, actualSize, font, TEXT_COLOR);
            textY -= lh;
        } else if (Array.isArray(line)) {
            const maxWidth = cellWidth - (padding * 2);
            let totalWidth = 0;
            for (const chunk of line) {
                const activeFont = (chunk.bold && boldFont) ? boldFont : font;
                const size = chunk.size || fontSize;
                totalWidth += activeFont.widthOfTextAtSize(chunk.text, size);
            }
            
            let actualSize = fontSize;
            let scale = 1;
            if (totalWidth > maxWidth && maxWidth > 0) {
                scale = maxWidth / totalWidth;
            }
            
            let currentX = x + padding;
            for (const chunk of line) {
                const activeFont = (chunk.bold && boldFont) ? boldFont : font;
                const size = (chunk.size || fontSize) * scale;
                drawThaiText(page, chunk.text, currentX, textY, size, activeFont, TEXT_COLOR, chunk.italic);
                currentX += activeFont.widthOfTextAtSize(chunk.text, size);
            }
            textY -= lh;
        } else if (line && typeof line === 'object') {
            const align = line.align || 'left';
            const chunks = line.chunks || [];
            
            const maxWidth = cellWidth - (padding * 2);
            let totalWidth = 0;
            for (const chunk of chunks) {
                const activeFont = (chunk.bold && boldFont) ? boldFont : font;
                const size = chunk.size || fontSize;
                totalWidth += activeFont.widthOfTextAtSize(chunk.text, size);
            }
            
            let scale = 1;
            if (totalWidth > maxWidth && maxWidth > 0) {
                scale = maxWidth / totalWidth;
            }
            
            let currentX = x + padding;
            if (align === 'center') {
                currentX = x + (cellWidth - (totalWidth * scale)) / 2;
            } else if (align === 'right') {
                currentX = x + cellWidth - padding - (totalWidth * scale);
            }
            
            for (const chunk of chunks) {
                const activeFont = (chunk.bold && boldFont) ? boldFont : font;
                const size = (chunk.size || fontSize) * scale;
                drawThaiText(page, chunk.text, currentX, textY, size, activeFont, TEXT_COLOR, chunk.italic);
                currentX += activeFont.widthOfTextAtSize(chunk.text, size);
            }
            textY -= lh;
        }
    }
}

// ── Helper: Draw header cell with background ──
function drawHeaderCell(page, text, x, y, cellWidth, cellHeight, font, fontSize) {
    drawFilledRect(page, x, y, cellWidth, cellHeight, HEADER_BG);
    drawRect(page, x, y, cellWidth, cellHeight);
    
    if (!text) return;
    const str = String(text);
    const textWidth = font.widthOfTextAtSize(str, fontSize);
    
    let actualSize = fontSize;
    const padding = 3;
    const maxWidth = cellWidth - (padding * 2);
    if (textWidth > maxWidth && maxWidth > 0) {
        actualSize = fontSize * (maxWidth / textWidth);
    }
    
    // Center text horizontally and vertically
    const actualWidth = font.widthOfTextAtSize(str, actualSize);
    const textX = x + (cellWidth - actualWidth) / 2;
    const textY = y + (cellHeight / 2) - (actualSize * 0.35);
    
    drawThaiText(page, str, textX, textY, actualSize, font, TEXT_COLOR);
}

// ── Helper: Draw a multi-line header cell ──
function drawHeaderCellMultiLine(page, lines, x, y, cellWidth, cellHeight, font, fontSize) {
    drawFilledRect(page, x, y, cellWidth, cellHeight, HEADER_BG);
    drawRect(page, x, y, cellWidth, cellHeight);
    
    const lineHeight = fontSize * 1.3;
    const totalTextHeight = lines.length * lineHeight;
    let startY = y + (cellHeight / 2) + (totalTextHeight / 2) - lineHeight + (fontSize * 0.15);
    
    for (const line of lines) {
        const str = String(line);
        let actualSize = fontSize;
        const padding = 3;
        const maxWidth = cellWidth - (padding * 2);
        const textWidth = font.widthOfTextAtSize(str, actualSize);
        if (textWidth > maxWidth && maxWidth > 0) {
            actualSize = actualSize * (maxWidth / textWidth);
        }
        const actualWidth = font.widthOfTextAtSize(str, actualSize);
        const textX = x + (cellWidth - actualWidth) / 2;
        drawThaiText(page, str, textX, startY, actualSize, font, TEXT_COLOR);
        startY -= lineHeight;
    }
}

// ── Helper: Check if we need a new page ──
function checkPageBreak(currentY, neededHeight, pdfDoc, pages) {
    if (currentY - neededHeight < MARGIN_BOTTOM) {
        const newPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        pages.push(newPage);
        // Draw page number header
        return { page: newPage, y: A4_HEIGHT - MARGIN_TOP };
    }
    return null;
}

// ── Draw a complete data table ──
function drawDynamicTable(pdfDoc, page, pages, startY, columns, headerTexts, rows, font, boldFont, fontSize, sectionTitle, groupHeader, customHeaderRenderer) {
    let currentPage = page;
    let y = startY;
    
    let maxHeaderLines = 1;
    if (headerTexts) {
        for (const hText of headerTexts) {
            if (Array.isArray(hText)) {
                maxHeaderLines = Math.max(maxHeaderLines, hText.length);
            }
        }
    }
    const headerHeight = Math.max(28, (maxHeaderLines * fontSize * 1.3) + 8);
    const minRowHeight = 16;
    
    // ── Section title (if provided) ──
    if (sectionTitle) {
        const pb = checkPageBreak(y, headerHeight + 30, pdfDoc, pages);
        if (pb) { currentPage = pb.page; y = pb.y; }
        
        drawThaiText(currentPage, sectionTitle, MARGIN_LEFT, y - 12, fontSize + 2, boldFont, TEXT_COLOR);
        y -= 28;
    }
    
    // ── Calculate column widths (proportional) ──
    const totalParts = columns.reduce((sum, col) => sum + col.flex, 0);
    const colWidths = columns.map(col => (col.flex / totalParts) * CONTENT_WIDTH);
    
    // ── Draw table header ──
    const pb = checkPageBreak(y, headerHeight + minRowHeight, pdfDoc, pages);
    if (pb) { currentPage = pb.page; y = pb.y; }
    
    let colX = MARGIN_LEFT;
    if (groupHeader) {
        const groupHeight = 18;
        const totalHeaderHeight = headerHeight + groupHeight;
        
        // Handle page break for taller grouped header
        const pbGroup = checkPageBreak(y + headerHeight, totalHeaderHeight + minRowHeight, pdfDoc, pages);
        if (pbGroup) { currentPage = pbGroup.page; y = pbGroup.y; }

        let groupWidth = 0;
        for (let i = 0; i < groupHeader.spanColumns; i++) groupWidth += colWidths[i];
        
        // Draw group header
        drawFilledRect(currentPage, colX, y - groupHeight, groupWidth, groupHeight, HEADER_BG);
        drawRect(currentPage, colX, y - groupHeight, groupWidth, groupHeight);
        const titleW = boldFont.widthOfTextAtSize(groupHeader.text, fontSize);
        drawThaiText(currentPage, groupHeader.text, colX + (groupWidth - titleW)/2, y - 14, fontSize, boldFont, TEXT_COLOR);
        
        // Draw subheaders for grouped columns
        let subX = colX;
        for (let i = 0; i < groupHeader.spanColumns; i++) {
            const hText = headerTexts[i];
            if (Array.isArray(hText)) {
                drawHeaderCellMultiLine(currentPage, hText, subX, y - totalHeaderHeight, colWidths[i], headerHeight, boldFont, fontSize);
            } else {
                drawHeaderCell(currentPage, hText, subX, y - totalHeaderHeight, colWidths[i], headerHeight, boldFont, fontSize);
            }
            subX += colWidths[i];
        }
        
        // Draw remaining columns spanning full height
        let remX = colX + groupWidth;
        for (let i = groupHeader.spanColumns; i < columns.length; i++) {
            const hText = headerTexts[i];
            drawFilledRect(currentPage, remX, y - totalHeaderHeight, colWidths[i], totalHeaderHeight, HEADER_BG);
            drawRect(currentPage, remX, y - totalHeaderHeight, colWidths[i], totalHeaderHeight);
            
            // Center text vertically and horizontally in the full-height cell
            const w = boldFont.widthOfTextAtSize(hText, fontSize);
            drawThaiText(currentPage, hText, remX + (colWidths[i] - w)/2, y - (totalHeaderHeight/2) + (fontSize/3), fontSize, boldFont, TEXT_COLOR);
            remX += colWidths[i];
        }
        y -= totalHeaderHeight;
    } else {
        if (customHeaderRenderer) {
            y = customHeaderRenderer(currentPage, y, colWidths, font, boldFont, fontSize);
        } else if (headerTexts) {
            let colX = MARGIN_LEFT;
            for (let i = 0; i < columns.length; i++) {
                const headerText = headerTexts[i];
                if (Array.isArray(headerText)) {
                    drawHeaderCellMultiLine(currentPage, headerText, colX, y - headerHeight, colWidths[i], headerHeight, boldFont, fontSize);
                } else {
                    drawHeaderCell(currentPage, headerText, colX, y - headerHeight, colWidths[i], headerHeight, boldFont, fontSize);
                }
                colX += colWidths[i];
            }
            y -= headerHeight;
        }
    }
    
    // ── Draw data rows ──
    if (rows.length === 0) {
        // Draw one empty row
        const rowHeight = 16;
        colX = MARGIN_LEFT;
        for (let i = 0; i < columns.length; i++) {
            drawRect(currentPage, colX, y - rowHeight, colWidths[i], rowHeight);
            colX += colWidths[i];
        }
        y -= rowHeight;
    } else {
        for (const row of rows) {
            // Calculate required row height based on multiline text
            const cellLines = [];
            let maxLines = 1;
            for (let i = 0; i < columns.length; i++) {
                const text = row[columns[i].key];
                let rawText = String(text || '');
                const maxWidthForWrap = columns[i].singleLine ? 9999 : (colWidths[i] - 12);
                const lines = wrapThaiTextRich(rawText, maxWidthForWrap, fontSize, font, boldFont);
                cellLines.push(lines);
                if (lines.length > maxLines) {
                    maxLines = lines.length;
                }
            }
            
            const rowHeight = Math.max(16, (maxLines * (fontSize * 1.3)) + 6);
            
            const pbRow = checkPageBreak(y, rowHeight, pdfDoc, pages);
            if (pbRow) { 
                currentPage = pbRow.page; 
                y = pbRow.y;
                // Re-draw table header on new page
                if (customHeaderRenderer) {
                    y = customHeaderRenderer(currentPage, y, colWidths, font, boldFont, fontSize);
                } else if (headerTexts) {
                    colX = MARGIN_LEFT;
                    for (let i = 0; i < columns.length; i++) {
                        const headerText = headerTexts[i];
                        if (Array.isArray(headerText)) {
                            drawHeaderCellMultiLine(currentPage, headerText, colX, y - headerHeight, colWidths[i], headerHeight, boldFont, fontSize);
                        } else {
                            drawHeaderCell(currentPage, headerText, colX, y - headerHeight, colWidths[i], headerHeight, boldFont, fontSize);
                        }
                        colX += colWidths[i];
                    }
                    y -= headerHeight;
                }
            }
            
            colX = MARGIN_LEFT;
            for (let i = 0; i < columns.length; i++) {
                drawRect(currentPage, colX, y - rowHeight, colWidths[i], rowHeight);
                drawCellTextMultiline(currentPage, cellLines[i], colX, y - rowHeight, colWidths[i], rowHeight, font, fontSize, boldFont);
                colX += colWidths[i];
            }
            y -= rowHeight;
        }
    }
    
    return { page: currentPage, y };
}

// ── Draw page number centered at bottom ──
function drawPageNumber(page, pageNum, font) {
    const text = `–${pageNum}–`;
    const textWidth = font.widthOfTextAtSize(text, 14);
    drawThaiText(page, text, (A4_WIDTH - textWidth) / 2, 25, 14, font, TEXT_COLOR);
}

// ── Draw the scalar header fields of Section 4 (ตำรับ) ──
function drawRecipeScalarFields(page, y, data, font, boldFont, fontSize) {
    const labelSize = fontSize;
    const valueSize = fontSize + 1;
    
    drawThaiText(page, '๔. รายละเอียดของตำรับผลิตภัณฑ์สมุนไพร', MARGIN_LEFT, y, labelSize + 2, boldFont, TEXT_COLOR);
    y -= 24;
    
    // ชื่อภาษาไทย
    const lblThai = 'ชื่อภาษาไทย';
    drawThaiText(page, lblThai, MARGIN_LEFT + 20, y, labelSize, font, TEXT_COLOR);
    const thaiNameX = MARGIN_LEFT + 20 + font.widthOfTextAtSize(lblThai, labelSize) + 5;
    drawThaiText(page, data.ProductNameThai || '', thaiNameX + 5, y, valueSize, boldFont, TEXT_COLOR);
    drawDottedLine(page, thaiNameX, y - 2, CONTENT_WIDTH - (thaiNameX - MARGIN_LEFT));
    y -= 22;
    
    // ชื่อภาษาอังกฤษ
    const lblEng = 'ชื่อภาษาอังกฤษ (ถ้ามี)';
    drawThaiText(page, lblEng, MARGIN_LEFT + 20, y, labelSize, font, TEXT_COLOR);
    const engNameX = MARGIN_LEFT + 20 + font.widthOfTextAtSize(lblEng, labelSize) + 5;
    drawThaiText(page, data.ProductNameEng || '', engNameX + 5, y, valueSize, boldFont, TEXT_COLOR);
    drawDottedLine(page, engNameX, y - 2, CONTENT_WIDTH - (engNameX - MARGIN_LEFT));
    y -= 22;
    
    // ชื่อภาษาต่างประเทศอื่นๆ
    const lblOther = 'ชื่อภาษาต่างประเทศอื่นๆ (ถ้ามี)';
    drawThaiText(page, lblOther, MARGIN_LEFT + 20, y, labelSize, font, TEXT_COLOR);
    const otherNameX = MARGIN_LEFT + 20 + font.widthOfTextAtSize(lblOther, labelSize) + 5;
    drawThaiText(page, data.RecipeOtherName || '', otherNameX + 5, y, valueSize, boldFont, TEXT_COLOR);
    drawDottedLine(page, otherNameX, y - 2, CONTENT_WIDTH - (otherNameX - MARGIN_LEFT));
    y -= 22;
    
    // รูปแบบ
    const lblFormat = 'รูปแบบ';
    drawThaiText(page, lblFormat, MARGIN_LEFT + 20, y, labelSize, font, TEXT_COLOR);
    const formatX = MARGIN_LEFT + 20 + font.widthOfTextAtSize(lblFormat, labelSize) + 5;
    drawThaiText(page, data.RecipeFormat || '', formatX + 5, y, valueSize, boldFont, TEXT_COLOR);
    drawDottedLine(page, formatX, y - 2, CONTENT_WIDTH - (formatX - MARGIN_LEFT));
    y -= 22;
    
    // ในตำรับนี้
    const lblQty = 'ในตำรับนี้';
    drawThaiText(page, lblQty, MARGIN_LEFT + 20, y, labelSize, font, TEXT_COLOR);
    const qtyX = MARGIN_LEFT + 20 + font.widthOfTextAtSize(lblQty, labelSize) + 5;
    drawThaiText(page, data.RecipeQuantity || '', qtyX + 5, y, valueSize, boldFont, TEXT_COLOR);
    
    const afterQtyLabel = '(ระบุปริมาณและหน่วยของผลิตภัณฑ์สำเร็จรูปต่อรุ่นการผลิต โดยแสดงเป็นระบบเมตริก)';
    const afterQtyWidth = font.widthOfTextAtSize(afterQtyLabel, valueSize - 2);
    const afterQtyX = (MARGIN_LEFT + CONTENT_WIDTH) - afterQtyWidth;
    
    drawDottedLine(page, qtyX, y - 2, afterQtyX - qtyX - 5);
    drawThaiText(page, afterQtyLabel, afterQtyX, y, valueSize - 2, font, TEXT_COLOR);
    y -= 22;
    
    // มีวัตถุอันเป็นส่วนประกอบ คือ
    drawThaiText(page, 'มีวัตถุอันเป็นส่วนประกอบ คือ', MARGIN_LEFT + 20, y, labelSize, font, TEXT_COLOR);
    y -= 18;
    
    return y;
}

/**
 * Main entry point: Render TorBor1 Page 3 (dynamic recipe tables)
 * 
 * @param {PDFDocument} pdfDoc - The pdf-lib PDFDocument 
 * @param {Object} font - Regular font (Sarabun)
 * @param {Object} boldFont - Bold font (Sarabun Bold)
 * @param {Object} data - Document data from DB (parsed JSON fields)
 * @returns {PDFPage[]} Array of newly created pages to insert
 */
function renderTorbor1Page3(pdfDoc, font, boldFont, data) {
    const pages = [];
    const fontSize = 16;
    
    // Create first page
    const firstPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    pages.push(firstPage);
    
    let currentPage = firstPage;
    let y = A4_HEIGHT - MARGIN_TOP;
    
    // Draw page header
    drawThaiText(currentPage, '–๓–', (A4_WIDTH - font.widthOfTextAtSize('–๓–', 14)) / 2, y, 14, font, TEXT_COLOR);
    y -= 28;
    
    // ── Scalar Fields ──
    y = drawRecipeScalarFields(currentPage, y, data, font, boldFont, fontSize);
    y -= 6;
    
    // ── Table 1: ชื่อสมุนไพร ──
    const ingredientColumns = [
        { key: 'thaiName', flex: 1.8, singleLine: true },
        { key: 'engName', flex: 2.2, singleLine: true },
        { key: 'latinName', flex: 2.8, singleLine: true },
        { key: 'partUsed', flex: 1.1, singleLine: true },
        { key: 'quantity', flex: 1.1, singleLine: true }
    ];
    const ingredientHeaders = [
        'ชื่อภาษาไทย',
        'ชื่อภาษาอังกฤษ (ถ้ามี)',
        'ชื่อวิทยาศาสตร์/ชื่อละติน (ถ้ามี)',
        'ส่วนที่ใช้',
        'ปริมาณ'
    ];
    
    let ingredients = [];
    try { ingredients = typeof data.RecipeActiveIngredients === 'string' ? JSON.parse(data.RecipeActiveIngredients) : (data.RecipeActiveIngredients || []); } catch(e) { ingredients = []; }
    
    const result1 = drawDynamicTable(pdfDoc, currentPage, pages, y, ingredientColumns, ingredientHeaders, ingredients, font, boldFont, fontSize, null, { text: 'ชื่อสมุนไพร (พืช / สัตว์ / จุลชีพ / แร่)', spanColumns: 3 });
    currentPage = result1.page;
    y = result1.y;
    
    // ── หมายเหตุ ──
    y -= 16;
    const pb2 = checkPageBreak(y, 30, pdfDoc, pages);
    if (pb2) { currentPage = pb2.page; y = pb2.y; }
    
    const noteText = 'หมายเหตุ – กรณีสมุนไพรสำคัญ ให้แจ้งชื่อสารสำคัญในช่องชื่อภาษาอังกฤษ และอัตราส่วนที่ใช้ต่อรูปแบบผลิตภัณฑ์ที่พร้อมจำหน่าย';
    let noteSize = fontSize - 2;
    const maxNoteWidth = CONTENT_WIDTH - 20;
    const currentNoteWidth = font.widthOfTextAtSize(noteText, noteSize);
    if (currentNoteWidth > maxNoteWidth) {
        noteSize = noteSize * (maxNoteWidth / currentNoteWidth);
    }
    drawThaiText(currentPage, noteText, MARGIN_LEFT + 20, y, noteSize, font, TEXT_COLOR);
    y -= 18;
    
    // ── Table 2: กรณีเป็นสารสกัด ──
    const extractColumns = [
        { key: 'extractName', flex: 2, singleLine: true },
        { key: 'latinName', flex: 2, singleLine: true },
        { key: 'partUsed', flex: 1.5, singleLine: true },
        { key: 'solvent', flex: 1.5, singleLine: true },
        { key: 'ratio', flex: 2, singleLine: true },
        { key: 'quantity', flex: 1.5, singleLine: true }
    ];
    const extractHeaders = [
        ['ชื่อสารสกัดพืช/', 'สัตว์'],
        ['ชื่อวิทยาศาสตร์', '(พืช/สัตว์)'],
        'ส่วนที่ใช้',
        'ตัวทำละลาย',
        ['อัตราส่วน (พืช/สัตว์ :', 'ปริมาณตัวทำละลาย)'],
        'ปริมาณสารสกัด'
    ];
    
    let extracts = [];
    try { extracts = typeof data.RecipeExtracts === 'string' ? JSON.parse(data.RecipeExtracts) : (data.RecipeExtracts || []); } catch(e) { extracts = []; }
    
    const result2 = drawDynamicTable(pdfDoc, currentPage, pages, y, extractColumns, extractHeaders, extracts, font, boldFont, fontSize, 'กรณีเป็นสารสกัด ให้แจ้งรายละเอียดในตารางข้างล่าง');
    currentPage = result2.page;
    y = result2.y;
    y -= 25; // Increased spacing between tables
    
    // ── Table 3: ชื่อสารช่วย ──
    const excipientColumns = [
        { key: 'name', flex: 3, singleLine: true },
        { key: 'casNumber', flex: 2, singleLine: true },
        { key: 'function', flex: 2.5, singleLine: true },
        { key: 'quantity', flex: 2, singleLine: true }
    ];
    const excipientHeaders = [
        ['ชื่อภาษาไทย/ชื่อภาษาอังกฤษ'],
        ['CAS number (ถ้ามี)'],
        'หน้าที่',
        'ปริมาณ'
    ];
    
    let excipients = [];
    try { excipients = typeof data.RecipeExcipients === 'string' ? JSON.parse(data.RecipeExcipients) : (data.RecipeExcipients || []); } catch(e) { excipients = []; }
    
    // Draw section title for excipients table (merged header)
    const excipientHeaderRenderer = (page, currentY, colWidths, font, boldFont, fontSize) => {
        const topRowH = 20;
        const botRowH = 28;
        const w1 = colWidths[0];
        const w2 = colWidths[1];
        const w3 = colWidths[2];
        const w4 = colWidths[3];
        
        // "ชื่อสารช่วย" spans col 1 and 2, height 20
        drawHeaderCell(page, 'ชื่อสารช่วย', MARGIN_LEFT, currentY - topRowH, w1 + w2, topRowH, boldFont, fontSize);
        
        // "หน้าที่" spans col 3, height 20+36 = 56
        drawHeaderCell(page, 'หน้าที่', MARGIN_LEFT + w1 + w2, currentY - (topRowH + botRowH), w3, topRowH + botRowH, boldFont, fontSize);
        
        // "ปริมาณ" spans col 4, height 20+36 = 56
        drawHeaderCell(page, 'ปริมาณ', MARGIN_LEFT + w1 + w2 + w3, currentY - (topRowH + botRowH), w4, topRowH + botRowH, boldFont, fontSize);
        
        // Bottom row for col 1 and 2
        drawHeaderCell(page, 'ชื่อภาษาไทย/ชื่อภาษาอังกฤษ', MARGIN_LEFT, currentY - topRowH - botRowH, w1, botRowH, boldFont, fontSize);
        drawHeaderCell(page, 'CAS number (ถ้ามี)', MARGIN_LEFT + w1, currentY - topRowH - botRowH, w2, botRowH, boldFont, fontSize);
        
        return currentY - (topRowH + botRowH);
    };
    
    const result3 = drawDynamicTable(pdfDoc, currentPage, pages, y, excipientColumns, null, excipients, font, boldFont, fontSize, null, null, excipientHeaderRenderer);
    currentPage = result3.page;
    y = result3.y;
    
    return pages;
}

/**
 * Render RelatedManufacturers dynamic table on Page 2
 * This draws over the existing hardcoded table area.
 * 
 * @param {PDFPage} page - The existing page 2 from the template
 * @param {Object} font - Regular font
 * @param {Object} boldFont - Bold font
 * @param {Object} data - Document data from DB
 * @param {number} p2w - Page width
 * @param {number} p2h - Page height
 */
function renderRelatedManufacturersOnPage2(page, font, boldFont, data, p2w, p2h) {
    const fontSize = 16;
    
    // Data processing
    let manufacturers = [];
    try { manufacturers = typeof data.RelatedManufacturers === 'string' ? JSON.parse(data.RelatedManufacturers) : (data.RelatedManufacturers || []); } catch(e) { manufacturers = []; }
    
    if (manufacturers.length <= 2) return; // Default template handles up to 2 rows, no action needed
    
    // White-out the existing 2-row table area on page 2
    // The hardcoded area is approximately yPercent 70% to 92% (from config analysis)
    const whiteoutY = p2h * (1 - 0.92);
    const whiteoutH = p2h * (0.92 - 0.70);
    page.drawRectangle({
        x: MARGIN_LEFT - 5,
        y: whiteoutY,
        width: p2w - MARGIN_LEFT * 2 + 10,
        height: whiteoutH,
        color: rgb(1, 1, 1), // white
    });
    
    // Now re-draw the table dynamically
    const columns = [
        { key: 'name', flex: 3 },
        { key: 'licenseNo', flex: 2.5 },
        { key: 'responsibility', flex: 4 }
    ];
    const headers = [
        'ชื่อผู้ผลิต',
        'เลขที่ใบอนุญาต',
        'หน้าที่ความรับผิดชอบ'
    ];
    
    const tableWidth = p2w - MARGIN_LEFT * 2;
    const totalParts = columns.reduce((sum, col) => sum + col.flex, 0);
    const colWidths = columns.map(col => (col.flex / totalParts) * tableWidth);
    const headerHeight = 24;
    
    let y = p2h * (1 - 0.70); // Start from top of the area
    
    // Draw title
    drawThaiText(page, 'ผู้ผลิตอื่นที่เกี่ยวข้อง (ถ้ามี)', MARGIN_LEFT, y + 14, fontSize + 1, boldFont, TEXT_COLOR);
    
    // Draw header
    let colX = MARGIN_LEFT;
    for (let i = 0; i < columns.length; i++) {
        drawHeaderCell(page, headers[i], colX, y - headerHeight, colWidths[i], headerHeight, boldFont, fontSize);
        colX += colWidths[i];
    }
    y -= headerHeight;
    
    // Draw rows (limited by available space, since we can't add pages to an existing template page)
    for (let r = 0; r < manufacturers.length; r++) {
        const row = manufacturers[r];
        
        // Calculate row height
        const cellLines = [];
        let maxLines = 1;
        for (let i = 0; i < columns.length; i++) {
            const text = row[columns[i].key];
            const lines = wrapThaiTextRich(String(text || ''), colWidths[i] - 8, fontSize, font, boldFont);
            cellLines.push(lines);
            if (lines.length > maxLines) {
                maxLines = lines.length;
            }
        }
        
        const rowHeight = Math.max(16, (maxLines * (fontSize * 1.3)) + 6);
        
        if (y - rowHeight < whiteoutY) break; // Out of space in the whiteout area
        
        colX = MARGIN_LEFT;
        for (let i = 0; i < columns.length; i++) {
            drawRect(page, colX, y - rowHeight, colWidths[i], rowHeight);
            drawCellTextMultiline(page, cellLines[i], colX, y - rowHeight, colWidths[i], rowHeight, font, fontSize, boldFont);
            colX += colWidths[i];
        }
        y -= rowHeight;
    }
}

// ── Helper to convert Arabic numerals to Thai numerals ──
function toThaiNumeral(num) {
    const thaiNums = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return String(num).split('').map(digit => thaiNums[digit] || digit).join('');
}

// ── Render Section 5 (Page 4 and 5) ──
function renderTorbor1Page4And5(pdfDoc, font, boldFont, dingbatsFont, data) {
    let currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    let y = A4_HEIGHT - MARGIN_TOP;
    let pageNum = 4; // Start at 4, assuming page 3 was just rendered
    
    // Header for page 4
    const thaiPageNum = toThaiNumeral(pageNum);
    drawThaiText(currentPage, `–${thaiPageNum}–`, (A4_WIDTH - font.widthOfTextAtSize(`–${thaiPageNum}–`, 14)) / 2, y, 14, font, TEXT_COLOR);
    y -= 28;

    const fontSize = 16;
    drawThaiText(currentPage, '๕. รายละเอียดของผลิตภัณฑ์สมุนไพร', MARGIN_LEFT, y, fontSize + 2, boldFont, TEXT_COLOR);
    y -= 24;

    // Table Header
    const cellWidth = CONTENT_WIDTH;
    const headerHeight = 28;
    drawFilledRect(currentPage, MARGIN_LEFT, y - headerHeight, cellWidth, headerHeight, HEADER_BG);
    drawRect(currentPage, MARGIN_LEFT, y - headerHeight, cellWidth, headerHeight);
    const headerText = 'รายการของผลิตภัณฑ์';
    const hw = boldFont.widthOfTextAtSize(headerText, 16);
    drawThaiText(currentPage, headerText, MARGIN_LEFT + (cellWidth - hw)/2, y - headerHeight + 8, 16, boldFont, TEXT_COLOR);
    y -= headerHeight;

    let fields = [];
    const standardTitles = {
        'ProductAppearance': 'ลักษณะ',
        'ProductPackSize': 'ขนาดบรรจุ',
        'ProductMfgProcess': 'กรรมวิธีการผลิต',
        'ProductIndication': 'สรรพคุณ/ข้อบ่งใช้/ ข้อความกล่าวอ้างทางสุขภาพ',
        'ProductDosage': 'ขนาดและวิธีการใช้',
        'ProductPreparation': 'วิธีเตรียมก่อนรับประทาน',
        'ProductCondition': 'เงื่อนไขการรับประทาน',
        'ProductStorage': 'การเก็บรักษา / อายุการเก็บรักษา',
        'ProductContraindication': 'ข้อห้ามใช้',
        'ProductWarning': 'คำเตือน',
        'ProductPrecaution': 'ข้อควรระวัง',
        'ProductAdverseReaction': 'อาการไม่พึงประสงค์'
    };

    let order = null;
    if (data.Section5FieldOrder) {
        order = typeof data.Section5FieldOrder === 'string' ? JSON.parse(data.Section5FieldOrder) : data.Section5FieldOrder;
    }

    if (order && Array.isArray(order) && order.length > 0) {
        order.forEach((meta) => {
            if (meta.type === 'standard') {
                fields.push({ title: meta.customTitle || standardTitles[meta.key] || meta.key, key: meta.key });
            } else if (meta.type === 'custom') {
                const dynamicKey = `CustomProductDetails_${meta.id}`;
                data[dynamicKey] = meta.content;
                fields.push({ title: meta.title, key: dynamicKey });
            }
        });
    } else {
        // Fallback for old documents
        Object.keys(standardTitles).forEach(key => {
            fields.push({ title: standardTitles[key], key });
        });
        if (data.CustomProductDetails) {
            let customArr = typeof data.CustomProductDetails === 'string' ? JSON.parse(data.CustomProductDetails) : data.CustomProductDetails;
            if (Array.isArray(customArr)) {
                customArr.forEach((custom, index) => {
                    if (custom.title && custom.title.trim() !== '') {
                        const dynamicKey = `CustomProductDetails_fallback_${index}`;
                        data[dynamicKey] = custom.content;
                        fields.push({ title: custom.title, key: dynamicKey });
                    }
                });
            }
        }
    }
    
    fields.push(
        { title: 'ช่องทางการขาย (สำหรับเจ้าหน้าที่กรอก)', key: 'SalesChannel', isCheckboxes: true },
        { title: 'บทสรุป ด้านคุณภาพ ความปลอดภัย และประสิทธิภาพ', key: 'ProductSummary' }
    );

    for (const field of fields) {
        const titleHeight = fontSize * 1.3;
        let contentLines = [];
        
        if (!field.isCheckboxes) {
            let text = String(data[field.key] || '');
            // Convert plain text newlines to <p> tags if it's not already HTML
            if (text && !text.match(/<p\b/i)) {
                text = text.split('\n').map(line => `<p>${line}</p>`).join('');
            }
            contentLines = wrapThaiTextRich(text, cellWidth - 12, fontSize, font, boldFont);
        }
        
        // Determine required height to start the field
        let requiredHeight = titleHeight + 16; // just title + padding
        if (field.isCheckboxes) {
            requiredHeight = titleHeight + 8 + (3 * (fontSize * 1.3)) + 8; // title + checkboxes + padding
        }
        
        // Check if there's enough space
        if (y - requiredHeight < MARGIN_BOTTOM) {
            currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
            y = A4_HEIGHT - MARGIN_TOP;
            pageNum++;
            const thaiPageNum = toThaiNumeral(pageNum);
            drawThaiText(currentPage, `–${thaiPageNum}–`, (A4_WIDTH - font.widthOfTextAtSize(`–${thaiPageNum}–`, 14)) / 2, y, 14, font, TEXT_COLOR);
            y -= 28;
        }
        
        let cellStartY = y; // Record where this cell starts on this page
        
        // Draw title
        let textY = y - 8 - (fontSize * 0.85); // base line calculation
        drawThaiText(currentPage, field.title, MARGIN_LEFT + 6, textY + 1, fontSize, boldFont, TEXT_COLOR); // +1 y-offset for Thai font
        y -= (titleHeight + 8); // Consume title height + top padding
        
        // Draw content
        if (field.isCheckboxes) {
            const checkHeight = 3 * (fontSize * 1.3);
            const options = ['ผลิตภัณฑ์สมุนไพรขายทั่วไป', 'ผลิตภัณฑ์ขายในสถานที่มีใบอนุญาต', 'ผลิตภัณฑ์ใช้เฉพาะสถานพยาบาล'];
            let boxY = y - (fontSize * 0.85);
            for (const opt of options) {
                drawRect(currentPage, MARGIN_LEFT + 12, boxY - 2, 12, 12);
                if (data.SalesChannel === opt) {
                    drawThaiText(currentPage, '\u2714', MARGIN_LEFT + 12 + 1, boxY + 1, 14, dingbatsFont, TEXT_COLOR);
                }
                drawThaiText(currentPage, opt, MARGIN_LEFT + 32, boxY + 1, fontSize, font, TEXT_COLOR);
                boxY -= (fontSize * 1.3);
            }
            y -= checkHeight;
        } else {
            if (contentLines.length === 0) {
                 if (y - (fontSize * 1.3) < MARGIN_BOTTOM) {
                     drawRect(currentPage, MARGIN_LEFT, MARGIN_BOTTOM, cellWidth, cellStartY - MARGIN_BOTTOM);
                     currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
                     y = A4_HEIGHT - MARGIN_TOP;
                     pageNum++;
                     const thaiPageNum = toThaiNumeral(pageNum);
                     drawThaiText(currentPage, `–${thaiPageNum}–`, (A4_WIDTH - font.widthOfTextAtSize(`–${thaiPageNum}–`, 14)) / 2, y, 14, font, TEXT_COLOR);
                     y -= 28;
                     cellStartY = y;
                 }
                 y -= (fontSize * 1.3);
            } else {
                let isTopOfPage = false; // Track if we just started a new page mid-cell
                for (const line of contentLines) {
                    if (y - (fontSize * 1.3) < MARGIN_BOTTOM) {
                        drawRect(currentPage, MARGIN_LEFT, MARGIN_BOTTOM, cellWidth, cellStartY - MARGIN_BOTTOM); // Close cell
                        
                        currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
                        y = A4_HEIGHT - MARGIN_TOP;
                        pageNum++;
                        const thaiPageNum = toThaiNumeral(pageNum);
                        drawThaiText(currentPage, `–${thaiPageNum}–`, (A4_WIDTH - font.widthOfTextAtSize(`–${thaiPageNum}–`, 14)) / 2, y, 14, font, TEXT_COLOR);
                        y -= 28;
                        
                        cellStartY = y; // new start
                        isTopOfPage = true;
                    }
                    
                    // Check if line is empty
                    let isEmpty = false;
                    let lineChunks = [];
                    let align = 'left';

                    if (typeof line === 'string') {
                        isEmpty = line.trim() === '';
                        lineChunks = [{ text: line, bold: false, italic: false, size: null }];
                    } else if (Array.isArray(line)) {
                        isEmpty = line.every(chunk => chunk.text.trim() === '');
                        lineChunks = line;
                    } else if (line && typeof line === 'object') {
                        align = line.align || 'left';
                        lineChunks = line.chunks || [];
                        isEmpty = lineChunks.length === 0 || lineChunks.every(chunk => chunk.text.trim() === '');
                    }
                    
                    // Skip empty lines if they appear at the very top of a new page inside a cell
                    if (isTopOfPage && isEmpty) {
                        continue;
                    }
                    isTopOfPage = false; // Once we hit a non-empty line (or draw something), it's no longer the top
                    
                    let lineY = y - (fontSize * 0.85);
                    
                    if (!isEmpty) {
                        // Calculate total width for alignment
                        let totalWidth = 0;
                        for (const chunk of lineChunks) {
                            const actF = chunk.bold ? boldFont : font;
                            const size = chunk.size || fontSize;
                            totalWidth += actF.widthOfTextAtSize(chunk.text, size);
                        }
                        
                        let curX = MARGIN_LEFT + 6;
                        if (align === 'center') {
                            curX = MARGIN_LEFT + (cellWidth - totalWidth) / 2;
                        } else if (align === 'right') {
                            curX = MARGIN_LEFT + cellWidth - 6 - totalWidth;
                        }

                        for (const chunk of lineChunks) {
                            const actF = chunk.bold ? boldFont : font;
                            const size = chunk.size || fontSize;
                            drawThaiText(currentPage, chunk.text, curX, lineY + 1, size, actF, TEXT_COLOR, chunk.italic);
                            curX += actF.widthOfTextAtSize(chunk.text, size);
                        }
                    }
                    y -= (fontSize * 1.3);
                }
            }
        }
        
        // Add bottom padding
        y -= 8;
        
        // Draw the final border for whatever is left on this page
        drawRect(currentPage, MARGIN_LEFT, y, cellWidth, cellStartY - y);
    }
    
    // ── Draw Annex Text ("ข้าพเจ้าได้แนบหลักฐาน...") ──
    y -= 24; // Extra spacing after table
    
    const annexLines = [
        { text: 'ข้าพเจ้าได้แนบหลักฐานมาด้วย คือ', bold: true, indent: 0 },
        { text: '(๑) หนังสือรับรองการว่าจ้างระหว่างผู้ยื่นคำขอและผู้รับจ้างกรณีที่เป็นผู้ว่าจ้างผลิต หรือนำเข้าผลิตภัณฑ์สมุนไพร เฉพาะกรณีรับจ้างผลิต หรือนำเข้า', bold: false, indent: 30 },
        { text: '(๒) เอกสารแสดงว่าเป็นผู้มีอำนาจทำการแทน (กรณีมอบอำนาจ) หรือเป็นผู้แทนนิติบุคคลหรือผู้มีอำนาจทำการแทนนิติบุคคล (กรณีนิติบุคคลเป็นผู้ขออนุญาต)', bold: false, indent: 30 },
        { text: '(๓) สำเนาหนังสือเดินทาง สำเนาใบอนุญาตทำงาน สำเนาถิ่นที่อยู่ในราชอาณาจักร สำเนาใบอนุญาตประกอบธุรกิจคนต่างด้าวของผู้ขอขึ้นทะเบียนตำรับ สำหรับคนต่างด้าว (เฉพาะกรณีที่ไม่ได้แสดงตนด้วยตนเอง)', bold: false, indent: 30 },
        { text: '(๔) ตัวอย่างผลิตภัณฑ์สมุนไพร', bold: false, indent: 30 },
        { text: '(๕) รูปถ่ายลักษณะผลิตภัณฑ์สมุนไพร', bold: false, indent: 30 },
        { text: '(๖) หลักฐานแสดงข้อมูลด้านวิชาการของผลิตภัณฑ์', bold: false, indent: 30 },
        { text: '      (๖.๑) เอกสารด้านคุณภาพ', bold: false, indent: 50 },
        { text: '      (๖.๒) เอกสารด้านความปลอดภัย', bold: false, indent: 50 },
        { text: '      (๖.๓) เอกสารด้านประสิทธิภาพ', bold: false, indent: 50 },
        { text: '      (๖.๔) ฉลากและเอกสารกำกับผลิตภัณฑ์', bold: false, indent: 50 },
        { text: '      (๖.๕) หนังสือรับรองการอนุญาตให้ขายหรือการขึ้นทะเบียนตำรับ เฉพาะกรณีที่เป็นการนำเข้า', bold: false, indent: 50 },
        { text: '      (๖.๖) หนังสือรับรองมาตรฐานการผลิตหรือเอกสารอื่นที่เกี่ยวข้อง', bold: false, indent: 50 },
        { text: '(๗) หลักฐานอื่น ๆ ตามมาตรา ๓๖ (๑๑)', bold: false, indent: 30 },
        { text: '(๘) หนังสือให้ความยินยอมตามที่สำนักงานคณะกรรมการอาหารและยากำหนด', bold: false, indent: 30 },
        { text: '(๙) หนังสือคำรับรองสำหรับผู้รับใบสำคัญการขึ้นทะเบียนตำรับ ใบรับแจ้งรายละเอียด และใบรับจดแจ้งผลิตภัณฑ์สมุนไพร สำหรับการดำเนินการติดตามความปลอดภัยจากผลิตภัณฑ์สมุนไพร', bold: false, indent: 30 }
    ];

    const annexFontSize = 15;
    for (const item of annexLines) {
        const lines = wrapThaiText(item.text, cellWidth - item.indent, annexFontSize, font);
        
        if (y - (lines.length * (annexFontSize * 1.3)) < MARGIN_BOTTOM) {
            currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
            y = A4_HEIGHT - MARGIN_TOP;
            pageNum++;
            const thaiPageNum = toThaiNumeral(pageNum);
            drawThaiText(currentPage, `–${thaiPageNum}–`, (A4_WIDTH - font.widthOfTextAtSize(`–${thaiPageNum}–`, 14)) / 2, y, 14, font, TEXT_COLOR);
            y -= 28;
        }
        
        for (const line of lines) {
            drawThaiText(currentPage, line, MARGIN_LEFT + item.indent, y, annexFontSize, item.bold ? boldFont : font, TEXT_COLOR);
            y -= (annexFontSize * 1.3);
        }
        y -= 4; // spacing between items
    }
}

module.exports = {
    renderTorbor1Page3,
    renderTorbor1Page4And5,
    renderRelatedManufacturersOnPage2
};
