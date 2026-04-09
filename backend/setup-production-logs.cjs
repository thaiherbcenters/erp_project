require('dotenv').config();
const { poolPromise } = require('./config/db');

async function createProductionLogsTable() {
    try {
        const pool = await poolPromise;

        // Create Production_Logs
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Production_Logs' AND xtype='U')
            BEGIN
                CREATE TABLE Production_Logs (
                    LogID INT IDENTITY(1,1) PRIMARY KEY,
                    TaskID VARCHAR(50) NOT NULL,
                    ProducedQty INT NOT NULL DEFAULT 0,
                    DefectQty INT NOT NULL DEFAULT 0,
                    OperatorID VARCHAR(50),
                    Notes NVARCHAR(MAX),
                    LogDate DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_Production_Logs_Tasks FOREIGN KEY (TaskID) REFERENCES Production_Tasks(TaskID) ON DELETE CASCADE
                )
                PRINT 'Table Production_Logs created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table Production_Logs already exists.';
            END
        `);

        // Insert some dummy log data for testing if there are existing tasks
        console.log('Inserting mock log data...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM Production_Logs WHERE TaskID = 'PT-001')
            BEGIN
                INSERT INTO Production_Logs (TaskID, ProducedQty, DefectQty, OperatorID, Notes, LogDate)
                VALUES 
                ('PT-001', 500, 5, 'op1', N'กะเช้า เครื่องเดินเรียบ', '2026-04-01 12:00:00'),
                ('PT-001', 400, 10, 'op1', N'กะบ่าย ความร้อนตกเล็กน้อย', '2026-04-01 16:00:00'),
                ('PT-002', 450, 5, 'op1', N'เร่งด่วน', '2026-04-02 12:00:00');
            END
        `);

        console.log('✅ Production Logs database setup completed.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error setting up Production Logs database:', error);
        process.exit(1);
    }
}

createProductionLogsTable();
