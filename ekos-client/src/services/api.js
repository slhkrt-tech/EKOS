import axios from 'axios';
import { offlineStorage } from './offlineStorage';

// Canlı (Production) sunucu adresin. Test aşamasında .env dosyasından yerel IP'yi de alabilir.
const API_URL = import.meta.env.VITE_API_URL || 'https://api.ekos-sistem.com/api';

const api = axios.create({
    baseURL: API_URL,
    // Canlı ortamda gerçek bir veritabanı sorgusu zaman alabileceği için 
    // süreyi 1.5 saniyeden 8 saniyeye (8000ms) çıkarıyoruz.
    timeout: 8000, 
    headers: {
        'Content-Type': 'application/json'
    }
});

// REQUEST (İstek) Yakalayıcı: Her isteğe gerçek JWT Token'ı ekler
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ekos_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, (error) => Promise.reject(error));

// RESPONSE (Cevap) Yakalayıcı: Sadece Çevrimdışı (Offline) Modu Yönetir
api.interceptors.response.use(
    (response) => {
        // Sunucudan (Backend) gelen gerçek ve başarılı veriyi olduğu gibi döndür
        return response;
    },
    async (error) => {
        // SADECE İNTERNET YOKSA VEYA SUNUCU ÇÖKTÜYSE ÇALIŞIR
        if (!error.response || error.code === 'ERR_NETWORK') {
            const config = error.config;
            const method = (config.method || '').toLowerCase();
            const url = config.url || '';

            // Giriş denemelerinde internet yoksa kuyruğa alma, direkt hata ver
            if (url.includes('/auth/login')) return Promise.reject(error);

            // SAHA EKİBİ KORUMASI: Sadece veri "yazma" (POST/PUT/DELETE) işlemleri kuyruğa alınır
            if (['post', 'put', 'delete'].includes(method)) {
                console.warn('📡 [EKOS OFFLINE] İnternet koptu. İşlem cihaz hafızasına (IndexedDB) kaydediliyor...');
                
                await offlineStorage.addToSyncQueue({
                    url: config.url, 
                    method: config.method, 
                    data: config.data ? JSON.parse(config.data) : null,
                });
                
                // Sistemin çökmemesi ve saha ekibinin işine devam edebilmesi için başarılı sayıyoruz
                return Promise.resolve({ 
                    data: { 
                        success: true, 
                        offline: true,
                        message: "İnternet bağlantınız koptu. İşleminiz güvenli bir şekilde kuyruğa alındı."
                    }, 
                    status: 200 
                });
            }
        }
        
        // GET isteklerinde internet yoksa veya backend hata (404, 500 vb.) dönerse
        // ARTIK SAHTE VERİ DÖNMÜYORUZ. Gerçek hatayı fırlatıp UI'ın (arayüzün) bunu göstermesini sağlıyoruz.
        return Promise.reject(error);
    }
);

export default api;