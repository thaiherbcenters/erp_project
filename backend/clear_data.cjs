const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        let pool = await sql.connect(config);
        
        const tablesToClear = [
            // QC
            'QC_Results',
            'QC_Production',
            'QC_Defect_NCR',
            'QC_FinishedGoods',
            'QC_InProcess',
            'QC_Incoming',
            
            // Production
            'ProductionMaterialUsage',
            'ScrapRecord',
            'Production_Logs',
            'Production_Tasks',
            
            // Planning
            'Planner'
        ];

        for (let table of tablesToClear) {
            try {
                await pool.request().query(`DELETE FROM ${table}`);
                console.log(`Cleared table: ${table}`);
            } catch (err) {
                console.log(`Error clearing ${table}:`, err.message);
            }
        }
        
        console.log("Finished clearing data.");

    } catch (err) {
        console.error(err);
    } finally {
        sql.close();
    }
}
run();
