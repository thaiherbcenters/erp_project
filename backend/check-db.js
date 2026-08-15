require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
    try {
        await sql.connect(config);
        
        const tables = ['QuotationItem', 'QuotationItemHistory', 'SalesOrderItem', 'SalesOrderItemHistory'];
        
        for (const table of tables) {
            try {
                await sql.query(`ALTER TABLE ${table} ADD Unit NVARCHAR(50) NULL`);
                console.log(`Added Unit to ${table}`);
            } catch(e) {
                console.log(`${table}.Unit might already exist:`, e.message);
            }
        }
        
    } catch(e) { console.error(e); }
    process.exit(0);
}
run();
