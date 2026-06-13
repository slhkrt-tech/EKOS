import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useDLP from './hooks/useDLP'; // EKOS DLP (Data Loss Prevention) Güvenlik Katmanı

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

function App() {
  // Kurumsal güvenlik politikası gereği, tüm rotalarda sağ tık, kopyalama ve F12 engellenir.
  useDLP();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/customers" element={<CustomerManagement />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/route-planner" element={<RoutePlanner />} />
        <Route path="/routes/:id" element={<RouteDetail />} />
        <Route path="/proposal" element={<ProposalCreation />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/settings" element={<AdminSettings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;