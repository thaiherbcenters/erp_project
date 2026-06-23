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

const reqBody = {
    quotationNo: "QT20260615-001",
    docType: "quotation_thc",
    bankAccount: "ktb",
    customerTypeId: "",
    customerName: "Test Company",
    contactPerson: "",
    email: "",
    address: "Bangkok",
    phone: "0123456789",
    taxId: "",
    billDate: "2026-06-15",
    validUntil: "2026-07-15",
    subTotal: 1000,
    discountPercent: 0,
    discountAmount: 0,
    afterDiscount: 1000,
    vatRate: 0,
    vatAmount: 0,
    shippingCost: 0,
    grandTotal: 1000,
    depositPercent: "0",
    depositAmount: 0,
    remainingAmount: 1000,
    signer: "",
    notes: "test notes",
    showDiscountInPrint: false,
    showVatInPrint: false,
    showDepositInPrint: true,
    showShippingInPrint: true,
    designFee: 500,
    showDesignFeeInPrint: false,
    contractId: "", // FROM FRONTEND when nothing is selected
    status: "พร้อมใช้",
    items: [
        {
            name: "ยาดมสมุนไพร",
            qty: 10,
            price: 79,
            amount: 790,
            isPromo: false,
            promoMultiplier: 1,
            imageURL: null
        }
    ]
};

async function run() {
    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        const {
            quotationNo, docType, bankAccount, customerName, address, phone, taxId,
            billDate, validUntil, subTotal, discountPercent, discountAmount,
            afterDiscount, vatRate, vatAmount, shippingCost, grandTotal,
            depositPercent, depositAmount, remainingAmount, signer, notes,
            showDiscountInPrint, showVatInPrint, showDepositInPrint, showShippingInPrint,
            designFee, showDesignFeeInPrint, status, contractId, items
        } = reqBody;

        request.input('quotationNo', sql.NVarChar, quotationNo);
        request.input('docType', sql.NVarChar, docType);
        request.input('bankAccount', sql.NVarChar, bankAccount);
        request.input('customerName', sql.NVarChar, customerName);
        request.input('address', sql.NVarChar, address);
        request.input('phone', sql.NVarChar, phone);
        request.input('taxId', sql.NVarChar, taxId);
        request.input('billDate', sql.Date, billDate);
        request.input('validUntil', sql.Date, validUntil);
        request.input('subTotal', sql.Decimal(18,2), subTotal);
        request.input('discountPercent', sql.Int, discountPercent);
        request.input('discountAmount', sql.Decimal(18,2), discountAmount);
        request.input('afterDiscount', sql.Decimal(18,2), afterDiscount);
        request.input('vatRate', sql.Int, vatRate);
        request.input('vatAmount', sql.Decimal(18,2), vatAmount);
        request.input('shippingCost', sql.Decimal(18,2), shippingCost);
        request.input('grandTotal', sql.Decimal(18,2), grandTotal);
        request.input('depositPercent', sql.NVarChar, depositPercent);
        request.input('depositAmount', sql.Decimal(18,2), depositAmount);
        request.input('remainingAmount', sql.Decimal(18,2), remainingAmount);
        request.input('signer', sql.NVarChar, signer);
        request.input('notes', sql.NVarChar, notes);
        request.input('showDiscount', sql.Bit, showDiscountInPrint ? 1 : 0);
        request.input('showVat', sql.Bit, showVatInPrint ? 1 : 0);
        request.input('showDeposit', sql.Bit, showDepositInPrint ? 1 : 0);
        request.input('showShipping', sql.Bit, showShippingInPrint ? 1 : 0);
        request.input('designFee', sql.Decimal(18,2), designFee || 0);
        request.input('showDesignFee', sql.Bit, showDesignFeeInPrint ? 1 : 0);
        request.input('status', sql.NVarChar, status || 'ร่าง');
        request.input('contractId', sql.Int, contractId || null);

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

        const quotationId = headerResult.recordset[0].QuotationID;
        console.log("Header success. ID:", quotationId);

        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const itemReq = new sql.Request(transaction);
                itemReq.input('quotationId', sql.Int, quotationId);
                itemReq.input('itemOrder', sql.Int, i + 1);
                itemReq.input('itemName', sql.NVarChar, it.name);
                itemReq.input('qty', sql.Decimal(18,2), it.qty);
                itemReq.input('price', sql.Decimal(18,2), it.price);
                itemReq.input('amount', sql.Decimal(18,2), it.amount);
                itemReq.input('isPromo', sql.Bit, it.isPromo ? 1 : 0);
                itemReq.input('promoMultiplier', sql.Int, it.promoMultiplier || 1);
                itemReq.input('imageURL', sql.NVarChar, it.imageURL || '');

                await itemReq.query(`
                    INSERT INTO QuotationItem (QuotationID, ItemOrder, ItemName, Qty, Price, Amount, IsPromo, PromoMultiplier, ImageURL)
                    VALUES (@quotationId, @itemOrder, @itemName, @qty, @price, @amount, @isPromo, @promoMultiplier, @imageURL)
                `);
            }
        }
        
        await transaction.commit();
        console.log("All success");
    } catch (e) {
        if (transaction) await transaction.rollback();
        console.error("FAILED:", e.message);
    } finally {
        process.exit();
    }
}
run();
