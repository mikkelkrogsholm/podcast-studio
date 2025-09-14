import { useState, useEffect, useCallback } from 'react';

interface ResumableSession {
  id: string;
  title: string;
  status: 'incomplete';
  createdAt: number;
  audioFiles: Array<{
    speaker: string;
    filePath: string;
  }>;
  nextSegmentNumber: number;
}

interface ResumeContext {
  conversationHistory: Array<{
    speaker: 'human' | 'ai';
    text: string;
    timestamp: number;
  }>;
  contextSummary?: string;
}

interface AudioRecordingConfig {
  humanTrackPath: string;
  aiTrackPath: string;
  segmentNumber: number;
}

interface ResumeResult {
  success: boolean;
  error?: string;
  segmentNumber?: number;
  mediaRecorder?: MediaRecorder;
  contextApplied?: boolean;
  conversationHistory?: Array<{
    speaker: 'human' | 'ai';
    text: string;
  }>;
}

interface UIOptions {
  showResumeButton: boolean;
  resumeButtonText?: string;
}

interface SessionResumeState {
  resumableSessions: ResumableSession[];
  hasResumableSessions: boolean;
  isLoading: boolean;
  error: string | null;
  getResumeContext: (sessionId: string) => Promise<ResumeContext | null>;
  resumeSession: (sessionId: string, options?: { onContextRestored?: () => void }) => Promise<ResumeResult>;
  getUIOptions: () => UIOptions;
  getAudioRecordingConfig: (segmentNumber: number) => AudioRecordingConfig;
}

export function useSessionResume(): SessionResumeState {
  const [resumableSessions, setResumableSessions] = useState<ResumableSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate next segment number from existing audio files
  const calculateNextSegmentNumber = useCallback((audioFiles: Array<{ filePath: string }>) => {
    let maxSegmentNumber = 0;

    audioFiles.forEach(file => {
      // Extract segment number from file path like "sessions/id/human_segment_2.wav"
      const match = file.filePath.match(/_segment_(\d+)\.wav$/);
      if (match && match[1]) {
        const segmentNumber = parseInt(match[1], 10);
        maxSegmentNumber = Math.max(maxSegmentNumber, segmentNumber);
      }
    });

    // Next segment is max + 1, minimum 1
    return Math.max(maxSegmentNumber + 1, 1);
  }, []);

  // Fetch resumable sessions on mount
  useEffect(() => {
    const fetchResumableSessions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('http://localhost:4201/api/sessions');
        if (!response.ok) {
          throw new Error(`Network error: ${response.status}`);
        }

        const data = await response.json();

        // Filter and validate sessions
        const validIncompleteeSessions = (data.sessions || [])
          .filter((session: any) => {
            // More lenient validation - handle test data structure
            return session !== null &&
                   session !== undefined &&
                   typeof session.id === 'string' &&
                   session.status === 'incomplete' &&
                   (typeof session.title === 'string' || session.title === undefined) &&
                   (Array.isArray(session.audioFiles) || session.audioFiles === undefined);
          })
          .map((session: any) => {
            const audioFiles = session.audioFiles || [];
            const nextSegmentNumber = calculateNextSegmentNumber(audioFiles);

            return {
              id: session.id,
              title: session.title || '',
              status: session.status as 'incomplete',
              createdAt: session.createdAt || Date.now(),
              audioFiles,
              nextSegmentNumber
            } as ResumableSession;
          });

        setResumableSessions(validIncompleteeSessions);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResumableSessions();
  }, [calculateNextSegmentNumber]);

  // Get conversation context for resuming
  const getResumeContext = useCallback(async (sessionId: string): Promise<ResumeContext | null> => {
    try {
      const response = await fetch(`http://localhost:4201/api/session/${sessionId}/resume-context`);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        conversationHistory: data.conversationHistory || [],
        contextSummary: data.contextSummary
      };
    } catch (error) {
      console.error('Failed to get resume context:', error);
      return null;
    }
  }, []);

  // Resume a session
  const resumeSession = useCallback(async (sessionId: string, options?: { onContextRestored?: () => void }): Promise<ResumeResult> => {
    try {
      // Find the session in our list
      const session = resumableSessions.find(s => s.id === sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found or not resumable'
        };
      }

      // Call the resume endpoint to validate and get segment info
      const resumeResponse = await fetch(`http://localhost:4201/api/session/${sessionId}/resume`, {
        method: 'POST'
      });

      if (!resumeResponse.ok) {
        return {
          success: false,
          error: 'Session not found or not resumable'
        };
      }

      const resumeData = await resumeResponse.json();
      if (!resumeData.canResume) {
        return {
          success: false,
          error: 'Session not found or not resumable'
        };
      }

      // Get conversation context (handle errors gracefully)
      let context: ResumeContext | null = null;
      try {
        context = await getResumeContext(sessionId);
      } catch (error) {
        console.warn('Failed to get resume context:', error);
        // Continue without context
      }

      // Create new MediaRecorder with proper audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      // Use proper MediaRecorder options
      const options_mr: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=pcm', // Prefer PCM
      };

      // Fall back to supported format if PCM not available
      if (!MediaRecorder.isTypeSupported(options_mr.mimeType!)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options_mr.mimeType = 'audio/webm';
        } else {
          delete options_mr.mimeType; // Use default
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options_mr);

      // If context restoration callback is provided, call it
      if (options?.onContextRestored) {
        options.onContextRestored();
      }

      return {
        success: true,
        segmentNumber: resumeData.nextSegmentNumber || session.nextSegmentNumber,
        mediaRecorder,
        contextApplied: context !== null,
        conversationHistory: context?.conversationHistory || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume session'
      };
    }
  }, [resumableSessions, getResumeContext]);

  // Get UI options for resume functionality
  const getUIOptions = useCallback((): UIOptions => {
    return {
      showResumeButton: resumableSessions.length > 0,
      resumeButtonText: resumableSessions.length > 0 ? 'Resume' : ''
    };
  }, [resumableSessions]);

  // Get audio recording configuration for a specific segment
  const getAudioRecordingConfig = useCallback((segmentNumber: number): AudioRecordingConfig => {
    return {
      humanTrackPath: `human_segment_${segmentNumber}.wav`,
      aiTrackPath: `ai_segment_${segmentNumber}.wav`,
      segmentNumber
    };
  }, []);

  return {
    resumableSessions,
    hasResumableSessions: resumableSessions.length > 0,
    isLoading,
    error,
    getResumeContext,
    resumeSession,
    getUIOptions,
    getAudioRecordingConfig
  };
}