require('dotenv').config({path: './backend/.env'});
const { poolPromise } = require('./backend/config/db.js');

async function run() {
    const pool = await poolPromise;
    const res = await pool.request().query("SELECT TaskID, BatchNo FROM Production_Tasks WHERE BatchNo LIKE '%-WIP' ORDER BY CreatedAt ASC");
    
    let grouped = {};
    for (let r of res.recordset) {
        if (!grouped[r.BatchNo]) grouped[r.BatchNo] = [];
        grouped[r.BatchNo].push(r.TaskID);
    }
    
    for (let batch in grouped) {
        if (grouped[batch].length > 1) {
            let count = 1;
            for (let taskId of grouped[batch]) {
                let newBatch = batch + '-' + String(count).padStart(2, '0');
                await pool.request()
                    .input('TaskID', taskId)
                    .input('NewBatch', newBatch)
                    .query("UPDATE Production_Tasks SET BatchNo = @NewBatch WHERE TaskID = @TaskID");
                
                // Update sequences table to reflect this new number
                await pool.request()
                    .input('Prefix', batch + '-')
                    .input('Count', count)
                    .query(`
                        IF EXISTS (SELECT 1 FROM Sequences WHERE Prefix = @Prefix)
                            UPDATE Sequences SET LastNumber = CASE WHEN LastNumber < @Count THEN @Count ELSE LastNumber END WHERE Prefix = @Prefix
                        ELSE
                            INSERT INTO Sequences (Prefix, LastNumber, UpdatedAt) VALUES (@Prefix, @Count, GETDATE())
                    `);
                
                count++;
            }
        }
    }
    console.log('Fixed duplicates');
    process.exit(0);
}
run();
