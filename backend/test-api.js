const fetch = require('node-fetch');

async function testCreate() {
    try {
        require('dotenv').config();
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ userId: 1, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const res = await fetch('http://localhost:5000/api/quotations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                customerId: null,
                customerName: 'Test Customer',
                billDate: '2026-08-14',
                validUntil: '2026-09-14',
                quotationNo: 'TEST-1234',
                docType: 'quotation',
                bankAccount: 'กสิกรไทย',
                subTotal: 50,
                discountPercent: 0,
                discountAmount: 0,
                afterDiscount: 50,
                vatRate: 7,
                vatAmount: 3.5,
                shippingCost: 0,
                grandTotal: 53.5,
                depositPercent: '100%',
                depositAmount: 53.5,
                remainingAmount: 0,
                items: [
                    {
                        name: 'ยาหม่อง',
                        qty: 1,
                        price: 50,
                        amount: 50,
                        unit: 'ขวด'
                    }
                ]
            })
        });

        const json = await res.json();
        console.log("POST Response:", json);
        
        const sql = require('mssql');
        const config = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, server: process.env.DB_SERVER, database: process.env.DB_NAME, options: { encrypt: false, trustServerCertificate: true } };
        const pool = await sql.connect(config);
        const dbRes = await pool.request().query(`SELECT TOP 1 QuotationID, ItemName, Qty, Unit FROM QuotationItem WHERE QuotationID = ${json.data ? json.data.quotationId : 0}`);
        console.table(dbRes.recordset);
        sql.close();
    } catch(err) {
        console.error(err);
    }
}
testCreate();
