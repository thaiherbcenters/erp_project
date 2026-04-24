const { poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;
        console.log("Clearing all production workflow data...");

        // 1. Stock / Inventory
        let res = await pool.request().query("DELETE FROM Stock_Logs");
        console.log(`Deleted ${res.rowsAffected[0]} from Stock_Logs`);

        res = await pool.request().query("DELETE FROM Stock_Items");
        console.log(`Deleted ${res.rowsAffected[0]} from Stock_Items`);

        // 2. Shipping Orders (End of workflow)
        res = await pool.request().query("DELETE FROM Shipping_Orders");
        console.log(`Deleted ${res.rowsAffected[0]} from Shipping_Orders`);

        // 2. QC
        res = await pool.request().query("DELETE FROM QC_Results");
        console.log(`Deleted ${res.rowsAffected[0]} from QC_Results`);
        
        res = await pool.request().query("DELETE FROM QC_Production");
        console.log(`Deleted ${res.rowsAffected[0]} from QC_Production`);
        
        res = await pool.request().query("DELETE FROM QC_Defect_NCR");
        console.log(`Deleted ${res.rowsAffected[0]} from QC_Defect_NCR`);

        // 3. Packaging
        res = await pool.request().query("DELETE FROM Packaging_Tasks");
        console.log(`Deleted ${res.rowsAffected[0]} from Packaging_Tasks`);

        // 4. Production
        res = await pool.request().query("DELETE FROM Production_Logs");
        console.log(`Deleted ${res.rowsAffected[0]} from Production_Logs`);

        res = await pool.request().query("DELETE FROM Production_Tasks");
        console.log(`Deleted ${res.rowsAffected[0]} from Production_Tasks`);

        // 5. Planner
        res = await pool.request().query("DELETE FROM Planner");
        console.log(`Deleted ${res.rowsAffected[0]} from Planner`);

        console.log("Successfully cleared all production workflow data!");
        process.exit(0);
    } catch (e) {
        console.error("Error clearing data:", e);
        process.exit(1);
    }
})();
