const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { authorizeRoles } = require('../middleware/authorize');

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
            formulaType: f.FormulaType,
            unitSize: f.UnitSize,
            batchSize: f.BatchSize,
            unit: f.Unit,
            shelfLife: f.ShelfLife,
            description: f.Description,
            instructions: f.InstructionsJSON ? JSON.parse(f.InstructionsJSON) : [],
            torbor1Format: f.TorBor1FormatJSON ? JSON.parse(f.TorBor1FormatJSON) : null,
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
                    type: i.IngredientType || '',
                    engName: i.EngName || '',
                    latinName: i.LatinName || '',
                    partUsed: i.PartUsed || ''
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
            formulaType: f.FormulaType,
            unitSize: f.UnitSize,
            batchSize: f.BatchSize,
            unit: f.Unit,
            shelfLife: f.ShelfLife,
            description: f.Description,
            instructions: f.InstructionsJSON ? JSON.parse(f.InstructionsJSON) : [],
            torbor1Format: f.TorBor1FormatJSON ? JSON.parse(f.TorBor1FormatJSON) : null,
            createdBy: f.CreatedBy,
            createdDate: formatDateLocal(f.CreatedDate),
            approvedBy: f.ApprovedBy,
            approvedDate: formatDateLocal(f.ApprovedDate),
            ingredients: iRes.recordset.map(i => ({
                materialId: i.MaterialID,
                name: i.MaterialName,
                qty: i.Qty,
                unit: i.Unit,
                type: i.IngredientType || '',
                engName: i.EngName || '',
                latinName: i.LatinName || '',
                partUsed: i.PartUsed || ''
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
router.post('/formulas', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
    try {
        const { name, category, formulaType, version, status, batchSize, unit, unitSize, shelfLife, description, instructions, ingredients, createdBy } = req.body;
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
                .input('FormulaType', sql.NVarChar, formulaType || 'สูตรทั่วไป')
                .input('Version', sql.VarChar, version || 'v1.0')
                .input('Status', sql.NVarChar, status || 'ร่าง')
                .input('BatchSize', sql.Int, batchSize || 0)
                .input('Unit', sql.NVarChar, unit || '')
                .input('UnitSize', sql.Decimal(18, 4), unitSize || 0)
                .input('ShelfLife', sql.NVarChar, shelfLife || '')
                .input('Description', sql.NVarChar, description || '')
                .input('InstructionsJSON', sql.NVarChar, JSON.stringify(instructions || []))
                .input('CreatedBy', sql.NVarChar, createdBy || 'system')
                .input('CreatedDate', sql.Date, new Date())
                .query(`
                    INSERT INTO RnD_Formulas (FormulaID, Name, Category, FormulaType, Version, Status, BatchSize, Unit, UnitSize, ShelfLife, Description, InstructionsJSON, CreatedBy, CreatedDate)
                    VALUES (@FormulaID, @Name, @Category, @FormulaType, @Version, @Status, @BatchSize, @Unit, @UnitSize, @ShelfLife, @Description, @InstructionsJSON, @CreatedBy, @CreatedDate)
                `);

            // Insert ingredients
            if (ingredients && ingredients.length > 0) {
                for (const ing of ingredients) {
                    await new sql.Request(transaction)
                        .input('FormulaID', sql.VarChar, newId)
                        .input('MaterialID', sql.VarChar, ing.materialId || null)
                        .input('MaterialName', sql.NVarChar, ing.name || '')
                        .input('Qty', sql.Decimal(10, 2), ing.qty || 0)
                        .input('Unit', sql.NVarChar, ing.unit || '')
                        .input('IngredientType', sql.NVarChar, ing.type || '')
                        .input('EngName', sql.NVarChar, ing.engName || '')
                        .input('LatinName', sql.NVarChar, ing.latinName || '')
                        .input('PartUsed', sql.NVarChar, ing.partUsed || '')
                        .query(`
                            INSERT INTO RnD_Formula_Ingredients (FormulaID, MaterialID, MaterialName, Qty, Unit, IngredientType, EngName, LatinName, PartUsed)
                            VALUES (@FormulaID, @MaterialID, @MaterialName, @Qty, @Unit, @IngredientType, @EngName, @LatinName, @PartUsed)
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
            formulaRef: e.FormulaRef,
            trialRecipe: e.TrialRecipe,
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
router.put('/formulas/:id', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
    try {
        const { name, category, formulaType, version, batchSize, unit, unitSize, shelfLife, description, instructions, ingredients } = req.body;
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, req.params.id)
                .input('Name', sql.NVarChar, name)
                .input('Category', sql.NVarChar, category || '')
                .input('FormulaType', sql.NVarChar, formulaType || 'สูตรทั่วไป')
                .input('Version', sql.VarChar, version || 'v1.0')
                .input('BatchSize', sql.Int, batchSize || 0)
                .input('Unit', sql.NVarChar, unit || '')
                .input('UnitSize', sql.Decimal(18, 4), unitSize || 0)
                .input('ShelfLife', sql.NVarChar, shelfLife || '')
                .input('Description', sql.NVarChar, description || '')
                .input('InstructionsJSON', sql.NVarChar, JSON.stringify(instructions || []))
                .query(`UPDATE RnD_Formulas SET Name=@Name, Category=@Category, FormulaType=@FormulaType, Version=@Version, BatchSize=@BatchSize, Unit=@Unit, UnitSize=@UnitSize, ShelfLife=@ShelfLife, Description=@Description, InstructionsJSON=@InstructionsJSON WHERE FormulaID=@FormulaID`);

            // Replace ingredients
            await new sql.Request(transaction)
                .input('FormulaID', sql.VarChar, req.params.id)
                .query('DELETE FROM RnD_Formula_Ingredients WHERE FormulaID=@FormulaID');

            if (ingredients && ingredients.length > 0) {
                for (const ing of ingredients) {
                    await new sql.Request(transaction)
                        .input('FormulaID', sql.VarChar, req.params.id)
                        .input('MaterialID', sql.VarChar, ing.materialId || null)
                        .input('MaterialName', sql.NVarChar, ing.name || '')
                        .input('Qty', sql.Decimal(10, 2), ing.qty || 0)
                        .input('Unit', sql.NVarChar, ing.unit || '')
                        .input('IngredientType', sql.NVarChar, ing.type || '')
                        .input('EngName', sql.NVarChar, ing.engName || '')
                        .input('LatinName', sql.NVarChar, ing.latinName || '')
                        .input('PartUsed', sql.NVarChar, ing.partUsed || '')
                        .query('INSERT INTO RnD_Formula_Ingredients (FormulaID, MaterialID, MaterialName, Qty, Unit, IngredientType, EngName, LatinName, PartUsed) VALUES (@FormulaID, @MaterialID, @MaterialName, @Qty, @Unit, @IngredientType, @EngName, @LatinName, @PartUsed)');
                }
            }
            await transaction.commit();
            res.json({ success: true });
        } catch (txErr) { await transaction.rollback(); throw txErr; }
    } catch (err) {
        console.error('Error updating formula:', err);
        res.status(500).json({ success: false, message: err.message || 'Error updating formula' });
    }
});

// =====================================================================
// DELETE /api/rnd/formulas/:id — ลบสูตร
// =====================================================================
router.delete('/formulas/:id', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
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
        if (err.number === 547) {
            return res.status(400).json({ success: false, message: 'ไม่สามารถลบสูตรนี้ได้ เนื่องจากถูกนำไปใช้งานในระบบแล้ว' });
        }
        res.status(500).json({ success: false, message: err.message || 'เกิดข้อผิดพลาดในการลบสูตร' });
    }
});

// =====================================================================
// PUT /api/rnd/formulas/:id/status — เปลี่ยนสถานะสูตร (Workflow)
// =====================================================================
router.put('/formulas/:id/status', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
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
router.post('/materials', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
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
                .input('UnitSize', sql.Decimal(18, 4), unitSize || 0)
            .input('Stock', sql.Decimal(10, 2), stock || 0)
            .input('MinStock', sql.Decimal(10, 2), minStock || 0)
            .input('CostPerUnit', sql.Decimal(10, 2), costPerUnit || 0)
            .input('Category', sql.NVarChar, category || '')
                .input('FormulaType', sql.NVarChar, formulaType || 'สูตรทั่วไป')
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
router.put('/materials/:id', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
    try {
        const { name, unit, stock, minStock, costPerUnit, category } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('MaterialID', sql.VarChar, req.params.id)
            .input('Name', sql.NVarChar, name)
            .input('Unit', sql.NVarChar, unit || '')
                .input('UnitSize', sql.Decimal(18, 4), unitSize || 0)
            .input('Stock', sql.Decimal(10, 2), stock || 0)
            .input('MinStock', sql.Decimal(10, 2), minStock || 0)
            .input('CostPerUnit', sql.Decimal(10, 2), costPerUnit || 0)
            .input('Category', sql.NVarChar, category || '')
                .input('FormulaType', sql.NVarChar, formulaType || 'สูตรทั่วไป')
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
router.delete('/materials/:id', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
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
router.post('/projects', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
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
router.post('/experiments', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
    try {
        const { projectCode, name, date, result, note, formulaRef, trialRecipe } = req.body;
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
            .input('FormulaRef', sql.NVarChar, formulaRef || null)
            .input('TrialRecipe', sql.NVarChar, trialRecipe || null)
            .query('INSERT INTO RnD_Experiments (Code, ProjectCode, Name, ExperimentDate, Result, Note, FormulaRef, TrialRecipe) VALUES (@Code, @ProjectCode, @Name, @ExperimentDate, @Result, @Note, @FormulaRef, @TrialRecipe)');

        res.status(201).json({ success: true, code: newCode });
    } catch (err) {
        console.error('Error creating experiment:', err);
        res.status(500).json({ message: 'Error creating experiment' });
    }
});

// =====================================================================
// PUT /api/rnd/experiments/:code — อัปเดตผลทดลอง
// =====================================================================
router.put('/experiments/:code', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
    try {
        const { projectCode, name, date, result, note, formulaRef, trialRecipe } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('Code', sql.VarChar, req.params.code)
            .input('ProjectCode', sql.VarChar, projectCode)
            .input('Name', sql.NVarChar, name)
            .input('ExperimentDate', sql.Date, date || new Date())
            .input('Result', sql.NVarChar, result || 'รอผล')
            .input('Note', sql.NVarChar, note || '')
            .input('FormulaRef', sql.NVarChar, formulaRef || null)
            .input('TrialRecipe', sql.NVarChar, trialRecipe || null)
            .query(`UPDATE RnD_Experiments 
                    SET ProjectCode=@ProjectCode, Name=@Name, ExperimentDate=@ExperimentDate, 
                        Result=@Result, Note=@Note, FormulaRef=@FormulaRef, TrialRecipe=@TrialRecipe 
                    WHERE Code=@Code`);

        res.json({ success: true, message: 'Experiment updated successfully' });
    } catch (err) {
        console.error('Error updating experiment:', err);
        res.status(500).json({ message: 'Error updating experiment' });
    }
});
// =====================================================================
// DELETE /api/rnd/projects/:code — ลบโครงการวิจัย
// =====================================================================
router.delete('/projects/:code', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Code', sql.VarChar, req.params.code)
            .query('DELETE FROM RnD_Projects WHERE Code=@Code');
        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (err) {
        console.error('Error deleting project:', err);
        res.status(500).json({ message: 'Error deleting project' });
    }
});

// =====================================================================
// DELETE /api/rnd/experiments/:code — ลบผลทดลอง
// =====================================================================
router.delete('/experiments/:code', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Code', sql.VarChar, req.params.code)
            .query('DELETE FROM RnD_Experiments WHERE Code=@Code');
        res.json({ success: true, message: 'Experiment deleted successfully' });
    } catch (err) {
        console.error('Error deleting experiment:', err);
        res.status(500).json({ message: 'Error deleting experiment' });
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
router.post('/formula-tests', authorizeRoles('admin', 'executive', 'rnd', 'qc'), async (req, res) => {
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
router.put('/formulas/:id/pharm-approve', authorizeRoles('admin', 'executive', 'rnd'), async (req, res) => {
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

// =====================================================================
// PUT /api/rnd/formulas/:id/torbor1-format — Save TorBor1 format
// =====================================================================
router.put('/formulas/:id/torbor1-format', async (req, res) => {
    try {
        const { torbor1Format } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('FormulaID', sql.VarChar, req.params.id)
            .input('TorBor1FormatJSON', sql.NVarChar, JSON.stringify(torbor1Format || {}))
            .query('UPDATE RnD_Formulas SET TorBor1FormatJSON=@TorBor1FormatJSON WHERE FormulaID=@FormulaID');
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving torbor1 format:', err);
        res.status(500).json({ message: 'Error saving torbor1 format' });
    }
});


const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const { drawThaiText, wrapThaiText } = require('../utils/thaiShaper');

router.get('/experiments/:id/print', async (req, res) => {
    try {
        const expId = parseInt(req.params.id);
        const pool = await poolPromise;
        const expRes = await pool.request()
            .input('id', sql.Int, expId)
            .query('SELECT * FROM RnD_Experiments WHERE ExperimentID = @id');
            
        if (expRes.recordset.length === 0) return res.status(404).send('Experiment not found');
        const exp = expRes.recordset[0];
        
        const projRes = await pool.request()
            .input('code', sql.VarChar, exp.ProjectCode)
            .query('SELECT * FROM RnD_Projects WHERE Code = @code');
        const proj = projRes.recordset[0] || { Name: 'ไม่ระบุ', Researcher: 'ไม่ระบุ' };

        // Parse ingredients
        let ingredients = [];
        try {
            const recipe = JSON.parse(exp.TrialRecipe || '[]');
            if (Array.isArray(recipe)) {
                ingredients = recipe.map(item => ({
                    ...item,
                    scaledQty: item.qty // Simulator data not available in this context
                }));
            }
        } catch(e) {}

        const data = {
            experiment: {
                code: exp.Code || exp.ExperimentID,
                projectCode: exp.ProjectCode,
                name: exp.Name,
                formulaRef: exp.FormulaRef || '-',
                date: exp.ExperimentDate ? new Date(exp.ExperimentDate).toLocaleDateString('th-TH') : '-',
                note: exp.Note,
                result: exp.Result || 'รอผล'
            },
            simulator: {
                targetUnits: 1,
                unitSize: 1,
                totalWeightGrams: 1
            },
            ingredients: ingredients,
            pharmacist: {
                name: '',
                date: ''
            }
        };

        const { generateExperimentApprovalPdf } = require('../utils/experimentApprovalPdfRenderer');
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);
        
        const regularFontPath = path.join(__dirname, '../fonts/THSarabunNew.ttf');
        const boldFontPath = path.join(__dirname, '../fonts/THSarabunNew-Bold.ttf');
        const logoPath = path.join(__dirname, '../../src/assets/logo.png');

        const regularFontBytes = fs.readFileSync(regularFontPath);
        const boldFontBytes = fs.readFileSync(boldFontPath);
        let logoBytes = null;
        if (fs.existsSync(logoPath)) {
            logoBytes = fs.readFileSync(logoPath);
        }

        const customFont = await pdfDoc.embedFont(regularFontBytes, { subset: true });
        const customBoldFont = await pdfDoc.embedFont(boldFontBytes, { subset: true });

        await generateExperimentApprovalPdf(pdfDoc, data, customFont, customBoldFont, logoBytes);

        const pdfBytes = await pdfDoc.save();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="experiment_approval_${exp.Code || exp.ExperimentID}.pdf"`);
        res.send(Buffer.from(pdfBytes));

    } catch (err) {
        console.error('Error generating PDF:', err);
        res.status(500).send('Error generating PDF');
    }
});

// GET /api/rnd/formula-tests/:testId/print — พิมพ์ใบรายงานผลทดสอบ QC
router.get('/formula-tests/:testId/print', async (req, res) => {
    try {
        const testId = parseInt(req.params.testId);
        const pool = await poolPromise;
        const testRes = await pool.request()
            .input('id', sql.Int, testId)
            .query(`
                SELECT t.*, f.Name, f.Version, f.Category, f.BatchSize, f.UnitSize
                FROM RnD_Formula_Tests t
                LEFT JOIN RnD_Formulas f ON t.FormulaID = f.FormulaID
                WHERE t.TestID = @id
            `);
            
        if (testRes.recordset.length === 0) return res.status(404).send('Test not found');
        const test = testRes.recordset[0];
        
        // Fetch ingredients
        const ingRes = await pool.request()
            .input('formulaId', sql.VarChar, test.FormulaID)
            .query(`
                SELECT MaterialName AS name, Qty AS [percent], Unit AS unit
                FROM RnD_Formula_Ingredients
                WHERE FormulaID = @formulaId
            `);
        
        let ingredients = ingRes.recordset || [];

        const data = {
            formula: {
                id: test.FormulaID,
                name: test.Name,
                version: test.Version,
                category: test.Category,
                batchSize: test.BatchSize || 0,
                unitSize: test.UnitSize || 0,
                ingredients: ingredients
            },
            testResult: {
                pH: test.PH,
                viscosity: test.Viscosity,
                color: test.Color,
                smell: test.Smell,
                stability: test.Stability,
                microbial: test.Microbial,
                overallResult: test.OverallResult,
                notes: test.Notes,
                testedBy: test.TestedBy,
                date: test.TestDate
            }
        };

        const { generateQcTestReportPdf } = require('../utils/qcTestReportPdfRenderer');
        const { generatePharmApprovePdf } = require('../utils/pharmApprovePdfRenderer');
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);
        
        const regularFontPath = path.join(__dirname, '../fonts/THSarabunNew.ttf');
        const boldFontPath = path.join(__dirname, '../fonts/THSarabunNew-Bold.ttf');
        const logoPath = path.join(__dirname, '../../src/assets/logo.png');

        const regularFontBytes = fs.readFileSync(regularFontPath);
        const boldFontBytes = fs.readFileSync(boldFontPath);
        let logoBytes = null;
        if (fs.existsSync(logoPath)) {
            logoBytes = fs.readFileSync(logoPath);
        }

        const customFont = await pdfDoc.embedFont(regularFontBytes, { subset: true });
        const customBoldFont = await pdfDoc.embedFont(boldFontBytes, { subset: true });

        await generateQcTestReportPdf(pdfDoc, data, customFont, customBoldFont, logoBytes);

        const pdfBytes = await pdfDoc.save();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="qc_test_report_${test.FormulaID}.pdf"`);
        res.send(Buffer.from(pdfBytes));

    } catch (err) {
        console.error('Error generating QC PDF:', err);
        res.status(500).send('Error generating PDF');
    }
});

// GET /api/rnd/formulas/:id/latest-qc-print — พิมพ์ใบรายงานผลทดสอบ QC ล่าสุดของสูตร
router.get('/formulas/:id/latest-qc-print', async (req, res) => {
    try {
        const pool = await poolPromise;
        const testRes = await pool.request()
            .input('id', sql.VarChar, req.params.id)
            .query('SELECT TOP 1 TestID FROM RnD_Formula_Tests WHERE FormulaID = @id ORDER BY TestDate DESC, TestID DESC');
        
        if (testRes.recordset.length === 0) return res.status(404).send('No QC tests found for this formula');
        
        const tokenStr = req.query.token ? `?token=${req.query.token}` : '';
        res.redirect(`/api/rnd/formula-tests/${testRes.recordset[0].TestID}/print${tokenStr}`);
    } catch (err) {
        console.error('Error finding latest QC test:', err);
        res.status(500).send('Error finding latest QC test');
    }
});

// GET /api/rnd/formulas/:id/pharm-print — พิมพ์ใบอนุมัติสูตรตำรับ (Pharmacist Approval)
router.get('/formulas/:id/pharm-print', async (req, res) => {
    try {
        const formulaId = req.params.id;
        const pool = await poolPromise;
        
        // 1. Get Formula
        const formulaRes = await pool.request()
            .input('id', sql.VarChar, formulaId)
            .query('SELECT * FROM RnD_Formulas WHERE FormulaID = @id');
        
        if (formulaRes.recordset.length === 0) return res.status(404).send('Formula not found');
        const formula = formulaRes.recordset[0];
        
        // 2. Get Ingredients
        const ingRes = await pool.request()
            .input('id', sql.VarChar, formulaId)
            .query('SELECT * FROM RnD_Formula_Ingredients WHERE FormulaID = @id ORDER BY ID');
        formula.ingredients = ingRes.recordset;

        // 3. Get Latest QC Test
        const qcRes = await pool.request()
            .input('id', sql.VarChar, formulaId)
            .query('SELECT TOP 1 * FROM RnD_Formula_Tests WHERE FormulaID = @id ORDER BY TestDate DESC, TestID DESC');
        const qcTest = qcRes.recordset.length > 0 ? qcRes.recordset[0] : null;

        const data = { formula, qcTest };

        // 4. Generate PDF
        const { PDFDocument } = require('pdf-lib');
        const fontkit = require('@pdf-lib/fontkit');
        const fs = require('fs');
        const path = require('path');
        const { generatePharmApprovePdf } = require('../utils/pharmApprovePdfRenderer');

        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);
        
        const regularFontPath = path.join(__dirname, '../fonts/THSarabunNew.ttf');
        const boldFontPath = path.join(__dirname, '../fonts/THSarabunNew-Bold.ttf');
        const logoPath = path.join(__dirname, '../../src/assets/logo.png');

        const regularFontBytes = fs.readFileSync(regularFontPath);
        const boldFontBytes = fs.readFileSync(boldFontPath);
        let logoBytes = null;
        if (fs.existsSync(logoPath)) {
            logoBytes = fs.readFileSync(logoPath);
        }

        const customFont = await pdfDoc.embedFont(regularFontBytes, { subset: true });
        const customBoldFont = await pdfDoc.embedFont(boldFontBytes, { subset: true });

        await generatePharmApprovePdf(pdfDoc, data, customFont, customBoldFont, logoBytes);

        const pdfBytes = await pdfDoc.save();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="pharm_approval_${formulaId}.pdf"`);
        res.send(Buffer.from(pdfBytes));

    } catch (err) {
        console.error('Error generating Pharm Approval PDF:', err);
        res.status(500).send('Error generating PDF: ' + err.stack);
    }
});

module.exports = router;
