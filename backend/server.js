const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files for uploads via /api/uploads
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.use('/api/auth', authRoutes);
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
app.use('/api/shipping', shippingRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/sales-orders', salesOrderRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Global Error Handler for unexpected middleware errors (e.g., multer fs errors)
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal Server Error', 
        error: err.message || err.toString() 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});


