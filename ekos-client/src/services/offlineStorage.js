import localforage from 'localforage';

// Telefondaki yerel veritabanı ayarları
localforage.config({
    driver: localforage.INDEXEDDB, // Tarayıcı/Capacitor IndexedDB motoru
    name: 'EKOS_Offline_DB',
    version: 1.0,
    storeName: 'ekos_store',
});

// Çevrimdışı kuyruk (İnternet yokken yapılan işlemleri burada biriktireceğiz)
const SYNC_QUEUE_KEY = 'ekos_sync_queue';

export const offlineStorage = {
    // ---- ÖNBELLEK (CACHE) İŞLEMLERİ ----
    // İnternet varken çekilen müşterileri/rotaları telefona kaydet
    saveData: async (key, data) => {
        try {
            await localforage.setItem(key, data);
        } catch (error) {
            console.error('[EKOS OFFLINE] Veri kaydedilemedi:', error);
        }
    },

    // İnternet yokken telefondaki veriyi getir
    getData: async (key) => {
        try {
            return await localforage.getItem(key);
        } catch (error) {
            console.error('[EKOS OFFLINE] Veri okunamadı:', error);
            return null;
        }
    },

    // ---- SENKRONİZASYON KUYRUĞU İŞLEMLERİ ----
    // İnternet yokken yapılan bir POST/PUT işlemini kuyruğa ekle
    addToSyncQueue: async (action) => {
        try {
            const queue = await localforage.getItem(SYNC_QUEUE_KEY) || [];
            queue.push({
                ...action,
                id: Date.now(), // Kuyruk sırası için benzersiz ID
                timestamp: new Date().toISOString()
            });
            await localforage.setItem(SYNC_QUEUE_KEY, queue);
            console.log('[EKOS OFFLINE] İşlem kuyruğa eklendi:', action.type);
        } catch (error) {
            console.error('[EKOS OFFLINE] Kuyruğa ekleme başarısız:', error);
        }
    },

    // Kuyruktaki işlemleri al
    getSyncQueue: async () => {
        return await localforage.getItem(SYNC_QUEUE_KEY) || [];
    },

    // Kuyruğu temizle (Senkronizasyon bitince çağrılır)
    clearSyncQueue: async () => {
        await localforage.setItem(SYNC_QUEUE_KEY, []);
    }
};