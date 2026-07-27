const { poolPromise, sql } = require('./config/db');

poolPromise.then(pool => pool.request().input('ContractID', sql.Int, 1).query(`
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
        SELECT documentId as DocumentID, CAST(documentId AS NVARCHAR(50)) as DocumentNo, DocumentDate, Status, CreatedAt,
               ROW_NUMBER() OVER(PARTITION BY documentId ORDER BY Version DESC) as rn
        FROM SafetyCertDocuments
        WHERE contractId = @ContractID AND Status != 'พรีวิว'
    ) scdocs
    WHERE rn = 1
    
    UNION ALL
    
    SELECT QuotationID as DocumentID, QuotationNo as DocumentNo, BillDate as DocumentDate, N'ใบเสนอราคา' as DocumentType, Status, CreatedAt,
           CAST(0 AS BIT) AS HasAttachment, NULL AS AttachmentPath
    FROM Quotation
    WHERE ContractID = @ContractID
    
    UNION ALL
    
    SELECT SalesOrderID as DocumentID, SalesOrderNo as DocumentNo, OrderDate as DocumentDate, N'ใบสั่งซื้อ' as DocumentType, Status, CreatedAt,
           CAST(0 AS BIT) AS HasAttachment, NULL AS AttachmentPath
    FROM SalesOrder
    WHERE ContractID = @ContractID
    
    ORDER BY CreatedAt DESC
`)).then(r => console.log('Query OK:', r.recordset)).catch(e => console.log('Query Error:', e.message)).finally(() => process.exit(0));
