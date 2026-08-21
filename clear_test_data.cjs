require('dotenv').config({path: './backend/.env'});
const { poolPromise, sql } = require('./backend/config/db.js');

async function run() {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        
        const tablesToClear = [
            // Sales & Quotation
            'QuotationItemHistory', 'QuotationHistory', 'QuotationItem', 'Quotation',
            'SalesOrderItemHistory', 'SalesOrderHistory', 'SalesOrderItem', 'SalesOrder',
            
            // Production & Planner
            'Production_Logs', 'Packaging_Tasks', 'Production_Tasks', 'Planner',
            
            // Shipping
            'Shipping_Orders',
            
            // QC
            'QC_Results', 'QC_Incoming', 'QC_InProcess', 'QC_FinishedGoods', 'QC_Production', 'QC_Defect_NCR',
            
            // Stock Logs
            'Stock_Logs'
        ];

        for (const table of tablesToClear) {
            console.log(`Clearing ${table}...`);
            await transaction.request().query(`DELETE FROM ${table}`);
        }

        // Reset Sequences to 0 or delete them
        await transaction.request().query(`DELETE FROM Sequences`);

        await transaction.commit();
        console.log('✅ Successfully cleared all test transaction data!');
    } catch (err) {
        console.error('❌ Error clearing data:', err);
        await transaction.rollback();
    }
    process.exit(0);
}

run();
