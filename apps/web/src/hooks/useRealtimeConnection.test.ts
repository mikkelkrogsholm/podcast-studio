import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeConnection } from './useRealtimeConnection';

describe('useRealtimeConnection - AI Transcript Handling', () => {
  let mockDataChannel: any;
  let messageListeners: ((event: any) => void)[] = [];

  beforeEach(() => {
    messageListeners = [];

    // Create a mock data channel with event listener support
    mockDataChannel = {
      addEventListener: vi.fn((event: string, listener: (event: any) => void) => {
        if (event === 'message') {
          messageListeners.push(listener);
        }
      }),
      send: vi.fn(),
      close: vi.fn(),
      readyState: 'open',
    };

    // Mock WebRTC APIs
    global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
      createOffer: vi.fn(),
      setLocalDescription: vi.fn(),
      setRemoteDescription: vi.fn(),
      addTrack: vi.fn(),
      createDataChannel: vi.fn(() => mockDataChannel),
      addEventListener: vi.fn(),
      close: vi.fn(),
      connectionState: 'connected',
    })) as any;

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getAudioTracks: () => [{ stop: vi.fn() }],
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
      writable: true,
    });

    // Mock fetch for token endpoint
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        client_secret: { value: 'mock-token' }
      }),
      text: () => Promise.resolve('mock-sdp'),
    }) as any;

    // Clear any existing audio element
    delete (window as any).__realtimeAudio;
  });

  it('should NOT add transcript messages for response.audio_transcript.delta events', async () => {
    const { result } = renderHook(() => useRealtimeConnection());

    // Start connection to set up the data channel
    await act(async () => {
      await result.current.connect();
    });

    // Simulate a delta event being received through the data channel
    const deltaMessage = {
      type: 'response.audio_transcript.delta',
      delta: 'Hello, this is a partial',
    };

    act(() => {
      // Trigger the message event on data channel
      messageListeners.forEach(listener => {
        listener({ data: JSON.stringify(deltaMessage) });
      });
    });

    // Delta events should NOT be added to transcript messages
    expect(result.current.transcriptMessages).toHaveLength(0);
  });

  it('should add transcript messages for response.audio_transcript.done events', async () => {
    const { result } = renderHook(() => useRealtimeConnection());

    // Start connection to set up the data channel
    await act(async () => {
      await result.current.connect();
    });

    // Simulate a done event being received through the data channel
    const doneMessage = {
      type: 'response.audio_transcript.done',
      transcript: 'Hello, this is a complete message',
    };

    act(() => {
      // Trigger the message event on data channel
      messageListeners.forEach(listener => {
        listener({ data: JSON.stringify(doneMessage) });
      });
    });

    // Done events should be added to transcript messages
    expect(result.current.transcriptMessages).toHaveLength(1);
    expect(result.current.transcriptMessages[0]).toMatchObject({
      speaker: 'ai',
      text: 'Hello, this is a complete message',
    });
  });

  it('should replace partial transcripts with complete transcript on done event', async () => {
    const { result } = renderHook(() => useRealtimeConnection());

    // Start connection to set up the data channel
    await act(async () => {
      await result.current.connect();
    });

    // Simulate multiple delta events (these should be ignored)
    const deltaEvents = [
      { delta: 'Hello', type: 'response.audio_transcript.delta' },
      { delta: ', this', type: 'response.audio_transcript.delta' },
      { delta: ' is a', type: 'response.audio_transcript.delta' },
    ];

    deltaEvents.forEach((eventData) => {
      act(() => {
        // Trigger the message event on data channel
        messageListeners.forEach(listener => {
          listener({ data: JSON.stringify(eventData) });
        });
      });
    });

    // Should have no messages from delta events
    expect(result.current.transcriptMessages).toHaveLength(0);

    // Now send the complete transcript
    const doneMessage = {
      type: 'response.audio_transcript.done',
      transcript: 'Hello, this is a complete message',
    };

    act(() => {
      // Trigger the message event on data channel
      messageListeners.forEach(listener => {
        listener({ data: JSON.stringify(doneMessage) });
      });
    });

    // Should only have the final complete transcript, not the partial ones
    expect(result.current.transcriptMessages).toHaveLength(1);
    expect(result.current.transcriptMessages[0]).toMatchObject({
      speaker: 'ai',
      text: 'Hello, this is a complete message',
    });
  });

  // NEW TESTS: SessionId in token request
  describe('SessionId Token Request', () => {
    it('should send sessionId in token request when sessionId is provided', async () => {
      const testSessionId = 'test-session-123'
      const { result } = renderHook(() => useRealtimeConnection(testSessionId))

      // Start connection
      try {
        await act(async () => {
          await result.current.connect()
        })
      } catch (error) {
        // Ignore connection errors for this test
      }

      // Check that fetch was called with sessionId in request body
      const tokenCall = (global.fetch as any).mock.calls.find((call: any[]) =>
        call[0] === 'http://localhost:4201/api/realtime/token'
      )

      expect(tokenCall).toBeDefined()
      expect(tokenCall[1]).toMatchObject({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const requestBody = JSON.parse(tokenCall[1].body)
      expect(requestBody).toHaveProperty('sessionId', testSessionId)
    })

    it('should not send sessionId when sessionId is not provided', async () => {
      const { result } = renderHook(() => useRealtimeConnection())

      try {
        await act(async () => {
          await result.current.connect()
        })
      } catch (error) {
        // Ignore connection errors
      }

      // Check token request was made
      const tokenCall = (global.fetch as any).mock.calls.find((call: any[]) =>
        call[0] === 'http://localhost:4201/api/realtime/token'
      )

      expect(tokenCall).toBeDefined()

      // Should not have body with sessionId when none provided
      const requestBody = tokenCall[1].body ? JSON.parse(tokenCall[1].body) : {}
      expect(requestBody).not.toHaveProperty('sessionId')
    })
  })
});