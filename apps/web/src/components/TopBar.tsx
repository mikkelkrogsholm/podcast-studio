"use client";
import { PlugZap, Settings as SettingsIcon, Circle, Pause, Square, History, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Tooltip } from '../ui/Tooltip';

interface TopBarProps {
  status: string;
  isRecording: boolean;
  paused: boolean;
  isAiSpeaking?: boolean;
  onRecord: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onInterrupt?: () => void;
  onToggleSettings: () => void;
  onToggleSessions: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  volumeLevels: { human: number; ai: number };
  muteState: { human: boolean; ai: boolean };
  onMuteToggle: (track: 'human' | 'ai', muted: boolean) => void;
}

export function TopBar(props: TopBarProps) {
  const { t, language, setLanguage } = useLanguage();
  const { status, isRecording, paused, isAiSpeaking = false } = props;

  const connColor =
    status === 'connected' ? 'text-green-600' : status === 'connecting' ? 'text-yellow-600' : status === 'error' ? 'text-red-600' : 'text-ink-muted';

  const MiniLevel = ({ level, muted, label, onToggle }: { level: number; muted: boolean; label: string; onToggle: () => void }) => {
    const segments = 8;
    const active = Math.ceil((level / 100) * segments);
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-muted min-w-[56px]">{label}</span>
        <div className="flex items-end gap-[2px] h-4">
          {Array.from({ length: segments }, (_, i) => {
            const isActive = !muted && i < active;
            const height = `${((i + 1) / segments) * 100}%`;
            const bg = isActive ? (i < segments * 0.6 ? 'bg-green-500' : i < segments * 0.8 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-[rgba(0,0,0,0.12)]';
            return <div key={i} className={`w-[6px] ${bg} rounded-sm`} style={{ height }} />;
          })}
        </div>
        <Tooltip label={muted ? t.tooltips.unmute : t.tooltips.mute}>
          <button onClick={onToggle} className={`text-xs px-2 py-1 rounded-full ${muted ? 'bg-red-500 text-white' : 'bg-elevated text-ink hover:bg-elevated/90'} transition-ui`}>
            {muted ? t.ui.on : t.ui.mute}
          </button>
        </Tooltip>
      </div>
    );
  };

  return (
    <div className="card p-3 flex items-center justify-between">
      {/* Left: Recording controls */}
      <div className="flex items-center gap-2">
        <Tooltip label={t.tooltips.record}>
        <button
          className={`p-2 rounded-full transition-ui ${isRecording ? 'bg-elevated opacity-60 cursor-not-allowed' : 'bg-elevated hover:bg-elevated/90'}`}
          onClick={!isRecording ? props.onRecord : undefined}
          aria-label={t.toolbar.record}
          disabled={isRecording}
        >
          <Circle className="w-5 h-5 text-red-600" />
        </button>
        </Tooltip>
        <Tooltip label={paused ? t.tooltips.resume : t.tooltips.pause}>
        <button
          className={`p-2 rounded-full transition-ui ${!isRecording ? 'opacity-60 cursor-not-allowed' : 'bg-elevated hover:bg-elevated/90'}`}
          onClick={isRecording ? (paused ? props.onResume : props.onPause) : undefined}
          aria-label={paused ? t.toolbar.resume : t.toolbar.pause}
          disabled={!isRecording}
        >
          <Pause className={`w-5 h-5 ${paused ? 'text-ink' : 'text-yellow-600'}`} />
        </button>
        </Tooltip>
        <Tooltip label={t.tooltips.stop}>
        <button
          className={`p-2 rounded-full transition-ui ${!isRecording ? 'opacity-60 cursor-not-allowed' : 'bg-elevated hover:bg-elevated/90'}`}
          onClick={isRecording ? props.onStop : undefined}
          aria-label={t.toolbar.stop}
          disabled={!isRecording}
        >
          <Square className="w-5 h-5 text-ink" />
        </button>
        </Tooltip>

        {/* Interrupt button - only visible when AI is speaking during recording */}
        {isRecording && isAiSpeaking && props.onInterrupt && (
          <Tooltip label={t.tooltips.interrupt}>
            <button
              className="p-2 rounded-full transition-ui bg-red-100 hover:bg-red-200 border border-red-300"
              onClick={props.onInterrupt}
              aria-label={t.toolbar.interrupt}
            >
              <X className="w-5 h-5 text-red-600" />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Center: Mini audio levels */}
      <div className="hidden md:flex items-center gap-6">
        <MiniLevel
          level={props.volumeLevels.human}
          muted={props.muteState.human}
          label={t.transcript.human}
          onToggle={() => props.onMuteToggle('human', !props.muteState.human)}
        />
        <MiniLevel
          level={props.volumeLevels.ai}
          muted={props.muteState.ai}
          label={t.transcript.ai}
          onToggle={() => props.onMuteToggle('ai', !props.muteState.ai)}
        />
      </div>

      {/* Right: Icons */}
      <div className="flex items-center gap-2">
        {/* Language selector */}
        <div className="flex gap-1 bg-elevated rounded-full p-1">
          <button
            onClick={() => setLanguage('da')}
            className={`px-3 py-1 rounded-full text-sm transition-ui ${
              language === 'da' ? 'bg-[var(--accent)] text-white' : 'text-ink hover:bg-elevated/50'
            }`}
            aria-label="Dansk"
          >
            DA
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-full text-sm transition-ui ${
              language === 'en' ? 'bg-[var(--accent)] text-white' : 'text-ink hover:bg-elevated/50'
            }`}
            aria-label="English"
          >
            EN
          </button>
        </div>

        <Tooltip label={t.tooltips.sessions}>
          <button className="p-2 rounded-full bg-elevated hover:bg-elevated/90 transition-ui" onClick={props.onToggleSessions} aria-label={t.toolbar.sessions}>
            <History className="w-5 h-5 text-ink" />
          </button>
        </Tooltip>
        <Tooltip label={`${t.tooltips.connection}: ${status === 'connected' ? t.tooltips.connectionConnected : t.tooltips.connectionDisconnected}`}>
          <button
            className={`p-2 rounded-full bg-elevated hover:bg-elevated/90 transition-ui ${connColor}`}
            onClick={status === 'connected' ? props.onDisconnect : props.onConnect}
            aria-label={t.toolbar.connection}
          >
            <PlugZap className={`w-5 h-5 ${connColor}`} />
          </button>
        </Tooltip>
        <Tooltip label={t.tooltips.settings}>
          <button className="p-2 rounded-full bg-elevated hover:bg-elevated/90 transition-ui" onClick={props.onToggleSettings} aria-label={t.toolbar.settings}>
            <SettingsIcon className="w-5 h-5 text-ink" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
