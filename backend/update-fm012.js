const sql = require('mssql');
const { poolPromise } = require('./config/db');

async function updateFormula() {
    try {
        const pool = await poolPromise;
        
        // Fetch current TorBor1FormatJSON to preserve other fields like RecipeActiveIngredients
        const res = await pool.request()
            .input('FormulaID', sql.VarChar, 'FM-012')
            .query('SELECT TorBor1FormatJSON FROM RnD_Formulas WHERE FormulaID = @FormulaID');
            
        if (res.recordset.length === 0) {
            console.error('Formula not found');
            process.exit(1);
        }
        
        let formatJSON = {};
        try {
            formatJSON = JSON.parse(res.recordset[0].TorBor1FormatJSON || '{}');
        } catch (e) {
            console.error('Error parsing existing JSON');
        }
        
        // Standard fields
        formatJSON.ProductAppearance = '<p style="text-align: center;">ยาขี้ผึ้ง สีเหลือง</p>';
        formatJSON.ProductPackSize = '<p style="text-align: center;">บรรจุในขวดแก้วใสไม่มีสี ขวดละ 5, 10, 15, 20, 25, 40, 50, 60 และ100 กรัม และปิดด้วยฝาอลูมิเนียม</p>';
        formatJSON.ProductMfgProcess = '<p>1. ชั่งน้ำหนักตัวยาข้อ 1-7 ตามสูตร</p><p>2. นำ Hard paraffin ใส่ภาชนะ อุ่นให้ร้อนที่อุณหภูมิ 70-80 องศาเซลเซียส</p><p>3. เติม White soft paraffin อุ่นต่อจนละลายเป็นเนื้อเดียวกัน</p><p>4. ผสม พิมเสน เกล็ดสะระแหน่ คนจนละลายบางส่วน</p><p>5. เติมน้ำมันระกำ น้ำมันสะระแหน่ และน้ำมันยูคาลิปตัส ตามสูตร</p><p>6. คนจนละลายเป็นเนื้อเดียวกัน นำไปบรรจุใส่ขวดแก้ว แล้วปิดฝาให้สนิท</p>';
        formatJSON.ProductIndication = '<p style="text-align: center;">บรรเทาอาการปวดเมื่อยตามร่างกาย, Relieve muscle pain</p>';
        formatJSON.ProductDosage = '<p style="text-align: center;">ทาบริเวณที่มีอาการ วันละ 2-3 ครั้ง, Apply on the affected areas, 2-3 times a day.</p>';
        formatJSON.ProductPreparation = '<p style="text-align: center;">-</p>';
        formatJSON.ProductCondition = '<p style="text-align: center;">-</p>';
        formatJSON.ProductStorage = '<p style="text-align: center;">เก็บที่อุณหภูมิห้อง/3 ปี นับจากวันผลิต</p>';
        
        // Custom section
        const customContent = '<p><strong>น้ำมันไพลทอด</strong></p><p>1. นำเหง้าไพลสด ล้างทำความสะอาด ผึ่งลมจนสะเด็ดน้ำ</p><p>2. หั่นไพล เป็นชิ้นเล็กๆ และชั่งน้ำหนัก 2 กิโลกรัม</p><p>3. นำน้ำมันมะพร้าว 1 กิโลกรัม ตั้งไฟร้อนปานกลาง ประมาณไม่เกิน 160 องศาเซลเซียส</p><p>4. เมื่อน้ำมันเริ่มร้อน ใส่ไพลที่หั่นเป็นชิ้น 1 กิโลกรัม ทอดจนเนื้อไพลแห้ง กรอบ เป็นสีน้ำตาล ใช้ตะแกรงตักเฉพาะเนื้อไพลออก เติมไพลที่เหลืออีก 1 กิโลกรัม ลงไปในน้ำมันเดิม ทอดจนเนื้อไพลแห้ง กรอบ เป็นสีน้ำตาล ปิดไฟใช้ตะแกรงตักเฉพาะเนื้อไพลออก</p><p>5. ยกลงจากเตา และเติมผงดอกกานพลู 5 กรัม ทิ้งไว้พออุ่น กรองด้วยผ้าขาวบาง ได้น้ำมันไพล 740 กรัม และชั่งน้ำหนักน้ำมันที่ได้ เก็บน้ำมันในภาชนะปิดสนิท แล้วนำไปเก็บในที่มืด เย็น เพื่อใช้เตรียมตำรับ น้ำมันไพลที่ใช้สูตร 15.38 กรัม</p>';
        
        // Note: I merged steps 4, 5 and 6 from the image into 4 and 5 because the image had line breaks mid-sentence.
        // Image line 4: "...ตักเฉพาะเนื้อไพลออก เติมไพลที่"
        // Image line 5: "เหลืออีก 1 กิโลกรัม... ปิดไฟใช้ตะแกรงตักเฉพาะเนื้อไพลออก"
        // Image line 6: ".ยกลงจากเตา..."
        
        // Define field order
        formatJSON.Section5FieldOrder = [
            { type: 'standard', key: 'ProductAppearance' },
            { type: 'standard', key: 'ProductPackSize' },
            { type: 'custom', title: 'วิธีการเตรียมวัตถุดิบก่อนใช้ปรุงยา', id: Date.now().toString(), content: customContent },
            { type: 'standard', key: 'ProductMfgProcess' },
            { type: 'standard', key: 'ProductIndication' },
            { type: 'standard', key: 'ProductDosage' },
            { type: 'standard', key: 'ProductPreparation' },
            { type: 'standard', key: 'ProductCondition' },
            { type: 'standard', key: 'ProductStorage' },
            { type: 'standard', key: 'ProductContraindication' },
            { type: 'standard', key: 'ProductWarning' },
            { type: 'standard', key: 'ProductPrecaution' },
            { type: 'standard', key: 'ProductAdverseReaction' }
        ];

        const updateRes = await pool.request()
            .input('FormulaID', sql.VarChar, 'FM-012')
            .input('TorBor1FormatJSON', sql.NVarChar, JSON.stringify(formatJSON))
            .query('UPDATE RnD_Formulas SET TorBor1FormatJSON = @TorBor1FormatJSON WHERE FormulaID = @FormulaID');

        console.log('Successfully updated FM-012 details:', updateRes.rowsAffected);
    } catch (err) {
        console.error('Error updating formula:', err);
    } finally {
        process.exit(0);
    }
}

updateFormula();
