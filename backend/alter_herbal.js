const {poolPromise} = require('./config/db');
poolPromise.then(pool => {
    const query = `ALTER TABLE HerbalCertDocuments ADD ApplicantPrefix NVARCHAR(50) NULL, ReceiptNo NVARCHAR(100) NULL, RefProductNameThai NVARCHAR(300) NULL, RefRegistrationNo NVARCHAR(100) NULL, CertificateHolder NVARCHAR(200) NULL, SignDate DATE NULL`;
    return pool.request().query(query);
})
.then(() => {
    console.log('Columns added successfully');
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
