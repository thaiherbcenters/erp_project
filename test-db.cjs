require('dotenv').config({ path: 'backend/.env' });
const { poolPromise } = require('./backend/config/db');

async function test() {
    try {
        const pool = await poolPromise;
        const res = await pool.request().query("SELECT user_id FROM Users WHERE username = 'test'");
        const userId = res.recordset[0].user_id;
        console.log('User ID:', userId);

        const permRes = await pool.request()
            .input('user_id', userId)
            .query('SELECT page_id, data_scope, can_create, can_read, can_update, can_delete FROM UserPermissions WHERE user_id = @user_id AND is_granted = 1');
        console.log('Permissions:', permRes.recordset.length);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

test();
