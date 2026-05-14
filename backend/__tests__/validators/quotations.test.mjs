/**
 * Unit test สำหรับ quotation validation schemas
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createQuotationSchema, updateStatusSchema } = require('../../validators/quotations');

describe('createQuotationSchema', () => {
    const validQuotation = {
        customerName: 'บริษัท ทดสอบ จำกัด',
        billDate: '2026-05-08',
        items: [{ name: 'สินค้า A', qty: 10, price: 100, amount: 1000 }],
    };

    it('✅ valid: ข้อมูลขั้นต่ำ (customerName + billDate)', () => {
        const result = createQuotationSchema.safeParse(validQuotation);
        expect(result.success).toBe(true);
        expect(result.data.customerName).toBe('บริษัท ทดสอบ จำกัด');
    });

    it('✅ defaults: ค่า default ถูกต้อง', () => {
        const result = createQuotationSchema.safeParse(validQuotation);
        expect(result.data.status).toBe('ร่าง');
        expect(result.data.grandTotal).toBe(0);
        expect(result.data.designFee).toBe(0);
        expect(result.data.showVatInPrint).toBe(false);
    });

    it('❌ missing customerName', () => {
        const result = createQuotationSchema.safeParse({ billDate: '2026-05-08' });
        expect(result.success).toBe(false);
        const errors = result.error.issues.map(e => e.message);
        expect(errors.some(e => e.includes('ลูกค้า'))).toBe(true);
    });

    it('❌ missing billDate', () => {
        const result = createQuotationSchema.safeParse({ customerName: 'Test' });
        expect(result.success).toBe(false);
    });

    it('❌ negative grandTotal', () => {
        const result = createQuotationSchema.safeParse({ ...validQuotation, grandTotal: -100 });
        expect(result.success).toBe(false);
    });

    it('❌ discountPercent > 100', () => {
        const result = createQuotationSchema.safeParse({ ...validQuotation, discountPercent: 150 });
        expect(result.success).toBe(false);
    });

    it('❌ invalid email format', () => {
        const result = createQuotationSchema.safeParse({ ...validQuotation, email: 'not-an-email' });
        expect(result.success).toBe(false);
    });

    it('✅ valid email', () => {
        const result = createQuotationSchema.safeParse({ ...validQuotation, email: 'test@example.com' });
        expect(result.success).toBe(true);
    });

    it('✅ items: valid item', () => {
        const result = createQuotationSchema.safeParse(validQuotation);
        expect(result.data.items).toHaveLength(1);
        expect(result.data.items[0].name).toBe('สินค้า A');
    });

    it('❌ items: item missing name', () => {
        const result = createQuotationSchema.safeParse({
            ...validQuotation,
            items: [{ qty: 10, price: 100, amount: 1000 }],
        });
        expect(result.success).toBe(false);
    });
});

describe('updateStatusSchema', () => {
    it('✅ valid status', () => {
        const result = updateStatusSchema.safeParse({ status: 'อนุมัติ' });
        expect(result.success).toBe(true);
    });

    it('❌ missing status', () => {
        const result = updateStatusSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it('❌ empty status', () => {
        const result = updateStatusSchema.safeParse({ status: '' });
        expect(result.success).toBe(false);
    });
});
