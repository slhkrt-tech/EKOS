import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

const Dashboard = () => {
    const [userRegion, setUserRegion] = useState('');
    const [liveRequests, setLiveRequests] = useState([]);
    const [recentSavedRequests, setRecentSavedRequests] = useState([]);
    const [savedRequestCount, setSavedRequestCount] = useState(0);
    const [requestTypeSummary, setRequestTypeSummary] = useState({
        fault_reports: 0,
        speed_requests: 0,
        support_requests: 0
    });
    const [routeHistory, setRouteHistory] = useState([]);
    const [routeHistorySummary, setRouteHistorySummary] = useState({ total_routes: 0, total_distance: 0, average_fuel: 0 });
    const [vehicleAnalytics, setVehicleAnalytics] = useState([]);
    const [customerInfrastructure, setCustomerInfrastructure] = useState([]);
    const wsRef = useRef(null);
    const navigate = useNavigate();

    // Sayfa yüklendiğinde "Dijital Yaka Kartını" (Token) kontrol et
    useEffect(() => {
        const token = localStorage.getItem('ekos_token');
        if (!token) {
            navigate('/');
            return;
        }
        try {
            const decoded = jwtDecode(token);
            setUserRegion(decoded.region);
        } catch (error) {
            localStorage.removeItem('ekos_token');
            navigate('/');
        }
    }, [navigate]);

    const loadRecentSavedRequests = async () => {
        try {
            const response = await api.get('/requests?limit=5');
            setRecentSavedRequests(response.data.data || []);
            setSavedRequestCount(response.data.summary?.total_requests || 0);
            setRequestTypeSummary({
                fault_reports: response.data.summary?.fault_reports || 0,
                speed_requests: response.data.summary?.speed_requests || 0,
                support_requests: response.data.summary?.support_requests || 0
            });
        } catch (error) {
            console.error('[EKOS DASHBOARD] Kaydedilmiş talepler yüklenemedi.', error);
        }
    };

    const loadRouteHistory = async () => {
        try {
            const response = await api.get('/routes/history?limit=5');
            setRouteHistory(response.data.data || []);
            setRouteHistorySummary(response.data.summary || { total_routes: 0, total_distance: 0, average_fuel: 0 });
        } catch (error) {
            console.error('[EKOS DASHBOARD] Rota geçmişi yüklenemedi.', error);
        }
    };

    const loadVehicleAnalytics = async () => {
        try {
            const response = await api.get('/vehicles');
            const vehicles = response.data.data || [];
            setVehicleAnalytics(vehicles);
        } catch (error) {
            console.error('[EKOS DASHBOARD] Araç analitikleri yüklenemedi.', error);
        }
    };

    const loadCustomerInfrastructureStats = async () => {
        try {
            const response = await api.get('/customers/analytics/infrastructure');
            setCustomerInfrastructure(response.data.data || []);
        } catch (error) {
            console.error('[EKOS DASHBOARD] Müşteri altyapı istatistikleri yüklenemedi.', error);
        }
    };

    useEffect(() => {
        loadRecentSavedRequests();
        loadRouteHistory();
        loadVehicleAnalytics();
        loadCustomerInfrastructureStats();
        
        // WebSocket adresi APK için Local IP ile değiştirildi
        const socket = new WebSocket('ws://192.168.1.185:3000/ws');

        socket.onopen = () => {
            setLiveRequests((prev) => [...prev, { id: Date.now(), type: 'system', message: 'Canlı bildirim bağlantısı kuruldu.' }]);
        };

        socket.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.event === 'new_customer_request') {
                    setLiveRequests((prev) => [
                        { id: Date.now(), type: 'request', message: payload },
                        ...prev
                    ].slice(0, 5));
                    setRecentSavedRequests((prev) => [
                        { id: payload.id, company_name: payload.company_name, request_type: payload.request_type, details: payload.details, created_at: payload.created_at },
                        ...prev
                    ].slice(0, 5));
                    setSavedRequestCount((count) => count + 1);
                }
            } catch (error) {
                setLiveRequests((prev) => [...prev, { id: Date.now(), type: 'system', message: event.data }]);
            }
        };

        socket.onerror = () => {
            setLiveRequests((prev) => [...prev, { id: Date.now(), type: 'system', message: 'WebSocket hatası oluştu.' }]);
        };

        wsRef.current = socket;
        return () => {
            wsRef.current?.close();
        };
    }, []);

    // Sistemden güvenli çıkış
    const handleLogout = () => {
        localStorage.removeItem('ekos_token');
        navigate('/');
    };

    return (
        <>
            {/* Üst Navigasyon Barı */}
            <nav className="navbar">
                <div className="navbar-inner">
                    <div className="navbar-brand">EKOS | Türk Telekom & Evanet</div>
                    <div className="navbar-user-info">
                        <span><strong>Salih Kurt</strong> | Kurumsal Teknoloji Danışmanı</span>
                        <button onClick={handleLogout} className="btn-logout">Çıkış Yap</button>
                    </div>
                </div>
            </nav>

            {/* Ana İçerik */}
            <main className="container">
                
                {/* Özet İstatistik Kartları */}
                <div className="grid-stats">
                    <div className="card" style={{ borderLeft: '4px solid var(--kurumsal-turkuaz)' }}>
                        <h3 className="card-title">Portföydeki Müşteriler</h3>
                        <p className="card-value">0</p>
                    </div>
                    <div className="card" style={{ borderLeft: '4px solid var(--kurumsal-lacivert)' }}>
                        <h3 className="card-title">Onay Bekleyen Teklifler</h3>
                        <p className="card-value">0</p>
                    </div>
                    <div className="card" style={{ borderLeft: '4px solid var(--success-text)' }}>
                        <h3 className="card-title">Kaydedilmiş Talepler</h3>
                        <p className="card-value">{savedRequestCount}</p>
                    </div>
                    <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                        <h3 className="card-title">Arıza Kaydı</h3>
                        <p className="card-value">{requestTypeSummary.fault_reports}</p>
                    </div>
                    <div className="card" style={{ borderLeft: '4px solid #a855f7' }}>
                        <h3 className="card-title">Kaydedilmiş Rota</h3>
                        <p className="card-value">{routeHistorySummary.total_routes}</p>
                    </div>
                    <div className="card" style={{ borderLeft: '4px solid #6366f1' }}>
                        <h3 className="card-title">Saha Operasyon Bölgesi</h3>
                        <p className="card-value" style={{ fontSize: '1.25rem', marginTop: '0.5rem' }}>{userRegion || 'Yükleniyor...'}</p>
                    </div>
                </div>

                {/* Karmaşık Veri Panelleri (Grid) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    
                    {/* Canlı Talepler Paneli */}
                    <div className="card">
                        <h3 className="module-title" style={{ marginBottom: '1rem' }}>Son 5 Canlı Talep</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '15rem', overflowY: 'auto' }}>
                            {liveRequests.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Henüz canlı talep alınmadı.</p>
                            ) : (
                                liveRequests.map((item) => (
                                    <div key={item.id} style={{
                                        padding: '0.75rem', borderRadius: '0.5rem', 
                                        backgroundColor: item.type === 'request' ? '#eff6ff' : '#f9fafb',
                                        border: `1px solid ${item.type === 'request' ? '#dbeafe' : 'var(--border-color)'}`
                                    }}>
                                        {item.type === 'request' ? (
                                            <>
                                                <p style={{ fontWeight: '600', color: 'var(--kurumsal-lacivert)' }}>{item.message.company_name}</p>
                                                <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>Tür: {item.message.request_type}</p>
                                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Detay: {item.message.details || 'Yok'}</p>
                                                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>{new Date(item.message.timestamp).toLocaleString()}</p>
                                            </>
                                        ) : (
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{item.message}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Son Kayıtlı Talepler */}
                    <div className="card">
                        <h3 className="module-title" style={{ marginBottom: '1rem' }}>Son Kayıtlı Talepler</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                <p style={{ fontWeight: '600' }}>Toplam</p><p>{savedRequestCount}</p>
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                <p style={{ fontWeight: '600' }}>Hız Talebi</p><p>{requestTypeSummary.speed_requests}</p>
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                <p style={{ fontWeight: '600' }}>Destek</p><p>{requestTypeSummary.support_requests}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '15rem', overflowY: 'auto' }}>
                            {recentSavedRequests.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Henüz kayıtlı talep yok.</p>
                            ) : (
                                recentSavedRequests.map((item) => (
                                    <div key={item.id} style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)' }}>
                                        <p style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{item.company_name}</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>Tür: {item.request_type}</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Detay: {item.details || 'Yok'}</p>
                                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>{new Date(item.created_at).toLocaleString()}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Son Kayıtlı Rota Planları */}
                    <div className="card">
                        <h3 className="module-title" style={{ marginBottom: '1rem' }}>Son Kayıtlı Rota Planları</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                <p style={{ fontWeight: '600' }}>Toplam Rota</p><p>{routeHistorySummary.total_routes}</p>
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                <p style={{ fontWeight: '600' }}>Mesafe</p><p>{routeHistorySummary.total_distance} km</p>
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                <p style={{ fontWeight: '600' }}>Ort. Yakıt</p><p>{routeHistorySummary.average_fuel} L</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '15rem', overflowY: 'auto' }}>
                            {routeHistory.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Henüz rota kaydı bulunmuyor.</p>
                            ) : (
                                routeHistory.map((item) => (
                                    <div key={item.id} onClick={() => navigate(`/routes/${item.id}`)} style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                                        <p style={{ fontWeight: '600', color: 'var(--text-dark)' }}>Araç: {item.brand_model || 'Bilinmiyor'} ({item.plate_number || '---'})</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>Mesafe: {item.total_distance} km</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>Yakıt: {item.estimated_fuel} L</p>
                                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>{new Date(item.created_at).toLocaleString()}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--kurumsal-turkuaz)', fontWeight: '600', marginTop: '0.25rem' }}>Detayları Görüntüle →</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Müşteri Altyapı Dağılımı */}
                    <div className="card">
                        <h3 className="module-title" style={{ marginBottom: '1rem' }}>Müşteri Altyapı Dağılımı</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                            {customerInfrastructure.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Altyapı verisi yok</p>
                            ) : (
                                customerInfrastructure.map((item, idx) => (
                                    <div key={idx} style={{ background: 'linear-gradient(to bottom right, #faf5ff, #f3e8ff)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e9d5ff' }}>
                                        <p style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{item.current_infrastructure}</p>
                                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--kurumsal-lacivert)', margin: '0.5rem 0' }}>{item.count}</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{item.percentage}% oranında</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

                {/* Geniş İstatistik / Analitik Panelleri */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 className="module-title" style={{ marginBottom: '1rem' }}>Talep İstatistikleri Özeti</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Toplam Talep</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1d4ed8', marginTop: '0.5rem' }}>{requestTypeSummary.fault_reports + requestTypeSummary.speed_requests + requestTypeSummary.support_requests}</p>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Arıza Kaydı</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b91c1c', marginTop: '0.5rem' }}>{requestTypeSummary.fault_reports}</p>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Hız Talebi</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#c2410c', marginTop: '0.5rem' }}>{requestTypeSummary.speed_requests}</p>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Teknik Destek</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#15803d', marginTop: '0.5rem' }}>{requestTypeSummary.support_requests}</p>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 className="module-title" style={{ marginBottom: '1rem' }}>Araç Filosu Yakıt Tüketim Analizi</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', maxHeight: '20rem', overflowY: 'auto' }}>
                        {vehicleAnalytics.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Araç verisi yüklenemedi.</p>
                        ) : (
                            vehicleAnalytics.map((vehicle) => (
                                <div key={vehicle.id} style={{ background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                                    <p style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{vehicle.brand_model}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Plaka: {vehicle.plate_number}</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Base Tüketim:</span>
                                            <span style={{ fontWeight: '500', color: 'var(--text-dark)' }}>{vehicle.base_fuel_consumption} L/100km</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Klima Çarpanı:</span>
                                            <span style={{ fontWeight: '500', color: 'var(--text-dark)' }}>{vehicle.ac_fuel_multiplier}x</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Mevcut Km:</span>
                                            <span style={{ fontWeight: '500', color: 'var(--text-dark)' }}>{vehicle.current_km} km</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Dinamik İşlem Modülleri */}
                <h2 style={{ marginBottom: '1rem', color: 'var(--text-dark)' }}>Hızlı İşlemler</h2>
                <div className="grid-actions">
                    <button onClick={() => navigate('/customers')} className="action-module" style={{ border: 'none', width: '100%' }}>
                        <div className="module-icon">🏢</div>
                        <span className="module-title">Yeni Kurumsal Müşteri Ekle</span>
                        <span className="module-desc">Metro İnternet ve IT projeleri için kayıt aç</span>
                    </button>

                    <button onClick={() => navigate('/route-planner')} className="action-module" style={{ border: 'none', width: '100%' }}>
                        <div className="module-icon">🗺️</div>
                        <span className="module-title">Günlük Rota & Yakıt Planla</span>
                        <span className="module-desc">En yakın komşu algoritmasıyla mesafeyi optimize et</span>
                    </button>

                    <button onClick={() => navigate('/proposal')} className="action-module" style={{ border: 'none', width: '100%' }}>
                        <div className="module-icon">📄</div>
                        <span className="module-title">Yeni Teklif Oluştur</span>
                        <span className="module-desc">Müşteri bilgilerini otomatik doldur ve PDF hazırla</span>
                    </button>

                    <button onClick={() => navigate('/requests')} className="action-module" style={{ border: 'none', width: '100%' }}>
                        <div className="module-icon" style={{ backgroundColor: '#dcfce7' }}>🔔</div>
                        <span className="module-title">Canlı Talep Paneli</span>
                        <span className="module-desc">Müşteri taleplerini anlık olarak saha ekibine ilet</span>
                    </button>

                    <button onClick={() => navigate('/settings')} className="action-module" style={{ border: 'none', width: '100%' }}>
                        <div className="module-icon" style={{ backgroundColor: '#f3e8ff' }}>⚙️</div>
                        <span className="module-title">Sistem Ayarları</span>
                        <span className="module-desc">Araç filosu ve sistem konfigürasyonunu yönet</span>
                    </button>
                </div>
            </main>
        </>
    );
};

export default Dashboard;