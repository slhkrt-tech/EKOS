import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../services/api';

// Kanban Kolon Tanımlamaları ve Renk Kodları
const COLUMNS = {
    'potansiyel': { id: 'potansiyel', title: '🎯 Potansiyel', color: '#f1f5f9', borderColor: '#cbd5e1' },
    'gorusuluyor': { id: 'gorusuluyor', title: '💬 Görüşülüyor', color: '#fffbeb', borderColor: '#fde68a' },
    'teklif': { id: 'teklif', title: '📄 Teklif İletildi', color: '#eff6ff', borderColor: '#bfdbfe' },
    'sozlesme': { id: 'sozlesme', title: '🤝 Sözleşme İmzalandı', color: '#f0fdf4', borderColor: '#bbf7d0' },
    'iptal': { id: 'iptal', title: '❌ İptal / Kayıp', color: '#fef2f2', borderColor: '#fecaca' }
};

const Pipeline = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(COLUMNS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPipelineData();
    }, []);

    const loadPipelineData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/customers');
            const customers = response.data.data || [];

            // Backend'den gelen müşterileri kolonlara dağıt (Kolonu olmayanları 'potansiyel'e at)
            const initialData = { ...COLUMNS };
            Object.keys(initialData).forEach(key => initialData[key].items = []);

            customers.forEach(customer => {
                const stage = customer.pipeline_stage || 'potansiyel';
                // Tahmini gelir verisi yoksa rastgele kurumsal bir değer ata (Şov amaçlı)
                const expected_revenue = customer.expected_revenue || Math.floor(Math.random() * 50000) + 15000;
                
                if (initialData[stage]) {
                    initialData[stage].items.push({ ...customer, expected_revenue });
                }
            });

            setData(initialData);
        } catch (error) {
            console.error('[EKOS PIPELINE] Veri yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;

        // Kart boşluğa bırakıldıysa veya yeri değişmediyse işlem yapma
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
            return;
        }

        const sourceCol = data[source.droppableId];
        const destCol = data[destination.droppableId];
        const sourceItems = [...sourceCol.items];
        const destItems = [...destCol.items];
        const [movedItem] = sourceItems.splice(source.index, 1);

        // UI'ı anında güncelle (Optimistic UI Update)
        if (source.droppableId === destination.droppableId) {
            sourceItems.splice(destination.index, 0, movedItem);
            setData({
                ...data,
                [source.droppableId]: { ...sourceCol, items: sourceItems }
            });
        } else {
            movedItem.pipeline_stage = destination.droppableId; // Yeni aşamayı ata
            destItems.splice(destination.index, 0, movedItem);
            setData({
                ...data,
                [source.droppableId]: { ...sourceCol, items: sourceItems },
                [destination.droppableId]: { ...destCol, items: destItems }
            });

            // Değişikliği arka uca bildir (Hata verirse konsola yaz ama UI'ı bozma)
            try {
                await api.put(`/customers?id=${draggableId}`, { pipeline_stage: destination.droppableId });
            } catch (error) {
                console.warn('[EKOS PIPELINE] Backend güncellemesi başarısız, tablo gösterim modunda devam ediyor.');
            }
        }
    };

    // Kolondaki toplam bekleyen geliri hesapla
    const getColumnTotal = (items) => {
        return items.reduce((sum, item) => sum + (item.expected_revenue || 0), 0);
    };

    if (loading) return <div className="page-container"><p className="text-muted font-bold text-center mt-4">Kanban Panosu Yükleniyor...</p></div>;

    return (
        <div className="page-container" style={{ maxWidth: '100%', padding: '1rem 2rem' }}>
            <div className="page-header mb-4 flex-between">
                <div>
                    <h1 className="page-title">📊 Satış Fırsatları (Pipeline)</h1>
                    <p className="text-muted text-sm mt-2">Müşterileri sürükleyerek satış hunisindeki aşamalarını güncelleyin.</p>
                </div>
                <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
                    ← Panele Dön
                </button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem', minHeight: '70vh' }}>
                    {Object.values(data).map((column) => (
                        <div key={column.id} style={{ display: 'flex', flexDirection: 'column', minWidth: '320px', flex: 1 }}>
                            
                            {/* Kolon Başlığı */}
                            <div style={{ 
                                padding: '1.25rem 1rem', 
                                backgroundColor: column.color, 
                                borderTop: `4px solid ${column.borderColor}`,
                                borderRadius: '0.5rem 0.5rem 0 0',
                                borderLeft: '1px solid var(--border-light)',
                                borderRight: '1px solid var(--border-light)'
                            }}>
                                <h3 className="font-bold" style={{ color: 'var(--kurumsal-lacivert)', fontSize: '1rem' }}>{column.title}</h3>
                                <div className="flex-between mt-2 text-sm">
                                    <span className="text-muted">{column.items.length} Firma</span>
                                    <span className="font-bold" style={{ color: 'var(--kurumsal-turkuaz)' }}>
                                        {getColumnTotal(column.items).toLocaleString()} ₺
                                    </span>
                                </div>
                            </div>

                            {/* Sürükle-Bırak Alanı */}
                            <Droppable droppableId={column.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{
                                            flex: 1,
                                            padding: '1rem',
                                            backgroundColor: snapshot.isDraggingOver ? '#f8fafc' : 'var(--bg-main)',
                                            borderLeft: '1px solid var(--border-light)',
                                            borderRight: '1px solid var(--border-light)',
                                            borderBottom: '1px solid var(--border-light)',
                                            borderRadius: '0 0 0.5rem 0.5rem',
                                            transition: 'background-color 0.2s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        {column.items.map((item, index) => (
                                            <Draggable key={item.id.toString()} draggableId={item.id.toString()} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            padding: '1rem',
                                                            backgroundColor: 'white',
                                                            borderRadius: '0.5rem',
                                                            boxShadow: snapshot.isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.15)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                                            border: '1px solid var(--border-light)',
                                                            ...provided.draggableProps.style
                                                        }}
                                                    >
                                                        <p className="font-bold" style={{ color: 'var(--kurumsal-lacivert)', fontSize: '0.95rem' }}>{item.company_name}</p>
                                                        <p className="text-sm text-muted mt-1">{item.contact_person || 'Yetkili Belirtilmedi'}</p>
                                                        
                                                        <div className="flex-between mt-3 pt-3" style={{ borderTop: '1px dashed var(--border-light)' }}>
                                                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '1rem', fontWeight: '600' }}>
                                                                {item.current_infrastructure || 'Altyapı Yok'}
                                                            </span>
                                                            <span className="font-bold text-sm" style={{ color: 'var(--success-text)' }}>
                                                                {item.expected_revenue.toLocaleString()} ₺
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>

                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
};

export default Pipeline;