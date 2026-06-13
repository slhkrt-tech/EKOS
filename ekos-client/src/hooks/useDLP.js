import { useEffect } from 'react';

/**
 * EKOS - Veri Sızıntısı Engelleme (DLP) Katmanı
 * Kurumsal müşteri verilerinin dışarıya kopyalanmasını, sayfa kaynağının incelenmesini
 * ve izinsiz veri çekimini (Scraping) engeller.
 */
const useDLP = () => {
    useEffect(() => {
        // Standart fare ve seçim eylemlerini durduran fonksiyon
        const preventAction = (e) => {
            e.preventDefault();
            console.warn('[EKOS DLP] Kurumsal güvenlik politikası gereği bu işlem engellendi.');
        };

        // Tehlikeli klavye kısayollarını durduran fonksiyon
        const preventKeys = (e) => {
            // F12 (Geliştirici Araçları)
            if (e.key === 'F12') {
                e.preventDefault();
                console.warn('[EKOS DLP] Geliştirici araçlarına erişim engellendi.');
            }
            
            // Ctrl/Cmd ile kombine edilen tehlikeli tuşlar: C (Kopyala), X (Kes), S (Kaydet), P (Yazdır)
            // Ayrıca Ctrl+Shift+I / J / C gibi geliştirici kısayolları
            if (e.ctrlKey || e.metaKey) {
                const key = e.key.toLowerCase();
                if (['c', 'x', 's', 'p'].includes(key) || (e.shiftKey && ['i', 'j', 'c'].includes(key))) {
                    e.preventDefault();
                    console.warn(`[EKOS DLP] ${e.key} kısayolu kullanımı güvenlik ihlali nedeniyle engellendi.`);
                }
            }
        };

        // Clipboard API üzerinden yapılan yazma işlemlerini de engelle
        // (Örn: navigator.clipboard.writeText, copy event tetiklemeden direkt panoya yazar)
        const originalClipboard = {
            writeText: navigator.clipboard?.writeText,
            write: navigator.clipboard?.write
        };

        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText = async () => {
                console.warn('[EKOS DLP] Clipboard writeText engellendi.');
                return Promise.reject(new Error('DLP: Clipboard işlemi engellendi'));
            };
        }

        if (navigator.clipboard?.write) {
            navigator.clipboard.write = async () => {
                console.warn('[EKOS DLP] Clipboard write engellendi.');
                return Promise.reject(new Error('DLP: Clipboard işlemi engellendi'));
            };
        }

        // Olay Dinleyicilerini (Event Listeners) Sisteme Ekle
        document.addEventListener('contextmenu', preventAction); // Sağ tıklamayı engelle
        document.addEventListener('copy', preventAction);        // Kopyalamayı engelle (Ctrl+C ve Sağ tık -> Kopyala)
        document.addEventListener('cut', preventAction);         // Kesmeyi engelle
        document.addEventListener('selectstart', preventAction); // Metinleri fareyle seçip taramayı (highlight) engelle
        document.addEventListener('dragstart', preventAction);   // Resimleri veya metinleri sürüklemeyi engelle
        document.addEventListener('keydown', preventKeys);       // Klavye kısayollarını engelle

        // Bileşen (Component) ekrandan kalktığında (Unmount) dinleyicileri temizle
        return () => {
            document.removeEventListener('contextmenu', preventAction);
            document.removeEventListener('copy', preventAction);
            document.removeEventListener('cut', preventAction);
            document.removeEventListener('selectstart', preventAction);
            document.removeEventListener('dragstart', preventAction);
            document.removeEventListener('keydown', preventKeys);
        };
    }, []);
};

export default useDLP;