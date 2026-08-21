require('dotenv').config({path: './backend/.env'});
const { poolPromise, sql } = require('./backend/config/db.js');
const { generateSequence, getDatePrefix } = require('./backend/utils/sequence.js');

async function run() {
    const pool = await poolPromise;
    const taskId = 'PT-20260821-003';
    
    // Check if it's currently at 'wait'
    const res = await pool.request().input('TaskID', taskId).query("SELECT * FROM Production_Tasks WHERE TaskID = @TaskID");
    if (res.recordset.length > 0) {
        const task = res.recordset[0];
        
        // Update to packaging
        await pool.request().input('TaskID', taskId).query("UPDATE Production_Tasks SET CurrentStep = 'packaging', Status = N'รอบรรจุ' WHERE TaskID = @TaskID");
        
        // Check if packaging task exists
        const checkPkg = await pool.request().input('ProdTaskIDCheck', taskId).query("SELECT COUNT(*) as cnt FROM Packaging_Tasks WHERE ProductionTaskID = @ProdTaskIDCheck");
        
        if (checkPkg.recordset[0].cnt === 0) {
            const pkgId = await generateSequence(pool, 'Packaging_Tasks', 'TaskID', `PKG-${getDatePrefix()}`, 3);
            
            let pkgDestination = 'คลัง';
            try {
                const plannerCheck = await pool.request()
                    .input('PlannerIDCheck', sql.VarChar, task.JobOrderID)
                    .query('SELECT Notes FROM Planner WHERE PlannerID = @PlannerIDCheck');
                if (plannerCheck.recordset.length > 0) {
                    const pNotes = plannerCheck.recordset[0].Notes || '';
                    if (pNotes.includes('OEM') || pNotes.includes('ผลิตตามออร์เดอร์') || pNotes.includes('ผลิตตามออเดอร์') || pNotes.includes('ผลิตตามคำสั่งซื้อ')) {
                        pkgDestination = 'ส่งลูกค้า';
                    }
                }
            } catch(pe) { console.error(pe); }
            
            await pool.request()
                .input('PkgTaskID', sql.VarChar, pkgId)
                .input('BatchNoPkg', sql.VarChar, task.BatchNo)
                .input('ProductPkg', sql.NVarChar, task.ProductName || task.FormulaName || '')
                .input('LinePkg', sql.VarChar, task.Line || '')
                .input('QtyPkg', sql.Int, task.ExpectedQty || task.ProducedQty || 0)
                .input('StatusPkg', sql.NVarChar, 'รอบรรจุ')
                .input('DestinationPkg', sql.NVarChar, pkgDestination)
                .input('ProductionTaskIDPkg', sql.VarChar, taskId)
                .input('JobOrderIDPkg', sql.VarChar, task.JobOrderID || null)
                .query(`
                    INSERT INTO Packaging_Tasks 
                    (TaskID, BatchNo, Product, Line, Qty, PackedQty, Status, Destination, ProductionTaskID, JobOrderID)
                    VALUES (@PkgTaskID, @BatchNoPkg, @ProductPkg, @LinePkg, @QtyPkg, 0, @StatusPkg, @DestinationPkg, @ProductionTaskIDPkg, @JobOrderIDPkg)
                `);
            console.log('Created Packaging Task', pkgId);
        }
        
        console.log('Fixed PT-20260821-003 to packaging');
    }
    process.exit(0);
}
run();
