import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

async function getHeaders() {
  const headers = {};
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`;
    }
  }
  return headers;
}

export function usePipeline() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchPipeline = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      const res = await fetch('/api/pipeline', { headers });
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
        if (data.demo) setIsDemo(true);
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

  return { deals, loading, error, isDemo, refresh: fetchPipeline };
}
