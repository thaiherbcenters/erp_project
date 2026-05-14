/**
 * Unit test สำหรับ Zod validation middleware
 */
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const validate = require('../../middleware/validate');
const { z } = require('zod');

// Helper: สร้าง mock req/res/next
const mockReq = (body = {}) => ({ body });
const mockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

// สร้าง schema ตัวอย่างสำหรับ test
const testSchema = z.object({
    name: z.string({ required_error: 'กรุณากรอกชื่อ' }).min(1, 'กรุณากรอกชื่อ'),
    age: z.number({ required_error: 'กรุณากรอกอายุ' }).min(0, 'อายุต้องไม่ติดลบ'),
});

describe('validate middleware', () => {
    it('ผ่าน validation → เรียก next()', () => {
        const req = mockReq({ name: 'Test', age: 25 });
        const res = mockRes();
        const next = vi.fn();

        validate(testSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(req.body).toEqual({ name: 'Test', age: 25 });
    });

    it('body ว่าง → return 400 + error message', () => {
        const req = mockReq({});
        const res = mockRes();
        const next = vi.fn();

        validate(testSchema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: expect.any(String),
            })
        );
    });

    it('field ผิด type → return 400', () => {
        const req = mockReq({ name: 'Test', age: 'not-a-number' });
        const res = mockRes();
        const next = vi.fn();

        validate(testSchema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('strip unknown fields ออกจาก body', () => {
        const req = mockReq({ name: 'Test', age: 25, hack: '<script>' });
        const res = mockRes();
        const next = vi.fn();

        validate(testSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.body).toEqual({ name: 'Test', age: 25 });
        expect(req.body.hack).toBeUndefined();
    });
});
