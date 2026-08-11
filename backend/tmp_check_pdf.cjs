const { poolPromise, sql } = require('./config/db');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const { drawThaiText } = require('./utils/thaiShaper');

const formatDateLocal = (dateObj) => {
    if (!dateObj) return null;
    if (typeof dateObj === 'string') dateObj = new Date(dateObj);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

async function test() {
    try {
        const expId = 9;
        const pool = await poolPromise;
        const expRes = await pool.request()
            .input('id', sql.Int, expId)
            .query('SELECT * FROM RnD_Experiments WHERE ExperimentID = @id');
            
        if (expRes.recordset.length === 0) return console.log('Experiment not found');
        const exp = expRes.recordset[0];
        
        const projRes = await pool.request()
            .input('code', sql.VarChar, exp.ProjectCode)
            .query('SELECT * FROM RnD_Projects WHERE Code = @code');
        const proj = projRes.recordset[0] || { Name: 'ไม่ระบุ', Researcher: 'ไม่ระบุ' };

        // Create PDF
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);
        
        // Load fonts
        const fontPathRegular = path.join(__dirname, './fonts/THSarabunNew.ttf');
        const fontPathBold = path.join(__dirname, './fonts/THSarabunNew-Bold.ttf');
        
        const fontBytesReg = fs.readFileSync(fontPathRegular);
        const fontBytesBold = fs.readFileSync(fontPathBold);
        
        const customFont = await pdfDoc.embedFont(fontBytesReg);
        const customFontBold = await pdfDoc.embedFont(fontBytesBold);
        
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page.getSize();
        
        let currentY = height - 80;
        
        // Header
        drawThaiText(page, 'ใบรับรองความปลอดภัยและผลการทดลอง', width / 2 - 120, currentY, 24, customFontBold, rgb(0,0,0));
        currentY -= 40;
        
        drawThaiText(page, `รหัสการทดลอง: ${exp.Code || exp.ExperimentID}`, 50, currentY, 16, customFontBold, rgb(0,0,0));
        currentY -= 25;
        drawThaiText(page, `ชื่อการทดลอง: ${exp.Name}`, 50, currentY, 16, customFont, rgb(0,0,0));
        currentY -= 25;
        drawThaiText(page, `โครงการ: ${exp.ProjectCode} - ${proj.Name}`, 50, currentY, 16, customFont, rgb(0,0,0));
        currentY -= 25;
        drawThaiText(page, `ผู้ทำการทดลอง: ${proj.Researcher}`, 50, currentY, 16, customFont, rgb(0,0,0));
        currentY -= 25;
        drawThaiText(page, `วันที่ทดลอง: ${formatDateLocal(exp.ExperimentDate)}`, 50, currentY, 16, customFont, rgb(0,0,0));
        currentY -= 35;
        
        drawThaiText(page, 'สูตร/สัดส่วนที่ทดลอง:', 50, currentY, 16, customFontBold, rgb(0,0,0));
        currentY -= 20;
        
        try {
            const recipe = JSON.parse(exp.TrialRecipe || '[]');
            if (Array.isArray(recipe)) {
                for (let i = 0; i < recipe.length; i++) {
                    const item = recipe[i];
                    drawThaiText(page, `- ${item.name}: ${item.qty} ${item.unit}`, 70, currentY, 16, customFont, rgb(0,0,0));
                    currentY -= 20;
                }
            } else {
                drawThaiText(page, exp.TrialRecipe || '-', 70, currentY, 16, customFont, rgb(0,0,0));
                currentY -= 20;
            }
        } catch(e) {
            drawThaiText(page, exp.TrialRecipe || '-', 70, currentY, 16, customFont, rgb(0,0,0));
            currentY -= 20;
        }
        
        currentY -= 15;
        drawThaiText(page, 'ผลลัพธ์การประเมิน:', 50, currentY, 16, customFontBold, rgb(0,0,0));
        currentY -= 25;
        
        const resultText = exp.Result || 'ไม่มีผลลัพธ์';
        const resultColor = resultText === 'ผ่าน' ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0);
        drawThaiText(page, `สถานะ: ${resultText}`, 70, currentY, 16, customFontBold, resultColor);
        currentY -= 25;
        
        drawThaiText(page, `หมายเหตุ: ${exp.Note || '-'}`, 70, currentY, 16, customFont, rgb(0,0,0));
        
        currentY -= 50;
        drawThaiText(page, 'เอกสารนี้รับรองว่าผลิตภัณฑ์ได้ผ่านการทดสอบความปลอดภัยเบื้องต้นแล้ว', 50, currentY, 14, customFont, rgb(0.3,0.3,0.3));
        
        currentY -= 80;
        drawThaiText(page, 'ลงชื่อ.......................................................', width - 250, currentY, 16, customFont, rgb(0,0,0));
        currentY -= 25;
        drawThaiText(page, `(${proj.Researcher})`, width - 210, currentY, 16, customFont, rgb(0,0,0));
        currentY -= 25;
        drawThaiText(page, 'นักวิจัยโครงการ', width - 210, currentY, 16, customFont, rgb(0,0,0));

        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync('test.pdf', pdfBytes);
        console.log('PDF generated successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error generating PDF:', err);
        process.exit(1);
    }
}
test();
