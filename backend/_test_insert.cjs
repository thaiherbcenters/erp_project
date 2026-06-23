const sql = require('mssql');
require('dotenv').config();
const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: { trustServerCertificate: true, encrypt: true }
};

async function test() {
    try {
        const pool = await sql.connect(config);
        const request = pool.request();
        
        request.input('quotationNo', sql.NVarChar, 'QT-TEST');
        request.input('docType', sql.NVarChar, 'quotation_thc');
        request.input('bankAccount', sql.NVarChar, 'ktb');
        request.input('customerName', sql.NVarChar, 'TEST CUSTOMER');
        request.input('address', sql.NVarChar, '123 Test St');
        request.input('phone', sql.NVarChar, '0123456789');
        request.input('taxId', sql.NVarChar, '1234567890123');
        request.input('billDate', sql.Date, '2023-10-10');
        request.input('validUntil', sql.Date, '2023-11-10');
        request.input('subTotal', sql.Decimal(18,2), 100);
        request.input('discountPercent', sql.Int, 0);
        request.input('discountAmount', sql.Decimal(18,2), 0);
        request.input('afterDiscount', sql.Decimal(18,2), 100);
        request.input('vatRate', sql.Int, 0);
        request.input('vatAmount', sql.Decimal(18,2), 0);
        request.input('shippingCost', sql.Decimal(18,2), 0);
        request.input('grandTotal', sql.Decimal(18,2), 100);
        request.input('depositPercent', sql.NVarChar, '0');
        request.input('depositAmount', sql.Decimal(18,2), 0);
        request.input('remainingAmount', sql.Decimal(18,2), 100);
        request.input('signer', sql.NVarChar, '');
        request.input('notes', sql.NVarChar, '');
        request.input('showDiscount', sql.Bit, 0);
        request.input('showVat', sql.Bit, 0);
        request.input('showDeposit', sql.Bit, 0);
        request.input('showShipping', sql.Bit, 0);
        request.input('designFee', sql.Decimal(18,2), 0);
        request.input('showDesignFee', sql.Bit, 0);
        request.input('status', sql.NVarChar, 'ร่าง');
        request.input('contractId', sql.Int, null);

        const headerResult = await request.query(`
            INSERT INTO Quotation (
                QuotationNo, ContractID, DocType, BankAccount, CustomerName, Address, Phone, TaxID,
                BillDate, ValidUntil, SubTotal, DiscountPercent, DiscountAmount, AfterDiscount,
                VatRate, VatAmount, ShippingCost, GrandTotal, DepositPercent, DepositAmount,
                RemainingAmount, Signer, Notes, ShowDiscountInPrint, ShowVatInPrint, ShowDepositInPrint, ShowShippingInPrint, DesignFee, ShowDesignFeeInPrint, Status
            )
            OUTPUT INSERTED.QuotationID
            VALUES (
                @quotationNo, @contractId, @docType, @bankAccount, @customerName, @address, @phone, @taxId,
                @billDate, @validUntil, @subTotal, @discountPercent, @discountAmount, @afterDiscount,
                @vatRate, @vatAmount, @shippingCost, @grandTotal, @depositPercent, @depositAmount,
                @remainingAmount, @signer, @notes, @showDiscount, @showVat, @showDeposit, @showShipping, @designFee, @showDesignFee, @status
            )
        `);
        console.log("Success:", headerResult.recordset);
    } catch (err) {
        console.error("DB Error:", err.message);
    } finally {
        process.exit();
    }
}
test();
