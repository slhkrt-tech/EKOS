const pdfGenerator = require('../utils/pdfGenerator');
const mailSender = require('../utils/mailSender');
const db = require('../config/db');

class ProposalController {
    
    async createAndDownloadPDF(req, res) {
        try {
            // isMailRequested (Mail gönderilsin mi?) parametresi eklenir
            const { customerId, services, totalAmount, isMailRequested } = req.body;

            if (!customerId || !services || !totalAmount) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: "Müşteri ID, Hizmetler ve Toplam Tutar zorunludur." }));
            }

            const customerResult = await db.query(`SELECT * FROM customers WHERE id = $1`, [customerId]);
            
            if (customerResult.rowCount === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: "Müşteri bulunamadı." }));
            }

            const customer = customerResult.rows[0];

            // 1. PDF belgesi bellek üzerinde (Buffer) oluşturulur
            const pdfBuffer = await pdfGenerator.generateProposal(customer, services, totalAmount);

            // 2. Eğer istemci mail gönderilmesini talep ettiyse (isMailRequested: true), mail motoru tetiklenir
            if (isMailRequested && customer.contact_email) {
                await mailSender.sendProposalEmail(customer.contact_email, customer.contact_person, pdfBuffer, customer.tax_number);
            }

            // 3. PDF dosyası yanıt (Response) olarak indirilir
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Teklif_${customer.tax_number}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);
            
            res.writeHead(200);
            res.end(pdfBuffer);

        } catch (error) {
            console.error('[EKOS ERROR] Teklif Oluşturma/Mail Hatası:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Sunucu hatası: İşlem tamamlanamadı." }));
        }
    }
}

module.exports = new ProposalController();