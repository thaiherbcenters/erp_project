const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    // Check for token in Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: 'การเข้าถึงถูกปฏิเสธ: ไม่พบ Token ยืนยันตัวตน' 
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is missing from environment variables');
            return res.status(500).json({ success: false, message: 'Server configuration error' });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user info to the request object
        req.user = decoded;
        next();
    } catch (err) {
        console.error('JWT Verification Error:', err.message);
        return res.status(401).json({ 
            success: false, 
            message: 'การเข้าถึงถูกปฏิเสธ: Token ไม่ถูกต้อง หรือหมดอายุ' 
        });
    }
};

module.exports = authMiddleware;
