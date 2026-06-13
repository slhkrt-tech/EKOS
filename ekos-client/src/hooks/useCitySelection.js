import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { TURKEY_CITY_DEFAULT_CENTER } from '../utils/turkeyCities';

const STORAGE_KEY = 'ekos_city';

export default function useCitySelection({ defaultCity = 'Adana' } = {}) {
  const [city, setCity] = useState(defaultCity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCity(saved);
  }, []);

  const center = useMemo(() => {
    return TURKEY_CITY_DEFAULT_CENTER[city] || TURKEY_CITY_DEFAULT_CENTER[defaultCity];
  }, [city, defaultCity]);

  const setSelectedCity = async (nextCity) => {
    setLoading(true);
    setError('');
    try {
      setCity(nextCity);
      localStorage.setItem(STORAGE_KEY, nextCity);

      // Backend kullanıcı profiline yazma (opsiyonel)
      // Eğer backend schema yoksa hata fırlatmayacak şekilde ignore edilecek.
      try {
        await api.put('/settings/city', { city: nextCity });
      } catch (e) {
        // schema/route yoksa ignore
      }
    } catch (e) {
      setError(e?.message || 'Şehir güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  return { city, center, setSelectedCity, loading, error };
}

