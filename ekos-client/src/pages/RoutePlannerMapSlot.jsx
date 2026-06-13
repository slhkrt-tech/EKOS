import React from 'react';
import GoogleMapRoute from '../components/GoogleMapRoute';

const RoutePlannerMapSlot = ({ apiKey, points, height = 460 }) => {
  return (
    <div className="card" style={{ gridColumn: 'span 2', padding: '1rem' }}>
      <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>Harita</h2>
      <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
        Google Maps üzerinde rota ve noktalar çizilir.
      </p>
      <GoogleMapRoute apiKey={apiKey} points={points} height={height} />
    </div>
  );
};

export default RoutePlannerMapSlot;

