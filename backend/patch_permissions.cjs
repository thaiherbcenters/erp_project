const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true }
};

sql.connect(config).then(async pool => {
    try {
        console.log("Connected to DB, checking UserPermissions...");
        // Assuming table name is UserPermissions or RolePermissions
        const result = await pool.request().query("SELECT * FROM UserPermissions WHERE page_id = 'sales_delivery_order'");
        
        for (const row of result.recordset) {
            // Check if sales_receipt exists for this user
            const check = await pool.request()
                .input('uid', sql.Int, row.user_id)
                .query("SELECT * FROM UserPermissions WHERE user_id = @uid AND page_id = 'sales_receipt'");
            
            if (check.recordset.length === 0) {
                // Add sales_receipt permission
                await pool.request()
                    .input('uid', sql.Int, row.user_id)
                    .query("INSERT INTO UserPermissions (user_id, page_id, data_scope) VALUES (@uid, 'sales_receipt', 'all')");
                
                await pool.request()
                    .input('uid', sql.Int, row.user_id)
                    .query("INSERT INTO UserPermissions (user_id, page_id, data_scope) VALUES (@uid, 'sales_receipt_search', 'all')");
                
                await pool.request()
                    .input('uid', sql.Int, row.user_id)
                    .query("INSERT INTO UserPermissions (user_id, page_id, data_scope) VALUES (@uid, 'sales_receipt_table', 'all')");

                console.log(`Added sales_receipt permissions for user_id: ${row.user_id}`);
            }
        }
        console.log("Done patching permissions.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
});
