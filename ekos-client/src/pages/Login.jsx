import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        try {
            const response = await api.post('/auth/login', { email, password });
            localStorage.setItem('ekos_token', response.data.token);
            navigate('/dashboard');
        } catch (error) {
            setErrorMsg(error.response?.data?.error || 'Sunucuya bağlanılamadı.');
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
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block mt-4" style={{ padding: '0.8rem', fontSize: '1rem' }}>
                        Sisteme Giriş Yap
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;