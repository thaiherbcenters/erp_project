const { poolPromise } = require('./config/db');
(async () => {
    const p = await poolPromise;
    
    // Check planner notes
    const r = await p.request().query("SELECT PlannerID, Notes FROM Planner ORDER BY CreatedAt DESC");
    console.log('=== Planner Records ===');
    r.recordset.forEach(rec => {
        console.log(`  ID: ${rec.PlannerID}`);
        console.log(`  Notes: ${rec.Notes}`);
        console.log('---');
    });
    
    // Check stock logs for OEM
    const r2 = await p.request().query("SELECT * FROM Stock_Logs WHERE RefType = 'oem_direct'");
    console.log('\n=== OEM Stock Logs ===');
    console.log('Count:', r2.recordset.length);
    r2.recordset.forEach(l => console.log(`  Ref: ${l.RefNo} | Product: ${l.ProductName} | Qty: ${l.Quantity}`));
    
    process.exit(0);
})();
