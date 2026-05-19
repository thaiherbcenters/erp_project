const { sql, poolPromise } = require('./config/db');

async function testLogin() {
    try {
        const pool = await poolPromise;
        const username = 'it_admin';

        console.log('Querying Users table...');
        const result = await pool.request()
            .input('username', username)
            .query('SELECT * FROM Users WHERE username = @username');

        const user = result.recordset[0];
        console.log('User found:', user ? user.username : 'Not found');

        if (user) {
            console.log('Querying UserPermissions...');
            const permResult = await pool.request()
                 .input('user_id', user.user_id)
                 .query('SELECT page_id, data_scope FROM UserPermissions WHERE user_id = @user_id AND is_granted = 1');
            console.log('Permissions found:', permResult.recordset.length);
        }

        process.exit(0);
    } catch (err) {
        console.error('\n❌ CAUGHT ERROR:');
        console.error(err);
        process.exit(1);
    }
}

testLogin();
