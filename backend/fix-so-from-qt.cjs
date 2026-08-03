require('dotenv').config();
const { sql, poolPromise } = require('./config/db');

(async () => {
    try {
        const pool = await poolPromise;

        // 1. Sync SalesOrder from linked Quotation for existing SOs
        await pool.request().query(`
            UPDATE S
            SET 
                S.ShowDiscountInPrint = ISNULL(S.ShowDiscountInPrint, Q.ShowDiscountInPrint),
                S.ShowVatInPrint = ISNULL(S.ShowVatInPrint, Q.ShowVatInPrint),
                S.ShowShippingInPrint = ISNULL(S.ShowShippingInPrint, Q.ShowShippingInPrint),
                S.DesignFee = CASE WHEN S.DesignFee IS NULL OR S.DesignFee = 0 THEN Q.DesignFee ELSE S.DesignFee END,
                S.ShowDesignFeeInPrint = ISNULL(S.ShowDesignFeeInPrint, Q.ShowDesignFeeInPrint),
                S.DepositPercent = CASE WHEN S.DepositPercent IS NULL OR S.DepositPercent = '0' THEN Q.DepositPercent ELSE S.DepositPercent END,
                S.DepositAmount = CASE WHEN S.DepositAmount IS NULL OR S.DepositAmount = 0 THEN Q.DepositAmount ELSE S.DepositAmount END,
                S.ShowDepositInPrint = CASE WHEN S.ShowDepositInPrint IS NULL OR S.ShowDepositInPrint = 0 THEN 1 ELSE S.ShowDepositInPrint END
            FROM SalesOrder S
            INNER JOIN Quotation Q ON S.QuotationID = Q.QuotationID OR S.QuotationNo = Q.QuotationNo;
        `);
        console.log('✅ Synced existing SalesOrders with Quotation deposit & print flags');

        // 2. Also ensure all SOs have ShowDepositInPrint = 1 if DepositPercent > 0
        await pool.request().query(`
            UPDATE SalesOrder 
            SET ShowDepositInPrint = 1 
            WHERE (DepositPercent IS NOT NULL AND DepositPercent <> '0') AND (ShowDepositInPrint IS NULL OR ShowDepositInPrint = 0);
        `);
        console.log('✅ Updated ShowDepositInPrint = 1 for SalesOrders with deposit');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing SO records:', err.message);
        process.exit(1);
    }
})();
