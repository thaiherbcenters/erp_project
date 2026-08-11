require('dotenv').config();
const { poolPromise, sql } = require('./config/db');
const { PDFDocument } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const { generateQcTestReportPdf } = require('./utils/qcTestReportPdfRenderer');

async function test() {
    try {
        const testId = 4;
        const pool = await poolPromise;
        const testRes = await pool.request()
            .input('id', sql.Int, testId)
            .query(`
                SELECT t.*, f.Name, f.Version, f.Category, f.BatchSize, f.UnitSize
                FROM RnD_Formula_Tests t
                LEFT JOIN RnD_Formulas f ON t.FormulaID = f.FormulaID
                WHERE t.TestID = @id
            `);
            
        if (testRes.recordset.length === 0) {
            console.log('Test not found');
            return;
        }
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

        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);
        
        const regularFontPath = path.join(__dirname, 'fonts/THSarabunNew.ttf');
        const boldFontPath = path.join(__dirname, 'fonts/THSarabunNew-Bold.ttf');
        const logoPath = path.join(__dirname, '../src/assets/logo.png');

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
        console.log('PDF generated successfully, size:', pdfBytes.length);
    } catch (e) {
        console.error('ERROR:', e);
    }
    process.exit(0);
}

test();
