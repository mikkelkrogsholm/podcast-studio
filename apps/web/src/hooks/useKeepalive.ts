import { useCallback, useRef, useEffect } from 'react';

interface KeepaliveState {
  startKeepalive: (sessionId: string) => void;
  stopKeepalive: () => void;
  isActive: boolean;
}

export function useKeepalive(): KeepaliveState {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isActiveRef = useRef(false);

  // Send heartbeat to the backend
  const sendHeartbeat = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`http://localhost:4201/api/session/${sessionId}/keepalive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        console.error(`Keepalive failed for session ${sessionId}: ${response.status}`);
        // Don't throw error to avoid stopping the keepalive loop
      }
    } catch (error) {
      console.error('Network error during keepalive:', error);
      // Network errors are expected during connectivity issues, don't crash
    }
  }, []);

  // Start sending keepalive heartbeats every 7 seconds
  const startKeepalive = useCallback((sessionId: string) => {
    // Stop any existing keepalive first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    sessionIdRef.current = sessionId;
    isActiveRef.current = true;

    // Send initial heartbeat immediately
    sendHeartbeat(sessionId);

    // Then send every 7 seconds (within the 30-second timeout window)
    intervalRef.current = setInterval(() => {
      if (sessionIdRef.current) {
        sendHeartbeat(sessionIdRef.current);
      }
    }, 7000);
  }, [sendHeartbeat]);

  // Stop keepalive heartbeats
  const stopKeepalive = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    sessionIdRef.current = null;
    isActiveRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    startKeepalive,
    stopKeepalive,
    isActive: isActiveRef.current,
  };
}