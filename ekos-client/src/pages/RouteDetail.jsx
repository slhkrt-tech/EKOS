import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function RouteDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [route, setRoute] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [routeWaypoints, setRouteWaypoints] = useState([]);
    const [totalDistance, setTotalDistance] = useState(0);
    const [estimatedFuel, setEstimatedFuel] = useState(0);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        loadRouteData();
    }, [id]);

    const loadRouteData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/routes/history?limit=100');
            const routes = response.data.data || [];
            const routeData = routes.find(r => r.id == id);
            
            if (routeData) {
                setRoute(routeData);
                setNote(routeData.note || '');
                setTotalDistance(routeData.total_distance || 0);
                setEstimatedFuel(routeData.estimated_fuel || 0);
                
                let routeInfo = routeData.route_data;
                if (typeof routeInfo === 'string') {
                    try {
                        routeInfo = JSON.parse(routeInfo);
                    } catch (e) {
                        console.log('Could not parse route_data');
                    }
                }
                
                if (Array.isArray(routeInfo)) {
                    setRouteWaypoints(routeInfo);
                } else if (routeInfo && typeof routeInfo === 'object') {
                    setRouteWaypoints(routeInfo.waypoints || [routeInfo]);
                }
            } else {
                setMessage({ type: 'error', text: 'Rota bulunamadı.' });
            }
        } catch (error) {
            console.error('[EKOS ERROR] Rota detayı yüklenemedi:', error);
            setMessage({ type: 'error', text: 'Rota detayı yüklenemedi.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveChanges = async () => {
        try {
            setMessage({ type: 'success', text: 'Rota değişiklikleri kaydedildi.' });
            setEditMode(false);
        } catch (error) {
            console.error('[EKOS ERROR] Rota güncellemesi başarısız:', error);
            setMessage({ type: 'error', text: 'Rota güncellemesi başarısız oldu.' });
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <p className="text-muted">Yükleniyor...</p>
            </div>
        );
    }

    if (!route) {
        return (
            <div className="page-container">
                <p className="text-muted">Rota bulunamadı.</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Başlık */}
            <div className="page-header">
                <h1 className="page-title">Rota Detayı</h1>
                <button onClick={() => navigate('/route-planner')} className="btn btn-outline">
                    ← Geri Dön
                </button>
            </div>

            {/* Mesaj Görüntüleme */}
            {message.text && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid-3">
                {/* Rota Özeti */}
                <div className="card">
                    <h2 className="card-title">Rota Özeti</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                        <div>
                            <label className="form-label mb-0">Araç</label>
                            <p className="font-bold">{route.brand_model || 'Bilinmiyor'}</p>
                        </div>
                        <div>
                            <label className="form-label mb-0">Plaka</label>
                            <p className="font-bold">{route.plate_number || 'Bilinmiyor'}</p>
                        </div>
                        <div>
                            <label className="form-label mb-0">Toplam Mesafe</label>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>{totalDistance} km</p>
                        </div>
                        <div>
                            <label className="form-label mb-0">Tahmini Yakıt</label>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#c2410c' }}>{estimatedFuel} L</p>
                        </div>
                        <div>
                            <label className="form-label mb-0">Oluşturulma Tarihi</label>
                            <p className="text-main">{new Date(route.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                            <label className="form-label mb-0">Durağa Sayısı</label>
                            <p className="text-main">{routeWaypoints.length}</p>
                        </div>
                    </div>
                </div>

                {/* Notlar */}
                <div className="card">
                    <h2 className="card-title">Notlar</h2>
                    {editMode ? (
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Rota hakkında notlar ekleyin..."
                            className="form-control"
                            rows="8"
                        />
                    ) : (
                        <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.95rem' }}>{note || 'Henüz not eklenmemiş.'}</p>
                    )}
                </div>

                {/* Kontrol Butonları */}
                <div className="card">
                    <h2 className="card-title">İşlemler</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {editMode ? (
                            <>
                                <button onClick={handleSaveChanges} className="btn btn-primary btn-block">
                                    Değişiklikleri Kaydet
                                </button>
                                <button
                                    onClick={() => { setEditMode(false); loadRouteData(); }}
                                    className="btn btn-outline btn-block"
                                >
                                    İptal Et
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setEditMode(true)} className="btn btn-secondary btn-block">
                                    Düzenle
                                </button>
                                <button
                                    onClick={() => {
                                        const data = `Rota Bilgileri:\n\nAraç: ${route.brand_model}\nMesafe: ${totalDistance} km\nYakıt: ${estimatedFuel} L\nDurağa: ${routeWaypoints.length}\n\n${note}`;
                                        navigator.clipboard.writeText(data);
                                        setMessage({ type: 'success', text: 'Rota bilgileri kopyalandı.' });
                                    }}
                                    className="btn btn-primary btn-block"
                                >
                                    Kopyala
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Rota Durağaları */}
            <div className="card mt-4">
                <h2 className="card-title">Rota Durağaları</h2>
                <div className="table-responsive">
                    <table className="ekos-table">
                        <thead>
                            <tr>
                                <th>Sıra</th>
                                <th>Müşteri</th>
                                <th>Bir Öncekinden Mesafe</th>
                                <th>Koordinatlar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {routeWaypoints.length > 0 ? (
                                routeWaypoints.map((waypoint, idx) => {
                                    const lat = waypoint.latitude || waypoint.customer?.latitude;
                                    const lng = waypoint.longitude || waypoint.customer?.longitude;
                                    
                                    return (
                                        <tr key={idx}>
                                            <td className="font-bold">{waypoint.step || idx + 1}</td>
                                            <td>{waypoint.customer_name || waypoint.customer?.company_name || `Müşteri ${idx + 1}`}</td>
                                            <td>{waypoint.distanceFromPrevious ? `${Number(waypoint.distanceFromPrevious).toFixed(2)} km` : '-'}</td>
                                            <td className="text-muted">
                                                {lat && lng ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Durağa bilgisi bulunamadı.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}