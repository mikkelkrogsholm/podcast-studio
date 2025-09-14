import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBlock } from './MessageBlock';
import { useLanguage } from '../contexts/LanguageContext';

// Mock the useLanguage hook
vi.mock('../contexts/LanguageContext', async () => {
  const actual = await vi.importActual('../contexts/LanguageContext');
  return {
    ...actual,
    useLanguage: vi.fn(() => ({
      language: 'en' as const,
      setLanguage: vi.fn(),
      t: {
        transcript: {
          title: 'Transcript',
          human: 'Human',
          ai: 'AI',
          willAppearHere: 'Transcript will appear here during recording...',
          startSpeaking: 'Start speaking to see live transcription'
        }
      }
    })),
    LanguageProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  };
});

interface TranscriptMessage {
  id?: string;
  speaker: 'human' | 'ai';
  text: string;
  ts_ms: number;
  raw_json?: Record<string, any>;
  createdAt?: number;
}

const createMessage = (
  speaker: 'human' | 'ai',
  text: string,
  ts_ms: number = Date.now(),
  id?: string
): TranscriptMessage => ({
  id: id || `${speaker}-${ts_ms}-${Math.random()}`,
  speaker,
  text,
  ts_ms,
  raw_json: {}
});

describe('MessageBlock Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering (Expected to Fail)', () => {
    it('should render a message block with correct speaker', () => {
      const messages = [
        createMessage('human', 'Hello there', 1000)
      ];

      render(<MessageBlock messages={messages} speaker="human" />);

      const block = screen.getByTestId('message-block');
      expect(block).toBeInTheDocument();
      expect(block).toHaveAttribute('data-speaker', 'human');
    });

    it('should display speaker label only once per block', () => {
      const messages = [
        createMessage('human', 'Message one', 1000),
        createMessage('human', 'Message two', 2000),
        createMessage('human', 'Message three', 3000)
      ];

      render(<MessageBlock messages={messages} speaker="human" />);

      const speakerLabels = screen.queryAllByTestId('speaker-label');
      expect(speakerLabels).toHaveLength(1);
      expect(speakerLabels[0]).toHaveTextContent('Human');
    });

    it('should render all messages within the block', () => {
      const messages = [
        createMessage('human', 'First message', 1000),
        createMessage('human', 'Second message', 2000),
        createMessage('human', 'Third message', 3000)
      ];

      render(<MessageBlock messages={messages} speaker="human" />);

      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
      expect(screen.getByText('Third message')).toBeInTheDocument();
    });
  });

  describe('Timestamp Display', () => {
    it('should show timestamp of the latest message in the block', () => {
      const messages = [
        createMessage('human', 'First message', 1000), // 1 second
        createMessage('human', 'Second message', 2000), // 2 seconds
        createMessage('human', 'Latest message', 5000) // 5 seconds
      ];

      render(<MessageBlock messages={messages} speaker="human" />);

      const timestamp = screen.getByTestId('block-timestamp');
      expect(timestamp).toBeInTheDocument();

      // Should format the latest timestamp (5000ms = 5 seconds)
      // Format depends on implementation but should be readable time
      expect(timestamp).toHaveTextContent(/00:05|0:05/); // Various time formats
    });

    it('should format timestamp correctly', () => {
      const testTime = new Date('2024-09-14T14:30:45.123Z').getTime();
      const messages = [createMessage('human', 'Test message', testTime)];

      render(<MessageBlock messages={messages} speaker="human" />);

      const timestamp = screen.getByTestId('block-timestamp');
      expect(timestamp).toBeInTheDocument();

      // Should show HH:MM:SS format
      expect(timestamp.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Speaker Styling', () => {
    it('should apply human-specific styling for human messages', () => {
      const messages = [createMessage('human', 'Human message', 1000)];

      render(<MessageBlock messages={messages} speaker="human" />);

      const block = screen.getByTestId('message-block');
      expect(block).toHaveClass('human-message-block');

      const speakerLabel = screen.getByTestId('speaker-label');
      expect(speakerLabel).toHaveClass('human-speaker-label');
    });

    it('should apply ai-specific styling for ai messages', () => {
      const messages = [createMessage('ai', 'AI message', 1000)];

      render(<MessageBlock messages={messages} speaker="ai" />);

      const block = screen.getByTestId('message-block');
      expect(block).toHaveClass('ai-message-block');

      const speakerLabel = screen.getByTestId('speaker-label');
      expect(speakerLabel).toHaveClass('ai-speaker-label');
    });

    it('should have visual distinction between human and ai blocks', () => {
      const humanMessages = [createMessage('human', 'Human message', 1000)];
      const aiMessages = [createMessage('ai', 'AI message', 1000)];

      const { rerender } = render(<MessageBlock messages={humanMessages} speaker="human" />);
      const humanBlock = screen.getByTestId('message-block');
      const humanClasses = humanBlock.className;

      rerender(<MessageBlock messages={aiMessages} speaker="ai" />);
      const aiBlock = screen.getByTestId('message-block');
      const aiClasses = aiBlock.className;

      // Classes should be different for visual distinction
      expect(humanClasses).not.toBe(aiClasses);
    });
  });

  describe('Bilingual Support', () => {
    it('should display correct speaker names in English', () => {
      const humanMessages = [createMessage('human', 'Test', 1000)];
      const aiMessages = [createMessage('ai', 'Test', 1000)];

      const { rerender } = render(<MessageBlock messages={humanMessages} speaker="human" />);
      expect(screen.getByText('Human')).toBeInTheDocument();

      rerender(<MessageBlock messages={aiMessages} speaker="ai" />);
      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    it('should display correct speaker names in Danish', () => {
      // Override the mock for this specific test
      vi.mocked(useLanguage).mockReturnValueOnce({
        language: 'da' as const,
        setLanguage: vi.fn(),
        t: {
          transcript: {
            title: 'Transkription',
            human: 'Menneske',
            ai: 'AI',
            willAppearHere: 'Transkription vil blive vist her under optagelse...',
            startSpeaking: 'Begynd at tale for at se live transkription'
          }
        }
      });

      const humanMessages = [createMessage('human', 'Test', 1000)];
      render(<MessageBlock messages={humanMessages} speaker="human" />);

      expect(screen.getByText('Menneske')).toBeInTheDocument();
    });
  });

  describe('Message Rendering', () => {
    it('should render each message text within the block', () => {
      const messages = [
        createMessage('human', 'First message text', 1000),
        createMessage('human', 'Second message text', 2000)
      ];

      render(<MessageBlock messages={messages} speaker="human" />);

      const messageElements = screen.queryAllByTestId('block-message');
      expect(messageElements).toHaveLength(2);

      expect(messageElements[0]).toHaveTextContent('First message text');
      expect(messageElements[1]).toHaveTextContent('Second message text');
    });

    it('should preserve message order within the block', () => {
      const messages = [
        createMessage('human', 'Message A', 1000),
        createMessage('human', 'Message B', 2000),
        createMessage('human', 'Message C', 3000)
      ];

      render(<MessageBlock messages={messages} speaker="human" />);

      const messageElements = screen.queryAllByTestId('block-message');
      expect(messageElements).toHaveLength(3);

      // Messages should appear in the order they were provided
      expect(messageElements[0]).toHaveTextContent('Message A');
      expect(messageElements[1]).toHaveTextContent('Message B');
      expect(messageElements[2]).toHaveTextContent('Message C');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single message correctly', () => {
      const messages = [createMessage('human', 'Single message', 1000)];

      render(<MessageBlock messages={messages} speaker="human" />);

      const block = screen.getByTestId('message-block');
      expect(block).toBeInTheDocument();
      expect(screen.getByText('Single message')).toBeInTheDocument();

      const messageElements = screen.queryAllByTestId('block-message');
      expect(messageElements).toHaveLength(1);
    });

    it('should handle empty messages array gracefully', () => {
      render(<MessageBlock messages={[]} speaker="human" />);

      const block = screen.getByTestId('message-block');
      expect(block).toBeInTheDocument();

      const messageElements = screen.queryAllByTestId('block-message');
      expect(messageElements).toHaveLength(0);
    });

    it('should handle messages without id', () => {
      const messagesWithoutId = [
        { speaker: 'human' as const, text: 'No ID message', ts_ms: 1000, raw_json: {} }
      ];

      render(<MessageBlock messages={messagesWithoutId} speaker="human" />);

      const block = screen.getByTestId('message-block');
      expect(block).toBeInTheDocument();
      expect(screen.getByText('No ID message')).toBeInTheDocument();
    });

    it('should validate speaker prop matches message speakers', () => {
      const messages = [
        createMessage('human', 'Human message', 1000),
        createMessage('ai', 'AI message', 2000) // Wrong speaker for block
      ];

      // This should potentially warn or handle mismatched speakers
      render(<MessageBlock messages={messages} speaker="human" />);

      const block = screen.getByTestId('message-block');
      expect(block).toHaveAttribute('data-speaker', 'human');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const messages = [createMessage('human', 'Test message', 1000)];

      render(<MessageBlock messages={messages} speaker="human" />);

      const block = screen.getByTestId('message-block');
      expect(block).toHaveAttribute('aria-label');
      expect(block.getAttribute('aria-label')).toContain('Human');
    });

    it('should have semantic structure for screen readers', () => {
      const messages = [
        createMessage('human', 'First message', 1000),
        createMessage('human', 'Second message', 2000)
      ];

      render(<MessageBlock messages={messages} speaker="human" />);

      const block = screen.getByTestId('message-block');
      expect(block).toHaveAttribute('role', 'region');

      const speakerLabel = screen.getByTestId('speaker-label');
      expect(speakerLabel).toHaveAttribute('role', 'heading');
    });
  });
});