const { poolPromise, sql } = require('./config/db');

poolPromise.then(pool => pool.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME IN ('HerbalCertDocuments', 'SafetyCertDocuments')
`).then(r => {
    console.log('HerbalCertDocuments columns:');
    console.log(r.recordset.filter(row => row.TABLE_NAME === 'HerbalCertDocuments').map(r => r.COLUMN_NAME).join(', '));
    console.log('SafetyCertDocuments columns:');
    console.log(r.recordset.filter(row => row.TABLE_NAME === 'SafetyCertDocuments').map(r => r.COLUMN_NAME).join(', '));
}).catch(e => console.log('Error:', e.message))).finally(() => process.exit(0));
