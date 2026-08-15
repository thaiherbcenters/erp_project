const { poolPromise, sql } = require('./config/db');

async function fix() {
    try {
        const pool = await poolPromise;
        
        // Let's check what it currently is
        let res = await pool.request()
            .input('batchNo', sql.VarChar, 'B260814-FM012-01')
            .query("SELECT * FROM Production_Tasks WHERE BatchNo = @batchNo");
            
        if (res.recordset.length === 0) {
            console.log("No task found for B260814-FM012-01");
            // Try JobOrderID
            res = await pool.request()
                .input('jo', sql.VarChar, 'JO-20260814-002')
                .query("SELECT * FROM Production_Tasks WHERE JobOrderID = @jo");
            
            if (res.recordset.length === 0) {
                 console.log("No task found for JO-20260814-002 either!");
                 process.exit(1);
            }
        }
        
        const task = res.recordset[0];
        console.log("Found task:", task.TaskID, task.CurrentStep);
        
        // Parse StepTimesJSON
        let stepTimes = {};
        try {
            stepTimes = JSON.parse(task.StepTimesJSON || '{}');
            // Remove production_1 time
            delete stepTimes.production_1;
            // Add prepare time if it doesn't exist
            if (!stepTimes.prepare) {
                stepTimes.prepare = new Date().toISOString();
            }
        } catch(e){}

        // Update DB
        const updateRes = await pool.request()
            .input('taskId', sql.VarChar, task.TaskID)
            .input('step', sql.VarChar, 'prepare')
            .input('times', sql.NVarChar, JSON.stringify(stepTimes))
            .query("UPDATE Production_Tasks SET CurrentStep = @step, StepTimesJSON = @times WHERE TaskID = @taskId");
            
        console.log("Updated rows:", updateRes.rowsAffected);
        
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
fix();
