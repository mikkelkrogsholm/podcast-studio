'use client';

import { useSessionRecovery } from '../hooks/useSessionRecovery';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { downloadMikkelAudio, downloadFrejaAudio, downloadTranscriptJson, downloadTranscriptMarkdown } from '../utils/download';

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
  const [downloadStates, setDownloadStates] = useState<Record<string, string>>({});
  const { t } = useLanguage();

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t.sessionRecovery.statusActive;
      case 'incomplete':
        return t.sessionRecovery.statusIncomplete;
      case 'completed':
        return t.sessionRecovery.statusCompleted;
      default:
        return status;
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

  const handleDownload = async (sessionId: string, type: string, downloadFn: any) => {
    const stateKey = `${sessionId}-${type}`;

    try {
      await downloadFn({
        sessionId,
        onStart: () => setDownloadStates(prev => ({ ...prev, [stateKey]: t.download.downloading })),
        onSuccess: () => setDownloadStates(prev => ({ ...prev, [stateKey]: '' })),
        onError: (error: string) => {
          console.error(`Download failed for ${type}:`, error);
          setDownloadStates(prev => ({ ...prev, [stateKey]: t.download.downloadFailed }));
          setTimeout(() => {
            setDownloadStates(prev => ({ ...prev, [stateKey]: '' }));
          }, 3000);
        }
      });
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto"></div>
          <p className="mt-2 text-ink-muted">{t.sessionRecovery.loadingSessions}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="text-center py-4">
          <p className="text-red-600">{t.sessionRecovery.errorLoadingSessions}: {error}</p>
          <button 
            onClick={fetchSessions}
            className="mt-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white hover:brightness-110"
          >
            {t.sessionRecovery.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={fetchSessions}
          className="px-3 py-1 bg-elevated hover:bg-elevated/90 rounded-xl text-sm"
        >
          {t.sessionRecovery.refresh}
        </button>
      </div>

      {/* Incomplete Sessions Alert */}
      {hasIncompleteSessions && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <h3 className="font-medium text-yellow-800 mb-2">
            ⚠️ {t.sessionRecovery.incompleteSessions} ({incompleteSessions.length})
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            {t.sessionRecovery.recoveryMessage}
          </p>
          <div className="space-y-2">
            {incompleteSessions.map(session => (
              <div key={session.id} className="flex items-center justify-between bg-white p-2 rounded-xl">
                <div>
                  <span className="font-medium">{session.title}</span>
                  <span className="text-xs text-ink-muted ml-2">
                    {formatDate(session.createdAt)}
                  </span>
                </div>
                <div className="flex gap-2">
                  {onResumeSession && (
                    <button
                      onClick={() => handleResumeSession(session.id)}
                      className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded-xl"
                    >
                      {t.sessionRecovery.resume}
                    </button>
                  )}
                  <button
                    onClick={() => handleFinishSession(session.id)}
                    className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-xl"
                  >
                    {t.sessionRecovery.markComplete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Sessions List */}
      {sessions.length === 0 ? (
        <p className="text-gray-600 text-center py-4">{t.sessionRecovery.noSessionsFound}</p>
      ) : (
        <div className="space-y-2">
          {sessions.slice(0, 10).map(session => (
            <div key={session.id} className="border border-ui rounded-xl bg-white">
              <div 
                className="p-4 cursor-pointer hover:bg-elevated/60 rounded-xl"
                onClick={() => handleSessionExpand(session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{session.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {getStatusText(session.status)}
                      </span>
                      {session.id === currentSessionId && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-100">
                          {t.sessionRecovery.current}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-ink-muted mt-1">
                      {t.sessionRecovery.created}: {formatDate(session.createdAt)}
                      {session.completedAt && (
                        <span className="ml-4">{t.sessionRecovery.completed}: {formatDate(session.completedAt)}</span>
                      )}
                      {session.lastHeartbeat && (
                        <span className="ml-4">{t.sessionRecovery.lastActivity}: {formatDate(session.lastHeartbeat)}</span>
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
                <div className="border-t border-ui p-4 bg-elevated rounded-b-xl">
                  {loadingDetails ? (
                    <div className="text-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--accent)] mx-auto"></div>
                    </div>
                  ) : sessionDetails ? (
                    <div>
                      <h4 className="font-medium mb-2">{t.sessionRecovery.audioFiles}:</h4>
                      <div className="space-y-1">
                        {sessionDetails.audioFiles?.map((file: any) => (
                          <div key={file.id} className="flex justify-between items-center text-sm">
                            <span className="capitalize font-medium">{file.speaker}:</span>
                            <span>{formatFileSize(file.size)} ({file.format})</span>
                          </div>
                        ))}
                      </div>

                      {/* Download Section for Completed Sessions */}
                      {session.status === 'completed' && sessionDetails.audioFiles && sessionDetails.audioFiles.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-medium mb-3">{t.download.title}:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Audio Downloads */}
                            {sessionDetails.audioFiles?.find((f: any) => f.speaker === 'mikkel' && f.size > 0) && (
                              <button
                                onClick={() => handleDownload(session.id, 'mikkel', downloadMikkelAudio)}
                                disabled={downloadStates[`${session.id}-mikkel`] === t.download.downloading}
                                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm rounded flex items-center justify-center"
                              >
                                {downloadStates[`${session.id}-mikkel`] || t.download.downloadMikkelAudio}
                              </button>
                            )}

                            {sessionDetails.audioFiles?.find((f: any) => f.speaker === 'freja' && f.size > 0) && (
                              <button
                                onClick={() => handleDownload(session.id, 'freja', downloadFrejaAudio)}
                                disabled={downloadStates[`${session.id}-freja`] === t.download.downloading}
                                className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm rounded flex items-center justify-center"
                              >
                                {downloadStates[`${session.id}-freja`] || t.download.downloadFrejaAudio}
                              </button>
                            )}

                            {/* Transcript Downloads */}
                            <button
                              onClick={() => handleDownload(session.id, 'json', downloadTranscriptJson)}
                              disabled={downloadStates[`${session.id}-json`] === t.download.downloading}
                              className="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white text-sm rounded flex items-center justify-center"
                            >
                              {downloadStates[`${session.id}-json`] || t.download.downloadTranscriptJson}
                            </button>

                            <button
                              onClick={() => handleDownload(session.id, 'markdown', downloadTranscriptMarkdown)}
                              disabled={downloadStates[`${session.id}-markdown`] === t.download.downloading}
                              className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm rounded flex items-center justify-center"
                            >
                              {downloadStates[`${session.id}-markdown`] || t.download.downloadTranscriptMarkdown}
                            </button>
                          </div>

                          {/* Error Messages */}
                          {Object.entries(downloadStates).some(([key, state]) => key.startsWith(session.id) && state === t.download.downloadFailed) && (
                            <p className="text-red-600 text-sm mt-2">{t.download.downloadFailed}</p>
                          )}

                          {/* No audio files message */}
                          {(!sessionDetails.audioFiles || sessionDetails.audioFiles.length === 0 || sessionDetails.audioFiles.every((f: any) => f.size === 0)) && (
                            <p className="text-gray-500 text-sm">{t.download.noAudioFiles}</p>
                          )}
                        </div>
                      )}

                      {session.status === 'incomplete' && onResumeSession && (
                        <div className="mt-3 pt-3 border-t border-ui">
                          <button
                            onClick={() => handleResumeSession(session.id)}
                            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded-xl mr-2"
                          >
                            {t.sessionRecovery.resumeRecording}
                          </button>
                          <button
                            onClick={() => handleFinishSession(session.id)}
                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-xl"
                          >
                            {t.sessionRecovery.markAsComplete}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-600 text-sm">{t.sessionRecovery.failedToLoadDetails}</p>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {sessions.length > 10 && (
            <p className="text-center text-ink-muted text-sm mt-4">
              {t.sessionRecovery.showingLatest.replace('{total}', sessions.length.toString())}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
