const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * EKOS - E-Posta İletişim Motoru
 * Sistem üzerinden oluşturulan dökümanları ve bildirimleri ilgili adreslere iletir.
 */
class MailSender {
    constructor() {
        // SMTP taşıyıcısı (Transporter) yapılandırılır
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false, // 587 portu için TLS kullanılır
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // PDF teklifini müşteriye e-posta olarak gönderir
    async sendProposalEmail(customerEmail, customerName, pdfBuffer, taxNumber) {
        try {
            const mailOptions = {
                from: `"EKOS Kurumsal" <${process.env.SMTP_USER}>`,
                to: customerEmail,
                cc: process.env.SMTP_USER, // Bilgi amaçlı gönderen adrese de düşer
                subject: `Türk Telekom & Evanet - Kurumsal Teknoloji Teklifi | ${taxNumber}`,
                text: `Sayın ${customerName},\n\nTalep etmiş olduğunuz teknoloji altyapı hizmetlerine ait teklif dökümanınız ekte sunulmuştur.\n\nİyi çalışmalar dileriz.`,
                attachments: [
                    {
                        filename: `Teklif_${taxNumber}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EKOS MAIL] Teklif başarıyla iletildi: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error('[EKOS ERROR] Mail Gönderim Hatası:', error);
            throw error; // Hatayı Controller katmanına fırlatır
        }
    }

    // Müşteri talebi oluştuğunda yöneticiyi haberdar eden mail
    async sendRequestNotification(companyName, requestType, details) {
        try {
            const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
            const mailOptions = {
                from: `"EKOS Kurumsal" <${process.env.SMTP_USER}>`,
                to: adminEmail,
                subject: `Murat Bey - ${companyName} için yeni saha talebi`,
                text: `Merhaba Murat Bey,\n\n${companyName} için yeni bir saha talebi geldi.\n\nTalep türü: ${requestType}\nDetaylar: ${details || 'Belirtilmedi.'}\n\nLütfen gerekli aksiyonu alın.`
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EKOS MAIL] Yöneticye talep bildirimi gönderildi: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error('[EKOS ERROR] Yöneticye Bildirim Maili Hatası:', error);
            throw error;
        }
    }
}

module.exports = new MailSender();