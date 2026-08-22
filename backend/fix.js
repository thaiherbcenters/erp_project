const { sql, poolPromise } = require('./config/db');
async function fix() {
    try {
        const pool = await poolPromise;
        const task = await pool.request().query("SELECT * FROM Packaging_Tasks WHERE TaskID = 'PKG-20260822-001'");
        console.log(task.recordset);
        
        // Let's delete the QC task that was mistakenly created
        await pool.request().query("DELETE FROM QC_Production WHERE TaskID = 'PKG-20260822-001'");
        
        // Update Packaging_Tasks status
        await pool.request().query("UPDATE Packaging_Tasks SET Status = N'บรรจุเสร็จ-รอติดฉลาก' WHERE TaskID = 'PKG-20260822-001'");
        
        // Update Production task CurrentStep to 'labeling'
        const ptid = task.recordset[0].ProductionTaskID;
        if (ptid) {
            await pool.request().query(`UPDATE Production_Tasks SET CurrentStep = 'labeling' WHERE TaskID = '${ptid}'`);
        }
        
        // Create Labeling task if it doesn't exist
        const lbl = await pool.request().query("SELECT * FROM Labeling_Tasks WHERE PackagingTaskID = 'PKG-20260822-001'");
        if (lbl.recordset.length === 0) {
            const row = task.recordset[0];
            await pool.request()
                .input('TaskID', sql.VarChar, 'LBL-20260822-999')
                .input('PackagingTaskID', sql.VarChar, row.TaskID)
                .input('ProductionTaskID', sql.VarChar, row.ProductionTaskID || null)
                .input('JobOrderID', sql.VarChar, row.JobOrderID || null)
                .input('ProductName', sql.NVarChar, row.Product)
                .input('BatchNo', sql.VarChar, row.BatchNo)
                .input('Qty', sql.Int, row.PackedQty || row.Qty)
                .input('LabelType', sql.VarChar, 'stock')
                .input('Status', sql.NVarChar, 'พร้อมติดฉลาก')
                .input('Line', sql.VarChar, row.Line || 'Line A')
                .query(`
                    INSERT INTO Labeling_Tasks (TaskID, PackagingTaskID, ProductionTaskID, JobOrderID, ProductName, BatchNo, Qty, LabelType, Status, Line)
                    VALUES (@TaskID, @PackagingTaskID, @ProductionTaskID, @JobOrderID, @ProductName, @BatchNo, @Qty, @LabelType, @Status, @Line)
                `);
            console.log("Created missing labeling task LBL-20260822-999");
        }
        
    } catch(e) { console.error(e); }
    finally { process.exit(); }
}
fix();
