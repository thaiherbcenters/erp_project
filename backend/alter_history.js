const sql = require('mssql');
const db = require('./config/db');

async function alterHistoryTable() {
    try {
        const pool = await db.poolPromise;
        const query = `
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ReceiptHistory' AND COLUMN_NAME = 'IsDeposit')
            BEGIN
                ALTER TABLE ReceiptHistory ADD IsDeposit BIT DEFAULT 0;
            END;

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ReceiptHistory' AND COLUMN_NAME = 'DepositStatus')
            BEGIN
                ALTER TABLE ReceiptHistory ADD DepositStatus NVARCHAR(50) DEFAULT N'ชำระครบถ้วน';
            END;

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ReceiptHistory' AND COLUMN_NAME = 'PaidDepositAmount')
            BEGIN
                ALTER TABLE ReceiptHistory ADD PaidDepositAmount DECIMAL(18,2) DEFAULT 0;
            END;
        `;
        await pool.request().query(query);
        console.log("Successfully ensured deposit columns in ReceiptHistory table");
        process.exit(0);
    } catch (err) {
        console.error("Error altering table:", err);
        process.exit(1);
    }
}

alterHistoryTable();
