import { useLanguage } from '../contexts/LanguageContext';

interface TranscriptMessage {
  id?: string;
  speaker: 'human' | 'ai';
  text: string;
  ts_ms: number;
  raw_json?: Record<string, any>;
  createdAt?: number;
}

interface MessageBlockProps {
  messages: TranscriptMessage[];
  speaker: 'human' | 'ai';
}

export function MessageBlock({ messages, speaker }: MessageBlockProps) {
  const { t } = useLanguage();

  // Find the latest timestamp in the block
  const latestTimestamp = messages.length > 0
    ? Math.max(...messages.map(msg => msg.ts_ms))
    : 0;

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

  const speakerName = getSpeakerDisplayName(speaker);

  return (
    <div
      data-testid="message-block"
      data-speaker={speaker}
      data-message-count={messages.length}
      data-latest-timestamp={latestTimestamp}
      role="region"
      aria-label={`${speakerName} message block`}
      className={`message-block ${
        speaker === 'human' ? 'human-message-block' : 'ai-message-block'
      } ${
        speaker === 'human'
          ? 'flex flex-col items-start mb-4'
          : 'flex flex-col items-end mb-4'
      }`}
    >
      {/* Speaker header with name and timestamp */}
      <div className={`flex items-center gap-2 mb-2 ${
        speaker === 'human' ? 'flex-row' : 'flex-row-reverse'
      }`}>
        <span
          data-testid="speaker-label"
          role="heading"
          className={`speaker-label font-medium text-sm ${
            speaker === 'human'
              ? 'human-speaker-label text-blue-600'
              : 'ai-speaker-label text-green-600'
          }`}
        >
          {speakerName}
        </span>
        <span
          data-testid="block-timestamp"
          className="text-xs text-ink-muted"
        >
          {formatTimestamp(latestTimestamp)}
        </span>
      </div>

      {/* Messages container */}
      <div className={`max-w-[70%] space-y-1 ${
        speaker === 'human'
          ? 'bg-white/90 border-l-4 border-blue-500 rounded-r-xl rounded-tl-xl'
          : 'bg-elevated border-r-4 border-green-500 rounded-l-xl rounded-tr-xl'
      } p-3`}>
        {messages.map((message, index) => (
          <div
            key={message.id || `${speaker}-${message.ts_ms}-${index}`}
            data-testid="block-message"
            className="text-ink leading-relaxed"
          >
            {message.text}
          </div>
        ))}
      </div>
    </div>
  );
}