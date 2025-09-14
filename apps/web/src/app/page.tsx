"use client";

import { useRealtimeConnection } from '../hooks/useRealtimeConnection';
import { useDualTrackRecording } from '../hooks/useDualTrackRecording';
import { useSessionRecovery } from '../hooks/useSessionRecovery';
import { useSessionResume } from '../hooks/useSessionResume';
// DualTrackControls now shown in TopBar; import retained not necessary
import { SessionHistory } from '../components/SessionHistory';
import { Transcript } from '../components/Transcript';
import { SettingsForm } from '../components/SettingsForm';
import { CurrentSettings } from '../components/CurrentSettings';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { Settings } from '@podcast-studio/shared';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { TopBar } from '../components/TopBar';

export default function HomePage() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const { status, transcriptMessages, isTranscriptLoading, transcriptError, remoteAudioStream, isAiSpeaking, connect, disconnect, interrupt } = useRealtimeConnection(currentSessionId || undefined);
  const { isRecording, paused, volumeLevels, muteState, startRecording, stopRecording, pauseRecording, resumeRecording, setMute } = useDualTrackRecording();
  const { getSessionDetails } = useSessionRecovery();
  const { resumableSessions, hasResumableSessions, isLoading: isResumeLoading, error: resumeError, resumeSession, getResumeContext } = useSessionResume();
  const router = useRouter();
  const [currentSettings, setCurrentSettings] = useState<Settings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showSessions, setShowSessions] = useState(true);
  const [currentSegmentNumber, setCurrentSegmentNumber] = useState<number>(1);
  const { t } = useLanguage();

  useEffect(() => {
    const saved = localStorage.getItem('nordic-ui-show-sessions');
    if (saved === 'false') setShowSessions(false);
  }, []);
  useEffect(() => {
    localStorage.setItem('nordic-ui-show-sessions', showSessions ? 'true' : 'false');
  }, [showSessions]);

  const handleStartRecording = async () => {
    if (isRecording) return;
    if (status !== 'connected') {
      alert(t.alerts.pleaseConnectFirst);
      return;
    }
    if (!currentSettings) {
      setSettingsOpen(true);
      return;
    }
    try {
      const response = await fetch('http://localhost:4201/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Recording ${new Date().toLocaleString()}`, settings: currentSettings })
      });
      if (!response.ok) throw new Error(t.audioRecording.failedToCreate);
      const { sessionId } = await response.json();
      setCurrentSessionId(sessionId);
      setCurrentSegmentNumber(1);
      await startRecording(sessionId, remoteAudioStream);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      // Stop the recording first
      await stopRecording();

      // If we have a session ID, mark it as finished
      if (currentSessionId) {
        const response = await fetch(`http://localhost:4201/api/session/${currentSessionId}/finish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          console.error('Failed to finish session:', response.status);
          // Don't throw error - recording was stopped successfully
        } else {
          console.log('Session marked as completed');
        }
      }

      setCurrentSessionId(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      // Still clear session ID even if there was an error
      setCurrentSessionId(null);
    }
  };

  const handleResumeSession = async (sessionId: string) => {
    if (isRecording) {
      alert(t.alerts.stopCurrentRecording);
      return;
    }
    if (status !== 'connected') {
      alert(t.alerts.pleaseConnectFirst);
      return;
    }
    try {
      const sessionDetails = await getSessionDetails(sessionId);
      if (!sessionDetails) {
        alert(t.alerts.failedToLoadSession);
        return;
      }
      setCurrentSessionId(sessionId);
      await startRecording(sessionId, remoteAudioStream);
    } catch (error) {
      console.error('Failed to resume session:', error);
      alert(t.alerts.failedToResumeSession);
    }
  };

  const handleResumeSessionNew = async (sessionId: string) => {
    if (isRecording) {
      alert(t.alerts.stopCurrentRecording);
      return;
    }
    if (status !== 'connected') {
      alert(t.alerts.pleaseConnectFirst);
      return;
    }

    try {
      // Get conversation context for the session
      const context = await getResumeContext(sessionId);

      // Resume the session
      const resumeResult = await resumeSession(sessionId);
      if (!resumeResult.success) {
        alert(resumeResult.error || t.alerts.failedToResumeSession);
        return;
      }

      // Set up the session state
      setCurrentSessionId(sessionId);
      setCurrentSegmentNumber(resumeResult.segmentNumber || 1);

      // Connect with conversation context if available
      if (context && context.conversationHistory.length > 0) {
        // Reconnect with context
        disconnect(); // Disconnect first
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for disconnect
        await connect(currentSettings, context.conversationHistory);
      }

      // Start recording with the correct segment number
      await startRecording(sessionId, remoteAudioStream);
    } catch (error) {
      console.error('Failed to resume session:', error);
      alert(t.alerts.failedToResumeSession);
    }
  };

  const handleConnect = () => {
    if (status === 'disconnected' || status === 'error') connect(currentSettings);
  };
  const handleDisconnect = () => {
    if (status === 'connected') disconnect();
  };

  const handleInterrupt = () => {
    if (isAiSpeaking && status === 'connected') {
      interrupt();
    }
  };

  const handleNavigateToSessions = () => {
    router.push('/sessions');
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="mx-auto max-w-7xl mb-6">
        <TopBar
          status={status}
          isRecording={isRecording}
          paused={paused}
          isAiSpeaking={isAiSpeaking}
          onRecord={handleStartRecording}
          onPause={pauseRecording}
          onResume={resumeRecording}
          onStop={handleStopRecording}
          onInterrupt={handleInterrupt}
          onToggleSettings={() => setSettingsOpen(true)}
          onToggleSessions={handleNavigateToSessions}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          volumeLevels={volumeLevels}
          muteState={muteState}
          onMuteToggle={setMute}
        />
      </div>
      <div className="mx-auto max-w-7xl space-y-6">
          {currentSettings && <CurrentSettings settings={currentSettings} />}

          {/* Resume Session UI */}
          {hasResumableSessions && !isRecording && (
            <Card header={<h2 className="text-xl font-semibold">{t.sessionRecovery.incompleteSessions}</h2>}>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  {t.sessionRecovery.recoveryMessage}
                </p>

                {isResumeLoading ? (
                  <p className="text-sm text-gray-500">{t.sessionRecovery.loadingSessions}</p>
                ) : resumeError ? (
                  <div className="text-red-600 dark:text-red-400">
                    <p>{t.sessionRecovery.errorLoadingSessions}</p>
                    <p className="text-sm">{resumeError}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resumableSessions.slice(0, 3).map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{session.title}</h4>
                          <p className="text-sm text-gray-500">
                            {t.sessionRecovery.created}: {new Date(session.createdAt).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {t.sessionRecovery.statusIncomplete} • Segment {session.nextSegmentNumber}
                          </p>
                        </div>
                        <button
                          onClick={() => handleResumeSessionNew(session.id)}
                          disabled={status !== 'connected'}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {t.sessionRecovery.resumeRecording}
                        </button>
                      </div>
                    ))}

                    {resumableSessions.length > 3 && (
                      <p className="text-sm text-gray-500 text-center">
                        {t.sessionRecovery.showingLatest.replace('{total}', resumableSessions.length.toString())}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card header={
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t.transcript.title}</h2>
              {isRecording && currentSegmentNumber > 1 && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md">
                  Segment {currentSegmentNumber}
                </span>
              )}
            </div>
          }>
            <Transcript
              messages={transcriptMessages}
              isLoading={isTranscriptLoading}
              error={transcriptError}
            />
          </Card>

          {showSessions && (
            <Card header={<h2 className="text-xl font-semibold">{t.sessionRecovery.sessionHistory}</h2>}>
              <SessionHistory onResumeSession={handleResumeSession} currentSessionId={currentSessionId || undefined} />
            </Card>
          )}
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t.settings.title}>
        <SettingsForm
          key={settingsOpen ? 'open' : 'closed'}
          onSettingsChange={setCurrentSettings}
          disabled={isRecording}
        />
      </Modal>
    </div>
  );
}
