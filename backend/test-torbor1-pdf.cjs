/**
 * Quick test: Generate a standalone PDF with dynamic tables
 * Run: node test-torbor1-pdf.cjs
 */
const { PDFDocument } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const { renderTorbor1Page3 } = require('./utils/torbor1PdfRenderer');

async function test() {
    try {
        // Create PDF
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);
        
        // Load font
        const fontPath = './fonts/THSarabunNew.ttf';
        const fontBytes = fs.readFileSync(fontPath);
        
        // Fetch bold font
        const boldPath = './fonts/THSarabunNew-Bold.ttf';
        const boldBytes = fs.readFileSync(boldPath);
        
        const font = await pdfDoc.embedFont(fontBytes);
        const boldFont = await pdfDoc.embedFont(boldBytes);
        
        console.log('Fonts loaded, rendering...');
        
        // Mock data with many rows
        const mockData = {
            ProductNameThai: 'ยาดมสมุนไพร ตราไทยเฮิร์บ',
            ProductNameEng: 'ThaiHerb Herbal Inhaler',
            RecipeOtherName: '',
            RecipeFormat: 'ยาดม',
            RecipeQuantity: '100 กรัม',
            RecipeActiveIngredients: JSON.stringify([
                { thaiName: '<strong>น้ำมัน</strong>ยูคาลิปตัส', engName: '<strong>Eucalyptus</strong> Oil', latinName: 'Eucalyptus globulus', partUsed: 'ใบ', quantity: '20 มล.' },
                { thaiName: 'น้ำมันเปปเปอร์มินต์', engName: 'Peppermint Oil', latinName: 'Mentha piperita', partUsed: 'ใบ', quantity: '15 มล.' },
                { thaiName: 'การบูร', engName: 'Camphor', latinName: 'Cinnamomum camphora', partUsed: 'เนื้อไม้', quantity: '10 กรัม' },
                { thaiName: 'เมนทอล', engName: 'Menthol', latinName: 'Mentha arvensis', partUsed: 'ใบ', quantity: '5 กรัม' },
                { thaiName: 'น้ำมันมะกรูด', engName: 'Kaffir Lime Oil', latinName: 'Citrus hystrix', partUsed: 'ผิวผล', quantity: '8 มล.' },
                { thaiName: 'ขิง', engName: 'Ginger', latinName: 'Zingiber officinale', partUsed: 'เหง้า', quantity: '3 กรัม' },
                { thaiName: 'ตะไคร้', engName: 'Lemongrass', latinName: 'Cymbopogon citratus', partUsed: 'ลำต้น', quantity: '5 กรัม' },
                { thaiName: 'ไพล', engName: 'Plai', latinName: 'Zingiber cassumunar', partUsed: 'เหง้า', quantity: '4 กรัม' },
            ]),
            RecipeExtracts: JSON.stringify([
                { extractName: 'สารสกัดขมิ้นชัน', latinName: 'Curcuma longa', partUsed: 'เหง้า', solvent: 'เอทานอล 95%', ratio: '1:5', quantity: '2 กรัม' },
                { extractName: 'สารสกัดฟ้าทะลายโจร', latinName: 'Andrographis paniculata', partUsed: 'ใบ', solvent: 'น้ำ', ratio: '1:10', quantity: '5 กรัม' },
            ]),
            RecipeExcipients: JSON.stringify([
                { name: 'Microcrystalline Cellulose', casNumber: '9004-34-6', function: 'สารเพิ่มปริมาณ', quantity: '10 กรัม' },
                { name: 'Stearic Acid', casNumber: '57-11-4', function: 'สารหล่อลื่น', quantity: '2 กรัม' },
                { name: 'Talc', casNumber: '14807-96-6', function: 'สารช่วยไหล', quantity: '3 กรัม' },
                { name: 'Lactose Monohydrate', casNumber: '64044-51-5', function: 'สารเพิ่มปริมาณ', quantity: '15 กรัม' },
                { name: 'Magnesium Stearate', casNumber: '557-04-0', function: 'สารหล่อลื่น', quantity: '1 กรัม' },
            ]),
        };
        
        const pages = renderTorbor1Page3(pdfDoc, font, boldFont, mockData);
        console.log(`Generated ${pages.length} page(s)`);
        
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync('test_torbor1_output.pdf', pdfBytes);
        console.log('Saved to test_torbor1_output.pdf - Open to inspect!');
        
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
