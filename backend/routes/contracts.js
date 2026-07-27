const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// GET all contracts
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT ContractID, ContractNo, ContractName, CustomerID, StartDate, EndDate, ContractValue, Status, CreatedAt
            FROM Contracts
            ORDER BY CreatedAt DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching contracts:', err);
        res.status(500).json({ success: false, message: 'Server error fetching contracts', error: err.message });
    }
});

// GET single contract by ID
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const id = req.params.id;
        const result = await pool.request()
            .input('ContractID', sql.Int, id)
            .query(`
                SELECT ContractID, ContractNo, ContractName, CustomerID, StartDate, EndDate, ContractValue, Status, CreatedAt
                FROM Contracts
                WHERE ContractID = @ContractID
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Contract not found' });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error('Error fetching contract details:', err);
        res.status(500).json({ success: false, message: 'Server error fetching contract', error: err.message });
    }
});

// GET documents linked to contract
router.get('/:id/documents', async (req, res) => {
    try {
        const pool = await poolPromise;
        const id = req.params.id;
        const result = await pool.request()
            .input('ContractID', sql.Int, id)
            .query(`
                SELECT DocumentID, DocumentNo, DocumentDate, DocumentType, Status, CreatedAt, HasAttachment, AttachmentPath
                FROM (
                    SELECT DocumentID, DocumentNo, DocumentDate, DocumentType, Status, CreatedAt,
                           CAST(CASE WHEN EXISTS(SELECT 1 FROM LegalDocumentAttachments a WHERE a.DocumentNo = LegalDocuments.DocumentNo) THEN 1 ELSE 0 END AS BIT) AS HasAttachment,
                           (SELECT TOP 1 FilePath FROM LegalDocumentAttachments a WHERE a.DocumentNo = LegalDocuments.DocumentNo ORDER BY UploadedAt DESC) AS AttachmentPath,
                           ROW_NUMBER() OVER(PARTITION BY DocumentNo ORDER BY Version DESC) as rn
                    FROM LegalDocuments
                    WHERE ContractID = @ContractID AND Status != 'พรีวิว'
                ) docs
                WHERE rn = 1
                
                UNION ALL
                
                SELECT DocumentID, DocumentNo, DocumentDate, DocumentType, Status, CreatedAt,
                       CAST(0 AS BIT) AS HasAttachment, NULL AS AttachmentPath
                FROM (
                    SELECT DocumentID, DocumentNo, DocumentDate, DocumentType, Status, CreatedAt,
                           ROW_NUMBER() OVER(PARTITION BY DocumentNo ORDER BY Version DESC) as rn
                    FROM TorBor1Documents
                    WHERE ContractID = @ContractID AND Status != 'พรีวิว'
                ) tb1docs
                WHERE rn = 1
                
                UNION ALL
                
                SELECT DocumentID, DocumentNo, DocumentDate, 'herbal_cert' AS DocumentType, Status, CreatedAt,
                       CAST(0 AS BIT) AS HasAttachment, NULL AS AttachmentPath
                FROM (
                    SELECT DocumentID, DocumentNo, DocumentDate, Status, CreatedAt,
                           ROW_NUMBER() OVER(PARTITION BY DocumentNo ORDER BY Version DESC) as rn
                    FROM HerbalCertDocuments
                    WHERE ContractID = @ContractID AND Status != 'พรีวิว'
                ) hcdocs
                WHERE rn = 1
                
                UNION ALL
                
                SELECT DocumentID, DocumentNo, DocumentDate, 'safety_cert' AS DocumentType, Status, CreatedAt,
                       CAST(0 AS BIT) AS HasAttachment, NULL AS AttachmentPath
                FROM (
                    SELECT documentId as DocumentID, 'SFTY-' + RIGHT('0000' + CAST(documentId AS VARCHAR(10)), 4) as DocumentNo, DocumentDate, Status, CreatedAt,
                           ROW_NUMBER() OVER(PARTITION BY documentId ORDER BY Version DESC) as rn
                    FROM SafetyCertDocuments
                    WHERE contractId = @ContractID AND Status != 'พรีวิว'
                ) scdocs
                WHERE rn = 1
                
                UNION ALL
                
                SELECT QuotationID as DocumentID, QuotationNo as DocumentNo, BillDate as DocumentDate, N'ใบเสนอราคา' as DocumentType, Status, CreatedAt,
                       CAST(0 AS BIT) AS HasAttachment, NULL AS AttachmentPath
                FROM Quotation
                WHERE ContractID = @ContractID AND (DocType IS NULL OR DocType NOT LIKE '%billing_invoice%')
                
                UNION ALL
                
                SELECT BillingInvoiceID as DocumentID, BillingInvoiceNo as DocumentNo, BillDate as DocumentDate, N'ใบวางบิล/ใบแจ้งหนี้' as DocumentType, Status, CreatedAt,
                       CAST(0 AS BIT) AS HasAttachment, NULL AS AttachmentPath
                FROM BillingInvoice
                WHERE ContractID = @ContractID
                
                UNION ALL
                
                SELECT SalesOrderID as DocumentID, SalesOrderNo as DocumentNo, OrderDate as DocumentDate, N'ใบสั่งซื้อ' as DocumentType, Status, CreatedAt,
                       CAST(0 AS BIT) AS HasAttachment, NULL AS AttachmentPath
                FROM SalesOrder
                WHERE ContractID = @ContractID
                
                UNION ALL
                  
                SELECT DeliveryOrderID as DocumentID, DeliveryOrderNo as DocumentNo, BillDate as DocumentDate, N'ใบส่งสินค้า' as DocumentType, Status, CreatedAt,
                       CAST(0 AS BIT) AS HasAttachment, NULL AS AttachmentPath
                FROM DeliveryOrder
                WHERE ContractID = @ContractID
                  
                UNION ALL
                  
                SELECT TaxInvoiceID as DocumentID, TaxInvoiceNo as DocumentNo, BillDate as DocumentDate, N'ใบแจ้งหนี้/ใบส่งสินค้า' as DocumentType, Status, CreatedAt,
                       CAST(0 AS BIT) AS HasAttachment, NULL AS AttachmentPath
                FROM TaxInvoice
                WHERE ContractID = @ContractID
                  
                UNION ALL
                  
                SELECT ReceiptID as DocumentID, ReceiptNo as DocumentNo, BillDate as DocumentDate, N'ใบเสร็จรับเงิน' as DocumentType, Status, CreatedAt,
                       CAST(0 AS BIT) AS HasAttachment, NULL AS AttachmentPath
                FROM Receipt
                WHERE ContractID = @ContractID
                  
                ORDER BY CreatedAt DESC
            `);
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching contract documents:', err);
        res.status(500).json({ success: false, message: 'Server error fetching documents', error: err.message });
    }
});

// POST new contract
router.post('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const data = req.body;

        const result = await pool.request()
            .input('ContractNo', sql.NVarChar, data.contractNo)
            .input('ContractName', sql.NVarChar, data.contractName)
            .input('CustomerID', sql.Int, data.customerId || null)
            .input('StartDate', sql.Date, data.startDate || null)
            .input('EndDate', sql.Date, data.endDate || null)
            .input('ContractValue', sql.Decimal(18, 2), data.contractValue || null)
            .input('Status', sql.NVarChar, data.status || 'กำลังดำเนินการ')
            .query(`
                INSERT INTO Contracts (ContractNo, ContractName, CustomerID, StartDate, EndDate, ContractValue, Status)
                OUTPUT INSERTED.ContractID
                VALUES (@ContractNo, @ContractName, @CustomerID, @StartDate, @EndDate, @ContractValue, @Status)
            `);

        res.json({ success: true, message: 'Contract created successfully', contractId: result.recordset[0].ContractID });
    } catch (err) {
        console.error('Error creating contract:', err);
        res.status(500).json({ success: false, message: 'Server error creating contract', error: err.message });
    }
});

// DELETE contract
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const id = req.params.id;

        const result = await pool.request()
            .input('ContractID', sql.Int, id)
            .query(`DELETE FROM Contracts WHERE ContractID = @ContractID`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Contract not found' });
        }

        res.json({ success: true, message: 'Contract deleted successfully' });
    } catch (err) {
        console.error('Error deleting contract:', err);
        res.status(500).json({ success: false, message: 'Server error deleting contract', error: err.message });
    }
});

module.exports = router;
