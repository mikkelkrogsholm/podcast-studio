import { useCallback, useRef, useState, useEffect } from 'react';

type RecordingStatus = 'idle' | 'requesting-permission' | 'recording' | 'stopping' | 'error';

interface AudioRecordingState {
  status: RecordingStatus;
  isRecording: boolean;
  error: string | null;
  sessionId: string | null;
  recordedDuration: number;
  startRecording: (sessionId: string) => Promise<void>;
  stopRecording: () => Promise<void>;
}

export function useAudioRecording(): AudioRecordingState {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Upload audio chunk to backend
  const uploadChunk = useCallback(async (chunk: Blob, sessionId: string) => {
    try {
      // Convert blob to array buffer for raw binary upload
      const arrayBuffer = await chunk.arrayBuffer();
      
      const response = await fetch(`http://localhost:4201/api/audio/${sessionId}/mikkel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/wav',
        },
        body: arrayBuffer,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error uploading chunk:', error);
      throw error;
    }
  }, []);

  // Update recording duration
  const updateDuration = useCallback(() => {
    if (startTimeRef.current) {
      setRecordedDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }
  }, []);

  const startRecording = useCallback(async (sessionId: string) => {
    if (status === 'recording') {
      return;
    }

    try {
      setStatus('requesting-permission');
      setError(null);
      setSessionId(sessionId);
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      setRecordedDuration(0);

      // Request microphone access with audio constraints for 48kHz, mono
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      streamRef.current = stream;

      // Create MediaRecorder with WAV format (using webm as fallback since WAV isn't universally supported)
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=pcm', // Prefer PCM in WebM container
      };

      // Fall back to supported format if PCM not available
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4';
        } else {
          delete options.mimeType; // Use default
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available (chunks)
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          try {
            await uploadChunk(event.data, sessionId);
          } catch (error) {
            console.error('Failed to upload chunk:', error);
            // Don't stop recording on upload error, just log it
          }
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setStatus('error');
      };

      // Start recording with 1 second chunks
      mediaRecorder.start(1000);
      setStatus('recording');

      // Start duration timer
      intervalRef.current = setInterval(updateDuration, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to start recording');
      setStatus('error');
      
      // Cleanup on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [status, uploadChunk, updateDuration]);

  const stopRecording = useCallback(async () => {
    if (status !== 'recording' || !mediaRecorderRef.current) {
      return;
    }

    try {
      setStatus('stopping');

      // Clear duration timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Stop the MediaRecorder
      mediaRecorderRef.current.stop();

      // Stop the media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Upload any remaining chunks
      if (chunksRef.current.length > 0 && sessionId) {
        const finalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadChunk(finalBlob, sessionId);
      }

      setStatus('idle');
      setSessionId(null);

    } catch (error) {
      console.error('Failed to stop recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop recording');
      setStatus('error');
    } finally {
      // Cleanup
      mediaRecorderRef.current = null;
      chunksRef.current = [];
    }
  }, [status, sessionId, uploadChunk]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    status,
    isRecording: status === 'recording',
    error,
    sessionId,
    recordedDuration,
    startRecording,
    stopRecording,
  };
}