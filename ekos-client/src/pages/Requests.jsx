import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Requests = () => {
    const navigate = useNavigate();
    const [companyName, setCompanyName] = useState('');
    const [requestType, setRequestType] = useState('Arıza Kaydı');
    const [details, setDetails] = useState('');
    const [events, setEvents] = useState([]);
    const [requestHistory, setRequestHistory] = useState([]);
    const [requestSummary, setRequestSummary] = useState({ total_requests: 0, fault_reports: 0, speed_requests: 0, support_requests: 0 });
    const [filterType, setFilterType] = useState('Tümü');
    const [dateFilter, setDateFilter] = useState('7');
    const wsRef = useRef(null);

    const filterHistoryByDate = (days) => {
        if (!days || days === 'Tümü') return requestHistory;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(days));
        return requestHistory.filter(item => new Date(item.created_at) >= cutoff);
    };

    const filterHistoryByType = (items) => {
        if (filterType === 'Tümü') return items;
        return items.filter(item => item.request_type === filterType);
    };

    const getFilteredHistory = () => {
        let filtered = filterHistoryByDate(dateFilter);
        filtered = filterHistoryByType(filtered);
        return filtered;
    };

    const loadRequestHistory = async () => {
        try {
            const response = await api.get('/requests?limit=10');
            setRequestHistory(response.data.data || []);
            setRequestSummary(response.data.summary || { total_requests: 0, fault_reports: 0, speed_requests: 0, support_requests: 0 });
        } catch (error) {
            setEvents((prev) => [...prev, { type: 'system', message: 'Talepler yüklenemedi.' }]);
        }
    };

    useEffect(() => {
        const createSocket = () => {
            // WebSocket adresi artık tek bir merkezden (.env) dinamik olarak alınıyor
            const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';
            const socket = new WebSocket(wsUrl);
            
            socket.onopen = () => {
                setEvents((prev) => [...prev, { type: 'system', message: 'Canlı bağlantı kuruldu.' }]);
            };
            
            socket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    setEvents((prev) => [...prev, { type: 'receive', message: payload }]);

                    if (payload.event === 'new_customer_request') {
                        setRequestHistory((prev) => [
                            {
                                id: payload.id,
                                company_name: payload.company_name,
                                request_type: payload.request_type,
                                details: payload.details,
                                created_at: payload.created_at
                            },
                            ...prev
                        ].slice(0, 10));
                        
                        // Summary update for immediate UI reflection
                        loadRequestHistory();
                    }
                } catch (error) {
                    setEvents((prev) => [...prev, { type: 'system', message: event.data }]);
                }
            };
            socket.onerror = () => {
                setEvents((prev) => [...prev, { type: 'system', message: 'WebSocket hatası oluştu.' }]);
            };
            wsRef.current = socket;
        };

        createSocket();
        loadRequestHistory();

        return () => {
            wsRef.current?.close();
        };
    }, []);

    const handleNotify = async () => {
        if (!companyName || !requestType) return;
        try {
            const response = await api.post('/requests/notify', { company_name: companyName, request_type: requestType, details });
            setEvents((prev) => [...prev, { type: 'send', message: `Talep iletildi: ${companyName} (${requestType})` }]);
            setCompanyName('');
            setDetails('');
            
            if (response.data?.summary) {
                setRequestSummary(response.data.summary);
            }
        } catch (error) {
            setEvents((prev) => [...prev, { type: 'system', message: 'Talep gönderilemedi.' }]);
        }
    };

    return (
        <div className="page-container">
            {/* Başlık */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Canlı Müşteri Talep Paneli</h1>
                    <p className="text-muted text-sm mt-2">Müşteri talepleri anında saha ekibine WebSocket üzerinden gönderilir.</p>
                </div>
                <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
                    ← Panele Dön
                </button>
            </div>

            <div className="grid-3">
                {/* Sol Panel: Yeni Talep Oluştur */}
                <div className="card">
                    <h2 className="card-title">Yeni Talep Oluştur</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group mb-0">
                            <label className="form-label">Firma Adı</label>
                            <input 
                                value={companyName} 
                                onChange={(e) => setCompanyName(e.target.value)} 
                                className="form-control" 
                                placeholder="Örn: XYZ Teknoloji" 
                            />
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Talep Türü</label>
                            <select 
                                value={requestType} 
                                onChange={(e) => setRequestType(e.target.value)} 
                                className="form-control"
                            >
                                <option>Arıza Kaydı</option>
                                <option>Hız Artışı Talebi</option>
                                <option>Teknik Destek</option>
                            </select>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Detaylar</label>
                            <textarea 
                                value={details} 
                                onChange={(e) => setDetails(e.target.value)} 
                                className="form-control" 
                                rows="4" 
                                placeholder="Talep detayını buraya yazın..."
                            ></textarea>
                        </div>
                        <button onClick={handleNotify} className="btn btn-primary btn-block mt-2" style={{ padding: '0.8rem' }}>
                            Talebi Gönder
                        </button>
                    </div>
                </div>

                {/* Sağ Panel: Canlı Geçmiş ve Loglar */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    
                    {/* Sağ Üst: İstatistikler */}
                    <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
                        <div>
                            <h2 className="card-title" style={{ marginBottom: '0.2rem' }}>Canlı Bildirim Geçmişi</h2>
                            <p className="text-sm text-muted">Son 10 kaydedilmiş talep</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center', fontSize: '0.8rem' }}>
                            <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                                <p className="font-bold">Toplam</p><p>{requestSummary.total_requests}</p>
                            </div>
                            <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                                <p className="font-bold">Arıza</p><p>{requestSummary.fault_reports}</p>
                            </div>
                            <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                                <p className="font-bold">Hız</p><p>{requestSummary.speed_requests}</p>
                            </div>
                            <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                                <p className="font-bold">Destek</p><p>{requestSummary.support_requests}</p>
                            </div>
                        </div>
                    </div>

                    {/* Canlı Log Ekranı */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '360px', overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '2rem' }}>
                        {events.map((item, index) => {
                            let bgColor = 'var(--bg-main)';
                            let borderColor = 'var(--border-light)';
                            let textColor = 'var(--text-main)';
                            
                            if (item.type === 'send') {
                                bgColor = '#eff6ff'; borderColor = '#bfdbfe'; textColor = '#1e3a8a';
                            } else if (item.type === 'receive') {
                                bgColor = 'var(--success-bg)'; borderColor = 'var(--success-border)'; textColor = 'var(--success-text)';
                            }

                            return (
                                <div key={index} style={{ padding: '1rem', borderRadius: '0.75rem', backgroundColor: bgColor, border: `1px solid ${borderColor}`, color: textColor }}>
                                    {item.type === 'receive' ? (
                                        <div>
                                            <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Yeni Bildirim Alındı</p>
                                            <p className="text-sm">Firma: <span className="font-bold">{item.message.company_name}</span></p>
                                            <p className="text-sm">Tür: {item.message.request_type}</p>
                                            <p className="text-sm">Detay: {item.message.details}</p>
                                            <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.5rem' }}>{new Date(item.message.timestamp).toLocaleString()}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-bold">{item.message}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Filtreler ve Geçmiş Tablosu */}
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="form-group mb-0">
                                <label className="form-label">Talep Türü</label>
                                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="form-control">
                                    <option>Tümü</option>
                                    <option>Arıza Kaydı</option>
                                    <option>Hız Artışı Talebi</option>
                                    <option>Teknik Destek</option>
                                </select>
                            </div>
                            <div className="form-group mb-0">
                                <label className="form-label">Zaman Aralığı</label>
                                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="form-control">
                                    <option value="1">Son 1 Gün</option>
                                    <option value="7">Son 7 Gün</option>
                                    <option value="30">Son 30 Gün</option>
                                    <option value="0">Tümü</option>
                                </select>
                            </div>
                        </div>

                        <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                            Kayıtlı Talep Geçmişi ({getFilteredHistory().length} sonuç)
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {getFilteredHistory().length === 0 ? (
                                <p className="text-sm text-muted">Henüz kaydedilmiş talep yok veya filtreye uyan sonuç bulunamadı.</p>
                            ) : (
                                getFilteredHistory().map((item) => (
                                    <div key={item.id} style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)' }}>
                                        <p className="font-bold" style={{ color: 'var(--primary)' }}>{item.company_name}</p>
                                        <p className="text-sm mt-1"><span className="text-muted">Tür:</span> {item.request_type}</p>
                                        <p className="text-sm"><span className="text-muted">Detay:</span> {item.details || 'Yok'}</p>
                                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>{new Date(item.created_at).toLocaleString()}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Requests;