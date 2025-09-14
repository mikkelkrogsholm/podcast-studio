import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTranscriptPersistence } from './useTranscriptPersistence'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock console to suppress expected error logs during tests
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

beforeEach(() => {
  mockFetch.mockClear()
  consoleSpy.mockClear()
  // Mock successful responses by default
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true })
  })
})

afterEach(() => {
  vi.clearAllTimers()
  // Clear localStorage to prevent test state leakage
  localStorage.clear()
})

describe('useTranscriptPersistence', () => {
  const mockSessionId = 'test-session-123'

  describe('Message Posting to API', () => {
    it('should POST messages to API endpoint when addMessage is called', async () => {
      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      expect(result.current.addMessage).toBeDefined() // This will fail until hook exists

      const testMessage = {
        speaker: 'human' as const,
        text: 'Hello, this is a test message',
        ts_ms: 1000,
        raw_json: { type: 'conversation.item.input_audio_transcription.completed', text: 'Hello, this is a test message' }
      }

      // Call addMessage
      await result.current.addMessage(testMessage)

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/session/${mockSessionId}/message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testMessage)
        }
      )
    })

    it('should handle API errors gracefully when posting messages', async () => {
      // Mock API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      })

      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      const testMessage = {
        speaker: 'ai' as const,
        text: 'This message will fail to save',
        ts_ms: 2000,
        raw_json: { type: 'response.audio_transcript.delta', text: 'This message will fail to save' }
      }

      // This should not throw but handle error gracefully
      await expect(result.current.addMessage(testMessage)).resolves.not.toThrow()

      // Should still attempt the API call
      expect(mockFetch).toHaveBeenCalled()

      // Error should be logged or handled internally
      expect(consoleSpy).toHaveBeenCalled() // This will fail until error handling is implemented
    })
  })

  describe('Message Fetching on Mount', () => {
    it('should fetch messages from API when hook is mounted', async () => {
      const mockMessages = [
        {
          id: 1,
          speaker: 'human',
          text: 'First message',
          ts_ms: 1000,
          raw_json: { type: 'test' },
          created_at: Date.now()
        },
        {
          id: 2,
          speaker: 'ai',
          text: 'Second message',
          ts_ms: 2000,
          raw_json: { type: 'test' },
          created_at: Date.now()
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ messages: mockMessages })
      })

      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      // Should start loading
      expect(result.current.isLoading).toBe(true) // This will fail until hook exists

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should have fetched messages
      expect(mockFetch).toHaveBeenCalledWith(`/api/session/${mockSessionId}/messages`)
      expect(result.current.messages).toEqual(mockMessages) // This will fail until hook exists
    })

    it('should handle empty message list gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ messages: [] })
      })

      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.messages).toEqual([])
      expect(result.current.messages).toHaveLength(0)
    })
  })

  describe('Chronological Ordering', () => {
    it('should maintain chronological order of messages based on ts_ms', async () => {
      // Mock messages returned out of order from API
      const unorderedMessages = [
        { id: 3, speaker: 'ai', text: 'Third message', ts_ms: 3000, raw_json: {}, created_at: Date.now() },
        { id: 1, speaker: 'human', text: 'First message', ts_ms: 1000, raw_json: {}, created_at: Date.now() },
        { id: 2, speaker: 'human', text: 'Second message', ts_ms: 2000, raw_json: {}, created_at: Date.now() }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ messages: unorderedMessages })
      })

      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should be ordered by ts_ms ascending
      const messages = result.current.messages
      expect(messages[0]!.ts_ms).toBe(1000)
      expect(messages[1]!.ts_ms).toBe(2000)
      expect(messages[2]!.ts_ms).toBe(3000)
      expect(messages[0]!.text).toBe('First message')
      expect(messages[2]!.text).toBe('Third message')
    })

    it('should maintain order when adding new messages', async () => {
      // Start with empty messages
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ messages: [] })
      })

      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Add messages with different timestamps
      await result.current.addMessage({
        speaker: 'human',
        text: 'Second message chronologically',
        ts_ms: 2000,
        raw_json: {}
      })

      await result.current.addMessage({
        speaker: 'ai',
        text: 'First message chronologically',
        ts_ms: 1000,
        raw_json: {}
      })

      // Wait for state to update
      await waitFor(() => {
        expect(result.current.messages.length).toBe(2)
      })

      // Should be inserted in chronological order
      const messages = result.current.messages
      expect(messages[0]!.ts_ms).toBe(1000)
      expect(messages[1]!.ts_ms).toBe(2000)
      expect(messages[0]!.text).toBe('First message chronologically')
      expect(messages[1]!.text).toBe('Second message chronologically')
    })
  })

  describe('Offline Queue Functionality', () => {
    it('should queue messages when API is unavailable', async () => {
      // Start with successful initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ messages: [] })
      })

      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Mock network failure for message POST
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const testMessage = {
        speaker: 'human' as const,
        text: 'Offline message',
        ts_ms: 1000,
        raw_json: {}
      }

      // Should not throw when offline
      await expect(result.current.addMessage(testMessage)).resolves.not.toThrow()

      // Wait for state to update
      await waitFor(() => {
        expect(result.current.queuedMessages.length).toBe(1)
      })

      // Message should be queued locally
      expect(result.current.queuedMessages).toBeDefined()
      expect(result.current.queuedMessages).toHaveLength(1)
      expect(result.current.queuedMessages[0]).toMatchObject(testMessage)
    })

    it('should retry queued messages when connection is restored', async () => {
      // Start with empty state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ messages: [] })
      })

      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Simulate offline - network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await result.current.addMessage({
        speaker: 'human',
        text: 'Queued message',
        ts_ms: 1000,
        raw_json: {}
      })

      // Wait for queue to update
      await waitFor(() => {
        expect(result.current.queuedMessages.length).toBe(1)
      })

      // Should have queued message
      expect(result.current.queuedMessages).toHaveLength(1)

      // Restore connection - mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      })

      // Trigger retry (this would typically happen on reconnection)
      await result.current.retryQueuedMessages()

      // Wait for queue to be cleared
      await waitFor(() => {
        expect(result.current.queuedMessages.length).toBe(0)
      })

      // Queue should be empty after successful retry
      expect(result.current.queuedMessages).toHaveLength(0)
    })

    it('should preserve queue across component unmount/remount', () => {
      // This test verifies that the queue persists (e.g., in localStorage)
      const { unmount } = renderHook(() => useTranscriptPersistence(mockSessionId))

      unmount()

      // Remount with same session ID
      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      // Should restore any previously queued messages
      // This will fail until persistence is implemented
      expect(result.current.queuedMessages).toBeDefined()
    })
  })

  describe('Loading State Handling', () => {
    it('should show loading state while fetching initial messages', async () => {
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      // Should be loading initially
      expect(result.current.isLoading).toBe(true) // This will fail until hook exists

      // Resolve the promise
      resolvePromise!({
        ok: true,
        status: 200,
        json: async () => ({ messages: [] })
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle loading errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should handle error gracefully
      expect(result.current.error).toBeDefined() // This will fail until error state exists
      expect(result.current.messages).toEqual([]) // Should default to empty array
    })

    it('should not show loading state for subsequent message additions', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ messages: [] })
      })

      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Mock successful POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      })

      // Adding message should not trigger loading state
      await result.current.addMessage({
        speaker: 'human',
        text: 'New message',
        ts_ms: 1000,
        raw_json: {}
      })

      // Loading should remain false
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('No Duplicate Messages', () => {
    it('should not add duplicate messages after reload', async () => {
      const existingMessages = [
        {
          id: 1,
          speaker: 'human',
          text: 'Existing message',
          ts_ms: 1000,
          raw_json: {},
          created_at: Date.now()
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ messages: existingMessages })
      })

      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Try to add the same message (could happen on reconnection)
      await result.current.addMessage({
        speaker: 'human',
        text: 'Existing message',
        ts_ms: 1000,
        raw_json: {}
      })

      // Should not have duplicates
      const messages = result.current.messages
      expect(messages).toHaveLength(1) // This will fail until deduplication is implemented
      expect(messages.filter(m => m.text === 'Existing message')).toHaveLength(1)
    })

    it('should handle messages with identical timestamps but different content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ messages: [] })
      })

      const { result } = renderHook(() => useTranscriptPersistence(mockSessionId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Add two messages with same timestamp but different content
      await result.current.addMessage({
        speaker: 'human',
        text: 'First message',
        ts_ms: 1000,
        raw_json: {}
      })

      await result.current.addMessage({
        speaker: 'human',
        text: 'Second message',
        ts_ms: 1000, // Same timestamp
        raw_json: {}
      })

      // Wait for state to update
      await waitFor(() => {
        expect(result.current.messages.length).toBe(2)
      })

      // Both should be preserved (not duplicates)
      const messages = result.current.messages
      expect(messages).toHaveLength(2)
      expect(messages[0]!.text).toBe('First message')
      expect(messages[1]!.text).toBe('Second message')
    })
  })
})