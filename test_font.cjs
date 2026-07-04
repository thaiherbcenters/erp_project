const { PDFDocument } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');

async function main() {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    
    // Download font
    const res = await fetch('https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf');
    const fontBytes = await res.arrayBuffer();
    const font = await pdfDoc.embedFont(fontBytes);
    
    console.log("Width of น:", font.widthOfTextAtSize('น', 14));
    console.log("Width of น้ำ:", font.widthOfTextAtSize('น้ำ', 14));
    console.log("Width of นํ้า:", font.widthOfTextAtSize('นํ้า', 14));
    console.log("Width of นำ้:", font.widthOfTextAtSize('นำ้', 14));
    console.log("Width of ำ:", font.widthOfTextAtSize('ำ', 14));
    console.log("Width of ้:", font.widthOfTextAtSize('้', 14));
}
main();
