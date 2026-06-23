const http = require('http');

const payload = JSON.stringify({
  quotationNo: "QT20260615-001",
  docType: "quotation_thc",
  bankAccount: "ktb",
  customerTypeId: "",
  customerName: "Test Company",
  contactPerson: "",
  email: "",
  address: "Bangkok",
  phone: "0123456789",
  taxId: "",
  billDate: "2026-06-15",
  validUntil: "2026-07-15",
  subTotal: 1000,
  discountPercent: 0,
  discountAmount: 0,
  afterDiscount: 1000,
  vatRate: 0,
  vatAmount: 0,
  shippingCost: 0,
  grandTotal: 1000,
  depositPercent: "0",
  depositAmount: 0,
  remainingAmount: 1000,
  signer: "",
  notes: "",
  showDiscountInPrint: false,
  showVatInPrint: false,
  showDepositInPrint: true,
  showShippingInPrint: true,
  designFee: 500,
  showDesignFeeInPrint: false,
  contractId: null,
  status: "พร้อมใช้",
  items: [
    {
      name: "Product A",
      qty: 10,
      price: 100,
      amount: 1000,
      isPromo: false,
      promoMultiplier: 1,
      imageURL: null
    }
  ]
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/quotations',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    // Need authorization header? 
    // Wait, the route doesn't have authorization middleware? 
    // Let's check quotations.js -> router.post('/', authorizeRoles('admin', 'executive', 'sales'), ...
    // Oh, it needs token!
  }
};

// ... Wait, I can't easily mock a valid token for `authorizeRoles` if I don't have a token.
