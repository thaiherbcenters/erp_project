const express = require('express');
const router = express.Router();
const { PDFDocument } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { generateExperimentApprovalPdf } = require('../utils/experimentApprovalPdfRenderer');

router.post('/', async (req, res) => {
    try {
        const { experiment, simulator, ingredients, pharmacist } = req.body;

        if (!experiment || !simulator || !ingredients) {
            return res.status(400).json({ error: 'Missing required data fields' });
        }

        const data = { experiment, simulator, ingredients, pharmacist };

        const fs = require('fs');
        const path = require('path');
        const regularFontPath = path.join(__dirname, '../fonts/Sarabun-Regular.ttf');
        const boldFontPath = path.join(__dirname, '../fonts/THSarabunNew-Bold.ttf');
        const logoPath = path.join(__dirname, '../../src/assets/logo.png');

        const regularFontBytes = fs.readFileSync(regularFontPath);
        const boldFontBytes = fs.readFileSync(boldFontPath);
        
        let logoBytes = null;
        if (fs.existsSync(logoPath)) {
            logoBytes = fs.readFileSync(logoPath);
        }

        // Initialize PDF Document
        const pdfDoc = await PDFDocument.create();
        
        // Register fontkit
        pdfDoc.registerFontkit(fontkit);
        
        // Embed Fonts
        const customFont = await pdfDoc.embedFont(regularFontBytes, { subset: true });
        const customBoldFont = await pdfDoc.embedFont(boldFontBytes, { subset: true });

        // Draw the PDF content
        await generateExperimentApprovalPdf(pdfDoc, data, customFont, customBoldFont, logoBytes);

        // Save PDF and send as Blob
        const pdfBytes = await pdfDoc.save();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="experiment_approval_${experiment.code || 'cert'}.pdf"`);
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error('Error generating Experiment Approval PDF:', error);
        require('fs').writeFileSync('print_error.log', error.stack || error.message || String(error));
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

module.exports = router;
