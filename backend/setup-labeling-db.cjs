/**
 * setup-labeling-db.cjs
 */
require('dotenv').config();
const { poolPromise } = require('./config/db');

async function setup() {
    try {
        const pool = await poolPromise;
        console.log('Setting up Labeling tables...');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Label_Configurations')
            CREATE TABLE Label_Configurations (
                ConfigID INT IDENTITY(1,1) PRIMARY KEY,
                FGItemID VARCHAR(50) NOT NULL,
                FGProductName NVARCHAR(255),
                StickerItemID VARCHAR(50) NOT NULL,
                StickerName NVARCHAR(255),
                ApplyTo NVARCHAR(100) DEFAULT N'???',
                QtyPerUnit INT DEFAULT 1,
                Notes NVARCHAR(500) NULL,
                CreatedAt DATETIME DEFAULT GETDATE(),
                UpdatedAt DATETIME DEFAULT GETDATE()
            )
        `);
        console.log('Label_Configurations table ready');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Labeling_Tasks')
            CREATE TABLE Labeling_Tasks (
                TaskID VARCHAR(50) PRIMARY KEY,
                PackagingTaskID VARCHAR(50),
                ProductionTaskID VARCHAR(50),
                JobOrderID VARCHAR(50),
                ProductName NVARCHAR(255),
                BatchNo VARCHAR(50),
                Qty INT DEFAULT 0,
                LabeledQty INT DEFAULT 0,
                LabelType VARCHAR(20) DEFAULT 'stock',
                CustomerName NVARCHAR(255) NULL,
                StickerOrderedAt DATETIME NULL,
                StickerReceivedAt DATETIME NULL,
                StickerSupplier NVARCHAR(255) NULL,
                StickerNote NVARCHAR(MAX) NULL,
                Status NVARCHAR(50) DEFAULT N'????????????',
                Assignee NVARCHAR(100) NULL,
                Line VARCHAR(100) NULL,
                StartedAt DATETIME NULL,
                CompletedAt DATETIME NULL,
                LabelConfigJSON NVARCHAR(MAX) NULL,
                CreatedAt DATETIME DEFAULT GETDATE(),
                UpdatedAt DATETIME DEFAULT GETDATE()
            )
        `);
        console.log('Labeling_Tasks table ready');

        console.log('Labeling DB setup complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

setup();
