const { poolPromise, sql } = require('./config/db');
(async () => {
    try {
        const pool = await poolPromise;
        console.log("=== Fix: สร้าง Shipping Order สำหรับ OEM ที่หลุดไป ===\n");
        
        // Get planner data
        const planner = await pool.request()
            .query("SELECT PlannerID, Notes, Priority, DueDate FROM Planner WHERE PlannerID = 'JO-20260504-001'");
        const plan = planner.recordset[0];
        if (!plan) { console.log("❌ ไม่พบ Planner record"); process.exit(1); }
        
        const notes = plan.Notes;
        const custMatch = notes.match(/ลูกค้า:\s*(.+?)(?:\s*\||$)/);
        const soMatch = notes.match(/SO:\s*(SO-[\w-]+)/);
        
        console.log("Customer:", custMatch ? custMatch[1].trim() : 'N/A');
        console.log("SO No:", soMatch ? soMatch[1] : 'N/A');
        
        // Lookup SO address
        let shipAddress = '';
        let shipPhone = '';
        if (soMatch) {
            const soLookup = await pool.request()
                .input('SONo', sql.NVarChar, soMatch[1])
                .query('SELECT Address, Phone, CustomerPONumber FROM SalesOrder WHERE SalesOrderNo = @SONo');
            if (soLookup.recordset.length > 0) {
                shipAddress = soLookup.recordset[0].Address || '';
                shipPhone = soLookup.recordset[0].Phone || '';
                console.log("Address:", shipAddress || '(empty)');
                console.log("Phone:", shipPhone || '(empty)');
            }
        }
        
        // Get stock log for batch info
        const stockLog = await pool.request()
            .query("SELECT RefNo, ProductName, Quantity FROM Stock_Logs WHERE RefType = 'oem_direct' ORDER BY CreatedAt DESC");
        const log = stockLog.recordset[0];
        if (!log) { console.log("❌ ไม่พบ Stock Log"); process.exit(1); }
        
        // Check if shipping order already exists
        const existing = await pool.request().query("SELECT COUNT(*) as cnt FROM Shipping_Orders");
        if (existing.recordset[0].cnt > 0) {
            console.log("ℹ️ มี Shipping Order อยู่แล้ว ข้าม");
            process.exit(0);
        }
        
        const shipId = `SHP-${Date.now().toString().slice(-6)}`;
        await pool.request()
            .input('ShipmentID', sql.VarChar, shipId)
            .input('BatchNo', sql.VarChar, log.RefNo)
            .input('JobOrderID', sql.VarChar, 'JO-20260504-001')
            .input('ProductName', sql.NVarChar, log.ProductName)
            .input('Qty', sql.Int, Math.abs(log.Quantity))
            .input('CustomerName', sql.NVarChar, custMatch ? custMatch[1].trim() : '')
            .input('CustomerPO', sql.NVarChar, '')
            .input('Priority', sql.NVarChar, plan.Priority || 'ปกติ')
            .input('DueDate', sql.Date, plan.DueDate || null)
            .input('Notes', sql.NVarChar, `OEM จากการผลิต Batch: ${log.RefNo}`)
            .input('ShipAddress', sql.NVarChar, shipAddress)
            .input('ShipPhone', sql.NVarChar, shipPhone)
            .query(`INSERT INTO Shipping_Orders (ShipmentID, BatchNo, JobOrderID, ProductName, Quantity, CustomerName, CustomerPO, Status, Type, Priority, DueDate, Notes, ShippingAddress, CustomerPhone)
                    VALUES (@ShipmentID, @BatchNo, @JobOrderID, @ProductName, @Qty, @CustomerName, @CustomerPO, N'รอจัดส่ง', 'oem', @Priority, @DueDate, @Notes, @ShipAddress, @ShipPhone)`);
        
        console.log(`\n✅ สร้าง Shipping Order: ${shipId} สำเร็จ!`);
        process.exit(0);
    } catch (e) {
        console.error("❌ Error:", e.message);
        process.exit(1);
    }
})();
