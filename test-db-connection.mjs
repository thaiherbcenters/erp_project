/**
 * ทดสอบการเชื่อมต่อ SQL Server ด้วย SQL Authentication
 */

import sql from 'mssql';

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

async function testConnection() {
    console.log('===========================================');
    console.log(' SQL Server Connection Test');
    console.log(' Server:   localhost');
    console.log(' Database: ERP_THAIHERB');
    console.log(' User:     erp_admin');
    console.log('===========================================\n');

    try {
        const pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server successfully!\n');

        const result = await pool.request().query(
            'SELECT DB_NAME() AS CurrentDB, @@SERVERNAME AS ServerName, @@VERSION AS Version'
        );
        const row = result.recordset[0];
        console.log('📋 Connection Details:');
        console.log('   Database:', row.CurrentDB);
        console.log('   Server:  ', row.ServerName);
        console.log('   Version: ', row.Version.split('\n')[0]);

        const tables = await pool.request().query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME
        `);
        console.log(`\n📁 Tables in database (${tables.recordset.length}):`);
        if (tables.recordset.length > 0) {
            tables.recordset.forEach((t, i) => console.log(`   ${i + 1}. ${t.TABLE_NAME}`));
        } else {
            console.log('   (No tables found - database is empty)');
        }

        await pool.close();
        console.log('\n✅ Connection test PASSED!');
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    }
    console.log('===========================================');
}

testConnection();
