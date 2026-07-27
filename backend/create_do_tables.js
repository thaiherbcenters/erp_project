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
        await pool.request().query(`
            CREATE TABLE DeliveryOrder (
                DeliveryOrderID int IDENTITY(1,1) PRIMARY KEY,
                DeliveryOrderNo nvarchar(50) NULL,
                ContractID int NULL,
                DocType nvarchar(50) NULL,
                BankAccount nvarchar(20) NULL,
                CustomerName nvarchar(200) NULL,
                Address nvarchar(500) NULL,
                Phone nvarchar(50) NULL,
                TaxID nvarchar(20) NULL,
                BillDate date NULL,
                ValidUntil date NULL,
                SubTotal decimal(18,2) NULL,
                DiscountPercent int NULL,
                DiscountAmount decimal(18,2) NULL,
                AfterDiscount decimal(18,2) NULL,
                VatRate int NULL,
                VatAmount decimal(18,2) NULL,
                ShippingCost decimal(18,2) NULL,
                DesignFee decimal(18,2) NULL,
                GrandTotal decimal(18,2) NULL,
                DepositPercent nvarchar(10) NULL,
                DepositAmount decimal(18,2) NULL,
                RemainingAmount decimal(18,2) NULL,
                Signer nvarchar(100) NULL,
                Notes nvarchar(MAX) NULL,
                ShowDiscountInPrint bit NULL,
                ShowVatInPrint bit NULL,
                ShowDepositInPrint bit NULL,
                ShowShippingInPrint bit NULL,
                ShowDesignFeeInPrint bit NULL,
                FdaCustomerCode nvarchar(50) NULL,
                FdaEmail nvarchar(100) NULL,
                FdaProjectName nvarchar(200) NULL,
                FdaCreditTerms nvarchar(50) NULL,
                FdaServiceRegister bit NULL,
                FdaServiceRegisterPrice decimal(18,2) NULL,
                FdaServiceTrademark bit NULL,
                FdaServiceTrademarkPrice decimal(18,2) NULL,
                Status nvarchar(20) NULL,
                CreatedAt datetime DEFAULT GETDATE(),
                CreatedBy nvarchar(50) NULL,
                CustomerOrder nvarchar(100) NULL,
                PurchaseNo nvarchar(100) NULL,
                Salesperson nvarchar(100) NULL,
                TermOfPayment nvarchar(100) NULL,
                Revision int DEFAULT 1,
                UpdatedAt datetime DEFAULT GETDATE(),
                CustomerID int NULL
            );

            CREATE TABLE DeliveryOrderItem (
                ItemID int IDENTITY(1,1) PRIMARY KEY,
                DeliveryOrderID int NULL,
                ItemOrder int NULL,
                ItemName nvarchar(500) NULL,
                Qty decimal(18,2) NULL,
                Price decimal(18,2) NULL,
                Amount decimal(18,2) NULL,
                IsPromo bit NULL,
                PromoMultiplier decimal(18,2) NULL,
                ImageURL nvarchar(500) NULL,
                FOREIGN KEY (DeliveryOrderID) REFERENCES DeliveryOrder(DeliveryOrderID) ON DELETE CASCADE
            );

            CREATE TABLE DeliveryOrderHistory (
                HistoryID int IDENTITY(1,1) PRIMARY KEY,
                CustomerID int NULL,
                DeliveryOrderID int NULL,
                Revision int NULL,
                DeliveryOrderNo nvarchar(50) NULL,
                ContractID int NULL,
                DocType nvarchar(50) NULL,
                BankAccount nvarchar(20) NULL,
                CustomerName nvarchar(200) NULL,
                Address nvarchar(500) NULL,
                Phone nvarchar(50) NULL,
                TaxID nvarchar(20) NULL,
                BillDate date NULL,
                ValidUntil date NULL,
                SubTotal decimal(18,2) NULL,
                DiscountPercent int NULL,
                DiscountAmount decimal(18,2) NULL,
                AfterDiscount decimal(18,2) NULL,
                VatRate int NULL,
                VatAmount decimal(18,2) NULL,
                ShippingCost decimal(18,2) NULL,
                DesignFee decimal(18,2) NULL,
                GrandTotal decimal(18,2) NULL,
                DepositPercent nvarchar(10) NULL,
                DepositAmount decimal(18,2) NULL,
                RemainingAmount decimal(18,2) NULL,
                Signer nvarchar(100) NULL,
                Notes nvarchar(MAX) NULL,
                ShowDiscountInPrint bit NULL,
                ShowVatInPrint bit NULL,
                ShowDepositInPrint bit NULL,
                ShowShippingInPrint bit NULL,
                ShowDesignFeeInPrint bit NULL,
                FdaCustomerCode nvarchar(50) NULL,
                FdaEmail nvarchar(100) NULL,
                FdaProjectName nvarchar(200) NULL,
                FdaCreditTerms nvarchar(50) NULL,
                FdaServiceRegister bit NULL,
                FdaServiceRegisterPrice decimal(18,2) NULL,
                FdaServiceTrademark bit NULL,
                FdaServiceTrademarkPrice decimal(18,2) NULL,
                Status nvarchar(20) NULL,
                CreatedAt datetime NULL,
                CreatedBy nvarchar(50) NULL,
                CustomerOrder nvarchar(100) NULL,
                PurchaseNo nvarchar(100) NULL,
                Salesperson nvarchar(100) NULL,
                TermOfPayment nvarchar(100) NULL,
                BackupAt datetime DEFAULT GETDATE()
            );

            CREATE TABLE DeliveryOrderItemHistory (
                ItemHistoryID int IDENTITY(1,1) PRIMARY KEY,
                HistoryID int NULL,
                ItemOrder int NULL,
                ItemName nvarchar(500) NULL,
                Qty decimal(18,2) NULL,
                Price decimal(18,2) NULL,
                Amount decimal(18,2) NULL,
                IsPromo bit NULL,
                PromoMultiplier decimal(18,2) NULL,
                ImageURL nvarchar(500) NULL,
                FOREIGN KEY (HistoryID) REFERENCES DeliveryOrderHistory(HistoryID) ON DELETE CASCADE
            );
        `);
        console.log("DeliveryOrder tables created successfully!");
    } catch (err) {
        console.error("Error creating tables:", err);
    }
    process.exit(0);
});
