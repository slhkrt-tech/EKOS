import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { analyzeCustomerIntelligence } from '../utils/aiScoring';

export default function AIPredictions() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [churnAlerts, setChurnAlerts] = useState([]);
    const [upsellAlerts, setUpsellAlerts] = useState([]);

    useEffect(() => {
        const fetchAndAnalyzeData = async () => {
            try {
                setLoading(true);
                // Tüm müşterileri ve tüm talepleri paralel olarak çek
                const [customersRes, requestsRes] = await Promise.all([
                    api.get('/customers'),
                    api.get('/requests?limit=100') // Son 100 talebi analiz için çek
                ]);

                const customers = customersRes.data.data || [];
                const allRequests = requestsRes.data.data || [];

                const churnList = [];
                const upsellList = [];

                // Yapay Zeka Motorunu tüm portföy için döngüye sok
                customers.forEach(customer => {
                    const customerRequests = allRequests.filter(req => req.company_name === customer.company_name);
                    
                    // Önceden yazdığımız AI Algoritmasını çağır
                    const analysis = analyzeCustomerIntelligence(customer, customerRequests);

                    // Risk ve Fırsatları ilgili dizilere ekle
                    if (analysis.churnRisk >= 50) {
                        churnList.push({ customer, risk: analysis.churnRisk, reasons: analysis.recommendations });
                    }
                    
                    if (analysis.upsellPotential >= 60) {
                        upsellList.push({ customer, potential: analysis.upsellPotential, reasons: analysis.recommendations });
                    }
                });

                // En kritik olanları en üste sırala
                setChurnAlerts(churnList.sort((a, b) => b.risk - a.risk));
                setUpsellAlerts(upsellList.sort((a, b) => b.potential - a.potential));

            } catch (error) {
                console.error('[EKOS AI] Analiz verileri yüklenemedi:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndAnalyzeData();
    }, []);

    if (loading) return <div className="page-container"><p className="text-muted text-center mt-4 font-bold">🧠 Yapay Zeka Tüm Portföyü Analiz Ediyor...</p></div>;

    return (
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
            <div className="page-header mb-4">
                <div>
                    <h1 className="page-title">🧠 Yapay Zeka Müşteri Radarı</h1>
                    <p className="text-muted text-sm mt-2">Makine öğrenmesi algoritmaları, tüm portföyü tarayarak kayıp risklerini ve satış fırsatlarını listeler.</p>
                </div>
                <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
                    ← Panele Dön
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                
                {/* SOL PANEL: CHURN (KAYIP) RİSKİ YÜKSEK OLANLAR */}
                <div className="card" style={{ borderTop: '4px solid #ef4444' }}>
                    <div className="flex-between mb-3">
                        <h2 className="card-title text-main mb-0">🚨 Kritik Kayıp (Churn) Alarmları</h2>
                        <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {churnAlerts.length} Firma
                        </span>
                    </div>
                    <p className="text-sm text-muted mb-4">Sürekli arıza yaşayan veya iletişimi kopan firmalar.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {churnAlerts.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                                <span style={{ fontSize: '2rem' }}>🛡️</span>
                                <p className="font-bold mt-2 text-success">Riskli Müşteri Yok</p>
                            </div>
                        ) : (
                            churnAlerts.map((item, idx) => (
                                <div key={idx} style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid #fecaca', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div className="flex-between mb-2">
                                        <h3 className="font-bold" style={{ color: '#7f1d1d' }}>{item.customer.company_name}</h3>
                                        <span className="font-bold" style={{ color: '#dc2626' }}>%{item.risk} Risk</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', backgroundColor: '#fee2e2', borderRadius: '3px', marginBottom: '0.75rem' }}>
                                        <div style={{ width: `${item.risk}%`, height: '100%', backgroundColor: '#ef4444', borderRadius: '3px' }}></div>
                                    </div>
                                    <p className="text-sm text-muted mb-2"><strong>AI Notu:</strong> {item.reasons.find(r => r.includes('Kayıp')) || 'Sık arıza kaydı tespiti.'}</p>
                                    <button onClick={() => navigate(`/customers/${item.customer.id}`)} className="btn btn-outline" style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', color: '#b91c1c', borderColor: '#fecaca' }}>
                                        Müşteri Detayına Git
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* SAĞ PANEL: UPSELL (SATIŞ) FIRSATI YÜKSEK OLANLAR */}
                <div className="card" style={{ borderTop: '4px solid #10b981' }}>
                    <div className="flex-between mb-3">
                        <h2 className="card-title text-main mb-0">🎯 Metro İnternet Satış Fırsatları (Upsell)</h2>
                        <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {upsellAlerts.length} Firma
                        </span>
                    </div>
                    <p className="text-sm text-muted mb-4">Hız şikayeti olan veya bölgesinde fiber altyapı olup bakır kullanan firmalar.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {upsellAlerts.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                                <span style={{ fontSize: '2rem' }}>📈</span>
                                <p className="font-bold mt-2 text-muted">Şu an belirgin bir fırsat tespit edilemedi.</p>
                            </div>
                        ) : (
                            upsellAlerts.map((item, idx) => (
                                <div key={idx} style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid #bbf7d0', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div className="flex-between mb-2">
                                        <h3 className="font-bold" style={{ color: '#14532d' }}>{item.customer.company_name}</h3>
                                        <span className="font-bold" style={{ color: '#059669' }}>%{item.potential} İhtimal</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', backgroundColor: '#dcfce7', borderRadius: '3px', marginBottom: '0.75rem' }}>
                                        <div style={{ width: `${item.potential}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '3px' }}></div>
                                    </div>
                                    <p className="text-sm text-muted mb-2"><strong>AI Notu:</strong> {item.reasons.find(r => r.includes('satılabilir') || r.includes('teklifi')) || 'Altyapı yükseltme potansiyeli yüksek.'}</p>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => navigate(`/proposal`)} className="btn btn-primary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem', backgroundColor: '#10b981', border: 'none' }}>
                                            Teklif Oluştur
                                        </button>
                                        <button onClick={() => navigate(`/customers/${item.customer.id}`)} className="btn btn-outline" style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }}>
                                            İncele
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}