/**
 * validators/Receipts.js — Zod schemas สำหรับ tax invoice routes
 */
const { z } = require('zod');

const ReceiptItemSchema = z.object({
    name: z.string({ message: 'กรุณาระบุชื่อสินค้า' }).min(1, 'กรุณาระบุชื่อสินค้า'),
    qty: z.number({ message: 'กรุณาระบุจำนวน' }).min(0, 'จำนวนต้องไม่ติดลบ'),
    price: z.number({ message: 'กรุณาระบุราคา' }).min(0, 'ราคาต้องไม่ติดลบ'),
    amount: z.number().min(0).default(0),
    isPromo: z.boolean().optional().default(false),
    promoMultiplier: z.number().int().optional().default(1),
    imageURL: z.string().nullable().optional(),
});

const createReceiptSchema = z.object({
    customerId: z.union([z.string(), z.number()]).nullable().optional(),
    ReceiptNo: z.string().optional(),
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
    customerOrder: z.string().nullable().optional(),
    purchaseNo: z.string().nullable().optional(),
    salesperson: z.string().nullable().optional(),
    termOfPayment: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    showDiscountInPrint: z.boolean().optional().default(false),
    showVatInPrint: z.boolean().optional().default(false),
    showDepositInPrint: z.boolean().optional().default(false),
    showShippingInPrint: z.boolean().optional().default(false),
    designFee: z.number().min(0).default(0),
    showDesignFeeInPrint: z.boolean().optional().default(false),
    fdaCustomerCode: z.string().nullable().optional(),
    fdaEmail: z.string().nullable().optional(),
    fdaProjectName: z.string().nullable().optional(),
    fdaCreditTerms: z.string().nullable().optional(),
    fdaServiceRegister: z.boolean().optional().default(false),
    fdaServiceRegisterPrice: z.number().min(0).optional().default(0),
    fdaServiceTrademark: z.boolean().optional().default(false),
    fdaServiceTrademarkPrice: z.number().min(0).optional().default(0),
    contractId: z.union([z.string(), z.number()]).nullable().optional(),
    status: z.string().optional().default('ร่าง'),
    items: z.array(ReceiptItemSchema).optional().default([]),
});

const updateStatusSchema = z.object({
    status: z.string({ message: 'กรุณาระบุสถานะ' }).min(1, 'กรุณาระบุสถานะ'),
});

module.exports = { createReceiptSchema, updateStatusSchema };
