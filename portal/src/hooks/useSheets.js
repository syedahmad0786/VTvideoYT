import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

export function useSheets() {
  const [companies, setCompanies] = useState([]);
  const [outreach, setOutreach] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [compRes, outRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/sheets?tab=companies`),
        fetch(`${API_BASE}/sheets?tab=outreach`),
        fetch(`${API_BASE}/sheets?tab=summary`),
      ]);

      if (compRes.ok) {
        const data = await compRes.json();
        setCompanies(data.rows || data.data || []);
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
      await fetch(`${API_BASE}/sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return { companies, outreach, summary, loading, error, refresh: fetchData, updateStage };
}
