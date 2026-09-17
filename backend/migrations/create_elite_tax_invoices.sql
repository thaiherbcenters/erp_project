CREATE TABLE EliteTaxInvoices (
    id INT IDENTITY(1,1) PRIMARY KEY,
    DocNo VARCHAR(50) NOT NULL UNIQUE,
    DocDate DATE NOT NULL,
    CustomerName NVARCHAR(200) NOT NULL,
    CustomerAddress NVARCHAR(MAX),
    CustomerPhone VARCHAR(50),
    CustomerTaxId VARCHAR(50),
    ItemsJSON NVARCHAR(MAX),
    Subtotal DECIMAL(18,2) DEFAULT 0,
    Discount DECIMAL(18,2) DEFAULT 0,
    Vat DECIMAL(18,2) DEFAULT 0,
    GrandTotal DECIMAL(18,2) DEFAULT 0,
    Remarks NVARCHAR(MAX),
    CreatedBy INT,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
