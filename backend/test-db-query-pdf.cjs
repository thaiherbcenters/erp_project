const { poolPromise } = require('./config/db');

async function fixDB() {
    try {
        const pool = await poolPromise;
        await pool.request().query("UPDATE Documents SET file_path = N'D:\\ERP_Data\\Documents\\SOP-IT-03 การจัดการและควบคุมลายมือชื่ออิเล็กทร.docx' WHERE doc_code = 'SOP-IT-03'");
        console.log('DB Updated Successfully.');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
fixDB();
