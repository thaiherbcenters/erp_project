/**
 * validators/quotations.js — Zod schemas สำหรับ quotation routes
 */
const { z } = require('zod');

const quotationItemSchema = z.object({
    name: z.string({ message: 'กรุณาระบุชื่อสินค้า' }).min(1, 'กรุณาระบุชื่อสินค้า'),
    qty: z.number({ message: 'กรุณาระบุจำนวน' }).min(0, 'จำนวนต้องไม่ติดลบ'),
    price: z.number({ message: 'กรุณาระบุราคา' }).min(0, 'ราคาต้องไม่ติดลบ'),
    amount: z.number().min(0).default(0),
    isPromo: z.boolean().optional().default(false),
    promoMultiplier: z.number().int().optional().default(1),
    imageURL: z.string().nullable().optional(),
});

const createQuotationSchema = z.object({
    quotationNo: z.string().optional(),
    docType: z.string().nullable().optional(),
    bankAccount: z.string().nullable().optional(),
    customerTypeId: z.union([z.string(), z.number()]).nullable().optional(),
    customerName: z.string({ message: 'กรุณาระบุชื่อลูกค้า' }).min(1, 'กรุณาระบุชื่อลูกค้า'),
    contactPerson: z.string().nullable().optional(),
    email: z.string().email('รูปแบบ email ไม่ถูกต้อง').nullable().optional(),
    address: z.string().nullable().optional(),
    phone: z.string().max(50, 'เบอร์โทรยาวเกินไป').nullable().optional(),
    taxId: z.string().max(20, 'Tax ID ยาวเกินไป').nullable().optional(),
    billDate: z.string({ message: 'กรุณาระบุวันที่' }).min(1, 'กรุณาระบุวันที่'),
    validUntil: z.string().nullable().optional(),
    subTotal: z.number().min(0).default(0),
    discountPercent: z.number().int().min(0).max(100).default(0),
    discountAmount: z.number().min(0).default(0),
    afterDiscount: z.number().min(0).default(0),
    vatRate: z.number().int().min(0).max(100).default(0),
    vatAmount: z.number().min(0).default(0),
    shippingCost: z.number().min(0).default(0),
    grandTotal: z.number().min(0).default(0),
    depositPercent: z.union([z.string(), z.number()]).nullable().optional(),
    depositAmount: z.number().min(0).default(0),
    remainingAmount: z.number().min(0).default(0),
    signer: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    showDiscountInPrint: z.boolean().optional().default(false),
    showVatInPrint: z.boolean().optional().default(false),
    showDepositInPrint: z.boolean().optional().default(false),
    showShippingInPrint: z.boolean().optional().default(false),
    designFee: z.number().min(0).default(0),
    showDesignFeeInPrint: z.boolean().optional().default(false),
    status: z.string().optional().default('ร่าง'),
    items: z.array(quotationItemSchema).optional().default([]),
});

const updateStatusSchema = z.object({
    status: z.string({ message: 'กรุณาระบุสถานะ' }).min(1, 'กรุณาระบุสถานะ'),
});

module.exports = { createQuotationSchema, updateStatusSchema };
