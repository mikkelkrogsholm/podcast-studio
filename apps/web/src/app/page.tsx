"use client";

import { useRealtimeConnection } from '../hooks/useRealtimeConnection';
import { useDualTrackRecording } from '../hooks/useDualTrackRecording';
import { useSessionRecovery } from '../hooks/useSessionRecovery';
// DualTrackControls now shown in TopBar; import retained not necessary
import { SessionHistory } from '../components/SessionHistory';
import { Transcript } from '../components/Transcript';
import { SettingsForm } from '../components/SettingsForm';
import { CurrentSettings } from '../components/CurrentSettings';
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Settings } from '@podcast-studio/shared';
import { Card } from '../ui/Card';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../ui/Modal';
import { TopBar } from '../components/TopBar';

export default function HomePage() {
  const { status, transcriptMessages, remoteAudioStream, connect, disconnect } = useRealtimeConnection();
  const { isRecording, paused, volumeLevels, muteState, startRecording, stopRecording, pauseRecording, resumeRecording, setMute } = useDualTrackRecording();
  const { getSessionDetails } = useSessionRecovery();

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSettings, setCurrentSettings] = useState<Settings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showSessions, setShowSessions] = useState(true);
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

  const handleConnect = () => {
    if (status === 'disconnected' || status === 'error') connect(currentSettings);
  };
  const handleDisconnect = () => {
    if (status === 'connected') disconnect();
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="mx-auto max-w-7xl mb-6">
        <TopBar
          status={status}
          isRecording={isRecording}
          paused={paused}
          onRecord={handleStartRecording}
          onPause={pauseRecording}
          onResume={resumeRecording}
          onStop={handleStopRecording}
          onToggleSettings={() => setSettingsOpen(true)}
          onToggleSessions={() => setShowSessions((v) => !v)}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          volumeLevels={volumeLevels}
          muteState={muteState}
          onMuteToggle={setMute}
        />
      </div>
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <Sidebar current="home" />
        </div>
        <div className="space-y-6 lg:col-span-2">
          {currentSettings && <CurrentSettings settings={currentSettings} />}        

          <Card header={<h2 className="text-xl font-semibold">{t.transcript.title}</h2>}>
            <Transcript messages={transcriptMessages} />
          </Card>

          {showSessions && (
            <Card header={<h2 className="text-xl font-semibold">{t.sessionRecovery.sessionHistory}</h2>}>
              <SessionHistory onResumeSession={handleResumeSession} currentSessionId={currentSessionId || undefined} />
            </Card>
          )}
        </div>
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t.settings.title}>
        <SettingsForm onSettingsChange={setCurrentSettings} disabled={isRecording} />
      </Modal>
    </div>
  );
}
