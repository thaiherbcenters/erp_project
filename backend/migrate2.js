const { poolPromise } = require('./config/db');
async function run() {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'Section5FieldOrder' AND Object_ID = Object_ID(N'TorBor1Documents'))
            BEGIN
                ALTER TABLE TorBor1Documents ADD Section5FieldOrder NVARCHAR(MAX);
                PRINT 'Added Section5FieldOrder'
            END
            ELSE
            BEGIN
                PRINT 'Exists'
            END
        `);
        console.log('Done');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
