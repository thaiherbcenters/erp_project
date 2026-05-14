import { vi } from 'vitest';

// Global mock for db.js to prevent connection attempts in CI/CD or local test without DB
vi.mock('../../config/db', () => ({
    poolPromise: Promise.resolve({
        request: vi.fn().mockReturnThis(),
        input: vi.fn().mockReturnThis(),
        query: vi.fn().mockResolvedValue({ recordset: [] })
    }),
    sql: {
        VarChar: 'VarChar',
        NVarChar: 'NVarChar',
        Int: 'Int',
    }
}));
