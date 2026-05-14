/**
 * __tests__/api/auth.api.test.mjs
 * Integration test สำหรับ Auth API
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const app = require('../../server');

describe('POST /api/auth/login', () => {

    it('❌ return 400 ถ้าไม่ส่ง username/password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('❌ return 401 ถ้า user ไม่มีในระบบ', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'unknown_user_test_999', password: '123' });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('ผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    });

    it('❌ return 401 ถ้ารหัสผ่านผิด', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'it_admin', password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('ผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    });
});

