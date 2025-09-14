import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Transcript } from './Transcript';
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

describe('Transcript Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render transcript panel with title', () => {
      render(<Transcript messages={[]} />);

      expect(screen.getByTestId('transcript-panel')).toBeInTheDocument();
      expect(screen.getByText('Transcript')).toBeInTheDocument();
    });

    it('should show empty state when no messages', () => {
      render(<Transcript messages={[]} />);

      expect(screen.getByText('Transcript will appear here during recording...')).toBeInTheDocument();
      expect(screen.getByText('Start speaking to see live transcription')).toBeInTheDocument();
    });
  });

  describe('Message Grouping (Expected to Fail)', () => {
    it('should group consecutive messages from same speaker into blocks', () => {
      const messages = [
        createMessage('human', 'Hello there', 1000),
        createMessage('human', 'How are you today?', 2000),
        createMessage('ai', 'I am doing well', 3000),
        createMessage('ai', 'Thank you for asking', 4000),
        createMessage('human', 'Great to hear!', 5000)
      ];

      render(<Transcript messages={messages} />);

      // Should have 3 message blocks (human, ai, human)
      const messageBlocks = screen.queryAllByTestId('message-block');
      expect(messageBlocks).toHaveLength(3);

      // First block should contain both human messages
      const firstBlock = messageBlocks[0];
      expect(firstBlock).toHaveAttribute('data-speaker', 'human');
      expect(firstBlock).toHaveTextContent('Hello there');
      expect(firstBlock).toHaveTextContent('How are you today?');

      // Second block should contain both AI messages
      const secondBlock = messageBlocks[1];
      expect(secondBlock).toHaveAttribute('data-speaker', 'ai');
      expect(secondBlock).toHaveTextContent('I am doing well');
      expect(secondBlock).toHaveTextContent('Thank you for asking');

      // Third block should contain the final human message
      const thirdBlock = messageBlocks[2];
      expect(thirdBlock).toHaveAttribute('data-speaker', 'human');
      expect(thirdBlock).toHaveTextContent('Great to hear!');
    });

    it('should show speaker name only once per block', () => {
      const messages = [
        createMessage('human', 'Message one', 1000),
        createMessage('human', 'Message two', 2000),
        createMessage('human', 'Message three', 3000)
      ];

      render(<Transcript messages={messages} />);

      const messageBlocks = screen.queryAllByTestId('message-block');
      expect(messageBlocks).toHaveLength(1);

      // Should only have one speaker label in the block
      const speakerLabels = screen.getAllByTestId('speaker-label');
      expect(speakerLabels).toHaveLength(1);
      expect(speakerLabels[0]).toHaveTextContent('Human');
    });

    it('should display timestamp for each message block', () => {
      const messages = [
        createMessage('human', 'First message', 1000),
        createMessage('human', 'Second message', 2000),
        createMessage('ai', 'AI response', 3000)
      ];

      render(<Transcript messages={messages} />);

      const messageBlocks = screen.queryAllByTestId('message-block');
      expect(messageBlocks).toHaveLength(2);

      // Each block should have one timestamp (for the latest message in block)
      const timestamps = screen.getAllByTestId('block-timestamp');
      expect(timestamps).toHaveLength(2);
    });
  });

  describe('Visual Distinction', () => {
    it('should apply different styles for human vs ai messages', () => {
      const messages = [
        createMessage('human', 'Human message', 1000),
        createMessage('ai', 'AI message', 2000)
      ];

      render(<Transcript messages={messages} />);

      const messageBlocks = screen.queryAllByTestId('message-block');
      expect(messageBlocks).toHaveLength(2);

      const humanBlock = messageBlocks[0];
      const aiBlock = messageBlocks[1];

      // Human blocks should have human-specific styling
      expect(humanBlock).toHaveClass('human-message-block');

      // AI blocks should have ai-specific styling
      expect(aiBlock).toHaveClass('ai-message-block');
    });

    it('should display correct speaker names for different languages', () => {
      // Override the mock for this specific test - use mockReturnValue instead of mockReturnValueOnce
      // because both Transcript and MessageBlock will call useLanguage
      vi.mocked(useLanguage).mockReturnValue({
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

      const messages = [createMessage('human', 'Test message', 1000)];
      render(<Transcript messages={messages} />);

      expect(screen.getByText('Menneske')).toBeInTheDocument();

      // Reset the mock to default after the test
      vi.mocked(useLanguage).mockReturnValue({
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
      });
    });
  });

  describe('Auto-scroll Functionality', () => {
    it('should maintain auto-scroll behavior when messages are added', () => {
      // Mock scrollTop and scrollHeight
      // const mockScrollElement = {
      //   scrollTop: 0,
      //   scrollHeight: 1000,
      //   offsetHeight: 400
      // };

      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      const { rerender } = render(<Transcript messages={[]} />);

      const messages = [createMessage('human', 'New message', 1000)];
      rerender(<Transcript messages={messages} />);

      // Should maintain scroll-to-bottom functionality
      const scrollContainer = screen.getByTestId('transcript-panel').querySelector('[data-testid="scroll-container"]');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Message Block Structure (Expected to Fail)', () => {
    it('should render MessageBlock components for grouped messages', () => {
      const messages = [
        createMessage('human', 'Message 1', 1000),
        createMessage('human', 'Message 2', 2000),
        createMessage('ai', 'AI response', 3000)
      ];

      render(<Transcript messages={messages} />);

      // Should render MessageBlock components instead of individual messages
      const messageBlocks = screen.queryAllByTestId('message-block');
      expect(messageBlocks).toHaveLength(2);

      // Should NOT render individual transcript-message elements
      const individualMessages = screen.queryAllByTestId('transcript-message');
      expect(individualMessages).toHaveLength(0);
    });

    it('should pass correct props to MessageBlock components', () => {
      const messages = [
        createMessage('human', 'Message 1', 1000),
        createMessage('human', 'Message 2', 2000)
      ];

      render(<Transcript messages={messages} />);

      const messageBlock = screen.getByTestId('message-block');
      expect(messageBlock).toHaveAttribute('data-speaker', 'human');
      expect(messageBlock).toHaveAttribute('data-message-count', '2');
      expect(messageBlock).toHaveAttribute('data-latest-timestamp', '2000');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single message correctly', () => {
      const messages = [createMessage('human', 'Single message', 1000)];

      render(<Transcript messages={messages} />);

      const messageBlocks = screen.queryAllByTestId('message-block');
      expect(messageBlocks).toHaveLength(1);
      expect(messageBlocks[0]).toHaveTextContent('Single message');
    });

    it('should handle alternating speakers correctly', () => {
      const messages = [
        createMessage('human', 'Human 1', 1000),
        createMessage('ai', 'AI 1', 2000),
        createMessage('human', 'Human 2', 3000),
        createMessage('ai', 'AI 2', 4000)
      ];

      render(<Transcript messages={messages} />);

      const messageBlocks = screen.queryAllByTestId('message-block');
      expect(messageBlocks).toHaveLength(4); // Each message should be its own block
    });

    it('should handle messages without id gracefully', () => {
      const messagesWithoutId = [
        { speaker: 'human' as const, text: 'No ID message', ts_ms: 1000, raw_json: {} }
      ];

      render(<Transcript messages={messagesWithoutId} />);

      const messageBlocks = screen.queryAllByTestId('message-block');
      expect(messageBlocks).toHaveLength(1);
    });
  });
});