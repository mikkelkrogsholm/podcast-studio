import { useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface TranscriptMessage {
  id?: string;
  speaker: 'human' | 'ai';
  text: string;
  ts_ms: number;
  raw_json?: Record<string, any>;
  createdAt?: number;
}

interface TranscriptProps {
  messages: TranscriptMessage[];
}

export function Transcript({ messages }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTimestamp = (ts_ms: number) => {
    const date = new Date(ts_ms);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getSpeakerDisplayName = (speaker: 'human' | 'ai') => {
    return speaker === 'human' ? t.transcript.human : t.transcript.ai;
  };

  return (
    <div data-testid="transcript-panel" className="h-96">
      <div className="p-4 border-b border-ui bg-elevated rounded-t-xl">
        <h3 className="text-lg font-semibold text-ink">{t.transcript.title}</h3>
      </div>
      <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-ink-muted mt-8">
            <p>{t.transcript.willAppearHere}</p>
            <p className="text-sm mt-2">{t.transcript.startSpeaking}</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id || `${message.speaker}-${message.ts_ms}-${index}`}
              data-testid="transcript-message"
              data-speaker={message.speaker}
              data-timestamp={message.ts_ms}
              className={`flex flex-col space-y-1 p-3 rounded-xl ${
                message.speaker === 'human' 
                  ? 'bg-white/90 border-l-4 border-[var(--accent)]' 
                  : 'bg-elevated border-l-4 border-green-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span 
                  data-testid="speaker-label"
                  className={`speaker-label font-medium text-sm ${
                    message.speaker === 'human' ? 'text-ink' : 'text-green-700'
                  }`}
                >
                  {getSpeakerDisplayName(message.speaker)}
                </span>
                <span 
                  data-testid="message-timestamp"
                  className="timestamp text-xs text-ink-muted"
                >
                  {formatTimestamp(message.ts_ms)}
                </span>
              </div>
              <div className="text-ink leading-relaxed">
                {message.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
