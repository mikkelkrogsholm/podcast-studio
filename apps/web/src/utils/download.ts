/**
 * Utility functions for downloading files from the API
 */

export interface DownloadOptions {
  sessionId: string;
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Download Mikkel's audio track
 */
export async function downloadMikkelAudio(options: DownloadOptions): Promise<void> {
  const { sessionId, onStart, onSuccess, onError } = options;

  try {
    onStart?.();

    const response = await fetch(`http://localhost:4201/api/session/${sessionId}/file/mikkel`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Download failed');
    }

    // Create blob and trigger download
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mikkel-${sessionId}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onSuccess?.();
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Download failed');
  }
}

/**
 * Download Freja's audio track
 */
export async function downloadFrejaAudio(options: DownloadOptions): Promise<void> {
  const { sessionId, onStart, onSuccess, onError } = options;

  try {
    onStart?.();

    const response = await fetch(`http://localhost:4201/api/session/${sessionId}/file/freja`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Download failed');
    }

    // Create blob and trigger download
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `freja-${sessionId}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onSuccess?.();
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Download failed');
  }
}

/**
 * Download transcript as JSON
 */
export async function downloadTranscriptJson(options: DownloadOptions): Promise<void> {
  const { sessionId, onStart, onSuccess, onError } = options;

  try {
    onStart?.();

    const response = await fetch(`http://localhost:4201/api/session/${sessionId}/transcript.json`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Download failed');
    }

    // Create blob and trigger download
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${sessionId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onSuccess?.();
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Download failed');
  }
}

/**
 * Download transcript as Markdown
 */
export async function downloadTranscriptMarkdown(options: DownloadOptions): Promise<void> {
  const { sessionId, onStart, onSuccess, onError } = options;

  try {
    onStart?.();

    const response = await fetch(`http://localhost:4201/api/session/${sessionId}/transcript.md`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Download failed');
    }

    // Create blob and trigger download
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${sessionId}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onSuccess?.();
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Download failed');
  }
}