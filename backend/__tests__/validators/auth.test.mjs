/**
 * Unit test สำหรับ auth validation schemas
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { loginSchema } = require('../../validators/auth');

describe('loginSchema', () => {
    it('✅ valid: username + password ปกติ', () => {
        const result = loginSchema.safeParse({ username: 'admin', password: '1234' });
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ username: 'admin', password: '1234' });
    });

    it('❌ missing username', () => {
        const result = loginSchema.safeParse({ password: '1234' });
        expect(result.success).toBe(false);
    });

    it('❌ missing password', () => {
        const result = loginSchema.safeParse({ username: 'admin' });
        expect(result.success).toBe(false);
    });

    it('❌ empty body', () => {
        const result = loginSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it('❌ username empty string', () => {
        const result = loginSchema.safeParse({ username: '', password: '1234' });
        expect(result.success).toBe(false);
    });

    it('❌ password empty string', () => {
        const result = loginSchema.safeParse({ username: 'admin', password: '' });
        expect(result.success).toBe(false);
    });

    it('❌ username too long (>100)', () => {
        const result = loginSchema.safeParse({ username: 'a'.repeat(101), password: '1234' });
        expect(result.success).toBe(false);
    });

    it('✅ strips unknown fields', () => {
        const result = loginSchema.safeParse({ username: 'admin', password: '1234', hack: '<script>' });
        expect(result.success).toBe(true);
        expect(result.data.hack).toBeUndefined();
    });
});
