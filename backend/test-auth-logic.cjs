const sql = require('mssql');
const bcrypt = require('bcryptjs');

const config = {
    server: 'localhost',
    database: 'ERP_THAIHERB',
    user: 'erp_admin',
    password: 'Erp@2026!',
    options: {
        trustServerCertificate: true,
        encrypt: false,
    },
    connectionTimeout: 10000,
};

async function testAuth() {
    try {
        console.log('Connecting to DB...');
        const pool = await sql.connect(config);
        
        console.log('Querying doc1...');
        const username = 'doc1';
        const password = 'doc123';
        
        const result = await pool.request()
            .input('username', username)
            .query('SELECT * FROM Users WHERE username = @username');

        const user = result.recordset[0];

        if (!user) {
             console.log('User not found!');
             return;
        }
        
        console.log('User found! password_hash:', user.password_hash);
        
        let isMatch = false;
        if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password_hash);
        } else {
             isMatch = password === user.password_hash;
        }
        
        console.log('Password Match?:', isMatch);
        
        if (isMatch) {
             const permResult = await pool.request()
                 .input('user_id', user.user_id)
                 .query('SELECT page_id, is_granted FROM UserPermissions WHERE user_id = @user_id AND is_granted = 1');
             
             console.log('Permissions found:', permResult.recordset.length);
        }
        
        await pool.close();
    } catch (e) {
        console.error('Error:', e);
    }
}
testAuth();
