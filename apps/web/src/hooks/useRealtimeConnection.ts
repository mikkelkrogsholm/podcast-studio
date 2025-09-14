import { useCallback, useRef, useState, useEffect } from 'react';
import { useTranscriptPersistence } from './useTranscriptPersistence';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ConnectionEvent {
  timestamp: Date;
  status: ConnectionStatus;
  message?: string;
}

interface TranscriptMessage {
  speaker: 'human' | 'ai' | 'mikkel' | 'freja';
  text: string;
  ts_ms: number;
  raw_json: Record<string, any>;
}

interface RealtimeConnectionState {
  status: ConnectionStatus;
  events: ConnectionEvent[];
  transcriptMessages: TranscriptMessage[];
  isTranscriptLoading: boolean;
  transcriptError: string | null;
  remoteAudioStream: MediaStream | null;
  isAiSpeaking: boolean;
  connect: (settings?: any, conversationContext?: Array<{ speaker: 'human' | 'ai'; text: string }>) => Promise<void>;
  disconnect: () => void;
  interrupt: () => void;
}

export function useRealtimeConnection(sessionId?: string): RealtimeConnectionState {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Local state fallback for when no sessionId is provided (tests, previews)
  const [localTranscriptMessages, setLocalTranscriptMessages] = useState<TranscriptMessage[]>([]);

  // Use transcript persistence hook when sessionId is provided
  const transcriptPersistence = useTranscriptPersistence(sessionId || 'temp-session')

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 2;

  const addEvent = useCallback((status: ConnectionStatus, message?: string) => {
    const event: ConnectionEvent = {
      timestamp: new Date(),
      status,
      ...(message && { message })
    };
    setEvents(prev => [...prev, event]);
    setStatus(status);
  }, []);

  const addTranscriptMessage = useCallback(async (speaker: 'human' | 'ai', text: string, rawEvent: any) => {
    const message = {
      speaker,
      text,
      ts_ms: Date.now(),
      raw_json: rawEvent
    };

    // If sessionId is provided, persist the message; otherwise, use local state fallback
    if (sessionId) {
      await transcriptPersistence.addMessage(message);
    } else {
      // For preview/testing without session, use local state for backward compatibility
      setLocalTranscriptMessages(prev => [...prev, message]);
    }
  }, [sessionId, transcriptPersistence]);

  const cleanup = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clean up audio element
    if ((window as any).__realtimeAudio) {
      (window as any).__realtimeAudio.pause();
      (window as any).__realtimeAudio.srcObject = null;
      (window as any).__realtimeAudio = null;
    }
    
    setRemoteAudioStream(null);
    setLocalTranscriptMessages([]);
    setIsAiSpeaking(false);
  }, []);

  const interrupt = useCallback(() => {
    if (!dataChannelRef.current || status !== 'connected') {
      return;
    }

    try {
      // Send interrupt command to OpenAI Realtime API
      const interruptCommand = {
        type: 'response.cancel'
      };

      dataChannelRef.current.send(JSON.stringify(interruptCommand));
      setIsAiSpeaking(false);
      addEvent('connected', 'AI speech interrupted');

      // Log interrupt to transcript
      addTranscriptMessage('ai', '[INTERRUPTED]', { type: 'interrupt', timestamp: Date.now() });
    } catch (error) {
      console.error('Failed to send interrupt:', error);
    }
  }, [status, addEvent, addTranscriptMessage]);

  const attemptConnect = useCallback(async (settings?: any, conversationContext?: Array<{ speaker: 'human' | 'ai'; text: string }>): Promise<void> => {
    // Reset AI speaking state on reconnect
    setIsAiSpeaking(false);

    try {
      addEvent('connecting', 'Fetching session token...');
      
      // Get ephemeral token from our backend
      const tokenResponse = await fetch('http://localhost:4201/api/realtime/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionId ? { sessionId } : {})
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || `Token request failed: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      const ephemeralToken = tokenData.client_secret.value;

      addEvent('connecting', 'Getting microphone access...');
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const [audioTrack] = stream.getAudioTracks();

      addEvent('connecting', 'Setting up WebRTC connection...');

      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Handle incoming audio from OpenAI
      pc.ontrack = (event) => {
        addEvent('connecting', 'Received remote audio stream');
        const [remoteStream] = event.streams;
        if (remoteStream) {
          setRemoteAudioStream(remoteStream);
          
          // Create audio element to play AI response
          const audioElement = new Audio();
          audioElement.srcObject = remoteStream;
          audioElement.autoplay = true;
          
          // Store reference for cleanup
          (window as any).__realtimeAudio = audioElement;
          
          addEvent('connected', 'AI audio stream ready - you should hear Freja speaking');
        }
      };

      // Add local audio track
      if (audioTrack) {
        pc.addTrack(audioTrack, stream);
      }

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.addEventListener('open', () => {
        addEvent('connected', 'Data channel opened');
        
        // Build instructions from persona and context prompts
        let instructions = 'You are Freja, a friendly AI podcast co-host. Be conversational and engaging.';

        // Add persona customization if provided (extends base persona)
        if (settings?.persona_prompt && settings.persona_prompt.trim()) {
          instructions += '\n\n' + settings.persona_prompt;
        }

        // Add context/topic if provided
        if (settings?.context_prompt && settings.context_prompt.trim()) {
          instructions += '\n\nToday\'s topic/context: ' + settings.context_prompt;
        }
        
        // Configure session for voice mode with VAD
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['audio', 'text'],
            instructions: instructions,
            voice: settings?.voice || 'cedar',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: settings?.silence_ms || 500
            },
            tools: [],
            tool_choice: 'auto'
          }
        };
        
        dc.send(JSON.stringify(sessionConfig));
        addEvent('connected', 'Session configured for voice mode with VAD');

        // If conversation context is provided, restore previous conversation
        if (conversationContext && conversationContext.length > 0) {
          addEvent('connecting', 'Restoring conversation context...');

          // Add conversation history as conversation items
          for (const message of conversationContext) {
            const conversationItem = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: message.speaker === 'human' ? 'user' : 'assistant',
                content: [{
                  type: 'input_text',
                  text: message.text
                }]
              }
            };
            dc.send(JSON.stringify(conversationItem));
          }

          addEvent('connected', `Restored ${conversationContext.length} previous messages`);

          // Create response acknowledging the resume
          const resumeResponse = {
            type: 'response.create',
            response: {
              modalities: ['audio', 'text'],
              instructions: 'Acknowledge that you are resuming the previous conversation and ask how you can continue helping.'
            }
          };

          setTimeout(() => {
            dc.send(JSON.stringify(resumeResponse));
            addEvent('connected', 'AI resumed previous conversation');
          }, 200);
        } else {
          // Create initial response to start conversation
          const createResponse = {
            type: 'response.create',
            response: {
              modalities: ['audio', 'text'],
              instructions: 'Greet the user and introduce yourself as Freja, their AI podcast co-host.'
            }
          };

          setTimeout(() => {
            dc.send(JSON.stringify(createResponse));
            addEvent('connected', 'AI is ready to converse');
          }, 100);
        }
      });

      dc.addEventListener('message', (event) => {
        // Handle incoming events from OpenAI
        console.log('Received message:', event.data);
        
        try {
          const data = JSON.parse(event.data);
          
          // Handle transcript events for Human (user speech)
          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            if (data.transcript) {
              addTranscriptMessage('human', data.transcript, data);
            }
          }
          
          // Handle AI response state changes
          if (data.type === 'response.created') {
            setIsAiSpeaking(true);
          }

          if (data.type === 'response.done') {
            setIsAiSpeaking(false);
          }

          // Handle response cancellation (interrupt)
          if (data.type === 'response.cancelled') {
            setIsAiSpeaking(false);
          }

          // Handle full AI response transcript only (not delta events)
          // Delta events are ignored to prevent duplicate word-by-word display
          if (data.type === 'response.audio_transcript.done') {
            if (data.transcript) {
              addTranscriptMessage('ai', data.transcript, data);
            }
          }
          
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      dc.addEventListener('error', (event) => {
        addEvent('error', `Data channel error: ${event}`);
      });

      pc.addEventListener('connectionstatechange', () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          addEvent('error', `Connection failed: ${pc.connectionState}`);
        }
      });

      addEvent('connecting', 'Creating WebRTC offer...');

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      addEvent('connecting', 'Sending offer to OpenAI...');

      // Send offer to OpenAI's WebRTC endpoint
      const response = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
        method: 'POST',
        body: pc.localDescription?.sdp || '',
        headers: {
          'Authorization': `Bearer ${ephemeralToken}`,
          'Content-Type': 'application/sdp'
        }
      });

      if (!response.ok) {
        throw new Error(`WebRTC handshake failed: ${response.status}`);
      }

      addEvent('connecting', 'Processing WebRTC answer...');

      // Set remote description
      const answerSdp = await response.text();
      const answer = { type: 'answer' as RTCSdpType, sdp: answerSdp };
      await pc.setRemoteDescription(answer);

      addEvent('connected', 'WebRTC connection established');

    } catch (error) {
      console.error('Connection error:', error);
      addEvent('error', error instanceof Error ? error.message : 'Unknown error');
      cleanup();
      throw error; // Re-throw for reconnect logic
    }
  }, [status, addEvent, cleanup]);

  const connect = useCallback(async (settings?: any, conversationContext?: Array<{ speaker: 'human' | 'ai'; text: string }>) => {
    if (status === 'connecting' || status === 'connected') {
      return;
    }

    reconnectAttemptsRef.current = 0;

    const tryConnect = async (): Promise<void> => {
      try {
        await attemptConnect(settings, conversationContext);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      } catch (error) {
        reconnectAttemptsRef.current++;

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current - 1) * 1000; // Exponential backoff: 1s, 2s
          addEvent('connecting', `Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          setTimeout(async () => {
            try {
              await tryConnect();
            } catch (retryError) {
              // Final failure will be handled below
            }
          }, delay);
        } else {
          addEvent('error', `Maximum reconnection attempts reached (${maxReconnectAttempts})`);
        }
        throw error;
      }
    };

    await tryConnect();
  }, [status, attemptConnect, addEvent]);

  const disconnect = useCallback(() => {
    addEvent('disconnected', 'Disconnecting...');
    cleanup();
  }, [addEvent, cleanup]);

  // Listen for test events from Playwright tests
  useEffect(() => {
    const handleTranscriptEvent = (event: CustomEvent) => {
      const { speaker, text, raw_json } = event.detail as any;
      const mapped = speaker === 'mikkel' ? 'human' : speaker === 'freja' ? 'ai' : speaker;
      addTranscriptMessage(mapped, text, raw_json);
    };

    const handleTranscriptMessage = (event: CustomEvent) => {
      const { speaker, text, raw_json } = event.detail as any;
      const mapped = speaker === 'mikkel' ? 'human' : speaker === 'freja' ? 'ai' : speaker;
      addTranscriptMessage(mapped, text, raw_json);
    };

    window.addEventListener('transcript-event', handleTranscriptEvent as EventListener);
    window.addEventListener('transcript-message', handleTranscriptMessage as EventListener);

    return () => {
      window.removeEventListener('transcript-event', handleTranscriptEvent as EventListener);
      window.removeEventListener('transcript-message', handleTranscriptMessage as EventListener);
    };
  }, [addTranscriptMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    events,
    transcriptMessages: sessionId ? transcriptPersistence.messages : localTranscriptMessages,
    isTranscriptLoading: sessionId ? transcriptPersistence.isLoading : false,
    transcriptError: sessionId ? transcriptPersistence.error : null,
    remoteAudioStream,
    isAiSpeaking,
    connect,
    disconnect,
    interrupt
  };
}
