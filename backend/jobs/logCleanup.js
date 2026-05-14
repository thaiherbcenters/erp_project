/**
 * jobs/logCleanup.js — ระบบลบ Log อัตโนมัติ (Cron Job)
 * 
 * หน้าที่: จะรันทุกวันเวลา 03:00 น. เพื่อลบ Audit_Logs ที่มีอายุเก่ากว่าที่กำหนด (ค่าเริ่มต้น: 90 วัน)
 * เพื่อไม่ให้ Database บวมและทำงานช้าลง
 */
const cron = require('node-cron');
const { sql, poolPromise } = require('../config/db');

// จำนวนวันที่จะเก็บ Log ไว้ (เปลี่ยนเป็น 365 ได้ถ้าต้องการเก็บ 1 ปี)
const RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90;

async function cleanupOldLogs() {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('days', sql.Int, RETENTION_DAYS)
            .query(`
                DELETE FROM Audit_Logs 
                WHERE created_at < DATEADD(DAY, -@days, GETDATE())
            `);

        if (result.rowsAffected[0] > 0) {
            console.log(`🧹 [Cron] Auto-Cleanup: ลบ Audit Log เก่าที่อายุเกิน ${RETENTION_DAYS} วัน จำนวน ${result.rowsAffected[0]} รายการสำเร็จ (เวลา: ${new Date().toLocaleString('th-TH')})`);
        } else {
            console.log(`🧹 [Cron] Auto-Cleanup: ไม่พบ Audit Log เก่าที่ต้องลบในวันนี้`);
        }
    } catch (err) {
        console.error('❌ [Cron Error] เกิดข้อผิดพลาดในการลบ Audit Log:', err.message);
    }
}

// ฟังก์ชันสำหรับเปิดการทำงานของ Cron Job
function initCronJobs() {
    // รันทุกวัน เวลา 03:00 น. (ตี 3 ตรง) 
    // รูปแบบ Cron: นาที ชั่วโมง วัน เดือน วันในสัปดาห์
    cron.schedule('0 3 * * *', () => {
        console.log('⏰ [Cron] กำลังรันงานทำความสะอาด Audit Log ประจำวัน...');
        cleanupOldLogs();
    }, {
        scheduled: true,
        timezone: "Asia/Bangkok"
    });

    console.log(`✅ [Cron] ระบบทำความสะอาด Log อัตโนมัติติดตั้งแล้ว (รันทุกตี 3, ลบข้อมูลเก่ากว่า ${RETENTION_DAYS} วัน)`);
}

module.exports = { initCronJobs, cleanupOldLogs };
