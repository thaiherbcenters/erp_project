const { poolPromise, sql } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        console.log("=== เพิ่มคอลัมน์ ShippingAddress + Phone ในตาราง Shipping_Orders ===\n");

        // Add ShippingAddress column
        try {
            await pool.request().query(`
                ALTER TABLE Shipping_Orders ADD ShippingAddress NVARCHAR(500) NULL
            `);
            console.log("✓ เพิ่มคอลัมน์ ShippingAddress สำเร็จ");
        } catch (e) {
            if (e.message.includes('already')) {
                console.log("ℹ️ ShippingAddress มีอยู่แล้ว ข้าม");
            } else {
                console.error("❌ Error:", e.message);
            }
        }

        // Add CustomerPhone column
        try {
            await pool.request().query(`
                ALTER TABLE Shipping_Orders ADD CustomerPhone NVARCHAR(50) NULL
            `);
            console.log("✓ เพิ่มคอลัมน์ CustomerPhone สำเร็จ");
        } catch (e) {
            if (e.message.includes('already')) {
                console.log("ℹ️ CustomerPhone มีอยู่แล้ว ข้าม");
            } else {
                console.error("❌ Error:", e.message);
            }
        }

        console.log("\n🎉 Migration สำเร็จ!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Error:", e.message);
        process.exit(1);
    }
})();
