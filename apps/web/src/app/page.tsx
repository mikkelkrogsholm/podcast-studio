'use client';

import { useRealtimeConnection } from '../hooks/useRealtimeConnection';
import { useDualTrackRecording } from '../hooks/useDualTrackRecording';
import { useSessionRecovery } from '../hooks/useSessionRecovery';
import { DualTrackControls } from '../components/DualTrackControls';
import { SessionHistory } from '../components/SessionHistory';
import { Transcript } from '../components/Transcript';
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function HomePage() {
  const { status, events, transcriptMessages, remoteAudioStream, connect, disconnect } = useRealtimeConnection();
  const { 
    status: recordingStatus, 
    isRecording, 
    error: recordingError, 
    recordedDuration,
    volumeLevels,
    muteState,
    startRecording, 
    stopRecording,
    setMute
  } = useDualTrackRecording();
  
  const { hasIncompleteSessions, getSessionDetails } = useSessionRecovery();
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showRecoveryNotification, setShowRecoveryNotification] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  // Check for incomplete sessions on load
  useEffect(() => {
    if (hasIncompleteSessions && !isRecording) {
      setShowRecoveryNotification(true);
    }
  }, [hasIncompleteSessions, isRecording]);

  const handleStartRecording = async () => {
    if (isRecording) {
      return;
    }

    // Connect to OpenAI first if not connected
    if (status !== 'connected') {
      alert(t.alerts.pleaseConnectFirst);
      return;
    }

    try {
      // Create a new session
      const response = await fetch('http://localhost:4201/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Recording ${new Date().toLocaleString()}`
        })
      });

      if (!response.ok) {
        throw new Error(t.audioRecording.failedToCreate);
      }

      const { sessionId } = await response.json();
      setCurrentSessionId(sessionId);
      await startRecording(sessionId, remoteAudioStream);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    await stopRecording();
    setCurrentSessionId(null);
  };

  const handleResumeSession = async (sessionId: string) => {
    if (isRecording) {
      alert(t.alerts.stopCurrentRecording);
      return;
    }

    // Connect to OpenAI first if not connected
    if (status !== 'connected') {
      alert(t.alerts.pleaseConnectFirst);
      return;
    }

    try {
      // Get session details to verify it exists and get audio info
      const sessionDetails = await getSessionDetails(sessionId);
      if (!sessionDetails) {
        alert(t.alerts.failedToLoadSession);
        return;
      }

      setCurrentSessionId(sessionId);
      setShowRecoveryNotification(false);
      
      // Start recording with the existing session ID
      await startRecording(sessionId, remoteAudioStream);
    } catch (error) {
      console.error('Failed to resume session:', error);
      alert(t.alerts.failedToResumeSession);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConnect = () => {
    if (status === 'disconnected' || status === 'error') {
      connect();
    }
  };

  const handleDisconnect = () => {
    if (status === 'connected') {
      disconnect();
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'connecting':
        return t.openaiConnection.connecting;
      case 'connected':
        return t.openaiConnection.connected;
      case 'error':
        return t.openaiConnection.connect;
      default:
        return t.openaiConnection.connect;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connecting':
        return t.openaiConnection.connecting;
      case 'connected':
        return t.openaiConnection.connected;
      case 'disconnected':
        return t.openaiConnection.disconnected;
      case 'recording':
        return t.audioRecording.recording;
      case 'idle':
        return t.audioRecording.idle;
      case 'error':
        return t.audioRecording.error;
      case 'requesting-permission':
        return t.audioRecording.requestingPermission;
      default:
        return status;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage('da')}
            className={`px-3 py-1 rounded ${
              language === 'da' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {t.language.danish}
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded ${
              language === 'en' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {t.language.english}
          </button>
        </div>
      </div>

      {/* Recovery Notification */}
      {showRecoveryNotification && hasIncompleteSessions && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-yellow-800">⚠️ {t.sessionRecovery.incompleteSessions}</h3>
              <p className="text-sm text-yellow-700">
                {t.sessionRecovery.recoveryMessage}
              </p>
            </div>
            <button
              onClick={() => setShowRecoveryNotification(false)}
              className="text-yellow-600 hover:text-yellow-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Recording Section */}
      <div className="mb-8 p-6 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">{t.audioRecording.title}</h2>
        
        <div className="flex items-center space-x-4 mb-4">
          <button 
            onClick={handleStartRecording}
            disabled={isRecording || recordingStatus === 'requesting-permission'}
            className={`
              px-6 py-3 rounded-lg font-medium transition-colors
              ${isRecording 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : recordingStatus === 'requesting-permission'
                ? 'bg-yellow-500 text-white cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white'
              }
            `}
          >
            {recordingStatus === 'requesting-permission' 
              ? t.audioRecording.requestingPermission 
              : t.audioRecording.startRecording}
          </button>
          
          <button 
            onClick={handleStopRecording}
            disabled={!isRecording}
            className={`
              px-6 py-3 rounded-lg font-medium transition-colors
              ${!isRecording 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
              }
            `}
          >
            {t.audioRecording.stopRecording}
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">{t.audioRecording.status}:</span>
            <span className={`
              capitalize font-medium text-sm
              ${recordingStatus === 'recording' ? 'text-red-600' : ''}
              ${recordingStatus === 'requesting-permission' ? 'text-yellow-600' : ''}
              ${recordingStatus === 'error' ? 'text-red-600' : ''}
              ${recordingStatus === 'idle' ? 'text-gray-600' : ''}
            `}>
              {recordingStatus === 'recording' 
                ? `${t.audioRecording.recording} (${formatTime(recordedDuration)})` 
                : getStatusText(recordingStatus)}
            </span>
          </div>
          
          {currentSessionId && (
            <div className="text-sm text-gray-600">
              {t.audioRecording.sessionId}: {currentSessionId}
            </div>
          )}
          
          {recordingError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {t.audioRecording.error}: {recordingError}
            </div>
          )}
        </div>
      </div>
      
      {/* Dual Track Audio Controls */}
      <div className="mb-8 p-6 border rounded-lg bg-gray-50">
        <DualTrackControls
          volumeLevels={volumeLevels}
          muteState={muteState}
          isRecording={isRecording}
          onMuteToggle={setMute}
        />
      </div>
      
      {/* Live Transcript */}
      <div className="mb-8 p-6 border rounded-lg bg-gray-50">
        <Transcript messages={transcriptMessages} />
      </div>
      
      {/* Connection Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">{t.openaiConnection.title}</h2>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleConnect}
            disabled={status === 'connecting' || status === 'connected'}
            className={`
              px-6 py-3 rounded-lg font-medium transition-colors
              ${status === 'connected' 
                ? 'bg-green-500 text-white cursor-not-allowed' 
                : status === 'connecting'
                ? 'bg-yellow-500 text-white cursor-not-allowed'
                : status === 'error'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
              ${(status === 'connecting' || status === 'connected') ? 'opacity-75' : ''}
            `}
          >
            {getButtonText()}
          </button>
          
          {status === 'connected' && (
            <button 
              onClick={handleDisconnect}
              className="px-6 py-3 rounded-lg font-medium transition-colors bg-red-500 hover:bg-red-600 text-white"
            >
              {t.openaiConnection.disconnect}
            </button>
          )}
        </div>
        
        <div className="mt-4">
          <span className="text-sm font-medium">{t.openaiConnection.status}: </span>
          <span className={`
            capitalize font-medium
            ${status === 'connected' ? 'text-green-600' : ''}
            ${status === 'connecting' ? 'text-yellow-600' : ''}
            ${status === 'error' ? 'text-red-600' : ''}
            ${status === 'disconnected' ? 'text-gray-600' : ''}
          `}>
            {getStatusText(status)}
          </span>
        </div>
      </div>

      {events.length > 0 && (
        <div className="mb-8 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">{t.openaiConnection.connectionEvents}</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event, index) => (
              <div 
                key={index} 
                className="flex justify-between items-start text-sm border-b border-gray-200 pb-2"
              >
                <div className="flex-1">
                  <span className={`
                    font-medium capitalize
                    ${event.status === 'connected' ? 'text-green-600' : ''}
                    ${event.status === 'connecting' ? 'text-yellow-600' : ''}
                    ${event.status === 'error' ? 'text-red-600' : ''}
                    ${event.status === 'disconnected' ? 'text-gray-600' : ''}
                  `}>
                    {getStatusText(event.status)}
                  </span>
                  {event.message && (
                    <span className="ml-2 text-gray-700">
                      - {event.message}
                    </span>
                  )}
                </div>
                <span className="text-gray-500 text-xs ml-4">
                  {event.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session History */}
      <SessionHistory 
        onResumeSession={handleResumeSession}
        currentSessionId={currentSessionId || undefined}
      />
    </div>
  );
}