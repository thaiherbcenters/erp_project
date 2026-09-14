const { poolPromise, sql } = require('../config/db');
const bcrypt = require('bcryptjs');

const getAllUsers = async () => {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT user_id as id, username, display_name as displayName, role, department, avatar, is_active
        FROM Users 
        ORDER BY created_at ASC
    `);
    return result.recordset;
};

const createUser = async (userData) => {
    const { username, password, displayName, role, department, avatar } = userData;

    if (!username || !password || !displayName || !role) {
        const error = new Error('กรุณากรอกข้อมูลให้ครบถ้วน(username, password, name, role)');
        error.statusCode = 400;
        throw error;
    }

    const pool = await poolPromise;

    // ตรวจสอบว่ามี username นี้อยู่แล้วหรือยัง?
    const checkUser = await pool.request()
        .input('username', username)
        .query('SELECT user_id FROM Users WHERE username = @username');

    if (checkUser.recordset.length > 0) {
        const error = new Error('Username นี้ถูกใช้งานไปแล้ว');
        error.statusCode = 400;
        throw error;
    }

    // Hash รหัสผ่าน
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // หาอักษรย่อสำหรับ Avatar ถ้าไม่ได้ใส่มา
    let finalAvatar = avatar;
    if (!finalAvatar) {
        const words = displayName.trim().split(' ');
        if (words.length > 1) {
            finalAvatar = (words[0][0] + words[1][0]).toUpperCase().substring(0, 2);
        } else {
            finalAvatar = displayName.substring(0, 2).toUpperCase();
        }
    }

    // บันทึกลงฐานข้อมูล
    const result = await pool.request()
        .input('username', username)
        .input('password_hash', hashedPassword)
        .input('display_name', displayName)
        .input('role', role)
        .input('department', department || null)
        .input('avatar', finalAvatar)
        .query(`
            INSERT INTO Users (username, password_hash, display_name, role, department, avatar)
            OUTPUT INSERTED.user_id, INSERTED.username, INSERTED.display_name, INSERTED.role, INSERTED.department, INSERTED.avatar
            VALUES (@username, @password_hash, @display_name, @role, @department, @avatar)
        `);

    const newUser = result.recordset[0];

    // บันทึกสิทธิ์เข้าถึงบริษัท (UserCompanyAccess)
    let companyIdsToAssign = userData.companyIds;
    if (!Array.isArray(companyIdsToAssign) || companyIdsToAssign.length === 0) {
        if (role === 'admin' || role === 'executive') {
            companyIdsToAssign = [1, 2, 3, 4];
        } else {
            companyIdsToAssign = [1]; // default THC
        }
    }

    for (let i = 0; i < companyIdsToAssign.length; i++) {
        const cId = Number(companyIdsToAssign[i]);
        if (!isNaN(cId)) {
            await pool.request()
                .input('userId', sql.Int, newUser.user_id)
                .input('companyId', sql.Int, cId)
                .input('isDefault', sql.Bit, i === 0 ? 1 : 0)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM UserCompanyAccess WHERE user_id = @userId AND CompanyID = @companyId)
                    BEGIN
                        INSERT INTO UserCompanyAccess (user_id, CompanyID, is_default)
                        VALUES (@userId, @companyId, @isDefault)
                    END
                `);
        }
    }

    return newUser;
};

const updateUser = async (id, updateData) => {
    const { displayName, role, department, avatar } = updateData;
    const pool = await poolPromise;

    const request = pool.request().input('id', sql.Int, id);
    const sets = [];

    if (displayName !== undefined) {
        sets.push('display_name = @display_name');
        request.input('display_name', sql.NVarChar, displayName);
    }
    if (role !== undefined) {
        sets.push('role = @role');
        request.input('role', sql.NVarChar, role);
    }
    if (department !== undefined) {
        sets.push('department = @department');
        request.input('department', sql.NVarChar, department);
    }
    if (avatar !== undefined) {
        sets.push('avatar = @avatar');
        request.input('avatar', sql.NVarChar, avatar);
    }

    if (sets.length === 0) {
        const error = new Error('ไม่มีข้อมูลที่ต้องการแก้ไข');
        error.statusCode = 400;
        throw error;
    }

    const result = await request.query(`
        UPDATE Users SET ${sets.join(', ')} WHERE user_id = @id
    `);

    if (result.rowsAffected[0] === 0) {
        const error = new Error('ไม่พบผู้ใช้งานที่ต้องการแก้ไข');
        error.statusCode = 404;
        throw error;
    }

    return true;
};

const resetPassword = async (id, newPassword) => {
    if (!newPassword || newPassword.length < 4) {
        const error = new Error('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
        error.statusCode = 400;
        throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', sql.Int, id)
        .input('password_hash', sql.NVarChar, hashedPassword)
        .query('UPDATE Users SET password_hash = @password_hash WHERE user_id = @id');

    if (result.rowsAffected[0] === 0) {
        const error = new Error('ไม่พบผู้ใช้งาน');
        error.statusCode = 404;
        throw error;
    }

    return true;
};

const toggleUserStatus = async (id) => {
    const pool = await poolPromise;

    const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`
            UPDATE Users 
            SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END 
            OUTPUT INSERTED.is_active
            WHERE user_id = @id
        `);

    if (result.rowsAffected[0] === 0) {
        const error = new Error('ไม่พบผู้ใช้งาน');
        error.statusCode = 404;
        throw error;
    }

    return result.recordset[0].is_active;
};

const deleteUser = async (id) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('id', id)
        .query('DELETE FROM Users WHERE user_id = @id');
        
    if (result.rowsAffected[0] === 0) {
        const error = new Error('ไม่พบผู้ใช้งานที่ต้องการลบ');
        error.statusCode = 404;
        throw error;
    }
    return true;
};

// ============================================================
// Multi-Company Access Management
// ============================================================
const getUserCompanyAccess = async (userId) => {
    const pool = await poolPromise;
    const res = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT uca.CompanyID, uca.is_default, uca.role_override,
                   c.CompanyName, c.ShortName, c.CompanyNameTH, c.CompanyNameEN,
                   c.CompanyColor, c.CompanyIcon, c.CompanyLogo
            FROM UserCompanyAccess uca
            JOIN Company c ON uca.CompanyID = c.CompanyID
            WHERE uca.user_id = @userId AND c.IsActive = 1
            ORDER BY c.CompanyID
        `);
    return res.recordset;
};

const updateUserCompanyAccess = async (userId, companyIds = [], defaultCompanyId = null) => {
    const pool = await poolPromise;
    
    // ลบสิทธิ์เดิมของ user นี้
    await pool.request()
        .input('userId', sql.Int, userId)
        .query(`DELETE FROM UserCompanyAccess WHERE user_id = @userId`);

    // บันทึกสิทธิ์ใหม่
    const validCompanyIds = (companyIds || []).map(Number).filter(n => !isNaN(n) && n > 0);
    for (let i = 0; i < validCompanyIds.length; i++) {
        const cId = validCompanyIds[i];
        const isDefault = defaultCompanyId ? (cId === Number(defaultCompanyId) ? 1 : 0) : (i === 0 ? 1 : 0);
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('companyId', sql.Int, cId)
            .input('isDefault', sql.Bit, isDefault)
            .query(`
                INSERT INTO UserCompanyAccess (user_id, CompanyID, is_default)
                VALUES (@userId, @companyId, @isDefault)
            `);
    }

    return await getUserCompanyAccess(userId);
};

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    resetPassword,
    toggleUserStatus,
    deleteUser,
    getUserCompanyAccess,
    updateUserCompanyAccess
};
