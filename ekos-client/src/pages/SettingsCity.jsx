import React, { useMemo } from 'react';
import useCitySelection from '../hooks/useCitySelection';
import { TURKEY_CITIES_81 } from '../utils/turkeyCities';

const SettingsCity = () => {
  const { city, center, setSelectedCity, loading, error } = useCitySelection({ defaultCity: 'Adana' });

  const options = useMemo(() => TURKEY_CITIES_81, []);

  return (
    <div className="card">
      <h2 className="card-title">Çalışma Şehri</h2>
      <p className="text-sm text-muted mb-2">Seçili şehre göre rota başlangıç merkezi güncellenir ve harita rota görüntülenir.</p>

      <div className="form-group">
        <label className="form-label">Şehir</label>
        <select
          className="form-control"
          value={city}
          onChange={(e) => setSelectedCity(e.target.value)}
          disabled={loading}
        >
          {options.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: '1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '1rem', borderRadius: '0.5rem' }}>
        <p className="text-sm text-muted">Başlangıç Merkezi (yaklaşık)</p>
        <p className="font-bold" style={{ color: 'var(--kurumsal-lacivert)' }}>
          {city} • {center?.lat?.toFixed?.(4)}, {center?.lng?.toFixed?.(4)}
        </p>
      </div>

      {error ? <div className="alert alert-error mt-2">{error}</div> : null}
    </div>
  );
};

export default SettingsCity;

