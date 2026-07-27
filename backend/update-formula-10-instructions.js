const { poolPromise } = require('./config/db');
const sql = require('mssql');

async function updateFormula() {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const instructionsObj = {
                ProductAppearance: 'ยาน้ำมันใส สีเหลือง',
                ProductPackSize: 'บรรจุในขวดแก้วใส ไม่มีสี ขนาด 10, 20, 30, 50, 60, 100 มล. ปิดด้วยหัวสเปรย์พลาสติกชนิด PE และฝาครอบพลาสติก ชนิด PP,PE',
                ProductMfgProcess: `วิธีการเตรียมวัตถุดิบก่อนใช้ปรุงยา
น้ำมันไพลทอด
1. นำเหง้าไพลสด ล้างทำความสะอาด ผึ่งลมจนสะเด็ดน้ำ
2. หั่นไพล เป็นชิ้นเล็กๆ และชั่งน้ำหนัก 2 กิโลกรัม
3. นำน้ำมันมะพร้าว 1 กิโลกรัม ตั้งไฟร้อนปานกลาง ประมาณไม่เกิน 160 องศาเซลเซียส
4. เมื่อน้ำมันเริ่มร้อน ใส่ไพลที่หั่นเป็นชิ้น 1 กิโลกรัม ทอดจนเนื้อไพลแห้ง กรอบ เป็นสีน้ำตาล ใช้ตะแกรงตักเฉพาะเนื้อไพลออก เติมไพลที่เหลืออีก 1 กิโลกรัมลงไปในน้ำมันเดิม ทอดจนเนื้อไพลแห้ง กรอบ เป็นสีน้ำตาล ปิดไฟใช้ตะแกรงตักเนื้อไพลออก
5. ยกลงจากเตา ทิ้งไว้พออุ่น กรองด้วยผ้าขาวบาง ได้น้ำมันไพล 740 กรัม และชั่งน้ำหนักน้ำมันที่ได้ เก็บน้ำมันในภาชนะปิดสนิท แล้วนำไปเก็บในที่มืด เย็น เพื่อใช้เตรียมตำรับ น้ำมันไพลที่ใช้ในสูตร 150 กรัม

กรรมวิธีการผลิต
1. นำตัวยาลำดับที่ 1-4 มาชั่งตามสูตรที่กำหนด
2. เท เกล็ดสะระแหน่ พิมเสน น้ำมันสะระแหน่ และ น้ำมันยูคาลิปตัส ลงในหม้อ คนจนส่วนผสมเริ่มละลาย
3. เติมน้ำมันไพลทอดตามสูตรที่กำหนด คนจนละลายเข้ากันหมด ได้น้ำมันสมุนไพรรวม 700 กรัม
4. นำไปบรรจุใส่ขวดแก้ว แล้วปิดฝาให้สนิท

สูตรการคำนวณไพล น้ำมันมะพร้าว และดอกกานพลู
    1. สูตรการคำนวณไพล
น้ำมันไพลที่ได้ 740 กรัม มาจากไพล 2,000 กรัม เมื่อใช้
น้ำมันไพล 150 กรัม จะใช้ไพล = 150×2,000/740
                             = 405.40

    2. สูตรการคำนวณน้ำมันมะพร้าว
น้ำมันไพลที่ได้ 740 กรัม มาจากน้ำมันมะพร้าว 1,000 กรัม
เมื่อใช้น้ำมันไพล 150 กรัม จะใช้น้ำมันมะพร้าว = 150×1,000/740
                                       = 202.70 กรัม

    3. สูตรการคำนวณดอกกานพลู
น้ำมันไพลที่ได้ 740 กรัม มาจากดอกกานพลู 5 กรัม
เมื่อใช้น้ำมันไพล 150 กรัม จะใช้ ดอกกานพลู = 150×5/740
                                     = 1.01 กรัม`,
                ProductIndication: 'บรรเทาอาการปวดเมื่อยตามร่างกาย, Relieve muscle pain',
                ProductDosage: 'พ่นบริเวณที่มีอาการปวดเมื่อย วันละ 2-3 ครั้ง, Spray on the affected areas, 2-3 times a day',
                ProductPreparation: '-',
                ProductCondition: '-',
                ProductStorage: 'เก็บที่อุณหภูมิห้อง/3 ปีนับจากวันที่ผลิต',
                ProductContraindication: '-',
                ProductWarning: '-',
                ProductPrecaution: '-',
                ProductAdverseReaction: '-',
                SalesChannel: 'ผลิตภัณฑ์สมุนไพรขายทั่วไป'
            };

            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, 'FM-010')
                .input('InstructionsJSON', sql.NVarChar, JSON.stringify(instructionsObj))
                .query(`
                    UPDATE RnD_Formulas
                    SET InstructionsJSON = @InstructionsJSON
                    WHERE FormulaID = @FormulaID
                `);

            await transaction.commit();
            console.log('Formula FM-010 updated successfully!');
            process.exit(0);
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateFormula();
