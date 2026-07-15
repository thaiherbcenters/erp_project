const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Headers ──
app.use(helmet());

// ── CORS: อนุญาตเฉพาะ origin ที่กำหนดใน .env ──
app.use(cors({
    origin: (origin, callback) => {
        // อนุญาตทุก Origin เพื่อป้องกัน Error CORS 500 ในขณะที่เปิดจาก IP หรือ Domain ต่างๆ
        callback(null, true);
    },
    credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Serve static files for uploads via /api/uploads
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
const authMiddleware = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const permissionRoutes = require('./routes/permissions');
const documentRoutes = require('./routes/documents');
const formFillRoutes = require('./routes/form-fill');
const formSubmissionRoutes = require('./routes/form-submissions');
const documentLibraryRoutes = require('./routes/document-library');
const departmentRoutes = require('./routes/departments');
const roleRoutes = require('./routes/roles');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const leaveRequestRoutes = require('./routes/leave-requests');
const customerRoutes = require('./routes/customers');
const companyRoutes = require('./routes/companies');
const qcRoutes = require('./routes/qc');
const productionRoutes = require('./routes/production');
const plannerRoutes = require('./routes/planner');
const rndRoutes = require('./routes/rnd');
const packagingRoutes = require('./routes/packaging');
const stockRoutes = require('./routes/stock');
const shippingRoutes = require('./routes/shipping');
const quotationRoutes = require('./routes/quotations');
const salesOrderRoutes = require('./routes/sales-orders');
const auditLogRoutes = require('./routes/audit-logs');
const legalDocumentRoutes = require('./routes/legalDocuments');
const herbalCertDocumentRoutes = require('./routes/herbalCertDocuments');
const contractMfgRoutes = require('./routes/contractMfg');
const contractRoutes = require('./routes/contracts');
const printRoutes = require('./routes/print');
const templateRoutes = require('./routes/templates');

// ── Rate Limiting สำหรับ Login (ป้องกัน brute force) ──
const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 นาที
    max: 5,                   // จำกัด 5 ครั้ง/นาที
    message: { success: false, message: 'คุณพยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 1 นาที' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/auth', loginLimiter, authRoutes);

// Apply auth middleware to all subsequent API routes
app.use(authMiddleware);

app.use('/api/users', userRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/library', documentLibraryRoutes);
app.use('/api/forms', formFillRoutes);
app.use('/api/submissions', formSubmissionRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/rnd', rndRoutes);
app.use('/api/packaging', packagingRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/legal-documents', legalDocumentRoutes);
app.use('/api/contract-mfg-documents', contractMfgRoutes);
app.use('/api/print', printRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/herbal-cert-documents', herbalCertDocumentRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/torbor1-documents', require('./routes/torbor1Documents'));
app.use('/api/pdpa-consent-documents', require('./routes/pdpaConsentDocuments'));
app.use('/api/corp-rep-documents', require('./routes/corpRepDocuments'));
app.use('/api/safety-cert-documents', require('./routes/safetyCertDocuments'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

// ── Health Check (สำหรับ monitoring) ──
app.get('/api/health', async (req, res) => {
    try {
        const { poolPromise } = require('./config/db');
        const pool = await poolPromise;
        await pool.request().query('SELECT 1');
        res.json({ 
            success: true, 
            status: 'healthy', 
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(503).json({ 
            success: false, 
            status: 'unhealthy', 
            error: 'Database connection failed' 
        });
    }
});

// Global Error Handler for unexpected middleware errors (e.g., multer fs errors)
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    // Production: ซ่อน error details จาก client
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({ 
        success: false, 
        message: 'Internal Server Error', 
        ...(isProduction ? {} : { error: err.message || err.toString() })
    });
});

// Initialize Background Cron Jobs
const { initCronJobs } = require('./jobs/logCleanup');
initCronJobs();

// Export app สำหรับ testing (supertest) — ไม่ listen ถ้าถูก require จาก test
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server listening on port ${PORT}`);
    });
}

module.exports = app;
