import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import SignaturePad from '../components/SignaturePad'; // Dijital İmza Bileşeni eklendi

const ProposalCreation = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customerDetails, setCustomerDetails] = useState(null);
    const [services, setServices] = useState([
        { id: 1, name: 'Metro İnternet Altyapısı', price: 12500 },
        { id: 2, name: 'Siber Güvenlik İzleme', price: 8300 },
        { id: 3, name: 'Kurumsal Wi-Fi Çözümü', price: 4900 }
    ]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [sendMail, setSendMail] = useState(true);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // İmza State'leri
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [signature, setSignature] = useState(null);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const response = await api.get('/customers');
                setCustomers(response.data.data || []);
            } catch (error) {
                console.error('Müşteriler yüklenemedi', error);
            }
        };
        fetchCustomers();
    }, []);

    useEffect(() => {
        const amount = services.reduce((sum, item) => sum + Number(item.price || 0), 0);
        setTotalAmount(amount);
    }, [services]);

    useEffect(() => {
        const fetchCustomerDetails = async () => {
            if (!selectedCustomerId) {
                setCustomerDetails(null);
                setSignature(null); // Müşteri değişince imzayı sıfırla
                return;
            }

            try {
                const response = await api.get(`/customers/details?id=${selectedCustomerId}`);
                setCustomerDetails(response.data.data || null);
            } catch (error) {
                console.error('Müşteri detayı alınamadı', error);
            }
        };
        fetchCustomerDetails();
    }, [selectedCustomerId]);

    const handleServiceChange = (id, field, value) => {
        setServices((current) => current.map((item) => item.id === id ? { ...item, [field]: field === 'price' ? Number(value) : value } : item));
    };

    const handleSaveSignature = (dataUrl) => {
        setSignature(dataUrl);
        setShowSignaturePad(false);
        setMessage({ type: 'success', text: 'Dijital imza başarıyla alındı.' });
    };

    const handleGenerateProposal = async () => {
        if (!selectedCustomerId || !customerDetails) {
            setMessage({ type: 'error', text: 'Önce müşteri seçmelisiniz.' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const payload = {
                customerId: selectedCustomerId,
                services,
                totalAmount,
                isMailRequested: sendMail,
                signatureData: signature // İmzayı (Base64) arka uca gönderiyoruz
            };

            const response = await api.post('/proposals/generate', payload, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Teklif_${customerDetails.tax_number}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setMessage({ type: 'success', text: 'PDF oluşturuldu. E-posta gönderimi istenmişse ilgili mail gönderildi.' });
        } catch (error) {
            console.error('Teklif oluşturma hatası', error);
            setMessage({ type: 'error', text: error.response?.data?.error || 'Teklif oluşturulamadı.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Yeni Kurumsal Teklif Oluştur</h1>
                    <p className="text-muted text-sm mt-2">Seçilen müşterinin bilgilerini otomatik doldur, müşteriye tabletten imzalattır ve PDF olarak indir.</p>
                </div>
                <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
                    ← Panele Dön
                </button>
            </div>

            <div className="grid-3">
                {/* Sol Panel: Müşteri Seçimi */}
                <div className="card">
                    <h2 className="card-title">Müşteri Seçimi</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group mb-0">
                            <label className="form-label">Müşteri</label>
                            <select 
                                value={selectedCustomerId} 
                                onChange={(e) => setSelectedCustomerId(e.target.value)} 
                                className="form-control"
                            >
                                <option value="">Seçiniz...</option>
                                {customers.map((customer) => (
                                    <option key={customer.id} value={customer.id}>{customer.company_name}</option>
                                ))}
                            </select>
                        </div>

                        {customerDetails && (
                            <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                                <p className="font-bold" style={{ color: 'var(--primary)' }}>Otomatik Doldurulan Bilgiler</p>
                                <div style={{ fontSize: '0.875rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <p><span style={{ color: 'var(--text-muted)' }}>Firma:</span> <span className="font-bold text-main">{customerDetails.company_name}</span></p>
                                    <p><span style={{ color: 'var(--text-muted)' }}>Yetkili:</span> <span className="font-bold text-main">{customerDetails.contact_person || '-'}</span></p>
                                    <p><span style={{ color: 'var(--text-muted)' }}>Telefon:</span> <span className="font-bold text-main">{customerDetails.contact_phone || '-'}</span></p>
                                    <p><span style={{ color: 'var(--text-muted)' }}>E-Posta:</span> <span className="font-bold text-main">{customerDetails.contact_email || '-'}</span></p>
                                    <p><span style={{ color: 'var(--text-muted)' }}>Altyapı:</span> <span className="font-bold text-main">{customerDetails.current_infrastructure || '-'}</span></p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sağ Panel: Teklif Kalemleri ve İmza */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <h2 className="card-title">Teklif Kalemleri ve Onay</h2>
                    
                    {showSignaturePad ? (
                        <div style={{ padding: '2rem 0' }}>
                            <SignaturePad 
                                onSave={handleSaveSignature} 
                                onCancel={() => setShowSignaturePad(false)} 
                            />
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {services.map((item) => (
                                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                                        <div>
                                            <label className="form-label">Hizmet Adı</label>
                                            <input 
                                                type="text" 
                                                value={item.name} 
                                                onChange={(e) => handleServiceChange(item.id, 'name', e.target.value)} 
                                                className="form-control" 
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Fiyat (TL)</label>
                                            <input 
                                                type="number" 
                                                value={item.price} 
                                                onChange={(e) => handleServiceChange(item.id, 'price', e.target.value)} 
                                                className="form-control" 
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex-between mt-4" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={sendMail} 
                                            onChange={() => setSendMail(!sendMail)} 
                                            style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--secondary)' }} 
                                        />
                                        Müşteriye teklif maili gönderilsin
                                    </label>
                                    
                                    {/* Müşteri İmzası Önizleme */}
                                    {signature ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', backgroundColor: '#f0fdf4', border: '1px solid var(--success-border)', borderRadius: '0.5rem' }}>
                                            <div>
                                                <p className="text-sm font-bold" style={{ color: 'var(--success-text)' }}>✓ Müşteri İmzası Alındı</p>
                                                <button onClick={() => setShowSignaturePad(true)} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', marginTop: '0.25rem' }}>Yeniden İmzala</button>
                                            </div>
                                            <img src={signature} alt="Müşteri İmzası" style={{ height: '40px', backgroundColor: 'white', borderRadius: '0.25rem', border: '1px solid var(--border-light)' }} />
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setShowSignaturePad(true)} 
                                            disabled={!selectedCustomerId}
                                            className="btn btn-outline" 
                                            style={{ alignSelf: 'flex-start', borderStyle: 'dashed' }}
                                        >
                                            ✍️ Ekranda Müşteriye İmzalat
                                        </button>
                                    )}
                                </div>
                                
                                <div style={{ textAlign: 'right' }}>
                                    <p className="text-sm text-muted">Toplam Tutar</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        {totalAmount.toLocaleString()} TL
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                                <button 
                                    disabled={!selectedCustomerId || loading} 
                                    onClick={handleGenerateProposal} 
                                    className="btn btn-primary btn-block"
                                    style={{ padding: '0.8rem', fontSize: '1rem', opacity: (!selectedCustomerId || loading) ? 0.6 : 1 }}
                                >
                                    {loading ? 'Teklif oluşturuluyor...' : 'Onayla ve PDF Oluştur'}
                                </button>
                            </div>
                        </>
                    )}

                    {message.text && (
                        <div className={`alert mt-4 ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProposalCreation;