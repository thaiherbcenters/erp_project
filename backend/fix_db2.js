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

async function main() {
    try {
        let pool = await sql.connect(config);
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TaxInvoiceItemHistory')
            BEGIN
                CREATE TABLE TaxInvoiceItemHistory (
                    ItemHistoryID   INT IDENTITY(1,1) PRIMARY KEY,
                    HistoryID       INT NOT NULL,
                    ItemOrder       INT NOT NULL DEFAULT 0,
                    ItemName        NVARCHAR(300) NOT NULL,
                    Qty             DECIMAL(18,2) NOT NULL DEFAULT 0,
                    Price           DECIMAL(18,2) NOT NULL DEFAULT 0,
                    Amount          DECIMAL(18,2) NOT NULL DEFAULT 0,
                    IsPromo         BIT NOT NULL DEFAULT 0,
                    PromoMultiplier INT NOT NULL DEFAULT 1,
                    ImageURL        NVARCHAR(MAX) NULL,
                    CONSTRAINT FK_TaxInvoiceItemHistory_TaxInvoiceHistory FOREIGN KEY (HistoryID) REFERENCES TaxInvoiceHistory(HistoryID) ON DELETE CASCADE
                );
            END
        `);
        console.log("Success creating TaxInvoiceItemHistory table");
        
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();
