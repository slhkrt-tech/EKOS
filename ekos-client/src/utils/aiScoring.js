/**
 * EKOS - Müşteri Zekası ve Skorlama Motoru
 * Verileri analiz ederek Churn (Kayıp) ve Upsell (Satış) potansiyelini hesaplar.
 */

// Sigmoid aktivasyon fonksiyonu: Skorları yumuşak bir şekilde 0 ile 1 arasına sıkıştırır
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

// ReLU (Rectified Linear Unit): Negatif skor üretmemek için (0'ın altını 0 kabul eder)
const relu = (x) => Math.max(0, x);

export const analyzeCustomerIntelligence = (customer, requests) => {
    if (!customer) return { churnRisk: 0, upsellPotential: 0, recommendations: [] };

    let rawChurnScore = 0;
    let rawUpsellScore = 0;
    const recommendations = [];

    // 1. Talep (Request) Analizi
    const recentRequests = requests || [];
    const faultReports = recentRequests.filter(r => r.request_type === 'Arıza Kaydı').length;
    const speedRequests = recentRequests.filter(r => r.request_type === 'Hız Artışı Talebi').length;

    // Arıza kayıtları Churn (Kayıp) riskini artırır
    if (faultReports > 0) {
        rawChurnScore += faultReports * 1.5; 
        if (faultReports >= 3) {
            recommendations.push("🚨 Kritik Kayıp Riski: Firma sürekli arıza yaşıyor. Acil yerinde ziyaret planlayın.");
        }
    }

    // Hız talepleri Upsell (Üst paket satma) şansını artırır
    if (speedRequests > 0) {
        rawUpsellScore += speedRequests * 2.0;
        recommendations.push("💡 Hız şikayeti var. Mevcut paketi yetersiz, Metro İnternet teklifi sunmak için harika bir zaman.");
    }

    // 2. Altyapı Analizi
    if (customer.current_infrastructure === 'ADSL/VDSL' && customer.metro_internet_ready) {
        rawUpsellScore += 3.0;
        recommendations.push("🎯 Bölgesinde fiber altyapı potansiyeli var ancak eski nesil bakır kablo kullanıyor. Güvenlik ve Metro İnternet paketi satılabilir.");
    }

    if (!customer.metro_internet_ready && faultReports > 1) {
        rawChurnScore += 1.0;
    }

    // 3. Matematiksel Normalizasyon (Skorları 0-100 aralığına çekme)
    // Değerleri modellemek için ReLU ile tabanı 0'a sabitliyor,
    // ardından Sigmoid ile ekstrem sıçramaları törpüleyip 100 üzerinden yüzdelik dilime çeviriyoruz.
    
    // (Sigmoid(0) = 0.5 olduğu için formülü sıfırdan başlatacak şekilde kaydırıyoruz)
    const normalizedChurn = Math.round((sigmoid(relu(rawChurnScore) - 2)) * 100);
    const normalizedUpsell = Math.round((sigmoid(relu(rawUpsellScore) - 1)) * 100);

    return {
        churnRisk: Math.min(normalizedChurn, 99), // Maks %99
        upsellPotential: Math.min(normalizedUpsell, 99),
        recommendations: recommendations.length > 0 ? recommendations : ["Firma şu an stabil görünüyor. Rutin arama planlanabilir."]
    };
};