import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const API_BASE = '/api';

async function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`;
    }
  }
  return headers;
}

export function useSheets() {
  const [companies, setCompanies] = useState([]);
  const [outreach, setOutreach] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();

      const [compRes, outRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/sheets?tab=companies`, { headers }),
        fetch(`${API_BASE}/sheets?tab=outreach`, { headers }),
        fetch(`${API_BASE}/sheets?tab=summary`, { headers }),
      ]);

      if (compRes.ok) {
        const data = await compRes.json();
        setCompanies(data.rows || data.data || []);
        if (data.demo) setIsDemo(true);
      }
      if (outRes.ok) {
        const data = await outRes.json();
        setOutreach(data.rows || data.data || []);
      }
      if (sumRes.ok) {
        const data = await sumRes.json();
        setSummary(data);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStage = useCallback(async (tab, company, field, value) => {
    try {
      const headers = await getHeaders();
      await fetch(`${API_BASE}/sheets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: tab === 'companies' ? 'update_company' : 'update_contact',
          data: { company, [field]: value },
        }),
      });
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { companies, outreach, summary, loading, error, isDemo, refresh: fetchData, updateStage };
}
