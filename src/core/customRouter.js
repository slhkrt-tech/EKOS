/**
 * EKOS Özel Yönlendirme Sınıfı (Custom Router)
 * Gelen HTTP isteklerini ayrıştırır, gövde (body) verilerini okur ve işleyicilere yönlendirir.
 */
class CustomRouter {
    constructor() {
        this.routes = { GET: {}, POST: {}, PUT: {}, DELETE: {} };
    }

    get(path, handler) { this.routes.GET[path] = handler; }
    post(path, handler) { this.routes.POST[path] = handler; }
    put(path, handler) { this.routes.PUT[path] = handler; }
    delete(path, handler) { this.routes.DELETE[path] = handler; }

    handle(req, res) {
        const baseURL = `http://${req.headers.host}`;
        const parsedUrl = new URL(req.url, baseURL);
        const path = parsedUrl.pathname;
        req.query = Object.fromEntries(parsedUrl.searchParams.entries());
        const method = req.method;

        // --- CORS (GÜVENLİK VE İLETİŞİM) AYARLARI ---
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Tarayıcının "Girebilir miyim?" (OPTIONS) isteğine anında onay veriyoruz
        if (method === 'OPTIONS') {
            res.writeHead(204);
            return res.end();
        }

        const handler = this.routes[method] && this.routes[method][path];
        res.setHeader('Content-Type', 'application/json');

        if (handler) {
            // Veri taşıma ihtimali olan metodlar için gövde (body) ayrıştırma işlemi başlatılır.
            if (['POST', 'PUT', 'PATCH'].includes(method)) {
                let body = '';
                
                req.on('data', chunk => { body += chunk.toString(); });

                req.on('end', () => {
                    try {
                        req.body = body ? JSON.parse(body) : {};
                    } catch (error) {
                        res.writeHead(400);
                        return res.end(JSON.stringify({ error: "Hatalı İstek: Geçersiz JSON formatı." }));
                    }
                    handler(req, res);
                });
            } else {
                handler(req, res);
            }
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: "İstenilen API rotası bulunamadı." }));
        }
    }
}

module.exports = CustomRouter;