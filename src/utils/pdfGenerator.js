const PDFDocument = require('pdfkit');

/**
 * EKOS - Dinamik PDF Teklif Motoru
 * Müşteri verilerini ve sunulan hizmetleri alarak kurumsal PDF belgesi oluşturur.
 */
class PDFGenerator {
    
    // Verileri alıp bellekte (Buffer) PDF'e dönüştürür
    generateProposal(customer, services, totalAmount, signatureData) {
        return new Promise((resolve, reject) => {
            try {
                // Yeni bir PDF dökümanı başlatılır
                const doc = new PDFDocument({ margin: 50 });
                let buffers = [];

                // Veri akışı belleğe (array) yönlendirilir
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });

                // --- PDF TASARIMI VE İÇERİĞİ --- //

                // Kurumsal Başlık
                doc.fontSize(20).fillColor('#003366') // Kurumsal Lacivert
                   .text('TÜRK TELEKOM & EVANET', { align: 'center' })
                   .moveDown(0.5);

                doc.fontSize(14).fillColor('#00a3cc') // Turkuaz Vurgu
                   .text('Kurumsal Teknoloji Hizmet Teklifi', { align: 'center' })
                   .moveDown(2);

                // Müşteri Bilgileri
                doc.fontSize(12).fillColor('#333333')
                   .text(`Sayın Yetkili: ${customer.contact_person}`)
                   .text(`Firma: ${customer.company_name}`)
                   .text(`Vergi No: ${customer.tax_number}`)
                   .text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`)
                   .moveDown(2);

                // Hizmet Kalemleri (Tablo Simülasyonu)
                doc.fontSize(14).fillColor('#003366').text('Teklif Detayları:').moveDown(0.5);

                doc.fontSize(12).fillColor('#000000');
                services.forEach(service => {
                    doc.text(`- ${service.name} : ${service.price} TL`);
                });

                doc.moveDown(1);
                doc.rect(50, doc.y, 500, 1).fill('#cccccc'); // Ayırıcı çizgi
                doc.moveDown(1);

                // Toplam Tutar
                doc.fontSize(14).fillColor('#d9534f')
                   .text(`TOPLAM TUTAR: ${totalAmount} TL + KDV`, { align: 'right' })
                   .moveDown(3);

                // Alt Bilgi
                doc.fontSize(10).fillColor('#777777')
                   .text('Bu teklif 15 gün süreyle geçerlidir. Metro İnternet ve Siber Güvenlik hizmetleri taahhüt kapsamındadır.', { align: 'center' })
                   .moveDown(2);

                // İmza alanları
                doc.fontSize(12).fillColor('#003366')
                   .text('Hazırlayan:', 50, doc.y)
                   .text('Kurumsal Teknoloji Danışmanı', 50, doc.y + 15)
                   .text('Müşteri Onayı:', 400, doc.y - 15);

                // Sağ alana dijital imza PNG (base64) basılır (varsa)
                // signatureData: data:image/png;base64,... formatında bekleniyor.
                if (signatureData && typeof signatureData === 'string' && signatureData.startsWith('data:image/')) {
                    try {
                        const imgBase64 = signatureData.split(',')[1];
                        const signatureBuffer = Buffer.from(imgBase64, 'base64');

                        // Ölçek ve konum (PDF genişliği 550 varsayımıyla sağ kolon)
                        const sigX = 400;
                        const sigY = doc.y + 5;
                        const sigW = 130;
                        const sigH = 45;

                        doc.image(signatureBuffer, sigX, sigY, { width: sigW, height: sigH });
                        doc.fontSize(9).fillColor('#777777').text('İmza (Dijital)', sigX, sigY + sigH + 2);
                    } catch (e) {
                        // İmza basılamazsa PDF yine üretilsin.
                        doc.fontSize(9).fillColor('#777777').text('İmza basılamadı (format hatası).', 400, doc.y + 20);
                    }
                } else {
                    // İmza yoksa boş alan bilgisi
                    doc.fontSize(9).fillColor('#777777').text('İmza verilmedi.', 400, doc.y + 20);
                }

                // PDF çizimi sonlandırılır ve Buffer'a aktarılır
                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = new PDFGenerator();