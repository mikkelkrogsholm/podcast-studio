import { useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { MessageBlock } from './MessageBlock';

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

  // Group consecutive messages from the same speaker into blocks
  const groupMessages = (messages: TranscriptMessage[]) => {
    if (messages.length === 0) return [];

    const groups: { speaker: 'human' | 'ai'; messages: TranscriptMessage[] }[] = [];
    let currentGroup: { speaker: 'human' | 'ai'; messages: TranscriptMessage[] } | null = null;

    for (const message of messages) {
      if (!currentGroup || currentGroup.speaker !== message.speaker) {
        // Start a new group
        currentGroup = {
          speaker: message.speaker,
          messages: [message]
        };
        groups.push(currentGroup);
      } else {
        // Add to the current group
        currentGroup.messages.push(message);
      }
    }

    return groups;
  };

  const messageGroups = groupMessages(messages);

  return (
    <div data-testid="transcript-panel" className="h-96">
      <div className="p-4 border-b border-ui bg-elevated rounded-t-xl">
        <h3 className="text-lg font-semibold text-ink">{t.transcript.title}</h3>
      </div>
      <div ref={scrollRef} data-testid="scroll-container" className="h-80 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center text-ink-muted mt-8">
            <p>{t.transcript.willAppearHere}</p>
            <p className="text-sm mt-2">{t.transcript.startSpeaking}</p>
          </div>
        ) : (
          messageGroups.map((group, index) => (
            <MessageBlock
              key={`${group.speaker}-${group.messages[0]?.ts_ms || 0}-${index}`}
              messages={group.messages}
              speaker={group.speaker}
            />
          ))
        )}
      </div>
    </div>
  );
}
