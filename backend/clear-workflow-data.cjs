const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        console.log("=== ลบข้อมูลทดสอบทั้งหมด ===\n");

        // ── 1. Stock / Inventory ──
        console.log("── Stock / Inventory ──");
        let res = await pool.request().query("DELETE FROM Stock_Logs");
        console.log(`  ✓ Stock_Logs: ${res.rowsAffected[0]} rows`);

        res = await pool.request().query("DELETE FROM Stock_Items");
        console.log(`  ✓ Stock_Items: ${res.rowsAffected[0]} rows`);

        // ── 2. Shipping ──
        console.log("── Shipping ──");
        res = await pool.request().query("DELETE FROM Shipping_Orders");
        console.log(`  ✓ Shipping_Orders: ${res.rowsAffected[0]} rows`);

        // ── 3. QC ──
        console.log("── QC ──");
        res = await pool.request().query("DELETE FROM QC_Results");
        console.log(`  ✓ QC_Results: ${res.rowsAffected[0]} rows`);
        
        res = await pool.request().query("DELETE FROM QC_Production");
        console.log(`  ✓ QC_Production: ${res.rowsAffected[0]} rows`);
        
        res = await pool.request().query("DELETE FROM QC_Defect_NCR");
        console.log(`  ✓ QC_Defect_NCR: ${res.rowsAffected[0]} rows`);

        // ── 4. Packaging ──
        console.log("── Packaging ──");
        res = await pool.request().query("DELETE FROM Packaging_Tasks");
        console.log(`  ✓ Packaging_Tasks: ${res.rowsAffected[0]} rows`);

        // ── 5. Production ──
        console.log("── Production ──");
        res = await pool.request().query("DELETE FROM Production_Logs");
        console.log(`  ✓ Production_Logs: ${res.rowsAffected[0]} rows`);

        res = await pool.request().query("DELETE FROM Production_Tasks");
        console.log(`  ✓ Production_Tasks: ${res.rowsAffected[0]} rows`);

        // ── 6. Planner (Job Orders) ──
        console.log("── Planner (Job Orders) ──");
        res = await pool.request().query("DELETE FROM Planner");
        console.log(`  ✓ Planner: ${res.rowsAffected[0]} rows`);

        // ── 7. Sales Orders ──
        console.log("── Sales Orders ──");
        res = await pool.request().query("DELETE FROM SalesOrderItem");
        console.log(`  ✓ SalesOrderItem: ${res.rowsAffected[0]} rows`);

        res = await pool.request().query("DELETE FROM SalesOrder");
        console.log(`  ✓ SalesOrder: ${res.rowsAffected[0]} rows`);

        // ── 8. Quotations ──
        console.log("── Quotations ──");
        // History tables first (child)
        try {
            res = await pool.request().query("DELETE FROM QuotationItemHistory");
            console.log(`  ✓ QuotationItemHistory: ${res.rowsAffected[0]} rows`);
        } catch(e) { console.log(`  - QuotationItemHistory: ข้าม (ไม่มีตาราง)`); }

        try {
            res = await pool.request().query("DELETE FROM QuotationHistory");
            console.log(`  ✓ QuotationHistory: ${res.rowsAffected[0]} rows`);
        } catch(e) { console.log(`  - QuotationHistory: ข้าม (ไม่มีตาราง)`); }

        res = await pool.request().query("DELETE FROM QuotationItem");
        console.log(`  ✓ QuotationItem: ${res.rowsAffected[0]} rows`);

        res = await pool.request().query("DELETE FROM Quotation");
        console.log(`  ✓ Quotation: ${res.rowsAffected[0]} rows`);

        console.log("\n🎉 ลบข้อมูลทดสอบทั้งหมดเรียบร้อย! พร้อมเริ่มทดสอบใหม่");
        process.exit(0);
    } catch (e) {
        console.error("❌ Error:", e.message);
        process.exit(1);
    }
})();
