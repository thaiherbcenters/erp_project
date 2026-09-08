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
 * Read-only sequence peeker (does NOT modify Sequences table or burn numbers).
 * Ideal for previewing the next available document number in GET /next-number endpoints.
 * @param {Object} pool - The SQL connection pool
 * @param {string} tableName - The table to query
 * @param {string} columnName - The column to search
 * @param {string} prefix - The prefix to match and prepend (e.g., 'QT-20260908')
 * @param {number} padLength - Number of digits for the sequence (default: 3)
 * @param {string} separator - Separator between prefix and sequence (default: '-')
 * @returns {Promise<string>} - The next available ID
 */
const peekNextSequence = async (pool, tableName, columnName, prefix, padLength = 3, separator = '-') => {
    const fullPrefix = prefix.endsWith(separator) ? prefix : `${prefix}${separator}`;

    const result = await pool.request()
        .input('prefixPattern', sql.NVarChar, `${fullPrefix}%`)
        .query(`
            SELECT TOP 1 ${columnName} AS maxNo
            FROM ${tableName} WITH (NOLOCK)
            WHERE ${columnName} LIKE @prefixPattern
            ORDER BY ${columnName} DESC
        `);

    let maxNum = 0;
    if (result.recordset.length > 0 && result.recordset[0].maxNo) {
        const fullVal = String(result.recordset[0].maxNo).trim();
        const parts = fullVal.split(separator);
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num)) {
            maxNum = num;
        }
    }

    const nextSeq = String(maxNum + 1).padStart(padLength, '0');
    return `${fullPrefix}${nextSeq}`;
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
    const fullPrefix = prefix.endsWith(separator) ? prefix : `${prefix}${separator}`;
    
    // Atomically get the next number from the Sequences table
    const result = await pool.request()
        .input('prefix', sql.NVarChar, fullPrefix)
        .query(`
            BEGIN TRY
                BEGIN TRANSACTION;
                
                -- Ensure the row exists
                IF NOT EXISTS (SELECT 1 FROM Sequences WITH (UPDLOCK, SERIALIZABLE) WHERE Prefix = @prefix)
                BEGIN
                    INSERT INTO Sequences (Prefix, LastNumber, UpdatedAt) VALUES (@prefix, 0, GETDATE());
                END

                -- Increment and get the new number
                UPDATE Sequences 
                SET LastNumber = LastNumber + 1, UpdatedAt = GETDATE()
                OUTPUT inserted.LastNumber
                WHERE Prefix = @prefix;
                
                COMMIT TRANSACTION;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0
                    ROLLBACK TRANSACTION;
                THROW;
            END CATCH
        `);

    const nextSeq = result.recordset[0].LastNumber;
    const seq = String(nextSeq).padStart(padLength, '0');
    return `${fullPrefix}${seq}`;
};

module.exports = {
    getDatePrefix,
    getShortDatePrefix,
    getMonthPrefix,
    peekNextSequence,
    generateSequence
};
