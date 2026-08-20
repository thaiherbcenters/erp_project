require('dotenv').config({ path: 'backend/.env' });
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true }
};

async function run() {
    try {
        let pool = await sql.connect(config);
        
        // Mock sequence generator just for this script
        async function getSeq(prefix) {
            return prefix + "001"; // Fallback simple ID
        }

        const taskResult2 = await pool.request()
            .input('ProdTaskID', sql.VarChar, 'PT-20260820-001')
            .query('SELECT TaskID, JobOrderID, BatchNo, FormulaName, ProductName, Line, ExpectedQty, ProducedQty FROM Production_Tasks WHERE TaskID = @ProdTaskID');
            
        if (taskResult2.recordset.length > 0) {
            const taskData = taskResult2.recordset[0];
            const pkgId = 'PKG-20260820-001';
            
            const checkPkg = await pool.request()
                .input('ProdTaskID', sql.VarChar, 'PT-20260820-001')
                .query(`SELECT COUNT(*) as cnt FROM Packaging_Tasks WHERE ProductionTaskID = @ProdTaskID`);
                
            if (checkPkg.recordset[0].cnt === 0) {
                await pool.request()
                    .input('PkgTaskID', sql.VarChar, pkgId)
                    .input('BatchNo', sql.VarChar, taskData.BatchNo)
                    .input('Product', sql.NVarChar, taskData.ProductName || taskData.FormulaName || '')
                    .input('Line', sql.VarChar, taskData.Line || '')
                    .input('Qty', sql.Int, taskData.ExpectedQty || taskData.ProducedQty || 0)
                    .input('Status', sql.NVarChar, 'รอบรรจุ')
                    .input('Destination', sql.NVarChar, 'คลัง')
                    .input('ProductionTaskID', sql.VarChar, 'PT-20260820-001')
                    .input('JobOrderID', sql.VarChar, taskData.JobOrderID)
                    .query(`
                        INSERT INTO Packaging_Tasks 
                        (TaskID, BatchNo, Product, Line, Qty, PackedQty, Status, Destination, ProductionTaskID, JobOrderID)
                        VALUES (@PkgTaskID, @BatchNo, @Product, @Line, @Qty, 0, @Status, @Destination, @ProductionTaskID, @JobOrderID)
                    `);
                console.log("Created Packaging_Tasks row.");
            } else {
                console.log("Packaging_Tasks row already exists.");
            }
        }
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
run();
