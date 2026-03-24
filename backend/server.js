const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*', // อนุญาตให้ทุก IP (รวมถึง 10.0.0.x) เข้าถึงได้
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

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

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/library', documentLibraryRoutes);
app.use('/api/forms', formFillRoutes);
app.use('/api/submissions', formSubmissionRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/roles', roleRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});


