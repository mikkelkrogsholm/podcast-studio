'use client';

import { useSessionRecovery } from '../hooks/useSessionRecovery';
import { useState } from 'react';

interface SessionHistoryProps {
  onResumeSession?: (sessionId: string) => void;
  currentSessionId?: string | undefined;
}

export function SessionHistory({ onResumeSession, currentSessionId }: SessionHistoryProps) {
  const { 
    sessions, 
    incompleteSessions, 
    isLoading, 
    error, 
    hasIncompleteSessions,
    fetchSessions,
    getSessionDetails,
    finishSession 
  } = useSessionRecovery();
  
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'incomplete':
        return 'text-yellow-600 bg-yellow-50';
      case 'completed':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const handleSessionExpand = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      setSessionDetails(null);
      return;
    }

    setExpandedSession(sessionId);
    setLoadingDetails(true);
    
    try {
      const details = await getSessionDetails(sessionId);
      setSessionDetails(details);
    } catch (err) {
      console.error('Failed to load session details:', err);
      setSessionDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleResumeSession = (sessionId: string) => {
    if (onResumeSession) {
      onResumeSession(sessionId);
    }
  };

  const handleFinishSession = async (sessionId: string) => {
    try {
      await finishSession(sessionId);
      // Refresh the sessions list
      await fetchSessions();
    } catch (err) {
      console.error('Failed to finish session:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Session History</h2>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Session History</h2>
        <div className="text-center py-4">
          <p className="text-red-600">Error loading sessions: {error}</p>
          <button 
            onClick={fetchSessions}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Session History</h2>
        <button 
          onClick={fetchSessions}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Incomplete Sessions Alert */}
      {hasIncompleteSessions && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">
            ⚠️ Incomplete Sessions Found ({incompleteSessions.length})
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            These sessions were interrupted and may contain recoverable audio data.
          </p>
          <div className="space-y-2">
            {incompleteSessions.map(session => (
              <div key={session.id} className="flex items-center justify-between bg-white p-2 rounded">
                <div>
                  <span className="font-medium">{session.title}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {formatDate(session.createdAt)}
                  </span>
                </div>
                <div className="flex gap-2">
                  {onResumeSession && (
                    <button
                      onClick={() => handleResumeSession(session.id)}
                      className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded"
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={() => handleFinishSession(session.id)}
                    className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded"
                  >
                    Mark Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Sessions List */}
      {sessions.length === 0 ? (
        <p className="text-gray-600 text-center py-4">No sessions found.</p>
      ) : (
        <div className="space-y-2">
          {sessions.slice(0, 10).map(session => (
            <div key={session.id} className="border border-gray-200 rounded-lg bg-white">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSessionExpand(session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{session.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                      {session.id === currentSessionId && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-100">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Created: {formatDate(session.createdAt)}
                      {session.completedAt && (
                        <span className="ml-4">Completed: {formatDate(session.completedAt)}</span>
                      )}
                      {session.lastHeartbeat && (
                        <span className="ml-4">Last activity: {formatDate(session.lastHeartbeat)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {expandedSession === session.id ? '▼' : '▶'}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedSession === session.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  {loadingDetails ? (
                    <div className="text-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto"></div>
                    </div>
                  ) : sessionDetails ? (
                    <div>
                      <h4 className="font-medium mb-2">Audio Files:</h4>
                      <div className="space-y-1">
                        {sessionDetails.audioFiles?.map((file: any) => (
                          <div key={file.id} className="flex justify-between items-center text-sm">
                            <span className="capitalize font-medium">{file.speaker}:</span>
                            <span>{formatFileSize(file.size)} ({file.format})</span>
                          </div>
                        ))}
                      </div>
                      
                      {session.status === 'incomplete' && onResumeSession && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleResumeSession(session.id)}
                            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded mr-2"
                          >
                            Resume Recording
                          </button>
                          <button
                            onClick={() => handleFinishSession(session.id)}
                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded"
                          >
                            Mark as Complete
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-600 text-sm">Failed to load session details.</p>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {sessions.length > 10 && (
            <p className="text-center text-gray-500 text-sm mt-4">
              Showing latest 10 sessions of {sessions.length} total
            </p>
          )}
        </div>
      )}
    </div>
  );
}