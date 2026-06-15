import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useDLP from './hooks/useDLP'; // EKOS DLP (Data Loss Prevention) Güvenlik Katmanı
import useSyncEngine from './hooks/useSyncEngine'; // EKOS Offline-First Senkronizasyon Motoru
import ProtectedRoute from './components/ProtectedRoute'; // Güvenlik Kalkanı

// Sayfalar
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerManagement from './pages/CustomerManagement';
import CustomerDetail from './pages/CustomerDetail';
import RoutePlanner from './pages/RoutePlanner';
import RouteDetail from './pages/RouteDetail';
import ProposalCreation from './pages/ProposalCreation';
import Requests from './pages/Requests';
import AdminSettings from './pages/AdminSettings';
import Pipeline from './pages/Pipeline';
import AIPredictions from './pages/AIPredictions'; // YENİ EKLENDİ: Yapay Zeka Radarı

function App() {
  // Kurumsal güvenlik politikası gereği, tüm rotalarda sağ tık, kopyalama ve F12 engellenir.
  useDLP();
  
  // Arka plan senkronizasyon motorunu başlat (İnternet geldiğinde cihaz hafızasını sunucuya aktarır)
  useSyncEngine();

  return (
    <BrowserRouter>
      <Routes>
        {/* Herkese Açık Rota */}
        <Route path="/" element={<Login />} />

        {/* --- YETKİLENDİRİLMİŞ ROTALAR (RBAC) --- */}
        
        {/* Dashboard'u sisteme giriş yapan herkes görebilir, kendi içinde yetki kısıtlamaları yaparız */}
        <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />

        {/* Sadece Yönetici (admin) ve Satış Temsilcisi (sales) Girebilir */}
        <Route path="/customers" element={
            <ProtectedRoute allowedRoles={['admin', 'sales']}><CustomerManagement /></ProtectedRoute>
        } />
        <Route path="/customers/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'sales']}><CustomerDetail /></ProtectedRoute>
        } />
        <Route path="/pipeline" element={
            <ProtectedRoute allowedRoles={['admin', 'sales']}><Pipeline /></ProtectedRoute>
        } />
        <Route path="/proposal" element={
            <ProtectedRoute allowedRoles={['admin', 'sales']}><ProposalCreation /></ProtectedRoute>
        } />
        
        {/* YENİ EKLENDİ: AI Radar Sayfası */}
        <Route path="/ai-predictions" element={
            <ProtectedRoute allowedRoles={['admin', 'sales']}><AIPredictions /></ProtectedRoute>
        } />

        {/* Herkes Girebilir (Admin, Satış, Saha Teknisyeni) */}
        <Route path="/requests" element={
            <ProtectedRoute allowedRoles={['admin', 'sales', 'tech']}><Requests /></ProtectedRoute>
        } />
        <Route path="/route-planner" element={
            <ProtectedRoute allowedRoles={['admin', 'sales', 'tech']}><RoutePlanner /></ProtectedRoute>
        } />
        <Route path="/routes/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'sales', 'tech']}><RouteDetail /></ProtectedRoute>
        } />

        {/* Sadece Sistem Yöneticisi (admin) Girebilir */}
        <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;