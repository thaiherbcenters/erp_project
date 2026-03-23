const sql = require('mssql');
const config = {
    server: 'localhost',
    database: 'ERP_THAIHERB',
    user: 'erp_admin',
    password: 'Erp@2026!',
    options: {
        trustServerCertificate: true,
        encrypt: false,
    },
    connectionTimeout: 10000,
};

async function check() {
    try {
        const pool = await sql.connect(config);
        const users = await pool.request().query('SELECT TOP 1 * FROM Users');
        console.log('Users columns:', Object.keys(users.recordset[0] || {}));
        const perms = await pool.request().query('SELECT TOP 1 * FROM UserPermissions');
        console.log('Permissions columns:', Object.keys(perms.recordset[0] || {}));
        await pool.close();
    } catch (e) { console.error('Error:', e.message); }
}
check();
