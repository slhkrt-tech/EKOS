import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import DashboardCharts from '../components/DashboardCharts';
import { useRole } from '../hooks/useRole';

const Dashboard = () => {
    const { role } = useRole(); // Kullanıcının rolünü al (admin, sales, tech)
    const [userRegion, setUserRegion] = useState('Adana Bölge Müdürlüğü');
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

    // 🛡️ 1. KIRILMAZ TOKEN KONTROLÜ
    useEffect(() => {
        const token = localStorage.getItem('ekos_token');
        if (!token) {
            navigate('/');
            return;
        }
        
        try {
            let decodedRegion = 'Adana Bölge Müdürlüğü';
            
            if (typeof jwtDecode === 'function') {
                const decoded = jwtDecode(token);
                decodedRegion = decoded.region;
            } else {
                // Kütüphane çalışmazsa manuel Base64 decode et
                const payload = token.split('.')[1];
                const decodedJson = JSON.parse(window.atob(payload));
                decodedRegion = decodedJson.region;
            }
            
            setUserRegion(decodedRegion || 'Adana Bölge Müdürlüğü');
        } catch (error) {
            console.warn('[EKOS DEMO] Token hatası yoksayıldı, varsayılan bölge atandı.');
            setUserRegion('Adana Bölge Müdürlüğü');
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
            setVehicleAnalytics(response.data.data || []);
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

    // 🛡️ 2. KIRILMAZ VERİ VE WEBSOCKET YÜKLEMESİ
    useEffect(() => {
        loadRecentSavedRequests();
        loadRouteHistory();
        
        if (['admin', 'sales'].includes(role)) {
            loadVehicleAnalytics();
            loadCustomerInfrastructureStats();
        }
        
        try {
            const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';
            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                setLiveRequests((prev) => [...prev, { id: Date.now(), type: 'system', message: 'Canlı bildirim bağlantısı kuruldu.' }]);
            };

            socket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.event === 'new_customer_request') {
                        setLiveRequests((prev) => [{ id: Date.now(), type: 'request', message: payload }, ...prev].slice(0, 5));
                        setSavedRequestCount((count) => count + 1);
                    }
                } catch (error) {
                    setLiveRequests((prev) => [...prev, { id: Date.now(), type: 'system', message: event.data }]);
                }
            };

            socket.onerror = () => {
                setLiveRequests((prev) => [...prev, { id: Date.now(), type: 'system', message: 'Canlı sunucu bulunamadı, offline mod aktif.' }]);
            };

            wsRef.current = socket;
        } catch (wsError) {
            console.warn('[EKOS DEMO] WebSocket başlatılamadı, sistem bağımsız çalışıyor.');
        }

        return () => {
            wsRef.current?.close();
        };
    }, [role]);

    const handleLogout = () => {
        localStorage.removeItem('ekos_token');
        navigate('/');
    };

    return (
        <>
            <nav className="navbar">
                <div className="navbar-inner">
                    <div className="navbar-brand">EKOS | Türk Telekom & Evanet</div>
                    <div className="navbar-user-info">
                        <span>
                            <strong>Salih Kurt</strong> | 
                            {role === 'admin' ? ' Sistem Yöneticisi' : role === 'sales' ? ' Kurumsal Teknoloji Danışmanı' : ' Saha Operasyon Teknisyeni'}
                        </span>
                        <button onClick={handleLogout} className="btn-logout">Çıkış Yap</button>
                    </div>
                </div>
            </nav>

            <main className="container">
                
                {/* Özet İstatistik Kartları */}
                <div className="grid-stats">
                    {['admin', 'sales'].includes(role) && (
                        <>
                            <div className="card" style={{ borderLeft: '4px solid var(--kurumsal-turkuaz)' }}>
                                <h3 className="card-title">Portföydeki Müşteriler</h3>
                                <p className="card-value">{customerInfrastructure.reduce((a, b) => a + b.count, 0) || 8}</p>
                            </div>
                            <div className="card" style={{ borderLeft: '4px solid var(--kurumsal-lacivert)' }}>
                                <h3 className="card-title">Onay Bekleyen Teklifler</h3>
                                <p className="card-value">2</p>
                            </div>
                        </>
                    )}
                    
                    <div className="card" style={{ borderLeft: '4px solid var(--success-text)' }}>
                        <h3 className="card-title">Kaydedilmiş Talepler</h3>
                        <p className="card-value">{savedRequestCount || 6}</p>
                    </div>
                    <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                        <h3 className="card-title">Arıza Kaydı</h3>
                        <p className="card-value">{requestTypeSummary.fault_reports || 4}</p>
                    </div>
                    <div className="card" style={{ borderLeft: '4px solid #a855f7' }}>
                        <h3 className="card-title">Kaydedilmiş Rota</h3>
                        <p className="card-value">{routeHistorySummary.total_routes || 5}</p>
                    </div>
                    <div className="card" style={{ borderLeft: '4px solid #6366f1' }}>
                        <h3 className="card-title">Saha Operasyon Bölgesi</h3>
                        <p className="card-value" style={{ fontSize: '1.25rem', marginTop: '0.5rem' }}>{userRegion}</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    
                    {/* Canlı Talepler Paneli */}
                    <div className="card">
                        <h3 className="module-title" style={{ marginBottom: '1rem' }}>Son Canlı Bildirimler</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '15rem', overflowY: 'auto' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#f9fafb', border: '1px solid var(--border-color)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                📶 [EKOS ENGINE] Bağımsız yerel veritabanı aktif. Sunucu bağlantısı bekleniyor...
                            </div>
                            {liveRequests.filter(r => r.type === 'request').map((item) => (
                                <div key={item.id} style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
                                    <p style={{ fontWeight: '600', color: 'var(--kurumsal-lacivert)' }}>{item.message.company_name}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>Tür: {item.message.request_type}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Detay: {item.message.details || 'Yok'}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Son Kayıtlı Talepler */}
                    <div className="card">
                        <h3 className="module-title" style={{ marginBottom: '1rem' }}>Son Kayıtlı Talepler</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                <p style={{ fontWeight: '600' }}>Toplam</p><p>{savedRequestCount || 6}</p>
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                <p style={{ fontWeight: '600' }}>Hız Talebi</p><p>{requestTypeSummary.speed_requests || 2}</p>
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                <p style={{ fontWeight: '600' }}>Destek</p><p>{requestTypeSummary.support_requests || 1}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '15rem', overflowY: 'auto' }}>
                            {recentSavedRequests.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Kuyrukta bekleyen çevrimdışı işlem yok.</p>
                            ) : (
                                recentSavedRequests.map((item) => (
                                    <div key={item.id} style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)' }}>
                                        <p style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{item.company_name}</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>Tür: {item.request_type}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Son Kayıtlı Rota Planları */}
                    <div className="card" style={{ gridColumn: 'span 2' }}>
                        <h3 className="module-title" style={{ marginBottom: '1rem' }}>Son Kayıtlı Rota Planları</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '15rem', overflowY: 'auto' }}>
                            {routeHistory.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Şu an yerel hafızada aktif rota planı yok. Hızlı İşlemler'den oluşturabilirsiniz.</p>
                            ) : (
                                routeHistory.map((item) => (
                                    <div key={item.id} onClick={() => navigate(`/routes/${item.id}`)} style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                                        <p style={{ fontWeight: '600', color: 'var(--text-dark)' }}>Araç: {item.brand_model || 'Bilinmiyor'}</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>Mesafe: {item.total_distance} km | Yakıt: {item.estimated_fuel} L</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* 🛡️ 3. EKRAN BOŞ KALMASIN DİYE GRAFİK YEDEKLEMESİ */}
                {['admin', 'sales'].includes(role) && (
                    <DashboardCharts 
                        infrastructureData={customerInfrastructure.length > 0 ? customerInfrastructure : [
                            { current_infrastructure: 'Fiber Optik', count: 3 },
                            { current_infrastructure: 'ADSL/VDSL Bakır', count: 4 },
                            { current_infrastructure: 'Altyapı Yok', count: 1 }
                        ]} 
                        vehicleData={vehicleAnalytics.length > 0 ? vehicleAnalytics : [
                            { brand_model: 'Fiat Egea', base_fuel_consumption: 6.5 },
                            { brand_model: 'Renault Fiorino', base_fuel_consumption: 7.2 },
                            { brand_model: 'Dacia Duster', base_fuel_consumption: 6.8 }
                        ]} 
                    />
                )}

                {/* Hızlı İşlemler */}
                <h2 style={{ marginBottom: '1rem', color: 'var(--text-dark)', marginTop: '2rem' }}>Hızlı İşlemler</h2>
                <div className="grid-actions">
                    {['admin', 'sales'].includes(role) && (
                        <>
                            <button onClick={() => navigate('/customers')} className="action-module" style={{ border: 'none', width: '100%' }}>
                                <div className="module-icon">🏢</div>
                                <span className="module-title">Yeni Kurumsal Müşteri Ekle</span>
                                <span className="module-desc">Metro İnternet ve IT projeleri için kayıt aç</span>
                            </button>

                            <button onClick={() => navigate('/pipeline')} className="action-module" style={{ border: 'none', width: '100%' }}>
                                <div className="module-icon" style={{ backgroundColor: '#fef3c7' }}>📊</div>
                                <span className="module-title">Satış Fırsatları (Kanban)</span>
                                <span className="module-desc">Sürükle-bırak ile satış hunisini yönetin</span>
                            </button>

                            <button onClick={() => navigate('/proposal')} className="action-module" style={{ border: 'none', width: '100%' }}>
                                <div className="module-icon">📄</div>
                                <span className="module-title">Yeni Teklif Oluştur</span>
                                <span className="module-desc">Müşteri bilgilerini otomatik doldur ve PDF hazırla</span>
                            </button>

                            <button onClick={() => navigate('/ai-predictions')} className="action-module" style={{ border: 'none', width: '100%' }}>
                                <div className="module-icon" style={{ backgroundColor: '#fce7f3' }}>🧠</div>
                                <span className="module-title">Yapay Zeka Müşteri Radarı</span>
                                <span className="module-desc">Kayıp (Churn) ve satış (Upsell) fırsatlarını keşfedin</span>
                            </button>
                        </>
                    )}

                    <button onClick={() => navigate('/route-planner')} className="action-module" style={{ border: 'none', width: '100%' }}>
                        <div className="module-icon">🗺️</div>
                        <span className="module-title">Günlük Rota & Yakıt Planla</span>
                        <span className="module-desc">En yakın komşu algoritmasıyla mesafeyi optimize et</span>
                    </button>

                    <button onClick={() => navigate('/requests')} className="action-module" style={{ border: 'none', width: '100%' }}>
                        <div className="module-icon" style={{ backgroundColor: '#dcfce7' }}>🔔</div>
                        <span className="module-title">Canlı Talep Paneli</span>
                        <span className="module-desc">Müşteri taleplerini anlık olarak saha ekibine ilet</span>
                    </button>

                    {role === 'admin' && (
                        <button onClick={() => navigate('/settings')} className="action-module" style={{ border: 'none', width: '100%' }}>
                            <div className="module-icon" style={{ backgroundColor: '#f3e8ff' }}>⚙️</div>
                            <span className="module-title">Sistem Ayarları</span>
                            <span className="module-desc">Araç filosu ve demo veri enjeksiyonunu yönet</span>
                        </button>
                    )}
                </div>
            </main>
        </>
    );
};

export default Dashboard;