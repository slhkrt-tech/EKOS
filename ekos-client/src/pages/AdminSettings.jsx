import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AdminSettings() {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [editingVehicleId, setEditingVehicleId] = useState(null);
    const [formData, setFormData] = useState({
        plate_number: '', brand_model: '', base_fuel_consumption: 7, ac_fuel_multiplier: 1.15, current_km: 0
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {
        try {
            setLoading(true);
            const response = await api.get('/vehicles');
            setVehicles(response.data.data || []);
        } catch (error) {
            console.error('[EKOS ERROR] Araçlar yüklenemedi:', error);
            setMessage({ type: 'error', text: 'Araçlar yüklenemedi. İnternet bağlantınızı veya sunucuyu kontrol edin.' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'number' ? parseFloat(value) : value
        });
    };

    const handleEditClick = (vehicle) => {
        setEditingVehicleId(vehicle.id);
        setFormData({
            plate_number: vehicle.plate_number,
            brand_model: vehicle.brand_model,
            base_fuel_consumption: vehicle.base_fuel_consumption,
            ac_fuel_multiplier: vehicle.ac_fuel_multiplier,
            current_km: vehicle.current_km
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingVehicleId(null);
        setFormData({
            plate_number: '', brand_model: '', base_fuel_consumption: 7, ac_fuel_multiplier: 1.15, current_km: 0
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingVehicleId) {
                // Güncelleme İşlemi (PUT)
                const response = await api.put(`/vehicles?id=${editingVehicleId}`, formData);
                if (response.status === 200) {
                    setMessage({ type: 'success', text: 'Araç başarıyla güncellendi.' });
                }
            } else {
                // Yeni Ekleme İşlemi (POST)
                const response = await api.post('/vehicles', formData);
                if (response.status === 200 || response.status === 201) {
                    setMessage({ type: 'success', text: 'Araç başarıyla eklendi.' });
                }
            }
            
            handleCancelEdit(); // Formu temizle ve moddan çık
            loadVehicles();     // Listeyi yenile
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('[EKOS ERROR] Araç işlem hatası:', error);
            setMessage({ type: 'error', text: 'İşlem başarısız. ' + (error.response?.data?.error || error.message) });
        }
    };

    const handleDeleteVehicle = async (vehicleId) => {
        if (!window.confirm('Bu aracı silmek istediğinizden emin misiniz?')) return;
        
        try {
            await api.delete(`/vehicles?id=${vehicleId}`);
            setMessage({ type: 'success', text: 'Araç başarıyla silindi.' });
            loadVehicles();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('[EKOS ERROR] Araç silme hatası:', error);
            setMessage({ type: 'error', text: 'Araç silinemiyor. ' + (error.response?.data?.error || error.message) });
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <p className="text-muted" style={{ textAlign: 'center', marginTop: '2rem' }}>Filo bilgileri sunucudan yükleniyor, lütfen bekleyin...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Başlık */}
            <div className="page-header flex-between mb-4">
                <h1 className="page-title">Sistem Ayarları</h1>
                <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
                    ← Panele Dön
                </button>
            </div>

            {/* Mesaj Görüntüleme */}
            {message.text && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid-3">
                {/* Sol Panel: Dinamik Araç Ekleme / Düzenleme Formu */}
                <div className="card">
                    <h2 className="card-title" style={{ color: editingVehicleId ? 'var(--kurumsal-turkuaz)' : 'var(--text-main)' }}>
                        {editingVehicleId ? 'Araç Bilgilerini Düzenle' : 'Yeni Araç Ekle'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Plaka *</label>
                            <input
                                type="text"
                                name="plate_number"
                                value={formData.plate_number}
                                onChange={handleInputChange}
                                placeholder="06ABC123"
                                required
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Marka Model *</label>
                            <input
                                type="text"
                                name="brand_model"
                                value={formData.brand_model}
                                onChange={handleInputChange}
                                placeholder="Renault Kangoo"
                                required
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Base Yakıt Tüketimi (L/100km)</label>
                            <input
                                type="number"
                                name="base_fuel_consumption"
                                value={formData.base_fuel_consumption}
                                onChange={handleInputChange}
                                step="0.1"
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Klima Çarpanı</label>
                            <input
                                type="number"
                                name="ac_fuel_multiplier"
                                value={formData.ac_fuel_multiplier}
                                onChange={handleInputChange}
                                step="0.01"
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mevcut Km</label>
                            <input
                                type="number"
                                name="current_km"
                                value={formData.current_km}
                                onChange={handleInputChange}
                                className="form-control"
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.8rem' }}>
                                {editingVehicleId ? 'Değişiklikleri Güncelle' : 'Araç Ekle'}
                            </button>
                            {editingVehicleId && (
                                <button type="button" onClick={handleCancelEdit} className="btn btn-outline" style={{ padding: '0.8rem' }}>
                                    İptal
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Sağ Panel: Araç Listesi */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <h2 className="card-title">Filoyu Yönet ({vehicles.length})</h2>
                    {vehicles.length === 0 ? (
                        <p className="text-muted text-sm">Sunucuda henüz araç kaydı bulunmuyor.</p>
                    ) : (
                        <div className="grid-cards" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {vehicles.map((vehicle) => (
                                <div key={vehicle.id} style={{ padding: '1.25rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-main)', marginBottom: '1rem', transition: 'var(--transition-fluid)' }}>
                                    <div className="flex-between mb-4">
                                        <div>
                                            <p className="font-bold" style={{ fontSize: '1.1rem', color: 'var(--text-dark)' }}>{vehicle.brand_model}</p>
                                            <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Plaka: <span style={{ color: 'var(--kurumsal-lacivert)', fontWeight: '600' }}>{vehicle.plate_number}</span></p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleEditClick(vehicle)}
                                                className="btn btn-outline text-sm"
                                                style={{ padding: '0.4rem 0.8rem' }}
                                            >
                                                Düzenle
                                            </button>
                                            <button
                                                onClick={() => handleDeleteVehicle(vehicle.id)}
                                                className="btn btn-danger text-sm"
                                                style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', border: 'none' }}
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                                        <div>
                                            <span style={{ display: 'block', marginBottom: '0.25rem' }}>Base Tüketim</span>
                                            <span className="font-bold" style={{ color: 'var(--text-main)' }}>{vehicle.base_fuel_consumption} L/100km</span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', marginBottom: '0.25rem' }}>Klima Çarpanı</span>
                                            <span className="font-bold" style={{ color: 'var(--text-main)' }}>{vehicle.ac_fuel_multiplier}x</span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', marginBottom: '0.25rem' }}>Mevcut Km</span>
                                            <span className="font-bold" style={{ color: 'var(--text-main)' }}>{vehicle.current_km} km</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sistem Bilgileri ve İletişim */}
            <div className="grid-3" style={{ marginTop: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <div className="card">
                    <h2 className="card-title">Sistem Bilgileri</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
                        <div className="flex-between">
                            <span className="text-muted text-sm">Sistem Adı</span>
                            <span className="font-bold text-sm">EKOS CRM - Enterprise</span>
                        </div>
                        <div className="flex-between">
                            <span className="text-muted text-sm">Canlı Sürüm</span>
                            <span className="font-bold text-sm" style={{ color: 'var(--success-text)' }}>v1.0.0 (Production)</span>
                        </div>
                        <div className="flex-between">
                            <span className="text-muted text-sm">Toplam Araç</span>
                            <span className="font-bold text-sm">{vehicles.length} Aktif Kayıt</span>
                        </div>
                        <div className="flex-between">
                            <span className="text-muted text-sm">Bölge Veritabanı</span>
                            <span className="font-bold text-sm">Adana Bölge Müdürlüğü</span>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h2 className="card-title">Destek ve İletişim</h2>
                    <p className="text-muted text-sm mb-4">Sistem hakkında teknik destek almak veya yetkilendirme talepleri için BT birimiyle iletişime geçiniz.</p>
                    <div className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="text-muted">Email:</span>
                            <span className="font-bold">slhkrt333@gmail.com</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="text-muted">Telefon:</span>
                            <span className="font-bold">0 530 427 6483</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="text-muted">Destek Süresi:</span>
                            <span className="font-bold" style={{ color: 'var(--success-text)' }}>7/24 Kesintisiz</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}