const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    pool.request().query(`
        ALTER TABLE LegalDocuments ADD ReqTypeRegister BIT;
        ALTER TABLE LegalDocuments ADD ReqTypeNotifyDetail BIT;
        ALTER TABLE LegalDocuments ADD ReqTypeNotify BIT;
        ALTER TABLE LegalDocuments ADD ReqTypeRenew BIT;
        ALTER TABLE LegalDocuments ADD SubmitFormTypeAmend BIT;
        ALTER TABLE LegalDocuments ADD SubmitFormTypeReplace BIT;
        ALTER TABLE LegalDocuments ADD SubmitFormTypeOtherCheck BIT;
    `)
    .then(() => {
        console.log('Columns added successfully');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
});
