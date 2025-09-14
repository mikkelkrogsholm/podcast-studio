import { useState, useEffect, useCallback, useRef } from 'react'
import type { CreateMessageRequest } from '@podcast-studio/shared'

export interface TranscriptMessage extends CreateMessageRequest {
  id?: string
  sessionId?: string
  createdAt?: number
}

export interface UseTranscriptPersistenceResult {
  messages: TranscriptMessage[]
  isLoading: boolean
  error: string | null
  queuedMessages: TranscriptMessage[]
  addMessage: (message: CreateMessageRequest) => Promise<void>
  retryQueuedMessages: () => Promise<void>
}

// Local storage key for offline queue
const getQueueKey = (sessionId: string) => `transcript-queue-${sessionId}`

export function useTranscriptPersistence(sessionId: string): UseTranscriptPersistenceResult {
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queuedMessages, setQueuedMessages] = useState<TranscriptMessage[]>([])
  const mountedRef = useRef(true)

  // Load queued messages from localStorage on mount
  useEffect(() => {
    const queueKey = getQueueKey(sessionId)
    try {
      const stored = localStorage.getItem(queueKey)
      if (stored) {
        const parsed = JSON.parse(stored) as TranscriptMessage[]
        setQueuedMessages(parsed)
      }
    } catch (err) {
      console.error('Failed to load queued messages:', err)
    }
  }, [sessionId])

  // Save queued messages to localStorage whenever queue changes
  useEffect(() => {
    const queueKey = getQueueKey(sessionId)
    try {
      if (queuedMessages.length > 0) {
        localStorage.setItem(queueKey, JSON.stringify(queuedMessages))
      } else {
        localStorage.removeItem(queueKey)
      }
    } catch (err) {
      console.error('Failed to save queued messages:', err)
    }
  }, [sessionId, queuedMessages])

  // Fetch messages from API on mount
  useEffect(() => {
    let cancelled = false

    async function fetchMessages() {
      if (!sessionId) return

      try {
        setError(null)
        const response = await fetch(`/api/session/${sessionId}/messages`)

        if (cancelled) return

        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.status}`)
        }

        const data = await response.json()
        const fetchedMessages: TranscriptMessage[] = data.messages || []

        // Sort by timestamp to ensure chronological order
        const sortedMessages = fetchedMessages.sort((a, b) => a.ts_ms - b.ts_ms)

        setMessages(sortedMessages)
      } catch (err) {
        if (cancelled) return

        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages'
        setError(errorMessage)
        console.error('Failed to fetch messages:', err)
        // Default to empty array on error
        setMessages([])
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchMessages()

    return () => {
      cancelled = true
    }
  }, [sessionId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Deduplicate and sort messages
  const deduplicateAndSort = useCallback((newMessages: TranscriptMessage[]) => {
    // Create a map to track unique messages
    // Use a combination of timestamp, text, and speaker as the key
    const messageMap = new Map<string, TranscriptMessage>()

    newMessages.forEach(msg => {
      // Create a unique key based on timestamp, text, and speaker
      // This allows for identical timestamps with different content
      const key = `${msg.ts_ms}-${msg.text}-${msg.speaker}`
      if (!messageMap.has(key)) {
        messageMap.set(key, msg)
      }
    })

    // Convert back to array and sort chronologically
    return Array.from(messageMap.values()).sort((a, b) => {
      // Primary sort: timestamp
      if (a.ts_ms !== b.ts_ms) {
        return a.ts_ms - b.ts_ms
      }
      // Secondary sort: text to ensure consistent ordering for same timestamp
      return a.text.localeCompare(b.text)
    })
  }, [])

  // Add message to local state and post to API
  const addMessage = useCallback(async (message: CreateMessageRequest) => {
    if (!mountedRef.current) return

    // Add to local state immediately for optimistic updates
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, message]
      const sorted = deduplicateAndSort(newMessages)
      return sorted
    })

    try {
      // Try to post to API
      const response = await fetch(`/api/session/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      // If successful, message is already in local state - nothing more to do
    } catch (err) {
      console.error('Failed to post message:', err)

      // Add to offline queue for retry later
      if (mountedRef.current) {
        setQueuedMessages(prev => {
          const newQueue = [...prev, message]
          return deduplicateAndSort(newQueue)
        })
      }

      // Don't throw the error - handle gracefully
      // Note: message remains in local state for optimistic updates
    }
  }, [sessionId, deduplicateAndSort])

  // Retry queued messages
  const retryQueuedMessages = useCallback(async () => {
    if (!mountedRef.current || queuedMessages.length === 0) return

    const messagesToRetry = [...queuedMessages]

    try {
      // Try to send each queued message
      for (const message of messagesToRetry) {
        const response = await fetch(`/api/session/${sessionId}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        })

        if (!response.ok) {
          throw new Error(`Retry failed: ${response.status}`)
        }
      }

      // If all successful, clear the queue
      if (mountedRef.current) {
        setQueuedMessages([])
      }
    } catch (err) {
      console.error('Failed to retry queued messages:', err)
      // Keep messages in queue for next retry
    }
  }, [sessionId, queuedMessages])

  return {
    messages,
    isLoading,
    error,
    queuedMessages,
    addMessage,
    retryQueuedMessages
  }
}