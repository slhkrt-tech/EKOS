import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../hooks/useRole';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('ekos_token');
    const { role } = useRole();

    // 1) Token yoksa -> Login
    if (!token) {
        return <Navigate to="/" replace />;
    }

    // 2) Token var ama role guest döndüyse (jwtDecode'da role alanı yok/bozuk vs.)
    //    ProtectedRoute'u bloklamayalım; allowedRoles tanımlıysa yine kontrol edelim.
    //    (Bu değişiklik: Login sonrası /dashboard'a geçişin yanlışlıkla engellenmesini düzeltir.)
    if (allowedRoles && !allowedRoles.includes(role)) {
        console.warn(`[EKOS RBAC] Erişim Reddedildi. Mevcut Rol: ${role}, İstenen: ${allowedRoles}`);
        return <Navigate to="/dashboard" replace />;
    }


    // 3. Durum: Her şey uygunsa bileşeni (sayfayı) ekranda göster
    return children;
};

export default ProtectedRoute;