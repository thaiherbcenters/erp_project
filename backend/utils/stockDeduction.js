const sql = require('mssql');
const { poolPromise } = require('../config/db');

async function autoDeductStock(taskId, reqUser) {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Get task info
            const taskRes = await transaction.request()
                .input('TaskID', sql.VarChar, taskId)
                .query(`
                    SELECT pt.JobOrderID, pt.ExpectedQty, pt.BatchNo, 
                           p.FormulaID, 
                           f.BatchSize, f.Unit, f.UnitSize, f.FormulaType 
                    FROM Production_Tasks pt
                    LEFT JOIN Planner p ON pt.JobOrderID = p.PlannerID
                    LEFT JOIN RnD_Formulas f ON p.FormulaID = f.FormulaID
                    WHERE pt.TaskID = @TaskID
                `);
            
            if (taskRes.recordset.length === 0) throw new Error("Task not found");
            const task = taskRes.recordset[0];
            if (!task.FormulaID) {
                console.log('No formula linked, skipping auto deduct');
                await transaction.commit();
                return;
            }

            // Calculate scale factor
            let scaleFactor = 1;
            const expectedQty = task.ExpectedQty || 0; // Number of units to produce
            
            if (task.FormulaType === 'bulk') {
                const targetYieldGrams = expectedQty * (task.UnitSize || 1);
                let baseYieldGrams = task.BatchSize || 1;
                if (task.Unit === 'kg' || task.Unit === 'L' || task.Unit === 'กิโลกรัม' || task.Unit === 'ลิตร') {
                    baseYieldGrams *= 1000;
                }
                scaleFactor = targetYieldGrams / baseYieldGrams;
            } else {
                scaleFactor = expectedQty / (task.BatchSize || 1);
            }

            // 2. Get ingredients
            const ingRes = await transaction.request()
                .input('FormulaID', sql.VarChar, task.FormulaID)
                .query('SELECT * FROM RnD_Formula_Ingredients WHERE FormulaID = @FormulaID');
            
            const ingredients = ingRes.recordset;
            
            // 3. Deduct each ingredient
            for (const ing of ingredients) {
                if (!ing.MaterialID) continue; // Skip if no linked stock item
                
                const requiredQty = ing.Qty * scaleFactor;
                if (requiredQty <= 0) continue;

                // Find stock item
                const itemRes = await transaction.request()
                    .input('ItemID', sql.VarChar, ing.MaterialID)
                    .query('SELECT * FROM Stock_Items WHERE ItemID = @ItemID');
                
                if (itemRes.recordset.length === 0) continue;
                const stockItem = itemRes.recordset[0];

                if (stockItem.Category === 'สินค้ากึ่งสำเร็จรูป' || stockItem.Category === 'WIP') {
                    // It's a WIP: deduct from WIP_Lots FIFO
                    const lotsRes = await transaction.request()
                        .input('ItemID', sql.VarChar, stockItem.ItemID)
                        .query("SELECT * FROM WIP_Lots WHERE ItemID = @ItemID AND RemainingQty > 0 AND Status = 'พร้อมใช้' ORDER BY CreatedAt ASC");
                    
                    let remainingToDeduct = requiredQty;
                    
                    for (const lot of lotsRes.recordset) {
                        if (remainingToDeduct <= 0) break;
                        const deductAmount = Math.min(remainingToDeduct, lot.RemainingQty);
                        
                        // Update Lot
                        await transaction.request()
                            .input('LotID', sql.Int, lot.LotID)
                            .input('DeductQty', sql.Decimal(18,4), deductAmount)
                            .query("UPDATE WIP_Lots SET RemainingQty = RemainingQty - @DeductQty, Status = CASE WHEN RemainingQty - @DeductQty <= 0 THEN 'ใช้หมดแล้ว' ELSE 'พร้อมใช้' END WHERE LotID = @LotID");
                        
                        // Log Usage
                        await transaction.request()
                            .input('TaskID', sql.VarChar, taskId)
                            .input('BatchNo', sql.VarChar, task.BatchNo)
                            .input('ItemID', sql.VarChar, stockItem.ItemID)
                            .input('ItemName', sql.NVarChar, stockItem.ProductName)
                            .input('ItemCategory', sql.NVarChar, stockItem.Category)
                            .input('LotNo', sql.VarChar, lot.LotNo)
                            .input('QtyUsed', sql.Decimal(18,4), deductAmount)
                            .input('Unit', sql.NVarChar, stockItem.Unit)
                            .input('UsedBy', sql.NVarChar, reqUser)
                            .query(`
                                INSERT INTO Production_Material_Usage (TaskID, BatchNo, ItemID, ItemName, ItemCategory, LotNo, QtyUsed, Unit, UsedBy)
                                VALUES (@TaskID, @BatchNo, @ItemID, @ItemName, @ItemCategory, @LotNo, @QtyUsed, @Unit, @UsedBy)
                            `);
                        
                        remainingToDeduct -= deductAmount;
                    }
                    
                    // Note: If remainingToDeduct > 0, it means we don't have enough WIP stock!
                    // In a strict system, this would rollback. For now, we deduct what we can.
                    
                    // Deduct from total Stock_Items qty as well to keep in sync
                    const totalDeducted = requiredQty - remainingToDeduct;
                    if (totalDeducted > 0) {
                        await transaction.request()
                            .input('ItemID', sql.VarChar, stockItem.ItemID)
                            .input('DeductQty', sql.Int, Math.ceil(totalDeducted))
                            .query("UPDATE Stock_Items SET Quantity = Quantity - @DeductQty WHERE ItemID = @ItemID");
                            
                        await transaction.request()
                            .input('ItemID', sql.VarChar, stockItem.ItemID)
                            .input('Type', sql.VarChar, 'OUT')
                            .input('Quantity', sql.Int, Math.ceil(totalDeducted))
                            .input('RefNo', sql.VarChar, task.BatchNo)
                            .input('RefType', sql.VarChar, 'production')
                            .input('CreatedBy', sql.VarChar, reqUser)
                            .input('Notes', sql.NVarChar, 'ตัดสต็อกอัตโนมัติ (WIP) เริ่มผลิต ' + task.BatchNo)
                            .query(`INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, CreatedBy, Notes)
                                    VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @CreatedBy, @Notes)`);
                    }
                } else {
                    // Regular RM / PM stock deduction
                    await transaction.request()
                        .input('ItemID', sql.VarChar, stockItem.ItemID)
                        .input('DeductQty', sql.Int, Math.ceil(requiredQty))
                        .query("UPDATE Stock_Items SET Quantity = Quantity - @DeductQty WHERE ItemID = @ItemID");
                        
                    await transaction.request()
                        .input('ItemID', sql.VarChar, stockItem.ItemID)
                        .input('Type', sql.VarChar, 'OUT')
                        .input('Quantity', sql.Int, Math.ceil(requiredQty))
                        .input('RefNo', sql.VarChar, task.BatchNo)
                        .input('RefType', sql.VarChar, 'production')
                        .input('CreatedBy', sql.VarChar, reqUser)
                        .input('Notes', sql.NVarChar, 'ตัดสต็อกอัตโนมัติ เริ่มผลิต ' + task.BatchNo)
                        .query(`INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, CreatedBy, Notes)
                                VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @CreatedBy, @Notes)`);
                                
                    // Log Usage without specific lot (since RM lots aren't fully managed yet)
                    await transaction.request()
                        .input('TaskID', sql.VarChar, taskId)
                        .input('BatchNo', sql.VarChar, task.BatchNo)
                        .input('ItemID', sql.VarChar, stockItem.ItemID)
                        .input('ItemName', sql.NVarChar, stockItem.ProductName)
                        .input('ItemCategory', sql.NVarChar, stockItem.Category)
                        .input('LotNo', sql.VarChar, 'N/A')
                        .input('QtyUsed', sql.Decimal(18,4), requiredQty)
                        .input('Unit', sql.NVarChar, stockItem.Unit)
                        .input('UsedBy', sql.NVarChar, reqUser)
                        .query(`
                            INSERT INTO Production_Material_Usage (TaskID, BatchNo, ItemID, ItemName, ItemCategory, LotNo, QtyUsed, Unit, UsedBy)
                            VALUES (@TaskID, @BatchNo, @ItemID, @ItemName, @ItemCategory, @LotNo, @QtyUsed, @Unit, @UsedBy)
                        `);
                }
            }

            await transaction.commit();
            console.log(`✅ Auto-deducted stock for Task ${taskId}`);
        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }
    } catch (err) {
        console.error('❌ Error auto-deducting stock:', err);
    }
}

async function autoReceiveWIP(taskId, reqUser) {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Get task info and item category
            const taskRes = await transaction.request()
                .input('TaskID', sql.VarChar, taskId)
                .query(`
                    SELECT pt.JobOrderID, pt.BatchNo, pt.ProducedQty, 
                           p.FormulaID, f.Unit,
                           s.ItemID, s.Category, s.ProductName
                    FROM Production_Tasks pt
                    LEFT JOIN Planner p ON pt.JobOrderID = p.PlannerID
                    LEFT JOIN RnD_Formulas f ON p.FormulaID = f.FormulaID
                    LEFT JOIN Stock_Items s ON f.FormulaID = s.FormulaID
                    WHERE pt.TaskID = @TaskID
                `);
            
            if (taskRes.recordset.length === 0) throw new Error("Task not found");
            const task = taskRes.recordset[0];
            
            if (!task.Category || (task.Category !== 'สินค้ากึ่งสำเร็จรูป' && task.Category !== 'WIP')) {
                // Not a WIP, do nothing here
                await transaction.commit();
                return;
            }
            
            if (!task.ProducedQty || task.ProducedQty <= 0) {
                await transaction.commit();
                return;
            }

            // Generate Lot No (e.g. WIP-BatchNo)
            const lotNo = 'WIP-' + task.BatchNo;
            
            // Check if lot already exists
            const lotCheck = await transaction.request()
                .input('LotNo', sql.VarChar, lotNo)
                .query('SELECT LotID FROM WIP_Lots WHERE LotNo = @LotNo');
                
            if (lotCheck.recordset.length > 0) {
                // Already received
                await transaction.commit();
                return;
            }

            // Insert into WIP_Lots
            await transaction.request()
                .input('LotNo', sql.VarChar, lotNo)
                .input('ItemID', sql.VarChar, task.ItemID)
                .input('ItemName', sql.NVarChar, task.ProductName)
                .input('Quantity', sql.Decimal(18,4), task.ProducedQty)
                .input('Unit', sql.NVarChar, task.Unit)
                .input('ProductionDate', sql.Date, new Date())
                .input('TaskID', sql.VarChar, taskId)
                .input('CreatedBy', sql.NVarChar, reqUser)
                .query(`
                    INSERT INTO WIP_Lots (LotNo, ItemID, ItemName, Quantity, RemainingQty, Unit, ProductionDate, TaskID, Status, CreatedBy)
                    VALUES (@LotNo, @ItemID, @ItemName, @Quantity, @Quantity, @Unit, @ProductionDate, @TaskID, 'พร้อมใช้', @CreatedBy)
                `);

            // Also add to Stock_Items quantity
            await transaction.request()
                .input('ItemID', sql.VarChar, task.ItemID)
                .input('AddQty', sql.Int, Math.ceil(task.ProducedQty))
                .query("UPDATE Stock_Items SET Quantity = Quantity + @AddQty WHERE ItemID = @ItemID");

            // Log IN
            await transaction.request()
                .input('ItemID', sql.VarChar, task.ItemID)
                .input('Type', sql.VarChar, 'IN')
                .input('Quantity', sql.Int, Math.ceil(task.ProducedQty))
                .input('RefNo', sql.VarChar, task.BatchNo)
                .input('RefType', sql.VarChar, 'production')
                .input('CreatedBy', sql.VarChar, reqUser)
                .input('Notes', sql.NVarChar, 'รับเข้าจากการผลิต WIP ' + task.BatchNo)
                .query(`INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, CreatedBy, Notes)
                        VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @CreatedBy, @Notes)`);

            await transaction.commit();
            console.log(`✅ Auto-received WIP Lot ${lotNo} for Task ${taskId}`);
        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }
    } catch (err) {
        console.error('❌ Error auto-receiving WIP:', err);
    }
}

async function autoDeductPackaging(taskId, reqUser) {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Get packaging task info
            const taskRes = await transaction.request()
                .input('TaskID', sql.VarChar, taskId)
                .query(`
                    SELECT pt.Product, pt.Qty, pt.BatchNo
                    FROM Packaging_Tasks pt
                    WHERE pt.TaskID = @TaskID
                `);
            
            if (taskRes.recordset.length === 0) throw new Error("Packaging task not found");
            const task = taskRes.recordset[0];

            // Get FormulaID from Product Name
            const formulaRes = await transaction.request()
                .input('ProductName', sql.NVarChar, task.Product)
                .query('SELECT FormulaID FROM RnD_Formulas WHERE Name = @ProductName');
            
            if (formulaRes.recordset.length === 0) {
                console.log('No formula found for product, skipping packaging auto deduct');
                await transaction.commit();
                return;
            }
            const formulaId = formulaRes.recordset[0].FormulaID;

            // 2. Get packaging ingredients
            const ingRes = await transaction.request()
                .input('FormulaID', sql.VarChar, formulaId)
                .query("SELECT * FROM RnD_Formula_Ingredients WHERE FormulaID = @FormulaID AND IngredientType = 'packaging'");
            
            const ingredients = ingRes.recordset;
            const expectedQty = task.Qty || 0;
            
            // 3. Deduct each ingredient
            for (const ing of ingredients) {
                if (!ing.MaterialID) continue; 
                
                const requiredQty = ing.Qty * expectedQty;
                if (requiredQty <= 0) continue;

                const itemRes = await transaction.request()
                    .input('ItemID', sql.VarChar, ing.MaterialID)
                    .query('SELECT * FROM Stock_Items WHERE ItemID = @ItemID');
                
                if (itemRes.recordset.length === 0) continue;
                const stockItem = itemRes.recordset[0];

                await transaction.request()
                    .input('ItemID', sql.VarChar, stockItem.ItemID)
                    .input('DeductQty', sql.Int, Math.ceil(requiredQty))
                    .query("UPDATE Stock_Items SET Quantity = Quantity - @DeductQty WHERE ItemID = @ItemID");
                    
                await transaction.request()
                    .input('ItemID', sql.VarChar, stockItem.ItemID)
                    .input('Type', sql.VarChar, 'OUT')
                    .input('Quantity', sql.Int, Math.ceil(requiredQty))
                    .input('RefNo', sql.VarChar, taskId)
                    .input('RefType', sql.VarChar, 'packaging')
                    .input('CreatedBy', sql.VarChar, reqUser)
                    .input('Notes', sql.NVarChar, 'ตัดสต็อกบรรจุภัณฑ์อัตโนมัติ เริ่มบรรจุ ' + task.BatchNo)
                    .query(`INSERT INTO Stock_Logs (ItemID, Type, Quantity, RefNo, RefType, CreatedBy, Notes)
                            VALUES (@ItemID, @Type, @Quantity, @RefNo, @RefType, @CreatedBy, @Notes)`);
            }

            await transaction.commit();
            console.log(`✅ Auto-deducted packaging stock for Task ${taskId}`);
        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }
    } catch (err) {
        console.error('❌ Error auto-deducting packaging stock:', err);
    }
}

module.exports = { autoDeductStock, autoReceiveWIP, autoDeductPackaging };
