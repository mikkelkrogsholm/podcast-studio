'use client';

import { useState } from 'react';

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchToken = async () => {
    setLoading(true);
    setError(null);
    setToken(null);

    try {
      const response = await fetch('http://localhost:4201/api/realtime/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Podcast Studio</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={fetchToken}
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#007cba',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Fetching...' : 'Fetch Token'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          border: '1px solid #ef5350',
          borderRadius: '4px',
          marginBottom: '20px',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {token && (
        <div style={{
          padding: '12px',
          backgroundColor: '#e8f5e8',
          color: '#2e7d32',
          border: '1px solid #4caf50',
          borderRadius: '4px',
          wordBreak: 'break-all',
        }}>
          <strong>Token:</strong><br />
          <code style={{ fontSize: '12px' }}>{token}</code>
        </div>
      )}
    </div>
  );
}