const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function extractFormFields() {
    try {
        const filePath = 'D:\\ERP_Data\\Templates\\FM-IT-01_template.pdf';

        // Let's first check if the document exists
        if (!fs.existsSync(filePath)) {
            console.log('PDF file not found at:', filePath);
            console.log('We will ask the user where they saved their PDF template.');
            return;
        }

        const existingPdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        console.log('Found', fields.length, 'fields in the PDF:');
        fields.forEach(field => {
            const type = field.constructor.name;
            const name = field.getName();
            console.log(`- ${name} (${type})`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

extractFormFields();
