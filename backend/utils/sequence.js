const { sql } = require('../config/db');

/**
 * ── Sequence Generator Utility ──
 * This module standardizes the generation of running numbers across the ERP system.
 */

// Helper to parse date safely without timezone distortion
const parseDateParts = (date) => {
    if (!date) date = new Date();
    if (typeof date === 'string') {
        const clean = date.split('T')[0];
        const parts = clean.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            return {
                yyyy: parts[0],
                yy: parts[0].slice(-2),
                mm: parts[1].padStart(2, '0'),
                dd: parts[2].padStart(2, '0')
            };
        }
        date = new Date(date);
    }
    const yyyy = String(date.getFullYear());
    const yy = yyyy.slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return { yyyy, yy, mm, dd };
};

// Format YYYYMMDD
const getDatePrefix = (date = new Date()) => {
    const { yyyy, mm, dd } = parseDateParts(date);
    return `${yyyy}${mm}${dd}`;
};

// Format YYMMDD (for shorter codes like Batch)
const getShortDatePrefix = (date = new Date()) => {
    const { yy, mm, dd } = parseDateParts(date);
    return `${yy}${mm}${dd}`;
};

// Format YYYYMM (for monthly resets like Customers)
const getMonthPrefix = (date = new Date()) => {
    const { yyyy, mm } = parseDateParts(date);
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

    // If prefix is e.g. "PO20260914", also check legacy "PO-20260914-" for same-day continuity
    let altPrefix = null;
    const cleanPrefix = prefix.endsWith(separator) ? prefix.slice(0, -separator.length) : prefix;
    const match = cleanPrefix.match(/^([A-Za-z0-9]+?)(\d{8})$/);
    if (match && !match[1].endsWith('-')) {
        altPrefix = `${match[1]}-${match[2]}${separator}`;
    }

    const req = pool.request().input('prefixPattern', sql.NVarChar, `${fullPrefix}%`);
    let query = `
        SELECT TOP 5 ${columnName} AS no
        FROM ${tableName} WITH (NOLOCK)
        WHERE ${columnName} LIKE @prefixPattern
    `;
    if (altPrefix) {
        req.input('altPrefixPattern', sql.NVarChar, `${altPrefix}%`);
        query += ` OR ${columnName} LIKE @altPrefixPattern `;
    }
    query += ` ORDER BY ${columnName} DESC `;

    const result = await req.query(query);

    let maxNum = 0;
    if (result.recordset && result.recordset.length > 0) {
        for (const row of result.recordset) {
            if (row.no) {
                const fullVal = String(row.no).trim();
                const parts = fullVal.split(separator);
                const lastPart = parts[parts.length - 1];
                const num = parseInt(lastPart, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
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
