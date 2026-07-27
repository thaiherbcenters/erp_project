const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true }
};

async function fixDeliveryOrderRevision() {
    try {
        const pool = await sql.connect(config);
        
        // 1. Find the name of the default constraint on Revision
        const result = await pool.request().query(`
            SELECT name 
            FROM sys.default_constraints 
            WHERE parent_object_id = OBJECT_ID('DeliveryOrder') 
            AND parent_column_id = (
                SELECT column_id FROM sys.columns 
                WHERE object_id = OBJECT_ID('DeliveryOrder') AND name = 'Revision'
            )
        `);

        if (result.recordset.length > 0) {
            const constraintName = result.recordset[0].name;
            console.log("Dropping constraint: " + constraintName);
            await pool.request().query(`ALTER TABLE DeliveryOrder DROP CONSTRAINT ${constraintName}`);
        }

        // 2. Add new default constraint
        await pool.request().query(`ALTER TABLE DeliveryOrder ADD CONSTRAINT DF_DeliveryOrder_Revision DEFAULT 0 FOR Revision`);
        console.log("Added new default constraint (0).");

        // 3. Update existing records from 1 to 0
        await pool.request().query(`UPDATE DeliveryOrder SET Revision = 0 WHERE Revision = 1`);
        console.log("Updated existing records to Revision 0.");

    } catch (err) {
        console.error("Error fixing revision:", err);
    } finally {
        sql.close();
    }
}

fixDeliveryOrderRevision();
