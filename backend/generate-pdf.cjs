const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    const htmlPath = path.resolve(__dirname, 'database-tables-report.html');
    await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

    const pdfPath = path.resolve(__dirname, 'ERP_THAIHERB_Database_Tables.pdf');
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '10mm', right: '10mm' }
    });

    console.log('✅ PDF saved to:', pdfPath);
    await browser.close();
})();
