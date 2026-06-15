import { useEffect } from 'react';
import axios from 'axios';
import { offlineStorage } from '../services/offlineStorage';

/**
 * EKOS - Çevrimdışı (Offline-First) Senkronizasyon Motoru
 * İnternet bağlantısı geldiğinde cihaz hafızasındaki (IndexedDB) 
 * bekleyen (kuyruktaki) API isteklerini sunucuya sırasıyla iletir.
 */
const useSyncEngine = () => {
    useEffect(() => {
        // İnternet geldiğinde çalışacak ana motor
        const syncData = async () => {
            // Kuyrukta bekleyen işlem var mı diye telefon hafızasına bak
            const queue = await offlineStorage.getSyncQueue();
            if (!queue || queue.length === 0) return;

            console.log(`[EKOS SYNC] 🌐 İnternet bağlantısı sağlandı! Kuyruktaki ${queue.length} işlem arka uca gönderiliyor...`);

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const token = localStorage.getItem('ekos_token');
            
            // Başarısız olanları (sunucu hatası vb.) tekrar tutacağımız yeni kuyruk
            const failedQueue = []; 

            // Kuyruktaki işlemleri sırasıyla sunucuya ilet
            for (let i = 0; i < queue.length; i++) {
                const action = queue[i];
                try {
                    // Mevcut api.js'teki interceptor'a (çevrimdışı yakalayıcıya) tekrar takılmamak için
                    // işlemleri saf (raw) axios ile doğrudan sunucuya atıyoruz.
                    await axios({
                        baseURL: API_URL,
                        url: action.url,
                        method: action.method,
                        data: action.data,
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        }
                    });
                    console.log(`[EKOS SYNC] ✅ İşlem başarıyla senkronize edildi: ${action.method.toUpperCase()} ${action.url}`);
                } catch (error) {
                    console.error(`[EKOS SYNC] ❌ İşlem senkronize edilemedi: ${action.url}`, error);
                    
                    // Eğer hata sunucu kaynaklıysa (5xx) veya internet anlık gittiyse (Network Error), 
                    // işlemi silme, başarısızlar kuyruğuna at ki bir sonraki denemede tekrar göndersin.
                    if (!error.response || error.response.status >= 500) {
                        failedQueue.push(action);
                    }
                }
            }

            // Kuyruğu Güncelle (Başarılı olanlar silindi, sadece başarısızlar kaldı)
            if (failedQueue.length === 0) {
                await offlineStorage.clearSyncQueue();
                console.log('[EKOS SYNC] ✨ Tüm senkronizasyon tamamlandı, kuyruk tamamen temizlendi.');
                
                // İsteğe bağlı: UI tarafında "Senkronizasyon Tamamlandı" mesajı göstermek için global event fırlat
                window.dispatchEvent(new CustomEvent('ekos-sync-complete'));
            } else {
                // Sadece kalanları geri kaydet
                await offlineStorage.saveSyncQueue(failedQueue);
                console.warn(`[EKOS SYNC] ⚠️ ${failedQueue.length} işlem sunucu hatası nedeniyle kuyrukta bekletiliyor.`);
            }
        };

        // 1. Durum: Uygulama ilk açıldığında internet varsa hemen kuyruğu kontrol et
        if (navigator.onLine) {
            syncData();
        }

        // 2. Durum: Uygulama açıkken cihazın internete bağlandığı o saniyeyi (Event) dinle
        window.addEventListener('online', syncData);

        // Bileşen ekrandan kalkarsa dinleyiciyi temizle
        return () => {
            window.removeEventListener('online', syncData);
        };
    }, []);
};

export default useSyncEngine;