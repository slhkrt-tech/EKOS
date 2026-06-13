/**
 * CSV Export Utility for EKOS CRM
 * Handles exporting customer and route data to CSV format
 */

export const exportCustomersToCSV = (customers) => {
    if (!customers || customers.length === 0) {
        alert('Dışa aktarılacak müşteri yok.');
        return;
    }

    const headers = ['Firma Adı', 'Vergi No', 'Yetkili', 'Telefon', 'Email', 'Altyapı', 'Metro İnternet', 'Enlem', 'Boylam'];
    const rows = customers.map(c => [
        c.company_name || '',
        c.tax_number || '',
        c.contact_person || '',
        c.contact_phone || '',
        c.contact_email || '',
        c.current_infrastructure || '',
        c.metro_internet_ready ? 'Evet' : 'Hayır',
        c.latitude || '',
        c.longitude || ''
    ]);

    downloadCSV(headers, rows, 'musteriler.csv');
};

export const exportRoutesToCSV = (routes) => {
    if (!routes || routes.length === 0) {
        alert('Dışa aktarılacak rota yok.');
        return;
    }

    const headers = ['Araç Modeli', 'Plaka', 'Toplam Mesafe (km)', 'Tahmini Yakıt (L)', 'Tarih', 'Not'];
    const rows = routes.map(r => [
        r.brand_model || '',
        r.plate_number || '',
        r.total_distance || '',
        r.estimated_fuel || '',
        new Date(r.created_at).toLocaleString() || '',
        r.note || ''
    ]);

    downloadCSV(headers, rows, 'rotalar.csv');
};

export const exportRequestsToCSV = (requests) => {
    if (!requests || requests.length === 0) {
        alert('Dışa aktarılacak talep yok.');
        return;
    }

    const headers = ['Firma Adı', 'Talep Türü', 'Detay', 'Tarih'];
    const rows = requests.map(r => [
        r.company_name || '',
        r.request_type || '',
        r.details || '',
        new Date(r.created_at).toLocaleString() || ''
    ]);

    downloadCSV(headers, rows, 'taleplar.csv');
};

const downloadCSV = (headers, rows, filename) => {
    // Convert headers and rows to CSV format
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add UTF-8 BOM for proper Turkish character display in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Import customers from CSV file
 */
export const importCustomersFromCSV = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.trim().split('\n');
                
                if (lines.length < 2) {
                    reject('CSV dosyası boş veya geçersiz.');
                    return;
                }

                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const customers = [];

                for (let i = 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i]);
                    if (values.length === 0) continue;

                    const customer = {
                        company_name: values[headers.indexOf('firma adı')] || '',
                        tax_number: values[headers.indexOf('vergi no')] || '',
                        contact_person: values[headers.indexOf('yetkili')] || '',
                        contact_phone: values[headers.indexOf('telefon')] || '',
                        contact_email: values[headers.indexOf('email')] || '',
                        current_infrastructure: values[headers.indexOf('altyapı')] || '',
                        metro_internet_ready: values[headers.indexOf('metro internet')] === 'evet',
                        latitude: values[headers.indexOf('enlem')] ? parseFloat(values[headers.indexOf('enlem')]) : null,
                        longitude: values[headers.indexOf('boylam')] ? parseFloat(values[headers.indexOf('boylam')]) : null
                    };

                    customers.push(customer);
                }

                resolve(customers);
            } catch (error) {
                reject(`CSV işleme hatası: ${error.message}`);
            }
        };

        reader.onerror = () => reject('Dosya okuma hatası.');
        reader.readAsText(file);
    });
};

/**
 * Parse CSV line handling quoted values
 */
const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result.map(v => v.replace(/^"|"$/g, ''));
};
