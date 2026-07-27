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
        await pool.request().query("INSERT INTO UserPermissions (user_id, page_id, data_scope, is_granted) SELECT 3, 'sales_delivery_order', 'all', 1 WHERE NOT EXISTS (SELECT 1 FROM UserPermissions WHERE user_id = 3 AND page_id = 'sales_delivery_order')");
        await pool.request().query("INSERT INTO UserPermissions (user_id, page_id, data_scope, is_granted) SELECT 3, 'sales_delivery_order_search', 'all', 1 WHERE NOT EXISTS (SELECT 1 FROM UserPermissions WHERE user_id = 3 AND page_id = 'sales_delivery_order_search')");
        await pool.request().query("INSERT INTO UserPermissions (user_id, page_id, data_scope, is_granted) SELECT 3, 'sales_delivery_order_table', 'all', 1 WHERE NOT EXISTS (SELECT 1 FROM UserPermissions WHERE user_id = 3 AND page_id = 'sales_delivery_order_table')");
        console.log("Permissions granted!");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});
