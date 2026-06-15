const http = require('http');
require('dotenv').config();

// Çekirdek modüller sisteme dahil edilir.
const CustomRouter = require('./src/core/customRouter');
const websocketHub = require('./src/core/websocketServer');

// Page refresh / HMR sonrası istekleri kesmeden devam etmek için global hata yakalama
process.on('uncaughtException', (err) => {
    console.error('[EKOS CORE][uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[EKOS CORE][unhandledRejection]', reason);
});

// Kontrolcüler (Controllers) sisteme dahil edilir.
const customerController = require('./src/controllers/customerController'); 
const authController = require('./src/controllers/authController');
const routeOptimizer = require('./src/controllers/routeOptimizer');
const proposalController = require('./src/controllers/proposalController');
const routePlanController = require('./src/controllers/routePlanController');
const vehicleController = require('./src/controllers/vehicleController');
const requestController = require('./src/controllers/requestController');
const settingsController = require('./src/controllers/settingsController');

// Sunucu port numarası ve CORS izni çevre değişkenlerinden alınır.
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || '*'; // Canlı ortamda Frontend'in adresi (.env dosyasından gelir)

// Yönlendirici nesnesi (instance) oluşturulur.
const router = new CustomRouter();

// --- API ROTALARI --- //

// Sistemin genel sağlık durumunu kontrol eden test rotası
router.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        status: "Success",
        message: "EKOS Çekirdeği Aktif ve Tüm Rotalar Çalışıyor.",
        environment: process.env.NODE_ENV || 'development'
    }));
});

// Kimlik Doğrulama ve Güvenlik Rotaları
router.post('/api/auth/register', (req, res) => authController.registerUser(req, res));
router.post('/api/auth/login', (req, res) => authController.loginUser(req, res));

// Müşteri Yönetimi Rotaları
router.post('/api/customers', (req, res) => customerController.createCustomer(req, res));
router.get('/api/customers', (req, res) => customerController.getAllCustomers(req, res));
router.put('/api/customers', (req, res) => customerController.updateCustomerCoordinates(req, res));
router.get('/api/customers/analytics/infrastructure', (req, res) => customerController.getInfrastructureStats(req, res));

// Saha Operasyon ve Rota Optimizasyon Rotaları
router.post('/api/routes/optimize', (req, res) => routeOptimizer.generateDailyRoute(req, res));
router.post('/api/routes/history', (req, res) => routePlanController.saveRoutePlan(req, res));
router.get('/api/routes/history', (req, res) => routePlanController.getRouteHistory(req, res));
router.get('/api/routes/analytics', (req, res) => routePlanController.getRouteAnalytics(req, res));

// Araç filomuzu listeleyen ve yöneten API'ler
router.get('/api/vehicles', (req, res) => vehicleController.getAllVehicles(req, res));
router.post('/api/vehicles', (req, res) => vehicleController.createVehicle(req, res));
router.put('/api/vehicles', (req, res) => vehicleController.updateVehicle(req, res)); 
router.delete('/api/vehicles', (req, res) => vehicleController.deleteVehicle(req, res));

// Müşteri detaylarını asenkron doldurmak için gerekli API
router.get('/api/customers/details', (req, res) => customerController.getCustomerDetails(req, res));

// Talep saklama ve geçmişi
router.post('/api/requests', (req, res) => requestController.saveRequest(req, res));
router.get('/api/requests', (req, res) => requestController.getAllRequests(req, res));

// Teklif ve Dinamik PDF Üretim Rotaları
router.post('/api/proposals/generate', (req, res) => proposalController.createAndDownloadPDF(req, res));

// Şehir ayarı (kullanıcının çalışma şehri)
router.put('/api/settings/city', (req, res) => settingsController.updateUserCity(req, res));

// Anlık müşteri talep bildirimleri için native WebSocket destekli yol
router.post('/api/requests/notify', async (req, res) => {
    const { company_name, request_type, details } = req.body || {};
    if (!company_name || !request_type) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Firma adı ve talep türü gerekiyor.' }));
    }

    try {
        const savedRequest = await requestController.createRequest({ company_name, request_type, details });
        const summary = await requestController.getSummary();

        const notification = {
            event: 'new_customer_request',
            id: savedRequest.id,
            company_name: savedRequest.company_name,
            request_type: savedRequest.request_type,
            details: savedRequest.details,
            created_at: savedRequest.created_at,
            timestamp: new Date().toISOString()
        };

        websocketHub.broadcast(notification);

        try {
            const mailSender = require('./src/utils/mailSender');
            await mailSender.sendRequestNotification(company_name, request_type, details || 'Detay yok.');
        } catch (error) {
            console.error('[EKOS WARNING] Yönetici maili gönderilemedi, ancak WebSocket bildirimi yapıldı.', error);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'Success', message: 'Bildirim saha ekibine iletildi.', data: { notification, savedRequest, summary } }));
    } catch (error) {
        console.error('[EKOS ERROR] Bildirim sırasında talep kaydedilemedi:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Sunucu hatası: Bildirim işlenemedi.' }));
    }
});

// -------------------- //

// 🛡️ CANLI ORTAM GÜVENLİK KALKANI (CORS ve Preflight Yönetimi)
const server = http.createServer((req, res) => {
    // 1. Her gelen isteğe (Response) CORS başlıklarını ekle
    res.setHeader('Access-Control-Allow-Origin', CLIENT_URL);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // 2. Tarayıcıların güvenlik kontrolü (Preflight / OPTIONS) isteğini yanıtla
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // 3. Güvenlikten geçen normal istekleri CustomRouter'a gönder
    router.handle(req, res);
});

// WebSocket hub'u HTTP sunucusuna ilişkilendiriyoruz
websocketHub.attach(server);

// Sunucu dinlemeye başlar.
server.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`🚀 [EKOS CORE] Sistem başarıyla başlatıldı!`);
    console.log(`🌐 [EKOS CORE] Sunucu dinleniyor: http://localhost:${PORT}`);
    console.log(`🛡️  [EKOS CORS] İzin Verilen İstemci: ${CLIENT_URL}`);
    console.log(`===========================================`);
});