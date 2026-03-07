/**
 * =============================================================================
 * App.jsx — Root Component ของ ERP Application
 * =============================================================================
 *
 * จัดการ:
 *   - Routing (React Router v6)
 *   - Authentication Provider (ครอบทั้ง App)
 *   - Protected Routes (ตรวจสอบสิทธิ์ก่อนเข้าแต่ละหน้า)
 *
 * โครงสร้าง Route:
 *   /                → หน้า Login (public)
 *   /home            → หน้าหลัก (Dashboard)
 *   /stock           → คลังสินค้า
 *   /sales           → ฝ่ายขาย
 *   /accounts        → บัญชี
 *   /procurement     → จัดซื้อ
 *   /reports         → รายงาน
 *   /qc              → ตรวจสอบคุณภาพ
 *   /rnd             → วิจัยและพัฒนา
 *   /packaging       → บรรจุภัณฑ์
 *   /hr              → บุคลากร
 *   /settings        → ตั้งค่า
 *   /permissions     → จัดการสิทธิ์ (admin only)
 *   *                → redirect ไปหน้า Login
 *
 * =============================================================================
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Home from './pages/Home';
import Stock from './pages/Stock';
import Sales from './pages/Sales';
import Accounts from './pages/Accounts';
import Procurement from './pages/Procurement';
import Reports from './pages/Reports';
import QC from './pages/QC';
import HR from './pages/HR';
import Settings from './pages/Settings';
import PermissionManager from './pages/PermissionManager';
import Planning from './pages/Planning';
import Operator from './pages/Operator';
import RnD from './pages/RnD';
import Packaging from './pages/Packaging';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── หน้า Login (ไม่ต้องล็อกอิน) ── */}
          <Route path="/" element={<Login />} />

          {/* ── หน้าที่ต้องล็อกอิน (มี Layout ครอบ) ── */}
          <Route element={
            <ProtectedRoute pageId={null}>
              <Layout />
            </ProtectedRoute>
          }>
            {/* เมนูหลัก */}
            <Route path="/home" element={
              <ProtectedRoute pageId="home"><Home /></ProtectedRoute>
            } />
            <Route path="/stock" element={
              <ProtectedRoute pageId="stock"><Stock /></ProtectedRoute>
            } />
            <Route path="/sales" element={
              <ProtectedRoute pageId="sales"><Sales /></ProtectedRoute>
            } />
            <Route path="/accounts" element={
              <ProtectedRoute pageId="accounts"><Accounts /></ProtectedRoute>
            } />
            <Route path="/procurement" element={
              <ProtectedRoute pageId="procurement"><Procurement /></ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute pageId="reports"><Reports /></ProtectedRoute>
            } />
            <Route path="/qc" element={
              <ProtectedRoute pageId="qc"><QC /></ProtectedRoute>
            } />
            <Route path="/planning" element={
              <ProtectedRoute pageId="planning"><Planning /></ProtectedRoute>
            } />
            <Route path="/operator" element={
              <ProtectedRoute pageId="operator"><Operator /></ProtectedRoute>
            } />
            <Route path="/rnd" element={
              <ProtectedRoute pageId="rnd"><RnD /></ProtectedRoute>
            } />
            <Route path="/packaging" element={
              <ProtectedRoute pageId="packaging"><Packaging /></ProtectedRoute>
            } />

            {/* บุคลากร */}
            <Route path="/hr" element={
              <ProtectedRoute pageId="hr"><HR /></ProtectedRoute>
            } />

            {/* ระบบ */}
            <Route path="/settings" element={
              <ProtectedRoute pageId="settings"><Settings /></ProtectedRoute>
            } />
            <Route path="/permissions" element={
              <ProtectedRoute adminOnly><PermissionManager /></ProtectedRoute>
            } />
          </Route>

          {/* ── Route ไม่ตรง → redirect กลับหน้า Login ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
