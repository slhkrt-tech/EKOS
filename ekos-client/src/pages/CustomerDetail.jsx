import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

// Adana Bölgesi Örnek Türk Telekom Santral / POP Noktaları
const TT_SANTRALLER = [
    { id: 1, name: "Seyhan Merkez Santrali", lat: 37.0014, lng: 35.3289 },
    { id: 2, name: "Çukurova POP Noktası", lat: 37.0350, lng: 35.2850 },
    { id: 3, name: "Yüreğir Ana Santral", lat: 36.9850, lng: 35.3500 },
    { id: 4, name: "Sarıçam Dağıtım Merkezi", lat: 36.9950, lng: 35.3800 }
];

export default function CustomerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [customerRequests, setCustomerRequests] = useState([]);
    const [customerRoutes, setCustomerRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    
    // Fizibilite Motoru State'leri
    const [feasibility, setFeasibility] = useState(null);
    const [calculating, setCalculating] = useState(false);

    useEffect(() => {
        loadCustomerData();
    }, [id]);

    const loadCustomerData = async () => {
        try {
            setLoading(true);
            const customerRes = await api.get(`/customers`);
            const customers = customerRes.data.data || [];
            const customerData = customers.find(c => c.id == id);
            
            if (customerData) {
                setCustomer(customerData);
                setEditForm(customerData);
            }

            const requestsRes = await api.get('/requests');
            setCustomerRequests((requestsRes.data.data || []).filter(r => r.company_name === customerData?.company_name));

            const routesRes = await api.get('/routes/history?limit=50');
            setCustomerRoutes((routesRes.data.data || []).filter(r => r.customer_ids && r.customer_ids.includes(id.toString())));
        } catch (error) {
            setMessage({ type: 'error', text: 'Müşteri detayı yüklenemedi.' });
        } finally {
            setLoading(false);
        }
    };

    const handleEditChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditForm({ ...editForm, [name]: type === 'checkbox' ? checked : value });
    };

    const handleSaveCustomer = async () => {
        try {
            await api.put(`/customers?id=${id}`, editForm);
            setMessage({ type: 'success', text: 'Müşteri bilgileri güncellendi.' });
            setIsEditing(false);
            loadCustomerData();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Güncelleme başarısız oldu.' });
        }
    };

    const handleUpdateCoordinates = async () => {
        try {
            const coords = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                    (err) => reject(err),
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
                );
            });
            await api.put(`/customers?id=${id}`, coords);
            setMessage({ type: 'success', text: 'Koordinatlar güncellendi.' });
            loadCustomerData();
            setFeasibility(null); // Koordinat değişince eski hesabı sıfırla
        } catch (error) {
            setMessage({ type: 'error', text: 'Koordinat güncellemesi başarısız oldu.' });
        }
    };

    // İki koordinat arası mesafeyi metre cinsinden hesaplayan algoritma (Haversine Formula)
    const calculateDistanceInMeters = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Dünya yarıçapı (Metre)
        const radLat1 = lat1 * Math.PI/180;
        const radLat2 = lat2 * Math.PI/180;
        const deltaLat = (lat2-lat1) * Math.PI/180;
        const deltaLon = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                  Math.cos(radLat1) * Math.cos(radLat2) *
                  Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; 
    };

    // Telekom Altyapı Fizibilite Hesaplayıcı
    const handleRunFeasibility = () => {
        if (!customer.latitude || !customer.longitude) {
            setMessage({ type: 'error', text: 'Fizibilite analizi için müşterinin koordinatları sistemde kayıtlı olmalıdır.' });
            return;
        }

        setCalculating(true);
        
        // Simülasyon: Gerçekçi bir analiz süresi hissi (Mülakat UX detayı)
        setTimeout(() => {
            let nearestSantral = null;
            let minDistance = Infinity;

            // En yakın santrali bul
            TT_SANTRALLER.forEach(santral => {
                const distance = calculateDistanceInMeters(
                    Number(customer.latitude), Number(customer.longitude),
                    santral.lat, santral.lng
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestSantral = santral;
                }
            });

            // Maliyet Kriterleri (Örnek Parametreler)
            const BASE_HARDWARE_COST = 12500; // Switch ve Donanım bedeli
            const COST_PER_METER = 250; // Metre başına fiber kablo/kazı bedeli (TL)
            
            // Harita sapma payı eklenmiş gerçek kazı mesafesi tahmini
            const realExcavationDistance = minDistance * 1.4; 
            const cableCost = realExcavationDistance * COST_PER_METER;
            const totalCost = BASE_HARDWARE_COST + cableCost;

            setFeasibility({
                santral: nearestSantral.name,
                airDistance: Math.round(minDistance),
                realDistance: Math.round(realExcavationDistance),
                cableCost: cableCost,
                totalCost: totalCost
            });
            
            setCalculating(false);
        }, 1500);
    };

    if (loading) return <div className="page-container"><p className="text-muted">Yükleniyor...</p></div>;
    if (!customer) return <div className="page-container"><p className="text-muted">Müşteri bulunamadı.</p></div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">{customer.company_name}</h1>
                <button onClick={() => navigate('/customers')} className="btn btn-outline">← Geri Dön</button>
            </div>

            {message.text && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>{message.text}</div>
            )}

            <div className="grid-3">
                {/* Sol Panel: Müşteri Bilgileri */}
                <div className="card">
                    <div className="flex-between mb-4">
                        <h2 className="card-title mb-0">Temel Bilgiler</h2>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="btn btn-outline text-sm" style={{ padding: '0.2rem 0.6rem' }}>✏️ Düzenle</button>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                        <div>
                            <label className="form-label mb-0">Firma Adı</label>
                            {isEditing ? <input name="company_name" value={editForm.company_name || ''} onChange={handleEditChange} className="form-control" /> : <p className="font-bold">{customer.company_name}</p>}
                        </div>
                        <div>
                            <label className="form-label mb-0">Vergi No</label>
                            {isEditing ? <input name="tax_number" value={editForm.tax_number || ''} onChange={handleEditChange} className="form-control" /> : <p className="font-bold">{customer.tax_number}</p>}
                        </div>
                        <div>
                            <label className="form-label mb-0">Yetkili Kişi</label>
                            {isEditing ? <input name="contact_person" value={editForm.contact_person || ''} onChange={handleEditChange} className="form-control" /> : <p className="font-bold">{customer.contact_person || '-'}</p>}
                        </div>
                        <div>
                            <label className="form-label mb-0">Telefon</label>
                            {isEditing ? <input name="contact_phone" value={editForm.contact_phone || ''} onChange={handleEditChange} className="form-control" /> : <p className="font-bold">{customer.contact_phone || '-'}</p>}
                        </div>
                        <div>
                            <label className="form-label mb-0">Email</label>
                            {isEditing ? <input type="email" name="contact_email" value={editForm.contact_email || ''} onChange={handleEditChange} className="form-control" /> : <p className="font-bold break-all">{customer.contact_email || '-'}</p>}
                        </div>
                        <div>
                            <label className="form-label mb-0">Altyapı</label>
                            {isEditing ? (
                                <select name="current_infrastructure" value={editForm.current_infrastructure || ''} onChange={handleEditChange} className="form-control">
                                    <option value="ADSL/VDSL">ADSL/VDSL Bakır</option>
                                    <option value="Fiber">Fiber Optik</option>
                                    <option value="Yok">Altyapı Yok</option>
                                </select>
                            ) : <p className="font-bold">{customer.current_infrastructure || '-'}</p>}
                        </div>
                        <div>
                            <label className="form-label mb-0">Metro İnternet</label>
                            {isEditing ? (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="checkbox" name="metro_internet_ready" checked={editForm.metro_internet_ready} onChange={handleEditChange} style={{ width: '1rem', height: '1rem', accentColor: 'var(--secondary)' }} />
                                    Potansiyel Var
                                </label>
                            ) : <p className="font-bold">{customer.metro_internet_ready ? 'Evet' : 'Hayır'}</p>}
                        </div>
                    </div>

                    {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                            <button onClick={handleSaveCustomer} className="btn btn-primary" style={{ flex: 1 }}>Kaydet</button>
                            <button onClick={() => { setIsEditing(false); setEditForm(customer); }} className="btn btn-outline">İptal</button>
                        </div>
                    ) : (
                        <button onClick={handleUpdateCoordinates} className="btn btn-secondary btn-block mt-4">
                            GPS ile Koordinat Al / Güncelle
                        </button>
                    )}
                </div>

                {/* Orta ve Sağ Paneli Kaplayan Grid */}
                <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* YENİ MODÜL: Telekom Altyapı Fizibilite Motoru */}
                    <div className="card" style={{ border: '1px solid var(--kurumsal-lacivert)' }}>
                        <div className="flex-between mb-2">
                            <h2 className="card-title mb-0" style={{ color: 'var(--kurumsal-lacivert)' }}>⚡ Metro İnternet Fizibilite Analizi</h2>
                        </div>
                        <p className="text-sm text-muted mb-4">Sistem, firmanın koordinatlarını kullanarak Adana'daki en yakın Türk Telekom ana santralini tespit eder ve tahmini fiber kablo çekim/kazı maliyetini hesaplar.</p>
                        
                        {!feasibility ? (
                            <button 
                                onClick={handleRunFeasibility} 
                                disabled={calculating} 
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
                            >
                                {calculating ? 'Yapay Zeka Analiz Ediyor...' : 'Kablo/Kazı Maliyetini Hesapla'}
                            </button>
                        ) : (
                            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '1.5rem' }}>📍</span>
                                    <div>
                                        <p className="text-sm text-muted">Bağlanılacak POP Noktası</p>
                                        <p className="font-bold" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{feasibility.santral}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                    <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                                        <p className="text-xs text-muted">Kuş Uçuşu Mesafe</p>
                                        <p className="font-bold">{feasibility.airDistance} Metre</p>
                                    </div>
                                    <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                                        <p className="text-xs text-muted">Tahmini Kazı Mesafesi</p>
                                        <p className="font-bold text-main">{feasibility.realDistance} Metre</p>
                                    </div>
                                    <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                                        <p className="text-xs text-muted">Kazı ve Kablo Bedeli</p>
                                        <p className="font-bold" style={{ color: '#1e40af' }}>{feasibility.cableCost.toLocaleString()} TL</p>
                                    </div>
                                    <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                                        <p className="text-xs text-muted">Toplam Tahmini Yatırım</p>
                                        <p className="font-bold" style={{ color: '#166534', fontSize: '1.2rem' }}>{feasibility.totalCost.toLocaleString()} TL</p>
                                    </div>
                                </div>
                                <button onClick={() => setFeasibility(null)} className="btn btn-outline btn-block mt-4" style={{ padding: '0.5rem' }}>Analizi Sıfırla</button>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {/* Talep Geçmişi */}
                        <div className="card">
                            <h2 className="card-title">Talep Geçmişi ({customerRequests.length})</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
                                {customerRequests.length === 0 ? <p className="text-sm text-muted">Talep kaydı yok.</p> : customerRequests.map((req) => (
                                    <div key={req.id} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: '0.5rem' }}>
                                        <p className="font-bold text-main">{req.request_type}</p>
                                        <p className="text-sm text-muted mt-1">{req.details || '-'}</p>
                                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>{new Date(req.created_at).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rota Geçmişi */}
                        <div className="card">
                            <h2 className="card-title">Rota Geçmişi ({customerRoutes.length})</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
                                {customerRoutes.length === 0 ? <p className="text-sm text-muted">Rota kaydı yok.</p> : customerRoutes.map((route) => (
                                    <div key={route.id} style={{ padding: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem' }}>
                                        <p className="font-bold text-primary">{route.brand_model || 'Araç'}</p>
                                        <p className="text-sm mt-1"><span className="text-muted">Mesafe:</span> {route.total_distance} km</p>
                                        <p className="text-sm"><span className="text-muted">Yakıt:</span> {route.estimated_fuel} L</p>
                                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>{new Date(route.created_at).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}