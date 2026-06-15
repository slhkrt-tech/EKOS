import React from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend,
    BarChart, Bar
} from 'recharts';

// Kurumsal Renk Paletleri
const PIE_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
const CHART_FONT = { fontSize: 12, fill: '#64748b', fontFamily: 'Inter, sans-serif' };

// Mülakat / Demo sunumu için aylık trend mock verisi
// Gerçek senaryoda bu veri backend'den (GROUP BY month) gelir.
const monthlyTrendData = [
    { name: 'Oca', ariza: 65, cozum: 60 },
    { name: 'Şub', ariza: 59, cozum: 55 },
    { name: 'Mar', ariza: 80, cozum: 78 },
    { name: 'Nis', ariza: 45, cozum: 45 },
    { name: 'May', ariza: 30, cozum: 30 },
    { name: 'Haz', ariza: 25, cozum: 24 } // Yapay zeka modülü devreye girdikten sonra düşüş eğilimi :)
];

export default function DashboardCharts({ infrastructureData, vehicleData }) {
    
    // 1. Pasta Grafik Verisi (Altyapı)
    const pieData = infrastructureData && infrastructureData.length > 0 
        ? infrastructureData.map(item => ({
            name: item.current_infrastructure || 'Belirtilmedi',
            value: item.count
        })) 
        : [{ name: 'Veri Yok', value: 1 }];

    // 2. Sütun Grafik Verisi (Araç Yakıt)
    const barData = vehicleData && vehicleData.length > 0
        ? vehicleData.map(v => ({
            name: v.brand_model.split(' ')[0], // Sadece markayı alarak ekseni temiz tutalım
            'Base Tüketim': Number(v.base_fuel_consumption) || 0,
        }))
        : [];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
            {/* 1. Grafik: Aylık Arıza ve Çözüm Trendi (Area Chart) */}
            <div className="card" style={{ gridColumn: '1 / -1' }}> {/* Tam genişlik kaplar */}
                <h3 className="module-title" style={{ marginBottom: '1.5rem' }}>📈 Aylara Göre Arıza ve Çözüm Trendi (2026)</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAriza" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorCozum" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={CHART_FONT} />
                            <YAxis axisLine={false} tickLine={false} tick={CHART_FONT} />
                            <RechartsTooltip 
                                contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Area type="monotone" name="Gelen Arıza Kaydı" dataKey="ariza" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorAriza)" />
                            <Area type="monotone" name="Çözülen Arıza" dataKey="cozum" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCozum)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Grafik: Altyapı Dağılımı (Pasta Grafik) */}
            <div className="card">
                <h3 className="module-title" style={{ marginBottom: '1rem' }}>🌍 Müşteri Altyapı Dağılımı</h3>
                <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip 
                                contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Grafik: Araç Yakıt Tüketim Analizi (Sütun Grafik) */}
            <div className="card">
                <h3 className="module-title" style={{ marginBottom: '1rem' }}>⛽ Filo Yakıt Tüketim Profili (L/100km)</h3>
                <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                        <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={CHART_FONT} />
                            <YAxis axisLine={false} tickLine={false} tick={CHART_FONT} />
                            <RechartsTooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Bar name="Litre / 100km" dataKey="Base Tüketim" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={45}>
                                {barData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0ea5e9' : '#38bdf8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}