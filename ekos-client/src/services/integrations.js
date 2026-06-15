/**
 * EKOS - Harici Kurumsal Sistem Entegrasyonları (ERP & VoIP PBX)
 * Not: Bu dosya şirketin Logo/SAP ve Sanal Santral API'leri ile konuşur.
 */

export const enterpriseIntegrations = {
    // 1. Sanal Santral (VoIP) Tetikleyici
    initiateVoipCall: async (phoneNumber, extension = '1001') => {
        console.log(`[VoIP API] Dahili ${extension}, ${phoneNumber} numarasını arıyor...`);
        
        // Gerçekte burada şirketin PBX Santraline (Örn: 3CX, Karel, Bulut Santral) istek atılır.
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ 
                    success: true, 
                    callId: `CALL-${Date.now()}`,
                    message: 'Sanal santral tetiklendi. Lütfen masa telefonunuzu açın.' 
                });
            }, 1000);
        });
    },

    // 2. Logo/SAP (ERP) Fatura Aktarımı
    sendToERP: async (proposalData) => {
        console.log(`[ERP API] Teklif ERP sistemine taslak fatura olarak iletiliyor...`, proposalData);
        
        // Gerçekte burada SAP/Logo REST veya SOAP API'sine XML/JSON payload gönderilir.
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ 
                    success: true, 
                    erpInvoiceNo: `INV-2026-${Math.floor(Math.random() * 10000)}`,
                    status: 'Taslak Fatura Oluşturuldu'
                });
            }, 2000);
        });
    }
};