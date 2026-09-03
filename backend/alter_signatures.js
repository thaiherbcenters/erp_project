const { poolPromise } = require('./config/db');

poolPromise.then(pool => {
    const query = `
        IF NOT EXISTS (
            SELECT * FROM sys.columns 
            WHERE Name = N'user_id' AND Object_ID = Object_ID(N'Signatures')
        )
        BEGIN
            ALTER TABLE Signatures ADD user_id INT NULL;
            ALTER TABLE Signatures ADD CONSTRAINT FK_Signatures_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL;
            PRINT 'Added user_id column to Signatures table';
        END
        ELSE
        BEGIN
            PRINT 'user_id column already exists';
        END
    `;
    pool.request().query(query)
        .then(() => {
            console.log("✅ Successfully added user_id to Signatures table (ERP_THAIHERB_DEV)!");
            process.exit(0);
        })
        .catch(err => {
            console.error("❌ Migration failed:", err);
            process.exit(1);
        });
});
