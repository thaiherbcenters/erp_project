const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function alterSchema() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log("Connected to DB.");

        const columnsToAdd = [
            "FdaCustomerCode NVARCHAR(50)",
            "FdaEmail NVARCHAR(100)",
            "FdaProjectName NVARCHAR(200)",
            "FdaCreditTerms NVARCHAR(100)",
            "FdaServiceRegister BIT",
            "FdaServiceRegisterPrice DECIMAL(18,2)",
            "FdaServiceTrademark BIT",
            "FdaServiceTrademarkPrice DECIMAL(18,2)"
        ];

        const tables = ["Quotation", "QuotationHistory"];

        for (const table of tables) {
            for (const colDef of columnsToAdd) {
                const colName = colDef.split(' ')[0];
                try {
                    // Check if column exists
                    const checkRes = await pool.request().query(`
                        SELECT COLUMN_NAME
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = '${colName}'
                    `);
                    if (checkRes.recordset.length === 0) {
                        console.log(`Adding ${colName} to ${table}...`);
                        await pool.request().query(`ALTER TABLE ${table} ADD ${colDef}`);
                        console.log(`Successfully added ${colName} to ${table}.`);
                    } else {
                        console.log(`Column ${colName} already exists in ${table}.`);
                    }
                } catch (err) {
                    console.error(`Error adding ${colName} to ${table}:`, err.message);
                }
            }
        }
    } catch (err) {
        console.error("Connection error:", err);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}
alterSchema();
