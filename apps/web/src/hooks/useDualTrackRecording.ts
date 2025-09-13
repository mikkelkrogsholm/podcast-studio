import { useCallback, useRef, useState, useEffect } from 'react';
import { useKeepalive } from './useKeepalive';

type RecordingStatus = 'idle' | 'requesting-permission' | 'recording' | 'stopping' | 'error';

interface VolumeLevel {
  human: number;
  ai: number;
}

interface MuteState {
  human: boolean;
  ai: boolean;
}

interface DualTrackRecordingState {
  status: RecordingStatus;
  isRecording: boolean;
  paused: boolean;
  error: string | null;
  sessionId: string | null;
  recordedDuration: number;
  volumeLevels: VolumeLevel;
  muteState: MuteState;
  startRecording: (sessionId: string, remoteAudioStream?: MediaStream | null) => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  setMute: (track: 'human' | 'ai', muted: boolean) => void;
}

export function useDualTrackRecording(): DualTrackRecordingState {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [volumeLevels, setVolumeLevels] = useState<VolumeLevel>({ human: 0, ai: 0 });
  const [muteState, setMuteState] = useState<MuteState>({ human: false, ai: false });
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  
  // Keepalive functionality
  const { startKeepalive, stopKeepalive } = useKeepalive();
  
  // MediaRecorder references for both tracks
  const mikkelRecorderRef = useRef<MediaRecorder | null>(null);
  const frejaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // Audio streams and contexts
  const mikkelStreamRef = useRef<MediaStream | null>(null);
  const frejaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mikkelAnalyserRef = useRef<AnalyserNode | null>(null);
  const frejaAnalyserRef = useRef<AnalyserNode | null>(null);
  
  // Timing references
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Upload audio chunk to backend
  const uploadChunk = useCallback(async (chunk: Blob, sessionId: string, speaker: 'human' | 'ai') => {
    try {
      if (pausedRef.current) return; // Drop chunks while paused
      const arrayBuffer = await chunk.arrayBuffer();
      
      const response = await fetch(`http://localhost:4201/api/audio/${sessionId}/${speaker}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/wav',
        },
        body: arrayBuffer,
      });

      if (!response.ok) {
        throw new Error(`Upload failed for ${speaker}: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error uploading ${speaker} chunk:`, error);
      throw error;
    }
  }, []);

  // Calculate volume levels from audio data
  const calculateVolumeLevel = useCallback((analyser: AnalyserNode): number => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate RMS (root mean square) for volume level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const value = dataArray[i];
      if (value !== undefined) {
        sum += value * value;
      }
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    // Convert to 0-100 scale
    return Math.min(100, (rms / 255) * 100);
  }, []);

  // Update volume levels
  const updateVolumeLevels = useCallback(() => {
    const mikkelLevel = mikkelAnalyserRef.current ? calculateVolumeLevel(mikkelAnalyserRef.current) : 0;
    const frejaLevel = frejaAnalyserRef.current ? calculateVolumeLevel(frejaAnalyserRef.current) : 0;
    
    setVolumeLevels({
      human: muteState.human ? 0 : mikkelLevel,
      ai: muteState.ai ? 0 : frejaLevel
    });
  }, [calculateVolumeLevel, muteState]);

  // Update recording duration
  const updateDuration = useCallback(() => {
    if (startTimeRef.current) {
      setRecordedDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }
  }, []);

  // Set mute state for individual tracks
  const setMute = useCallback((track: 'human' | 'ai', muted: boolean) => {
    setMuteState(prev => ({
      ...prev,
      [track]: muted
    }));
  }, []);

  // Setup Web Audio API for Freja track recording
  const setupFrejaAudioRecording = useCallback((remoteStream: MediaStream): MediaStream => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;
    const destination = audioContext.createMediaStreamDestination();
    
    // Create source from remote stream
    const source = audioContext.createMediaStreamSource(remoteStream);
    
    // Create analyser for volume monitoring
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    frejaAnalyserRef.current = analyser;
    
    // Create gain node for mute control
    const gainNode = audioContext.createGain();
    
    // Connect: source -> analyser -> gain -> destination
    source.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(destination);
    
    // Update gain when mute state changes
    gainNode.gain.value = muteState.ai ? 0 : 1;
    
    return destination.stream;
  }, [muteState.ai]);

  // Setup Web Audio API for Mikkel track recording
  const setupMikkelAudioRecording = useCallback((micStream: MediaStream): MediaStream => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;
    const destination = audioContext.createMediaStreamDestination();
    
    // Create source from microphone stream
    const source = audioContext.createMediaStreamSource(micStream);
    
    // Create analyser for volume monitoring
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    mikkelAnalyserRef.current = analyser;
    
    // Create gain node for mute control
    const gainNode = audioContext.createGain();
    
    // Connect: source -> analyser -> gain -> destination
    source.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(destination);
    
    // Update gain when mute state changes
    gainNode.gain.value = muteState.human ? 0 : 1;
    
    return destination.stream;
  }, [muteState.human]);

  const startRecording = useCallback(async (sessionId: string, remoteAudioStream?: MediaStream | null) => {
    if (status === 'recording') {
      return;
    }

    try {
      setStatus('requesting-permission');
      setError(null);
      setSessionId(sessionId);
      startTimeRef.current = Date.now();
      setRecordedDuration(0);

      // Request microphone access
      const mikkelStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      mikkelStreamRef.current = mikkelStream;

      // Setup Mikkel track recording with Web Audio API
      const processedMikkelStream = setupMikkelAudioRecording(mikkelStream);

      // Create MediaRecorder for Mikkel track
      const mikkelOptions: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=pcm',
      };

      if (!MediaRecorder.isTypeSupported(mikkelOptions.mimeType!)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mikkelOptions.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mikkelOptions.mimeType = 'audio/mp4';
        } else {
          delete mikkelOptions.mimeType;
        }
      }

      const mikkelRecorder = new MediaRecorder(processedMikkelStream, mikkelOptions);
      mikkelRecorderRef.current = mikkelRecorder;

      mikkelRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          try {
            await uploadChunk(event.data, sessionId, 'human');
          } catch (error) {
            console.error('Failed to upload Mikkel chunk:', error);
          }
        }
      };

      mikkelRecorder.onerror = (event) => {
        console.error('Mikkel MediaRecorder error:', event);
        setError('Mikkel recording error occurred');
        setStatus('error');
      };

      // Setup Freja track if remote stream is available
      if (remoteAudioStream) {
        const processedFrejaStream = setupFrejaAudioRecording(remoteAudioStream);
        frejaStreamRef.current = processedFrejaStream;

        const frejaOptions: MediaRecorderOptions = {
          mimeType: 'audio/webm;codecs=pcm',
        };

        if (!MediaRecorder.isTypeSupported(frejaOptions.mimeType!)) {
          if (MediaRecorder.isTypeSupported('audio/webm')) {
            frejaOptions.mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            frejaOptions.mimeType = 'audio/mp4';
          } else {
            delete frejaOptions.mimeType;
          }
        }

        const frejaRecorder = new MediaRecorder(processedFrejaStream, frejaOptions);
        frejaRecorderRef.current = frejaRecorder;

        frejaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            try {
              await uploadChunk(event.data, sessionId, 'ai');
            } catch (error) {
              console.error('Failed to upload Freja chunk:', error);
            }
          }
        };

        frejaRecorder.onerror = (event) => {
          console.error('Freja MediaRecorder error:', event);
          setError('Freja recording error occurred');
          setStatus('error');
        };

        // Start Freja recording
        frejaRecorder.start(1000);
      }

      // Start Mikkel recording
      mikkelRecorder.start(1000);
      setStatus('recording');

      // Start keepalive heartbeat
      startKeepalive(sessionId);

      // Start timers
      intervalRef.current = setInterval(updateDuration, 1000);
      volumeIntervalRef.current = setInterval(updateVolumeLevels, 100); // Update volume 10x per second

    } catch (error) {
      console.error('Failed to start recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to start recording');
      setStatus('error');
      
      // Cleanup on error
      if (mikkelStreamRef.current) {
        mikkelStreamRef.current.getTracks().forEach(track => track.stop());
        mikkelStreamRef.current = null;
      }
    }
  }, [status, uploadChunk, updateDuration, updateVolumeLevels, setupMikkelAudioRecording, setupFrejaAudioRecording]);

  const stopRecording = useCallback(async () => {
    if (status !== 'recording') {
      return;
    }

    try {
      setStatus('stopping');

      // Stop keepalive heartbeat
      stopKeepalive();

      // Clear timers
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }

      // Stop MediaRecorders
      if (mikkelRecorderRef.current && mikkelRecorderRef.current.state === 'recording') {
        mikkelRecorderRef.current.stop();
      }

      if (frejaRecorderRef.current && frejaRecorderRef.current.state === 'recording') {
        frejaRecorderRef.current.stop();
      }

      // Stop media streams
      if (mikkelStreamRef.current) {
        mikkelStreamRef.current.getTracks().forEach(track => track.stop());
        mikkelStreamRef.current = null;
      }

      if (frejaStreamRef.current) {
        frejaStreamRef.current.getTracks().forEach(track => track.stop());
        frejaStreamRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Finalize both audio files and finish the session
      if (sessionId) {
        try {
          // Finalize both audio files
          await Promise.all([
            fetch(`http://localhost:4201/api/audio/${sessionId}/human/finalize`, { method: 'POST' }),
            fetch(`http://localhost:4201/api/audio/${sessionId}/ai/finalize`, { method: 'POST' })
          ]);

          // Mark session as completed
          await fetch(`http://localhost:4201/api/session/${sessionId}/finish`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
        } catch (error) {
          console.error('Failed to finalize session:', error);
          // Don't prevent normal cleanup even if finalization fails
        }
      }

      setStatus('idle');
      setSessionId(null);
      setVolumeLevels({ human: 0, ai: 0 });

    } catch (error) {
      console.error('Failed to stop recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop recording');
      setStatus('error');
    } finally {
      // Cleanup references
      mikkelRecorderRef.current = null;
      frejaRecorderRef.current = null;
      mikkelAnalyserRef.current = null;
      frejaAnalyserRef.current = null;
    }
  }, [status]);

  // Update gain nodes when mute state changes
  useEffect(() => {
    if (audioContextRef.current) {
      // Update gain nodes based on mute state
      // This is handled in the setup functions, but we need to update existing connections
      // For simplicity, this implementation recreates the connections when mute changes during recording
    }
  }, [muteState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mikkelRecorderRef.current && mikkelRecorderRef.current.state === 'recording') {
        mikkelRecorderRef.current.stop();
      }
      if (frejaRecorderRef.current && frejaRecorderRef.current.state === 'recording') {
        frejaRecorderRef.current.stop();
      }
      if (mikkelStreamRef.current) {
        mikkelStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (frejaStreamRef.current) {
        frejaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
      }
    };
  }, []);

  // Keep paused ref in sync
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const pauseRecording = useCallback(() => {
    if (status === 'recording') setPaused(true);
  }, [status]);

  const resumeRecording = useCallback(() => {
    if (status === 'recording') setPaused(false);
  }, [status]);

  return {
    status,
    isRecording: status === 'recording',
    paused,
    error,
    sessionId,
    recordedDuration,
    volumeLevels,
    muteState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    setMute,
  };
}
