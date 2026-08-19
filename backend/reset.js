const { poolPromise, sql } = require('./config/db'); 
async function resetTask() { 
    try { 
        const pool = await poolPromise; 
        
        // 1. Reset Packaging Task
        await pool.request().query(`
            UPDATE Packaging_Tasks 
            SET PackedQty = 0, DefectQty = 0, Status = N'กำลังบรรจุ' 
            WHERE TaskID = 'PKG-20260819-001'
        `);
        console.log('Packaging Task reset');

        // 2. Delete QC Final
        await pool.request().query(`
            DELETE FROM QC_Production 
            WHERE TaskID = 'PT-20260819-001' AND Type = 'qc_final'
        `);
        console.log('QC ticket deleted');

        // 3. Revert Production step if necessary (it was moved to 'qc_final')
        const prodRes = await pool.request().query(`SELECT StepTimesJSON FROM Production_Tasks WHERE TaskID = 'PT-20260819-001'`);
        if (prodRes.recordset.length > 0 && prodRes.recordset[0].StepTimesJSON) {
            let steps = JSON.parse(prodRes.recordset[0].StepTimesJSON);
            delete steps['qc_final'];
            await pool.request()
                .input('json', sql.NVarChar, JSON.stringify(steps))
                .query(`UPDATE Production_Tasks SET CurrentStep = 'packaging', StepTimesJSON = @json WHERE TaskID = 'PT-20260819-001'`);
            console.log('Production step reverted to packaging');
        }

    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
resetTask();
