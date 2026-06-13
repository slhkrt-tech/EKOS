import React, { useEffect, useMemo, useRef, useState } from 'react';

// Polyline/marker çizimi için Google Maps JS API.
// Not: Harita SDK’i <script> ile dışarıdan yüklenir.

const loadGoogleMaps = (apiKey) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('window yok'));

    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    const existing = document.querySelector('script[data-ekos-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('Google Maps script load hata')));
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('data-ekos-google-maps', 'true');
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry`;

    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Google Maps script load hata'));

    document.head.appendChild(script);
  });
};

const centerOf = (points) => {
  if (!points || points.length === 0) return { lat: 37.0, lng: 35.3 };
  const lats = points.map((p) => p.lat).filter((v) => typeof v === 'number');
  const lngs = points.map((p) => p.lng).filter((v) => typeof v === 'number');
  if (lats.length === 0 || lngs.length === 0) return { lat: 37.0, lng: 35.3 };
  return { lat: lats.reduce((a, b) => a + b, 0) / lats.length, lng: lngs.reduce((a, b) => a + b, 0) / lngs.length };
};

const GoogleMapRoute = ({
  apiKey,
  className,
  height = 420,
  points = [], // [{lat, lng, label?, id?}]
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const markersRef = useRef([]);

  const [status, setStatus] = useState({ loading: true, error: '' });

  const isReadyPoints = useMemo(() => {
    return (points || []).filter((p) => typeof p?.lat === 'number' && typeof p?.lng === 'number');
  }, [points]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!apiKey) {
        setStatus({ loading: false, error: 'Google Maps API key eksik (VITE_GOOGLE_MAPS_KEY).' });
        return;
      }
      setStatus({ loading: true, error: '' });
      try {
        const g = await loadGoogleMaps(apiKey);
        if (cancelled) return;

        const map = new g.maps.Map(containerRef.current, {
          center: centerOf(isReadyPoints.length ? isReadyPoints : []),
          zoom: 8,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });
        mapRef.current = map;

        setStatus({ loading: false, error: '' });
      } catch (e) {
        if (cancelled) return;
        setStatus({ loading: false, error: e?.message || 'Harita yüklenemedi.' });
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    const g = window.google;
    if (!mapRef.current || !g?.maps) return;

    // Clear polyline + markers
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const valid = (points || []).filter((p) => typeof p?.lat === 'number' && typeof p?.lng === 'number');
    if (valid.length === 0) return;

    const path = valid.map((p) => ({ lat: p.lat, lng: p.lng }));

    // Fit bounds
    const bounds = new g.maps.LatLngBounds();
    path.forEach((ll) => bounds.extend(ll));
    mapRef.current.fitBounds(bounds);

    // Polyline
    polylineRef.current = new g.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#003366',
      strokeOpacity: 0.9,
      strokeWeight: 5,
    });
    polylineRef.current.setMap(mapRef.current);

    // Markers
    const markerIcon = {
      path: g.maps.SymbolPath.CIRCLE,
      fillColor: '#00a3cc',
      fillOpacity: 1,
      strokeColor: '#003366',
      strokeWeight: 2,
      scale: 6,
    };

    valid.forEach((p, idx) => {
      const marker = new g.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: mapRef.current,
        label: p.label ? String(p.label) : String(idx + 1),
        icon: markerIcon,
      });
      markersRef.current.push(marker);
    });
  }, [points]);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: typeof height === 'number' ? `${height}px` : height,
          borderRadius: '0.75rem',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          background: '#e2e8f0',
        }}
      />
      {status.error ? (
        <div className="alert alert-error mt-2" style={{ marginBottom: 0 }}>
          {status.error}
        </div>
      ) : null}
    </div>
  );
};

export default GoogleMapRoute;

