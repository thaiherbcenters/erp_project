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

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProductionProvider } from './context/ProductionContext';
import { PlannerProvider } from './context/PlannerContext';
import { AlertProvider } from './components/CustomAlert';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
const Home = lazy(() => import('./pages/Home'));
const Customer = lazy(() => import('./pages/Customer'));
const Stock = lazy(() => import('./pages/Stock'));
const Sales = lazy(() => import('./pages/Sales'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Procurement = lazy(() => import('./pages/Procurement'));
const Reports = lazy(() => import('./pages/Reports'));
const QC = lazy(() => import('./pages/QC'));
const HR = lazy(() => import('./pages/HR'));
const Settings = lazy(() => import('./pages/Settings'));
const PermissionManager = lazy(() => import('./pages/PermissionManager'));
const Planning = lazy(() => import('./pages/Planning'));
const Operator = lazy(() => import('./pages/Operator'));
const RnD = lazy(() => import('./pages/RnD'));
const Packaging = lazy(() => import('./pages/Packaging'));
const Fulfillment = lazy(() => import('./pages/Fulfillment'));
const DocumentControl = lazy(() => import('./pages/DocumentControl'));
import { RnDProvider } from './context/RnDContext';

function App() {
  return (
    <AlertProvider>
    <AuthProvider>
      <ProductionProvider>
        <PlannerProvider>
          <RnDProvider>
          <BrowserRouter>
            <Suspense fallback={
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: '#666' }}>
                <div className="spinner-border text-primary me-2" role="status"></div> กำลังโหลด...
              </div>
            }>
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
                <Route path="/customer" element={
                  <ProtectedRoute pageId="customer"><Customer /></ProtectedRoute>
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
                <Route path="/fulfillment" element={
                  <ProtectedRoute pageId="fulfillment"><Fulfillment /></ProtectedRoute>
                } />
                <Route path="/packaging" element={
                  <ProtectedRoute pageId="packaging"><Packaging /></ProtectedRoute>
                } />
                <Route path="/document" element={
                  <ProtectedRoute pageId="document"><DocumentControl /></ProtectedRoute>
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
            </Suspense>
          </BrowserRouter>
          </RnDProvider>
        </PlannerProvider>
      </ProductionProvider>
    </AuthProvider>
    </AlertProvider>
  );
}

export default App;
