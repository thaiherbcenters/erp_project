module.exports = {
  apps: [
    {
      name: 'erp_backend',       // ชื่อโปรเซสของระบบหลังบ้าน
      script: './backend/server.js', // ไฟล์หลักที่ใช้รัน backend
      instances: 1,
      autorestart: true,         // เปิดให้ทำงานใหม่เองถ้าแอปดับ
      watch: false,              
      max_memory_restart: '1G',  // รีสตาร์ทถ้ากินแรมเกิน 1GB
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    // (ทางเลือก) ส่วนรันหน้าเว็บ Frontend (React)
    {
      name: 'erp_frontend',      // ชื่อโปรเซสของระบบหน้าบ้าน
      script: 'npx',
      args: 'serve -s dist -l 5173', // ใช้แพ็คเกจ serve รันไฟล์ในโฟลเดอร์ dist ที่พอร์ต 5173 
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
