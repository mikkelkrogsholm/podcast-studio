import { useCallback, useRef, useState, useEffect } from 'react';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ConnectionEvent {
  timestamp: Date;
  status: ConnectionStatus;
  message?: string;
}

interface RealtimeConnectionState {
  status: ConnectionStatus;
  events: ConnectionEvent[];
  remoteAudioStream: MediaStream | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useRealtimeConnection(): RealtimeConnectionState {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const addEvent = useCallback((status: ConnectionStatus, message?: string) => {
    const event: ConnectionEvent = {
      timestamp: new Date(),
      status,
      ...(message && { message })
    };
    setEvents(prev => [...prev, event]);
    setStatus(status);
  }, []);

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
    
    setRemoteAudioStream(null);
  }, []);

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') {
      return;
    }

    try {
      addEvent('connecting', 'Fetching session token...');
      
      // Get ephemeral token from our backend
      const tokenResponse = await fetch('http://localhost:4201/api/realtime/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
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
          addEvent('connected', 'AI audio stream ready for capture');
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
      });

      dc.addEventListener('message', (event) => {
        // Handle incoming events from OpenAI
        console.log('Received message:', event.data);
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
    }
  }, [status, addEvent, cleanup]);

  const disconnect = useCallback(() => {
    addEvent('disconnected', 'Disconnecting...');
    cleanup();
  }, [addEvent, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    events,
    remoteAudioStream,
    connect,
    disconnect
  };
}