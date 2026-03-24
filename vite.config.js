import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // เปิดให้เครื่องอื่นในวงแลนเข้าถึงได้
    port: 5173      // กำหนด port เป็น 5173 ตามเดิม
  }
})