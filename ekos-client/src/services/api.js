import axios from 'axios';

// Backend sunucumuzun adresi (Mobil APK ve yerel ağ testi için Local IP ile güncellendi)
const API_URL = 'http://192.168.1.185:3000/api';

// Tüm isteklerde kullanılacak standart Axios yapılandırması
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Eğer kullanıcı giriş yapmışsa (Token varsa), bunu her isteğin kimliğine (Header) otomatik ekle
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ekos_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;