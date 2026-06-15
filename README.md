# ⚡ EKOS - Kurumsal Operasyon Sistemi (Enterprise CRM)

![Version](https://img.shields.io/badge/version-1.1.0--beta-blue.svg)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Raw_HTTP-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)

EKOS, saha ekipleri, satış personeli ve yöneticiler için geliştirilmiş, yüksek performanslı ve modern bir Kurumsal Kaynak Planlama (ERP/CRM) sistemidir. Yeni nesil Glassmorphism tasarım diliyle inşa edilmiş olup, çevrimdışı çalışma (Offline-First) ve yapay zeka destekli rota optimizasyonu gibi ileri seviye kurumsal gereksinimleri karşılar.

---

## 🚀 Öne Çıkan Özellikler

* **📶 Offline-First (Çevrimdışı Çalışma):** İnternet koptuğunda veri kaybı yaşanmaz. Saha personelinin girdiği tüm arıza kayıtları ve işlemler IndexedDB kuyruğuna alınır ve bağlantı geldiğinde (Background Sync) arka planda otomatik senkronize edilir.
* **🤖 Yapay Zeka Rota & Yakıt Planlama:** Saha araçları için harita üzerinde (OpenStreetMap) en kısa ziyaret güzergahlarını çizer, klima çarpanına ve araç modeline göre anlık yakıt tüketim tahmini yapar.
* **📊 Dinamik Kanban (Satış Hunisi):** Sürükle-bırak (Drag & Drop) özellikli satış hunisi. Müşteri statüleri değiştikçe potansiyel gelir hesaplamaları eş zamanlı (Optimistic UI) güncellenir.
* **🛡️ Gelişmiş RBAC & Güvenlik:** Sıkılaştırılmış JWT token mimarisi. Admin, Sales (Satış) ve Tech (Saha) rolleri için dinamik sayfa erişimi. DLP (Data Loss Prevention) entegrasyonu ile yetkisiz inceleme engelleme kancaları.
* **⚡ Native WebSocket & Raw HTTP:** Backend tarafında hantal framework'ler (Express vb.) yerine, saf Node.js (`http` modülü) ve CustomRouter kullanılarak maksimum asenkron performans ve düşük gecikmeli anlık bildirim sistemi (WebSocket) kurulmuştur.

---

## 🛠️ Kullanılan Teknolojiler

### Frontend (İstemci)
* **Core:** React 18, Vite, React Router DOM
* **State & Data:** Axios, Custom Sync Hooks (Offline Storage)
* **UI/UX:** Glassmorphism Design System, Lucide React (İkonlar)
* **Data Viz & Maps:** Recharts, Leaflet / React-Leaflet, Hello-Pangea (DnD)

### Backend (Sunucu)
* **Core:** Node.js (Raw HTTP Server)
* **Database:** PostgreSQL (Supabase)
* **Security:** JWT (JSON Web Tokens), Bcryptjs, Native CORS Config
* **Real-time:** Native WebSocket (ws)
* **Utilities:** Nodemailer (SMTP Fatura/Teklif İletimi)

---

## ⚙️ Kurulum ve Çalıştırma (Geliştirici Ortamı)

Projeyi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

### 1. Veritabanı ve Çevre Değişkenleri (.env)
Aşağıdaki şablonlara uygun olarak `.env` dosyalarınızı oluşturun.

**`EKOS/.env` (Backend):**
```env
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_super_secret_key
DATABASE_URL=postgresql://user:password@host:port/dbname

ekos-client/.env (Frontend):

VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000/ws

2. Backend'i Başlatma

cd EKOS
npm install
npm run start
# Sunucu http://localhost:3000 adresinde ayağa kalkacaktır.

3. Frontend'i Başlatma

cd ekos-client
npm install
npm run dev
# Arayüz http://localhost:5173 adresinde ayağa kalkacaktır.

👨‍💻 Geliştirici İletişim
Bu proje, modern web standartları ve yüksek kurumsal güvenlik politikaları göz önünde bulundurularak tasarlanmıştır.

Geliştirici: Salih Kurt

E-Posta: slhkrt333@gmail.com

Sürüm: 1.1.0 (Beta / Production Ready)