require('dotenv').config({ path: './.env' });
const { poolPromise, sql } = require('./backend/config/db');

async function checkDocs() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT DocumentID, DocumentNo, Version, Status, ApplicantName, CreatedAt
            FROM HerbalCertDocuments
            WHERE DocumentNo = 'HBC-20260723-001'
            ORDER BY Version ASC
        `);
        console.log("Documents:");
        console.log(result.recordset);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

checkDocs();
