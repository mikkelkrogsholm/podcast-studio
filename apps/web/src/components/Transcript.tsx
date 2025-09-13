import { useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface TranscriptMessage {
  id?: string;
  speaker: 'mikkel' | 'freja';
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

  const getSpeakerDisplayName = (speaker: 'mikkel' | 'freja') => {
    return speaker === 'mikkel' ? t.transcript.mikkel : t.transcript.freja;
  };

  return (
    <div 
      data-testid="transcript-panel"
      className="h-96 border rounded-lg bg-white shadow-sm"
    >
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">{t.transcript.title}</h3>
      </div>
      
      <div 
        ref={scrollRef}
        className="h-80 overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
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
              className={`flex flex-col space-y-1 p-3 rounded-lg ${
                message.speaker === 'mikkel' 
                  ? 'bg-blue-50 border-l-4 border-blue-400' 
                  : 'bg-green-50 border-l-4 border-green-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span 
                  data-testid="speaker-label"
                  className={`speaker-label font-medium text-sm ${
                    message.speaker === 'mikkel' ? 'text-blue-700' : 'text-green-700'
                  }`}
                >
                  {getSpeakerDisplayName(message.speaker)}
                </span>
                <span 
                  data-testid="message-timestamp"
                  className="timestamp text-xs text-gray-500"
                >
                  {formatTimestamp(message.ts_ms)}
                </span>
              </div>
              <div className="text-gray-800 leading-relaxed">
                {message.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}