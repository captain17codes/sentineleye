import { useState, useEffect, useCallback } from 'react';
import { ZoneFeature, ZoneCollection } from '../types/zone.types';
import { zonesApi } from '../api/zones.api';

export function useZones() {
  const [zones, setZones] = useState<ZoneFeature[]>([]);
  const [collection, setCollection] = useState<ZoneCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      const data = await zonesApi.getAll();
      setCollection(data);
      setZones(data.features || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch zones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  return { zones, collection, loading, error, refreshZones: fetchZones };
}
