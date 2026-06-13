import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useCitySelection from '../hooks/useCitySelection';

// Açık Kaynak Harita Kütüphaneleri (Google API Key Gerektirmez!)
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet'in varsayılan ikon ayarlarını Vite ile uyumlu hale getirme
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const RoutePlanner = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [optimizedRoute, setOptimizedRoute] = useState(null);
    const [routeSaveMessage, setRouteSaveMessage] = useState(null);
    const [isWeatherHot, setIsWeatherHot] = useState(false);
    const [loading, setLoading] = useState(false);

    const { city, center, setSelectedCity } = useCitySelection({ defaultCity: 'Adana' });

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const response = await api.get('/customers');
                setCustomers(response.data.data || []);
            } catch (error) {
                console.error("Müşteriler yüklenemedi", error);
            }
        };

        const fetchVehicles = async () => {
            try {
                const response = await api.get('/vehicles');
                const items = response.data.data || [];
                setVehicles(items);
                if (items.length > 0 && !selectedVehicleId) {
                    setSelectedVehicleId(items[0].id.toString());
                }
            } catch (error) {
                console.error('Araçlar yüklenemedi', error);
            }
        };

        fetchCustomers();
        fetchVehicles();
    }, []);

    const toggleCustomer = (customer) => {
        if (selectedCustomers.find(c => c.id === customer.id)) {
            setSelectedCustomers(selectedCustomers.filter(c => c.id !== customer.id));
        } else {
            setSelectedCustomers([...selectedCustomers, customer]);
        }
    };

    const selectedVehicle = vehicles.find(v => v.id.toString() === selectedVehicleId);
    const hasMissingCoordinates = selectedCustomers.some((c) => !c.latitude || !c.longitude);
    const coordinateWarning = customers.filter((customer) => !customer.latitude || !customer.longitude).length;

    const saveRouteHistory = async (routeData, totalDistance, estimatedFuel) => {
        try {
            const payload = {
                vehicleId: Number(selectedVehicleId),
                customerIds: selectedCustomers.map(c => c.id),
                routeData,
                totalDistance,
                estimatedFuel,
                note: isWeatherHot ? 'Klima etkili rota' : 'Standart hava koşulu'
            };
            const response = await api.post('/routes/history', payload);
            setRouteSaveMessage({ type: 'success', text: 'Rota kaydedildi: #' + response.data.data.id });
        } catch (error) {
            setRouteSaveMessage({ type: 'error', text: 'Rota kaydedilirken hata oluştu.' });
        }
    };

    const handleOptimizeRoute = async () => {
        if (selectedCustomers.length < 2) {
            alert("Rota oluşturmak için en az 2 müşteri seçmelisiniz.");
            return;
        }
        if (hasMissingCoordinates) {
            alert('Seçilen müşterilerin tümünde koordinat bilgisi bulunmalıdır. Lütfen müşteri kayıtlarını güncelleyin.');
            return;
        }
        if (!selectedVehicleId) {
            alert('Lütfen rota optimizasyonu için bir araç seçin.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                customerIds: selectedCustomers.map(c => c.id),
                vehicleId: Number(selectedVehicleId),
                isWeatherHot: isWeatherHot,
                city
            };

            const response = await api.post('/routes/optimize', payload);
            const result = response.data.data;
            setOptimizedRoute(result);
            await saveRouteHistory(result.path, Number(result.total_distance_unit), Number(result.estimated_fuel_liters));

        } catch (error) {
            alert("Rota hesaplanamadı: " + (error.response?.data?.error || "Sunucu hatası"));
        } finally {
            setLoading(false);
        }
    };

    // Harita çizimi için rotayı ve merkez noktayı hazırlama
    const mapCenter = optimizedRoute ? [Number(optimizedRoute.path[0].customer.latitude), Number(optimizedRoute.path[0].customer.longitude)] : [37.0, 35.32];
    const polylinePositions = optimizedRoute ? optimizedRoute.path.map(point => [Number(point.customer.latitude), Number(point.customer.longitude)]) : [];

    return (
        <div className="page-container">
            {/* Başlık */}
            <div className="page-header">
                <h1 className="page-title">Akıllı Rota & Yakıt Optimizasyonu</h1>
                <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
                    ← Panele Dön
                </button>
            </div>

            <div className="grid-3">
                {/* Sol Panel: Seçim Formu */}
                <div className="card">
                    <h2 className="card-title">Bugün Kimleri Ziyaret Edeceksiniz?</h2>
                    <p className="text-sm text-muted mb-4">Listeden rotaya eklemek istediğiniz firmaları seçin. Adana merkezinden başlayan rota için klima tüketimini de devreye alabilirsiniz.</p>
                    
                    <div className="form-group">
                        <label className="form-label">Araç Seçimi</label>
                        <select 
                            value={selectedVehicleId} 
                            onChange={(e) => setSelectedVehicleId(e.target.value)} 
                            className="form-control mt-2"
                        >
                            {vehicles.length === 0 && <option value="">Araç bulunamadı</option>}
                            {vehicles.map(vehicle => (
                                <option key={vehicle.id} value={vehicle.id}>
                                    {vehicle.brand_model} - {vehicle.plate_number}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group mt-4 mb-4">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input
                                type="checkbox"
                                checked={isWeatherHot}
                                onChange={() => setIsWeatherHot(!isWeatherHot)}
                                style={{ width: '1rem', height: '1rem', accentColor: 'var(--kurumsal-turkuaz)' }}
                            />
                            Sıcak hava / klima tüketimi etkin
                        </label>
                        <p className="text-sm text-muted mt-2">Adana iklimine özel çarpan kullanılarak yakıt tahmini güncellenecektir.</p>
                    </div>

                    {coordinateWarning > 0 && (
                        <div className="alert alert-error text-sm mb-4">
                            {coordinateWarning} müşteri kaydında koordinat bilgisi eksik. Rotayı hesaplamak için bu müşterileri düzenleyin veya farklı müşteriler seçin.
                        </div>
                    )}

                    <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {customers.map(customer => {
                            const isSelected = selectedCustomers.find(c => c.id === customer.id);
                            return (
                                <div 
                                    key={customer.id} 
                                    onClick={() => toggleCustomer(customer)}
                                    style={{
                                        padding: '1rem',
                                        border: `1px solid ${isSelected ? 'var(--kurumsal-turkuaz)' : 'var(--border-color)'}`,
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? '#eff6ff' : 'var(--bg-card)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div>
                                        <div className="font-bold">{customer.company_name}</div>
                                        <div className="text-sm text-muted">{customer.contact_person || 'Yetkili belirtilmedi'}</div>
                                    </div>
                                    {isSelected && <div style={{ color: 'var(--kurumsal-turkuaz)', fontWeight: 'bold' }}>✓ Eklendi</div>}
                                </div>
                            );
                        })}
                        {customers.length === 0 && <p className="text-sm text-muted">Sistemde kayıtlı müşteri bulunamadı.</p>}
                    </div>

                    <button 
                        onClick={handleOptimizeRoute}
                        disabled={loading || selectedCustomers.length < 2}
                        className="btn btn-primary btn-block mt-4"
                        style={{ padding: '0.8rem', opacity: (loading || selectedCustomers.length < 2) ? 0.6 : 1 }}
                    >
                        {loading ? 'Yapay Zeka Hesaplarken Bekleyin...' : 'En Kısa Rotayı Hesapla'}
                    </button>

                    {routeSaveMessage && (
                        <div className={`alert mt-4 ${routeSaveMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                            {routeSaveMessage.text}
                        </div>
                    )}
                </div>

                {/* Sağ Panel: Algoritma Sonucu (Sıralı Rota) */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <h2 className="card-title">Optimize Edilmiş Seyahat Planı</h2>
                    <p className="text-sm text-muted mb-4">Başlangıç noktası: <span className="font-bold text-main" style={{ color: 'var(--kurumsal-lacivert)' }}>{city} Şehir Merkezi</span></p>

                    {selectedVehicle && (
                        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                            <div className="font-bold mb-2" style={{ color: 'var(--kurumsal-lacivert)' }}>Seçilen Araç</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <div>Araç: <span className="font-bold">{selectedVehicle.brand_model}</span></div>
                                <div>Plaka: <span className="font-bold">{selectedVehicle.plate_number}</span></div>
                                <div>Base Tüketim: <span className="font-bold">{selectedVehicle.base_fuel_consumption} L/100km</span></div>
                                <div>Klima Çarpanı: <span className="font-bold">{selectedVehicle.ac_fuel_multiplier}x</span></div>
                            </div>
                        </div>
                    )}
                    
                    {!optimizedRoute ? (
                        <div style={{ height: '16rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-color)', borderRadius: '0.5rem' }}>
                            <p className="text-muted text-center">Rota hesaplandığında sonuçlar burada interaktif harita ile listelenecektir.</p>
                        </div>
                    ) : (
                        <div>
                            {/* Rota ve Yakıt Özeti Kartı */}
                            <div className="alert alert-success mb-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="flex-between">
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>✅ {optimizedRoute.message}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: 'var(--kurumsal-lacivert)', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '1rem' }}>
                                        Araç: {optimizedRoute.vehicle_assigned} {optimizedRoute.climate_control_active && '(Klima Açık)'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.95rem' }}>
                                    <div style={{ flex: 1, backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid var(--success-border)' }}>
                                        Mesafe: <span className="font-bold" style={{ color: 'var(--text-main)' }}>{optimizedRoute.total_distance_unit} km</span>
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid var(--success-border)' }}>
                                        Yakıt: <span className="font-bold" style={{ color: 'var(--text-main)' }}>{optimizedRoute.estimated_fuel_liters} Litre</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Zaman Çizelgesi (Timeline) ve Harita Alanı */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem', position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '1.2rem', top: '2rem', bottom: '2rem', width: '2px', backgroundColor: 'var(--border-color)', zIndex: 0 }}></div>

                                {/* AÇIK KAYNAK HARİTA ENTEGRASYONU (Leaflet/OSM) */}
                                <div style={{ height: '400px', width: '100%', borderRadius: '0.5rem', border: '2px solid var(--border-color)', overflow: 'hidden', zIndex: 1, marginBottom: '1rem' }}>
                                    <MapContainer center={mapCenter} zoom={11} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                        {optimizedRoute.path.map((point) => (
                                            <Marker key={point.step} position={[Number(point.customer.latitude), Number(point.customer.longitude)]}>
                                                <Popup>
                                                    <strong style={{ color: 'var(--kurumsal-turkuaz)' }}>{point.step}. Durak</strong><br/>
                                                    {point.customer.company_name}
                                                </Popup>
                                            </Marker>
                                        ))}
                                        {/* Rota Çizgisi */}
                                        <Polyline positions={polylinePositions} color="#00a3cc" weight={5} opacity={0.7} />
                                    </MapContainer>
                                </div>

                                {optimizedRoute.path.map((point) => (
                                    <div key={point.step} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>

                                        {/* Sıra Numarası (Daire) */}
                                        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', backgroundColor: 'var(--kurumsal-turkuaz)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, border: '4px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                            {point.step}
                                        </div>
                                        
                                        {/* Durak Detayı (Kutu) */}
                                        <div style={{ flex: 1, backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                            <div className="font-bold" style={{ color: 'var(--kurumsal-lacivert)', fontSize: '1.05rem' }}>{point.customer.company_name}</div>
                                            <div className="text-sm text-muted mt-2" style={{ lineHeight: '1.6' }}>
                                                Yetkili: {point.customer.contact_person || '-'} <br/>
                                                {point.step > 1 ? (
                                                    <span>Önceki noktaya mesafe: <span className="font-bold" style={{ color: 'var(--text-main)' }}>{point.distanceFromPrevious} km</span></span>
                                                ) : (
                                                    <span style={{ color: 'var(--kurumsal-turkuaz)', fontWeight: '600' }}>📍 Rotanın Başlangıç Noktası</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default RoutePlanner;