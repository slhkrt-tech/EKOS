import { useEffect } from 'react';
import axios from 'axios';
import { offlineStorage } from '../services/offlineStorage';

/**
 * EKOS - Canlı Sürüm (Production-Ready) Senkronizasyon Motoru
 * Cihaz internete bağlandığı an IndexedDB'deki kuyruğu FIFO (İlk giren ilk çıkar)
 * prensibiyle, ardışık ilişkileri bozmadan güvenli bir şekilde sunucuya iletir.
 */
const useSyncEngine = () => {
    useEffect(() => {
        const syncData = async () => {
            // 1. Cihaz hafızasındaki bekleyen işlemleri kontrol et
            const queue = await offlineStorage.getSyncQueue();
            if (!queue || queue.length === 0) return;

            console.log(`📡 [EKOS SYNC] İnternet algılandı. Kuyruktaki ${queue.length} işlem senkronize ediliyor...`);
            
            // Premium UI için senkronizasyonun başladığını bildiren global event fırlat
            window.dispatchEvent(new CustomEvent('ekos-sync-started', { detail: { count: queue.length } }));

            // Canlı sunucu adresi (.env dosyasından çekilir)
            const API_URL = import.meta.env.VITE_API_URL || 'https://api.ekos-sistem.com/api';
            const failedQueue = []; 

            // Sıralı işlem bütünlüğü (Sequential Integrity) için senkron döngü çalıştırıyoruz
            for (let i = 0; i < queue.length; i++) {
                const action = queue[i];
                
                // Canlıda token süresi yenilenmiş olabileceği için her döngüde en güncel token'ı oku
                const currentToken = localStorage.getItem('ekos_token');

                try {
                    await axios({
                        baseURL: API_URL,
                        url: action.url,
                        method: action.method,
                        data: action.data,
                        timeout: 10000, // Canlı ortamda her istek için maksimum 10 saniye tanı
                        headers: {
                            'Content-Type': 'application/json',
                            ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
                        }
                    });
                    console.log(`[EKOS SYNC] ✅ Başarılı: ${action.method.toUpperCase()} ${action.url}`);
                } catch (error) {
                    console.error(`[EKOS SYNC] ❌ Başarısız: ${action.url}`, error);
                    
                    // 🛡️ CRITICAL PRODUCTION FILTER (Zehirli Hap Koruması):
                    // Eğer hata sunucu kaynaklıysa (5xx) veya internet o saniyede tekrar koptuysa (Network Error),
                    // bu işlemi silme, failedQueue'ya ekle ki bir sonraki internet gelişinde tekrar denensin.
                    // Eğer hata 400, 403, 422 gibi istemci hatasıysa, bu istek hatalıdır ve tekrar denense de
                    // asla çalışmayacaktır. Kuyruğu tıkamaması için canlıda bu isteği pas geçip imha ediyoruz.
                    if (!error.response || error.response.status >= 500) {
                        failedQueue.push(action);
                    } else {
                        console.warn(`[EKOS SYNC] ⚠️ Geçersiz istek (Hata: ${error.response.status}) kuyruktan temizlendi.`);
                    }
                }
            }

            // 2. Cihaz hafızasındaki (IndexedDB) kuyruğu güncelle
            if (failedQueue.length === 0) {
                await offlineStorage.clearSyncQueue();
                console.log('[EKOS SYNC] ✨ Tüm kuyruk başarıyla temizlendi. Sistem tamamen güncel.');
                
                // Arayüze "Senkronizasyon Kusursuz Tamamlandı" mesajı ve yeşil tik göndermek için event fırlat
                window.dispatchEvent(new CustomEvent('ekos-sync-complete'));
            } else {
                await offlineStorage.saveSyncQueue(failedQueue);
                console.warn(`[EKOS SYNC] ⚠️ Hatalı sunucu yanıtı sebebiyle ${failedQueue.length} işlem sonra tekrar denenecek.`);
                
                // Kullanıcıya arayüzde "Bazı işlemler bekletiliyor" uyarısı göstermek için event fırlat
                window.dispatchEvent(new CustomEvent('ekos-sync-partial', { detail: { remaining: failedQueue.length } }));
            }
        };

        // Durum 1: Uygulama ilk açıldığında veya sayfa yenilendiğinde internet varsa tetikle
        if (navigator.onLine) {
            syncData();
        }

        // Durum 2: Uygulama arka planda açıkken internetin geldiği o anı yakala
        window.addEventListener('online', syncData);

        return () => {
            window.removeEventListener('online', syncData);
        };
    }, []);
};

export default useSyncEngine;