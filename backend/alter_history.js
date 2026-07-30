const sql = require('mssql');
const db = require('./config/db');

async function alterHistoryTable() {
    try {
        const pool = await db.poolPromise;
        const query = `
            ALTER TABLE ReceiptHistory
            ADD 
                DeliverTo NVARCHAR(255) NULL,
                DueDate DATE NULL,
                PaymentMethod NVARCHAR(50) NULL,
                CustomerBank NVARCHAR(100) NULL,
                CustomerBranch NVARCHAR(100) NULL,
                ChequeNo NVARCHAR(100) NULL,
                ChequeDate DATE NULL;
        `;
        await pool.request().query(query);
        console.log("Successfully added columns to ReceiptHistory table");
        process.exit(0);
    } catch (err) {
        console.error("Error altering table:", err);
        process.exit(1);
    }
}

alterHistoryTable();
