const { poolPromise, sql } = require('./config/db');
(async () => {
    const p = await poolPromise;
    
    // Check Production_Tasks
    const pt = await p.request().query('SELECT TaskID, ProducedQty, DefectQty, Status, CurrentStep, JobOrderID FROM Production_Tasks');
    console.log('=== Production_Tasks ===');
    console.table(pt.recordset);
    
    // Check Packaging_Tasks 
    const pkg = await p.request().query('SELECT TaskID, PackedQty, Qty, Status, ProductionTaskID, BatchNo FROM Packaging_Tasks');
    console.log('=== Packaging_Tasks ===');
    console.table(pkg.recordset);
    
    // Check QC_Production
    const qc = await p.request().query('SELECT RequestID, Type, Status, BatchNo, TaskID FROM QC_Production');
    console.log('=== QC_Production ===');
    console.table(qc.recordset);
    
    // Check Stock_Logs
    const sl = await p.request().query('SELECT LogID, ItemID, Quantity, RefNo, Type, RefType, Notes FROM Stock_Logs');
    console.log('=== Stock_Logs ===');
    console.table(sl.recordset);
    
    // Check Shipping_Orders
    const sh = await p.request().query('SELECT * FROM Shipping_Orders');
    console.log('=== Shipping_Orders ===');
    console.table(sh.recordset);
    
    // Check Planner Notes (for OEM check)
    const pl = await p.request().query('SELECT PlannerID, Notes, Status FROM Planner');
    console.log('=== Planner ===');
    console.table(pl.recordset);
    
    process.exit(0);
})();
