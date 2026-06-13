import React, { useRef, useState, useEffect } from 'react';

const SignaturePad = ({ onSave, onCancel }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        // Canvas'ı yüksek çözünürlüklü ekranlar (Retina vb.) için ayarla
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#003366'; // Kurumsal Lacivert mürekkep
    }, []);

    // Dokunmatik veya fare konumunu hesapla
    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        e.preventDefault();
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.closePath();
            setIsDrawing(false);
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        // İmzayı Base64 PNG formatına çevir
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
            <p className="text-sm text-muted text-center">Lütfen aşağıdaki alana imzanızı atın.</p>
            <div style={{ border: '2px dashed var(--border-light)', borderRadius: '0.5rem', backgroundColor: '#f8fafc', overflow: 'hidden', touchAction: 'none' }}>
                <canvas
                    ref={canvasRef}
                    width={500}
                    height={200}
                    style={{ width: '100%', height: '200px', cursor: 'crosshair', display: 'block' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={clearCanvas} className="btn btn-outline" style={{ flex: 1 }}>Temizle</button>
                <button type="button" onClick={handleCancel} className="btn btn-danger" style={{ flex: 1 }}>İptal</button>
                <button type="button" onClick={handleSave} className="btn btn-primary" style={{ flex: 2 }}>İmzayı Kaydet</button>
            </div>
        </div>
    );
};

export default SignaturePad;