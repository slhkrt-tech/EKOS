const fs = require('fs');
const path = require('path');

// Taramak istediğimiz ana klasörler (Backend ve Frontend)
const foldersToScan = ['./EKOS', './ekos-client'];
const outputFile = 'tum_kodlar.txt';

let outputContent = '';

function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        // Sistemi yoracak ve koda dahil olmayan gereksiz klasörleri atlıyoruz
        if (stat.isDirectory()) {
            if (!['node_modules', 'dist', '.git', 'public', 'assets'].includes(file)) {
                scanDirectory(fullPath);
            }
        } else {
            // Sadece .js ve .jsx uzantılı kaynak kod dosyalarını alıyoruz
            if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                outputContent += `\n\n` + `=`.repeat(70) + `\n`;
                outputContent += `📁 DOSYA: ${fullPath}\n`;
                outputContent += `=`.repeat(70) + `\n\n`;
                outputContent += content;
            }
        }
    });
}

console.log("🚀 EKOS Projesi kodları taranıyor...");
foldersToScan.forEach(folder => scanDirectory(folder));

fs.writeFileSync(outputFile, outputContent);
console.log(`✅ Şahane! Tüm kodlar başarıyla '${outputFile}' dosyasına yazıldı.`);