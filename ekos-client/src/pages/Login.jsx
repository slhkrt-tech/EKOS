import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // 🚀 GERÇEK API BAĞLANTISI GERİ GELDİ

const Login = () => {
    // Canlı sürümde güvenlik gereği inputlar boş başlatılır
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);

        try {
            // 🚀 GERÇEK BACKEND İSTEĞİ ATILIYOR
            const response = await api.post('/auth/login', { email, password });
            
            // Sunucudan (Node.js/Python vb.) gelen GERÇEK JWT Token'ı tarayıcıya kaydet
            localStorage.setItem('ekos_token', response.data.token);
            
            setLoading(false);
            
            // Başarılı giriş sonrası Dashboard'a yönlendir
            navigate('/dashboard');
        } catch (error) {
            console.error('[EKOS LOGIN ERROR]', error);
            // Sunucudan gelen hata mesajını veya genel ağ hatasını kullanıcıya göster
            setErrorMsg(
                error.response?.data?.message || 
                error.response?.data?.error || 
                'Giriş başarısız. Lütfen bilgilerinizi veya internet bağlantınızı kontrol edin.'
            );
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: 'var(--kurumsal-lacivert)', letterSpacing: '0.05em' }}>EKOS</h1>
                    <p className="text-muted mt-2">Kurumsal Operasyon Sistemi</p>
                </div>

                {errorMsg && (
                    <div className="alert alert-error mb-4">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">E-Posta Adresi</label>
                        <input 
                            type="email" 
                            required
                            className="form-control"
                            placeholder="ornek@evanet.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)} 
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Şifre</label>
                        <input 
                            type="password" 
                            required
                            className="form-control"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block mt-4" disabled={loading} style={{ padding: '0.8rem', fontSize: '1rem' }}>
                        {loading ? 'Sunucu Doğrulanıyor...' : 'Sisteme Giriş Yap'}
                    </button>
                </form>
                
                <p style={{ fontSize: '0.75rem', marginTop: '2rem', color: '#9ca3af', textAlign: 'center' }}>
                    EKOS Beta v1.0 | Güvenli Bağlantı
                </p>
            </div>
        </div>
    );
};

export default Login;