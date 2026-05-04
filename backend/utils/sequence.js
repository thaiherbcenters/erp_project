const { sql } = require('../config/db');

/**
 * ── Sequence Generator Utility ──
 * This module standardizes the generation of running numbers across the ERP system.
 */

// Format YYYYMMDD
const getDatePrefix = (date = new Date()) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

// Format YYMMDD (for shorter codes like Batch)
const getShortDatePrefix = (date = new Date()) => {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
};

// Format YYYYMM (for monthly resets like Customers)
const getMonthPrefix = (date = new Date()) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}${mm}`;
};

/**
 * Generic sequence generator
 * @param {Object} pool - The SQL connection pool
 * @param {string} tableName - The table to query
 * @param {string} columnName - The column to count/search
 * @param {string} prefix - The prefix to match and prepend (e.g., 'QT-20260504')
 * @param {number} padLength - Number of digits for the sequence (e.g., 3 for 001)
 * @param {string} separator - Separator between prefix and sequence (default: '-')
 * @returns {Promise<string>} - The new generated ID
 */
const generateSequence = async (pool, tableName, columnName, prefix, padLength = 3, separator = '-') => {
    // Query count of records that start with the exact prefix
    const result = await pool.request()
        .input('prefix', sql.NVarChar, `${prefix}${separator}%`)
        .query(`SELECT COUNT(*) AS cnt FROM ${tableName} WHERE ${columnName} LIKE @prefix`);

    const seq = String((result.recordset[0].cnt || 0) + 1).padStart(padLength, '0');
    return `${prefix}${separator}${seq}`;
};

module.exports = {
    getDatePrefix,
    getShortDatePrefix,
    getMonthPrefix,
    generateSequence
};
