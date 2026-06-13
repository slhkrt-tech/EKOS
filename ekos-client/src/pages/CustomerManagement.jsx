import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { exportCustomersToCSV, importCustomersFromCSV } from '../utils/csvExport';

const CustomerManagement = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        tax_number: '', company_name: '', contact_person: '',
        contact_phone: '', contact_email: '', current_infrastructure: '', metro_internet_ready: false,
        latitude: '', longitude: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [locationStatus, setLocationStatus] = useState('');
    const [csvFile, setCsvFile] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const filtered = customers.filter(c => 
            c.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.tax_number?.includes(searchQuery) ||
            c.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredCustomers(filtered);
    }, [searchQuery, customers]);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data.data || []);
        } catch (error) {
            console.error("Müşteriler yüklenemedi", error);
        }
    };

    const handleExportCustomers = () => {
        exportCustomersToCSV(customers);
        setMessage({ type: 'success', text: 'Müşteriler başarıyla dışa aktarıldı.' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleImportCustomers = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const importedCustomers = await importCustomersFromCSV(file);
            setMessage({ type: 'success', text: `${importedCustomers.length} müşteri içe aktarıldı.` });
            setCsvFile(null);
            fetchCustomers(); // Listeyi yenile
        } catch (error) {
            setMessage({ type: 'error', text: `İçe aktarma hatası: ${error}` });
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const getCurrentGpsCoordinates = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('Tarayıcınız GPS konumunu desteklemiyor.'));
            }

            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position.coords),
                (error) => reject(new Error(error.message || 'GPS konumu alınamadı.')),
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
            );
        });
    };

    const handleFillCoordinatesFromGps = async () => {
        setLoadingLocation(true);
        setLocationStatus('GPS konumu alınıyor...');
        try {
            const coords = await getCurrentGpsCoordinates();
            setFormData((prev) => ({
                ...prev,
                latitude: coords.latitude.toFixed(6),
                longitude: coords.longitude.toFixed(6)
            }));
            setLocationStatus('Koordinatlar alındı.');
        } catch (error) {
            setLocationStatus(error.message);
        } finally {
            setLoadingLocation(false);
        }
    };

    const handleUpdateCustomerCoordinates = async (customerId) => {
        setLoadingLocation(true);
        setLocationStatus('Seçilen müşteri için GPS konumu alınıyor...');
        try {
            const coords = await getCurrentGpsCoordinates();
            await api.put(`/customers?id=${customerId}`, {
                latitude: coords.latitude,
                longitude: coords.longitude
            });
            setLocationStatus('Müşteri koordinatları güncellendi.');
            fetchCustomers();
        } catch (error) {
            setLocationStatus('Koordinatlar güncellenemedi.');
        } finally {
            setLoadingLocation(false);
            setTimeout(() => setLocationStatus(''), 3000);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        try {
            await api.post('/customers', formData);
            setMessage({ type: 'success', text: 'Müşteri başarıyla eklendi!' });
            setFormData({
                tax_number: '', company_name: '', contact_person: '',
                contact_phone: '', contact_email: '', current_infrastructure: '', metro_internet_ready: false,
                latitude: '', longitude: ''
            });
            setLocationStatus('');
            fetchCustomers();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Müşteri eklenirken hata oluştu.' });
        }
    };

    const handleDeleteCustomer = async (id) => {
        if(!window.confirm('Bu firmayı sistemden tamamen silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/customers?id=${id}`);
            setMessage({ type: 'success', text: 'Firma başarıyla silindi.' });
            fetchCustomers();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Firma silinemedi (Geçmiş talepleri veya rotaları olabilir).' });
        }
    };

    return (
        <div className="page-container">
            {/* Başlık */}
            <div className="page-header">
                <h1 className="page-title">Müşteri Portföy Yönetimi</h1>
                <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
                    ← Panele Dön
                </button>
            </div>

            <div className="grid-3">
                {/* Sol Taraf: Yeni Müşteri Formu */}
                <div className="card">
                    <h2 className="card-title">Yeni Firma Kaydı</h2>
                    
                    {message.text && (
                        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Vergi Numarası *</label>
                            <input type="text" name="tax_number" required value={formData.tax_number} onChange={handleInputChange} className="form-control" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Firma Adı *</label>
                            <input type="text" name="company_name" required value={formData.company_name} onChange={handleInputChange} className="form-control" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Yetkili Kişi</label>
                            <input type="text" name="contact_person" value={formData.contact_person} onChange={handleInputChange} className="form-control" />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Telefon</label>
                                <input type="text" name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} className="form-control" />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">E-Posta</label>
                                <input type="email" name="contact_email" value={formData.contact_email} onChange={handleInputChange} className="form-control" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mevcut Altyapı</label>
                            <select name="current_infrastructure" value={formData.current_infrastructure} onChange={handleInputChange} className="form-control">
                                <option value="">Seçiniz...</option>
                                <option value="ADSL/VDSL">ADSL/VDSL Bakır</option>
                                <option value="Fiber">Fiber Optik</option>
                                <option value="Yok">Altyapı Yok</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group mb-0" style={{ flex: 1 }}>
                                <label className="form-label">Enlem</label>
                                <input type="number" step="0.000001" name="latitude" value={formData.latitude} onChange={handleInputChange} className="form-control" placeholder="37.0" />
                            </div>
                            <div className="form-group mb-0" style={{ flex: 1 }}>
                                <label className="form-label">Boylam</label>
                                <input type="number" step="0.000001" name="longitude" value={formData.longitude} onChange={handleInputChange} className="form-control" placeholder="35.0" />
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem', marginBottom: '1rem' }}>
                            <button type="button" onClick={handleFillCoordinatesFromGps} disabled={loadingLocation} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                                {loadingLocation ? 'Bekleyin...' : 'GPS ile Doldur'}
                            </button>
                            {locationStatus && <p className="text-sm text-muted" style={{ flex: 1 }}>{locationStatus}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input type="checkbox" name="metro_internet_ready" checked={formData.metro_internet_ready} onChange={handleInputChange} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--secondary)' }} />
                                Metro İnternet Potansiyeli Var
                            </label>
                        </div>

                        <button type="submit" className="btn btn-primary btn-block mt-4" style={{ padding: '0.8rem' }}>
                            Firmayı Kaydet
                        </button>
                    </form>
                </div>

                {/* Sağ Taraf: Müşteri Listesi Tablosu */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                        <h2 className="card-title" style={{ marginBottom: 0 }}>Sistemdeki Firmalar</h2>
                        <div style={{ flex: '1 1 200px' }}>
                            <input 
                                type="text" 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                placeholder="Firma, vergi no veya yetkili ara..." 
                                className="form-control" 
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="button" onClick={handleExportCustomers} className="btn" style={{ backgroundColor: '#16a34a', color: 'white', fontSize: '0.85rem' }}>
                                📥 CSV İndir
                            </button>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn" style={{ backgroundColor: '#2563eb', color: 'white', fontSize: '0.85rem' }}>
                                📤 CSV Yükle
                            </button>
                            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCustomers} style={{ display: 'none' }} />
                        </div>
                    </div>
                    
                    <p className="text-sm text-muted mb-4">Toplam Görüntülenen: <strong>{filteredCustomers.length}</strong> kayıt</p>
                    
                    <div className="table-responsive" style={{ maxHeight: '600px' }}>
                        <table className="ekos-table">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th>Firma Adı</th>
                                    <th>Vergi No</th>
                                    <th>Yetkili</th>
                                    <th>Altyapı</th>
                                    <th>Aksiyonlar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map(customer => (
                                        <tr key={customer.id}>
                                            <td className="font-bold" style={{ color: 'var(--primary)' }}>{customer.company_name}</td>
                                            <td className="text-muted">{customer.tax_number}</td>
                                            <td>{customer.contact_person || '-'}</td>
                                            <td>
                                                <span style={{ backgroundColor: '#e0f2fe', color: '#1e40af', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', fontWeight: '600' }}>
                                                    {customer.current_infrastructure || 'Belirtilmedi'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    <button type="button" onClick={() => navigate(`/customers/${customer.id}`)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                                                        Detay/Düzenle
                                                    </button>
                                                    {!customer.latitude || !customer.longitude ? (
                                                        <button type="button" onClick={() => handleUpdateCustomerCoordinates(customer.id)} disabled={loadingLocation} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                                                            GPS
                                                        </button>
                                                    ) : null}
                                                    <button type="button" onClick={() => handleDeleteCustomer(customer.id)} className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                                                        Sil
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">Arama kriterlerine uygun müşteri bulunamadı.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerManagement;