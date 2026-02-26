import { useState, useEffect, useCallback } from 'react';

export function usePipeline() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPipeline = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pipeline');
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
    const interval = setInterval(fetchPipeline, 120000);
    return () => clearInterval(interval);
  }, [fetchPipeline]);

  return { deals, loading, error, refresh: fetchPipeline };
}
