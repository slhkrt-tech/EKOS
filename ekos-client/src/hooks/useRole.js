import { jwtDecode } from 'jwt-decode';

export const useRole = () => {
    try {
        const token = localStorage.getItem('ekos_token');
        
        // Token yoksa doğrudan misafir (guest) yetkisi dön, ProtectedRoute onu Login'e atacak
        if (!token) {
            return { role: 'guest', region: null, userId: null };
        }
        
        // Gerçek token'ı çöz (Decode)
        const decoded = jwtDecode(token);
        
        return {
            // Artık varsayılan 'admin' atamıyoruz, sunucu (token) ne derse o!
            role: decoded.role, 
            region: decoded.region,
            userId: decoded.id
        };
    } catch (error) {
        // 🛡️ CANLI ORTAM GÜVENLİĞİ (CRITICAL)
        // Eğer token bozuk, oynanmış veya süresi geçmişse (catch bloğu),
        // güvenliği sağlamak için token'ı sil ve kullanıcıyı dışarı at.
        console.error('[EKOS GÜVENLİK] Geçersiz, müdahale edilmiş veya süresi dolmuş token tespit edildi.');
        localStorage.removeItem('ekos_token'); 
        
        return { 
            role: 'guest', 
            region: null, 
            userId: null 
        };
    }
};