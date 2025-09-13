import { useState, useEffect, useCallback } from 'react';

interface Session {
  id: string;
  title: string;
  status: 'active' | 'incomplete' | 'completed';
  lastHeartbeat: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface AudioFile {
  id: string;
  speaker: 'mikkel' | 'freja';
  filePath: string;
  size: number;
  duration?: number;
  format: string;
  createdAt: number;
  updatedAt: number;
}

interface SessionDetails extends Session {
  audioFiles: AudioFile[];
}

interface SessionRecoveryState {
  sessions: Session[];
  incompleteSessions: Session[];
  isLoading: boolean;
  error: string | null;
  hasIncompleteSessions: boolean;
  fetchSessions: () => Promise<void>;
  getSessionDetails: (sessionId: string) => Promise<SessionDetails | null>;
  finishSession: (sessionId: string) => Promise<void>;
}

export function useSessionRecovery(): SessionRecoveryState {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter incomplete sessions
  const incompleteSessions = sessions.filter(session => session.status === 'incomplete');
  const hasIncompleteSessions = incompleteSessions.length > 0;

  // Fetch all sessions from the backend
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:4201/api/sessions');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }
      
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sessions';
      setError(errorMessage);
      console.error('Failed to fetch sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get detailed session information including audio files
  const getSessionDetails = useCallback(async (sessionId: string): Promise<SessionDetails | null> => {
    try {
      const response = await fetch(`http://localhost:4201/api/session/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch session details: ${response.status}`);
      }
      
      const sessionDetails = await response.json();
      return sessionDetails;
    } catch (err) {
      console.error(`Failed to fetch session details for ${sessionId}:`, err);
      return null;
    }
  }, []);

  // Mark a session as finished
  const finishSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`http://localhost:4201/api/session/${sessionId}/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to finish session: ${response.status}`);
      }

      // Update the local sessions state
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === sessionId 
            ? { ...session, status: 'completed' as const, completedAt: Date.now() }
            : session
        )
      );
    } catch (err) {
      console.error(`Failed to finish session ${sessionId}:`, err);
      throw err;
    }
  }, []);

  // Check for incomplete sessions on component mount
  useEffect(() => {
    // Run timeout check first to mark any timed-out sessions as incomplete
    const checkTimeouts = async () => {
      try {
        await fetch('http://localhost:4201/api/session/check-timeouts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timeoutMs: 30000 // 30 seconds timeout
          })
        });
      } catch (err) {
        console.warn('Failed to check session timeouts:', err);
      }
    };

    // Check timeouts then fetch sessions
    checkTimeouts().then(() => {
      fetchSessions();
    });
  }, [fetchSessions]);

  return {
    sessions,
    incompleteSessions,
    isLoading,
    error,
    hasIncompleteSessions,
    fetchSessions,
    getSessionDetails,
    finishSession,
  };
}