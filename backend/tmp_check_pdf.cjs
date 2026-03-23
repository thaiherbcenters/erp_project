const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function test() {
    try {
        const existingPdfBytes = fs.readFileSync('D:\\\\ERP_Data\\\\Templates\\\\FM-IT-01-01_template.pdf');
        const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        console.log('Total fields:', fields.length);
        for (const field of fields) {
            console.log(`- ${field.getName()} (${field.constructor.name})`);
        }
    } catch (e) {
        console.error(e);
    }
}

test();
