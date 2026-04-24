const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// Helper to format date in local timezone to prevent UTC timezone shifts
const formatDateLocal = (dateObj) => {
    if (!dateObj) return null;
    // If it's a string, parse it first
    if (typeof dateObj === 'string') dateObj = new Date(dateObj);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


// =====================================================================
// GET /api/rnd/formulas — สูตรทั้งหมด (พร้อม ingredients)
// =====================================================================
router.get('/formulas', async (req, res) => {
    try {
        const pool = await poolPromise;
        const formulasRes = await pool.request().query('SELECT * FROM RnD_Formulas ORDER BY CreatedAt DESC');
        const ingredientsRes = await pool.request().query('SELECT * FROM RnD_Formula_Ingredients ORDER BY FormulaID, ID');

        const formulas = formulasRes.recordset.map(f => ({
            id: f.FormulaID,
            name: f.Name,
            category: f.Category,
            version: f.Version,
            status: f.Status,
            batchSize: f.BatchSize,
            unit: f.Unit,
            shelfLife: f.ShelfLife,
            description: f.Description,
            instructions: f.InstructionsJSON ? JSON.parse(f.InstructionsJSON) : [],
            createdBy: f.CreatedBy,
            createdDate: formatDateLocal(f.CreatedDate),
            approvedBy: f.ApprovedBy,
            approvedDate: formatDateLocal(f.ApprovedDate),
            qcApprovedBy: f.QcApprovedBy,
            qcApprovedDate: formatDateLocal(f.QcApprovedDate),
            pharmApprovedBy: f.PharmApprovedBy,
            pharmApprovedDate: formatDateLocal(f.PharmApprovedDate),
            ingredients: ingredientsRes.recordset
                .filter(i => i.FormulaID === f.FormulaID)
                .map(i => ({
                    materialId: i.MaterialID,
                    name: i.MaterialName,
                    qty: i.Qty,
                    unit: i.Unit,
                })),
        }));

        res.json(formulas);
    } catch (err) {
        console.error('Error fetching formulas:', err);
        res.status(500).json({ message: 'Error fetching formulas' });
    }
});

// =====================================================================
// GET /api/rnd/formulas/:id — สูตรเดียว + ingredients
// =====================================================================
router.get('/formulas/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const fRes = await pool.request()
            .input('FormulaID', sql.VarChar, req.params.id)
            .query('SELECT * FROM RnD_Formulas WHERE FormulaID = @FormulaID');

        if (fRes.recordset.length === 0) {
            return res.status(404).json({ message: 'Formula not found' });
        }

        const f = fRes.recordset[0];
        const iRes = await pool.request()
            .input('FormulaID', sql.VarChar, req.params.id)
            .query('SELECT * FROM RnD_Formula_Ingredients WHERE FormulaID = @FormulaID ORDER BY ID');

        res.json({
            id: f.FormulaID,
            name: f.Name,
            category: f.Category,
            version: f.Version,
            status: f.Status,
            batchSize: f.BatchSize,
            unit: f.Unit,
            shelfLife: f.ShelfLife,
            description: f.Description,
            instructions: f.InstructionsJSON ? JSON.parse(f.InstructionsJSON) : [],
            createdBy: f.CreatedBy,
            createdDate: formatDateLocal(f.CreatedDate),
            approvedBy: f.ApprovedBy,
            approvedDate: formatDateLocal(f.ApprovedDate),
            ingredients: iRes.recordset.map(i => ({
                materialId: i.MaterialID,
                name: i.MaterialName,
                qty: i.Qty,
                unit: i.Unit,
            })),
        });
    } catch (err) {
        console.error('Error fetching formula:', err);
        res.status(500).json({ message: 'Error fetching formula' });
    }
});

// =====================================================================
// POST /api/rnd/formulas — สร้างสูตรใหม่
// =====================================================================
router.post('/formulas', async (req, res) => {
    try {
        const { name, category, version, batchSize, unit, shelfLife, description, instructions, ingredients, createdBy } = req.body;
        const pool = await poolPromise;

        // Generate ID
        const countRes = await pool.request().query("SELECT COUNT(*) as cnt FROM RnD_Formulas");
        const newNum = countRes.recordset[0].cnt + 1;
        const newId = `FM-${newNum.toString().padStart(3, '0')}`;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, newId)
                .input('Name', sql.NVarChar, name)
                .input('Category', sql.NVarChar, category || '')
                .input('Version', sql.VarChar, version || 'v1.0')
                .input('Status', sql.NVarChar, 'ร่าง')
                .input('BatchSize', sql.Int, batchSize || 0)
                .input('Unit', sql.NVarChar, unit || '')
                .input('ShelfLife', sql.NVarChar, shelfLife || '')
                .input('Description', sql.NVarChar, description || '')
                .input('InstructionsJSON', sql.NVarChar, JSON.stringify(instructions || []))
                .input('CreatedBy', sql.NVarChar, createdBy || 'system')
                .input('CreatedDate', sql.Date, new Date())
                .query(`
                    INSERT INTO RnD_Formulas (FormulaID, Name, Category, Version, Status, BatchSize, Unit, ShelfLife, Description, InstructionsJSON, CreatedBy, CreatedDate)
                    VALUES (@FormulaID, @Name, @Category, @Version, @Status, @BatchSize, @Unit, @ShelfLife, @Description, @InstructionsJSON, @CreatedBy, @CreatedDate)
                `);

            // Insert ingredients
            if (ingredients && ingredients.length > 0) {
                for (const ing of ingredients) {
                    await new sql.Request(transaction)
                        .input('FormulaID', sql.VarChar, newId)
                        .input('MaterialID', sql.VarChar, ing.materialId || '')
                        .input('MaterialName', sql.NVarChar, ing.name || '')
                        .input('Qty', sql.Decimal(10, 2), ing.qty || 0)
                        .input('Unit', sql.NVarChar, ing.unit || '')
                        .query(`
                            INSERT INTO RnD_Formula_Ingredients (FormulaID, MaterialID, MaterialName, Qty, Unit)
                            VALUES (@FormulaID, @MaterialID, @MaterialName, @Qty, @Unit)
                        `);
                }
            }

            await transaction.commit();
            res.status(201).json({ success: true, formulaId: newId });
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
    } catch (err) {
        console.error('Error creating formula:', err);
        res.status(500).json({ message: 'Error creating formula' });
    }
});

// =====================================================================
// GET /api/rnd/materials — วัตถุดิบทั้งหมด
// =====================================================================
router.get('/materials', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM RnD_RawMaterials ORDER BY MaterialID');
        const materials = result.recordset.map(m => ({
            id: m.MaterialID,
            name: m.Name,
            unit: m.Unit,
            stock: m.Stock,
            minStock: m.MinStock,
            costPerUnit: m.CostPerUnit,
            category: m.Category,
        }));
        res.json(materials);
    } catch (err) {
        console.error('Error fetching materials:', err);
        res.status(500).json({ message: 'Error fetching materials' });
    }
});

// =====================================================================
// GET /api/rnd/projects — โครงการวิจัยทั้งหมด
// =====================================================================
router.get('/projects', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM RnD_Projects ORDER BY ProjectID DESC');
        const projects = result.recordset.map(p => ({
            id: p.ProjectID,
            code: p.Code,
            name: p.Name,
            category: p.Category,
            researcher: p.Researcher,
            startDate: formatDateLocal(p.StartDate),
            targetDate: formatDateLocal(p.TargetDate),
            phase: p.Phase,
            progress: p.Progress,
            status: p.Status,
            formulaRef: p.FormulaRef,
        }));
        res.json(projects);
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ message: 'Error fetching projects' });
    }
});

// =====================================================================
// GET /api/rnd/experiments — ผลทดลองทั้งหมด
// =====================================================================
router.get('/experiments', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM RnD_Experiments ORDER BY ExperimentDate DESC');
        const experiments = result.recordset.map(e => ({
            id: e.ExperimentID,
            code: e.Code,
            projectCode: e.ProjectCode,
            name: e.Name,
            date: formatDateLocal(e.ExperimentDate),
            result: e.Result,
            note: e.Note,
        }));
        res.json(experiments);
    } catch (err) {
        console.error('Error fetching experiments:', err);
        res.status(500).json({ message: 'Error fetching experiments' });
    }
});
// =====================================================================
// PUT /api/rnd/formulas/:id — แก้ไขสูตร
// =====================================================================
router.put('/formulas/:id', async (req, res) => {
    try {
        const { name, category, version, batchSize, unit, shelfLife, description, instructions, ingredients } = req.body;
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, req.params.id)
                .input('Name', sql.NVarChar, name)
                .input('Category', sql.NVarChar, category || '')
                .input('Version', sql.VarChar, version || 'v1.0')
                .input('BatchSize', sql.Int, batchSize || 0)
                .input('Unit', sql.NVarChar, unit || '')
                .input('ShelfLife', sql.NVarChar, shelfLife || '')
                .input('Description', sql.NVarChar, description || '')
                .input('InstructionsJSON', sql.NVarChar, JSON.stringify(instructions || []))
                .query(`UPDATE RnD_Formulas SET Name=@Name, Category=@Category, Version=@Version, BatchSize=@BatchSize, Unit=@Unit, ShelfLife=@ShelfLife, Description=@Description, InstructionsJSON=@InstructionsJSON WHERE FormulaID=@FormulaID`);

            // Replace ingredients
            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, req.params.id)
                .query('DELETE FROM RnD_Formula_Ingredients WHERE FormulaID=@FormulaID');

            if (ingredients && ingredients.length > 0) {
                for (const ing of ingredients) {
                    await new sql.Request(transaction)
                        .input('FormulaID', sql.VarChar, req.params.id)
                        .input('MaterialID', sql.VarChar, ing.materialId || '')
                        .input('MaterialName', sql.NVarChar, ing.name || '')
                        .input('Qty', sql.Decimal(10, 2), ing.qty || 0)
                        .input('Unit', sql.NVarChar, ing.unit || '')
                        .query('INSERT INTO RnD_Formula_Ingredients (FormulaID, MaterialID, MaterialName, Qty, Unit) VALUES (@FormulaID, @MaterialID, @MaterialName, @Qty, @Unit)');
                }
            }
            await transaction.commit();
            res.json({ success: true });
        } catch (txErr) { await transaction.rollback(); throw txErr; }
    } catch (err) {
        console.error('Error updating formula:', err);
        res.status(500).json({ message: 'Error updating formula' });
    }
});

// =====================================================================
// DELETE /api/rnd/formulas/:id — ลบสูตร
// =====================================================================
router.delete('/formulas/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const reqParam = new sql.Request(transaction).input('FormulaID', sql.VarChar, req.params.id);
            
            // Delete related records first
            await reqParam.query('DELETE FROM RnD_Formula_Ingredients WHERE FormulaID=@FormulaID');
            await reqParam.query('DELETE FROM RnD_Formula_Tests WHERE FormulaID=@FormulaID');
            
            // Finally delete formula
            await reqParam.query('DELETE FROM RnD_Formulas WHERE FormulaID=@FormulaID');
            
            await transaction.commit();
            res.json({ success: true, message: 'Deleted successfully' });
        } catch (txErr) { await transaction.rollback(); throw txErr; }
    } catch (err) {
        console.error('Error deleting formula:', err);
        res.status(500).json({ message: 'Error deleting formula' });
    }
});

// =====================================================================
// PUT /api/rnd/formulas/:id/status — เปลี่ยนสถานะสูตร (Workflow)
// =====================================================================
router.put('/formulas/:id/status', async (req, res) => {
    try {
        const { status, approvedBy } = req.body;
        const pool = await poolPromise;
        const updates = { Status: status };
        let query = 'UPDATE RnD_Formulas SET Status=@Status';
        const request = pool.request()
            .input('FormulaID', sql.VarChar, req.params.id)
            .input('Status', sql.NVarChar, status);

        if (status === 'อนุมัติ' && approvedBy) {
            query += ', ApprovedBy=@ApprovedBy, ApprovedDate=@ApprovedDate';
            request.input('ApprovedBy', sql.NVarChar, approvedBy);
            request.input('ApprovedDate', sql.Date, new Date());
        }
        query += ' WHERE FormulaID=@FormulaID';
        await request.query(query);
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating formula status:', err);
        res.status(500).json({ message: 'Error updating formula status' });
    }
});

// =====================================================================
// POST /api/rnd/materials — สร้างวัตถุดิบ
// =====================================================================
router.post('/materials', async (req, res) => {
    try {
        const { name, unit, stock, minStock, costPerUnit, category } = req.body;
        const pool = await poolPromise;
        const countRes = await pool.request().query("SELECT COUNT(*) as cnt FROM RnD_RawMaterials");
        const newNum = countRes.recordset[0].cnt + 1;
        const newId = `RM-${newNum.toString().padStart(3, '0')}`;

        await pool.request()
            .input('MaterialID', sql.VarChar, newId)
            .input('Name', sql.NVarChar, name)
            .input('Unit', sql.NVarChar, unit || '')
            .input('Stock', sql.Decimal(10, 2), stock || 0)
            .input('MinStock', sql.Decimal(10, 2), minStock || 0)
            .input('CostPerUnit', sql.Decimal(10, 2), costPerUnit || 0)
            .input('Category', sql.NVarChar, category || '')
            .query('INSERT INTO RnD_RawMaterials (MaterialID, Name, Unit, Stock, MinStock, CostPerUnit, Category) VALUES (@MaterialID, @Name, @Unit, @Stock, @MinStock, @CostPerUnit, @Category)');

        res.status(201).json({ success: true, materialId: newId });
    } catch (err) {
        console.error('Error creating material:', err);
        res.status(500).json({ message: 'Error creating material' });
    }
});

// =====================================================================
// PUT /api/rnd/materials/:id — แก้ไขวัตถุดิบ
// =====================================================================
router.put('/materials/:id', async (req, res) => {
    try {
        const { name, unit, stock, minStock, costPerUnit, category } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('MaterialID', sql.VarChar, req.params.id)
            .input('Name', sql.NVarChar, name)
            .input('Unit', sql.NVarChar, unit || '')
            .input('Stock', sql.Decimal(10, 2), stock || 0)
            .input('MinStock', sql.Decimal(10, 2), minStock || 0)
            .input('CostPerUnit', sql.Decimal(10, 2), costPerUnit || 0)
            .input('Category', sql.NVarChar, category || '')
            .query('UPDATE RnD_RawMaterials SET Name=@Name, Unit=@Unit, Stock=@Stock, MinStock=@MinStock, CostPerUnit=@CostPerUnit, Category=@Category WHERE MaterialID=@MaterialID');
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating material:', err);
        res.status(500).json({ message: 'Error updating material' });
    }
});

// =====================================================================
// DELETE /api/rnd/materials/:id — ลบวัตถุดิบ
// =====================================================================
router.delete('/materials/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('MaterialID', sql.VarChar, req.params.id)
            .query('DELETE FROM RnD_RawMaterials WHERE MaterialID=@MaterialID');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting material:', err);
        res.status(500).json({ message: 'Error deleting material' });
    }
});

// =====================================================================
// POST /api/rnd/projects — สร้างโครงการวิจัย
// =====================================================================
router.post('/projects', async (req, res) => {
    try {
        const { name, category, researcher, startDate, targetDate, phase, formulaRef } = req.body;
        const pool = await poolPromise;
        const yr = new Date().getFullYear();
        const countRes = await pool.request().query(`SELECT COUNT(*) as cnt FROM RnD_Projects WHERE Code LIKE 'RD-${yr}-%'`);
        const newNum = countRes.recordset[0].cnt + 1;
        const newCode = `RD-${yr}-${newNum.toString().padStart(3, '0')}`;

        await pool.request()
            .input('Code', sql.VarChar, newCode)
            .input('Name', sql.NVarChar, name)
            .input('Category', sql.NVarChar, category || '')
            .input('Researcher', sql.NVarChar, researcher || '')
            .input('StartDate', sql.Date, startDate || new Date())
            .input('TargetDate', sql.Date, targetDate)
            .input('Phase', sql.NVarChar, phase || 'เริ่มต้น')
            .input('FormulaRef', sql.VarChar, formulaRef || null)
            .input('Status', sql.NVarChar, 'กำลังดำเนินการ')
            .query('INSERT INTO RnD_Projects (Code, Name, Category, Researcher, StartDate, TargetDate, Phase, Progress, Status, FormulaRef) VALUES (@Code, @Name, @Category, @Researcher, @StartDate, @TargetDate, @Phase, 0, @Status, @FormulaRef)');

        res.status(201).json({ success: true, code: newCode });
    } catch (err) {
        console.error('Error creating project:', err);
        res.status(500).json({ message: 'Error creating project' });
    }
});

// =====================================================================
// POST /api/rnd/experiments — บันทึกผลทดลอง
// =====================================================================
router.post('/experiments', async (req, res) => {
    try {
        const { projectCode, name, date, result, note } = req.body;
        const pool = await poolPromise;
        const countRes = await pool.request().query("SELECT COUNT(*) as cnt FROM RnD_Experiments");
        const newNum = countRes.recordset[0].cnt + 1;
        const newCode = `EXP-${newNum.toString().padStart(3, '0')}`;

        await pool.request()
            .input('Code', sql.VarChar, newCode)
            .input('ProjectCode', sql.VarChar, projectCode)
            .input('Name', sql.NVarChar, name)
            .input('ExperimentDate', sql.Date, date || new Date())
            .input('Result', sql.NVarChar, result || 'รอผล')
            .input('Note', sql.NVarChar, note || '')
            .query('INSERT INTO RnD_Experiments (Code, ProjectCode, Name, ExperimentDate, Result, Note) VALUES (@Code, @ProjectCode, @Name, @ExperimentDate, @Result, @Note)');

        res.status(201).json({ success: true, code: newCode });
    } catch (err) {
        console.error('Error creating experiment:', err);
        res.status(500).json({ message: 'Error creating experiment' });
    }
});
// =====================================================================
// GET /api/rnd/formula-tests/:formulaId — ผลทดสอบสูตร
// =====================================================================
router.get('/formula-tests/:formulaId', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('FormulaID', sql.VarChar, req.params.formulaId)
            .query('SELECT * FROM RnD_Formula_Tests WHERE FormulaID=@FormulaID ORDER BY CreatedAt DESC');
        res.json(result.recordset.map(t => ({
            id: t.TestID, formulaId: t.FormulaID, testDate: formatDateLocal(t.TestDate),
            testedBy: t.TestedBy, pH: t.pH, viscosity: t.Viscosity, color: t.Color, smell: t.Smell,
            stability: t.Stability, microbial: t.Microbial, overallResult: t.OverallResult, notes: t.Notes,
        })));
    } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// =====================================================================
// GET /api/rnd/formula-tests — ผลทดสอบทั้งหมด (สำหรับ QC)
// =====================================================================
router.get('/formula-tests', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT t.*, f.Name as FormulaName, f.Status as FormulaStatus
            FROM RnD_Formula_Tests t
            JOIN RnD_Formulas f ON t.FormulaID = f.FormulaID
            ORDER BY t.CreatedAt DESC
        `);
        res.json(result.recordset.map(t => ({
            id: t.TestID, formulaId: t.FormulaID, formulaName: t.FormulaName, formulaStatus: t.FormulaStatus,
            testDate: formatDateLocal(t.TestDate),
            testedBy: t.TestedBy, pH: t.pH, viscosity: t.Viscosity, color: t.Color, smell: t.Smell,
            stability: t.Stability, microbial: t.Microbial, overallResult: t.OverallResult, notes: t.Notes,
        })));
    } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// =====================================================================
// POST /api/rnd/formula-tests — QC บันทึกผลทดสอบสูตร
// =====================================================================
router.post('/formula-tests', async (req, res) => {
    try {
        const { formulaId, testedBy, pH, viscosity, color, smell, stability, microbial, overallResult, notes } = req.body;
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, formulaId)
                .input('TestDate', sql.Date, new Date())
                .input('TestedBy', sql.NVarChar, testedBy || '')
                .input('pH', sql.NVarChar, pH || '')
                .input('Viscosity', sql.NVarChar, viscosity || '')
                .input('Color', sql.NVarChar, color || '')
                .input('Smell', sql.NVarChar, smell || '')
                .input('Stability', sql.NVarChar, stability || '')
                .input('Microbial', sql.NVarChar, microbial || '')
                .input('OverallResult', sql.NVarChar, overallResult)
                .input('Notes', sql.NVarChar, notes || '')
                .query('INSERT INTO RnD_Formula_Tests (FormulaID,TestDate,TestedBy,pH,Viscosity,Color,Smell,Stability,Microbial,OverallResult,Notes) VALUES (@FormulaID,@TestDate,@TestedBy,@pH,@Viscosity,@Color,@Smell,@Stability,@Microbial,@OverallResult,@Notes)');

            // Update formula status based on result
            const newStatus = overallResult === 'ผ่าน' ? 'ทดสอบผ่าน' : 'ทดสอบไม่ผ่าน';
            const statusReq = new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, formulaId)
                .input('Status', sql.NVarChar, newStatus)
                .input('QcApprovedBy', sql.NVarChar, testedBy || '');

            if (overallResult === 'ผ่าน') {
                statusReq.input('QcApprovedDate', sql.Date, new Date());
                await statusReq.query('UPDATE RnD_Formulas SET Status=@Status, QcApprovedBy=@QcApprovedBy, QcApprovedDate=@QcApprovedDate WHERE FormulaID=@FormulaID');
            } else {
                await statusReq.query('UPDATE RnD_Formulas SET Status=@Status, QcApprovedBy=@QcApprovedBy WHERE FormulaID=@FormulaID');
            }

            await transaction.commit();
            res.status(201).json({ success: true });
        } catch (txErr) { await transaction.rollback(); throw txErr; }
    } catch (err) {
        console.error('Error creating formula test:', err);
        res.status(500).json({ message: 'Error creating formula test' });
    }
});

// =====================================================================
// PUT /api/rnd/formulas/:id/pharm-approve — เภสัชกรอนุมัติ
// =====================================================================
router.put('/formulas/:id/pharm-approve', async (req, res) => {
    try {
        const { approvedBy, approved } = req.body;
        const pool = await poolPromise;
        const newStatus = approved ? 'อนุมัติ' : 'เภสัชกรไม่อนุมัติ';
        await pool.request()
            .input('FormulaID', sql.VarChar, req.params.id)
            .input('Status', sql.NVarChar, newStatus)
            .input('PharmApprovedBy', sql.NVarChar, approvedBy || '')
            .input('PharmApprovedDate', sql.Date, new Date())
            .input('ApprovedBy', sql.NVarChar, approved ? approvedBy : null)
            .input('ApprovedDate', sql.Date, approved ? new Date() : null)
            .query('UPDATE RnD_Formulas SET Status=@Status, PharmApprovedBy=@PharmApprovedBy, PharmApprovedDate=@PharmApprovedDate, ApprovedBy=@ApprovedBy, ApprovedDate=@ApprovedDate WHERE FormulaID=@FormulaID');
        res.json({ success: true });
    } catch (err) {
        console.error('Error pharm approve:', err);
        res.status(500).json({ message: 'Error' });
    }
});

module.exports = router;
