const { poolPromise, sql } = require('./config/db'); 
async function setStartTime() { 
    try { 
        const pool = await poolPromise; 
        const prodRes = await pool.request().query("SELECT StepTimesJSON FROM Production_Tasks WHERE TaskID = 'PT-20260819-001'");
        if (prodRes.recordset.length > 0) {
            let steps = {};
            if (prodRes.recordset[0].StepTimesJSON) {
                try { steps = JSON.parse(prodRes.recordset[0].StepTimesJSON); } catch(e){}
            }
            steps['packaging'] = new Date().toISOString();
            await pool.request()
                .input('json', sql.NVarChar, JSON.stringify(steps))
                .query("UPDATE Production_Tasks SET StepTimesJSON = @json WHERE TaskID = 'PT-20260819-001'");
            console.log('Start time set successfully!');
        }
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
setStartTime();
