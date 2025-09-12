'use client';

import { useRealtimeConnection } from '../hooks/useRealtimeConnection';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { useState } from 'react';

export default function HomePage() {
  const { status, events, connect, disconnect } = useRealtimeConnection();
  const { 
    status: recordingStatus, 
    isRecording, 
    error: recordingError, 
    recordedDuration, 
    startRecording, 
    stopRecording 
  } = useAudioRecording();
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const handleStartRecording = async () => {
    if (isRecording) {
      return;
    }

    try {
      // Create a new session
      const response = await fetch('http://localhost:4201/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Recording ${new Date().toLocaleString()}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const { sessionId } = await response.json();
      setCurrentSessionId(sessionId);
      await startRecording(sessionId);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    await stopRecording();
    setCurrentSessionId(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConnect = () => {
    if (status === 'disconnected' || status === 'error') {
      connect();
    } else if (status === 'connected') {
      disconnect();
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Connect';
      default:
        return 'Connect';
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Podcast Studio</h1>
      
      {/* Recording Section */}
      <div className="mb-8 p-6 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Audio Recording</h2>
        
        <div className="flex items-center space-x-4 mb-4">
          <button 
            onClick={handleStartRecording}
            disabled={isRecording || recordingStatus === 'requesting-permission'}
            className={`
              px-6 py-3 rounded-lg font-medium transition-colors
              ${isRecording 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : recordingStatus === 'requesting-permission'
                ? 'bg-yellow-500 text-white cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white'
              }
            `}
          >
            {recordingStatus === 'requesting-permission' ? 'Requesting Permission...' : 'Start Recording'}
          </button>
          
          <button 
            onClick={handleStopRecording}
            disabled={!isRecording}
            className={`
              px-6 py-3 rounded-lg font-medium transition-colors
              ${!isRecording 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
              }
            `}
          >
            Stop Recording
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Status:</span>
            <span className={`
              capitalize font-medium text-sm
              ${recordingStatus === 'recording' ? 'text-red-600' : ''}
              ${recordingStatus === 'requesting-permission' ? 'text-yellow-600' : ''}
              ${recordingStatus === 'error' ? 'text-red-600' : ''}
              ${recordingStatus === 'idle' ? 'text-gray-600' : ''}
            `}>
              {recordingStatus === 'recording' ? `Recording (${formatTime(recordedDuration)})` : recordingStatus}
            </span>
          </div>
          
          {currentSessionId && (
            <div className="text-sm text-gray-600">
              Session ID: {currentSessionId}
            </div>
          )}
          
          {recordingError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {recordingError}
            </div>
          )}
        </div>
      </div>
      
      {/* Connection Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">OpenAI Connection</h2>
        <button 
          onClick={handleConnect}
          disabled={status === 'connecting' || status === 'connected'}
          className={`
            px-6 py-3 rounded-lg font-medium transition-colors
            ${status === 'connected' 
              ? 'bg-green-500 text-white cursor-not-allowed' 
              : status === 'connecting'
              ? 'bg-yellow-500 text-white cursor-not-allowed'
              : status === 'error'
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }
            ${(status === 'connecting' || status === 'connected') ? 'opacity-75' : ''}
          `}
        >
          {getButtonText()}
        </button>
        
        <div className="mt-4">
          <span className="text-sm font-medium">Status: </span>
          <span className={`
            capitalize font-medium
            ${status === 'connected' ? 'text-green-600' : ''}
            ${status === 'connecting' ? 'text-yellow-600' : ''}
            ${status === 'error' ? 'text-red-600' : ''}
            ${status === 'disconnected' ? 'text-gray-600' : ''}
          `}>
            {status}
          </span>
        </div>
      </div>

      {events.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Connection Events</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event, index) => (
              <div 
                key={index} 
                className="flex justify-between items-start text-sm border-b border-gray-200 pb-2"
              >
                <div className="flex-1">
                  <span className={`
                    font-medium capitalize
                    ${event.status === 'connected' ? 'text-green-600' : ''}
                    ${event.status === 'connecting' ? 'text-yellow-600' : ''}
                    ${event.status === 'error' ? 'text-red-600' : ''}
                    ${event.status === 'disconnected' ? 'text-gray-600' : ''}
                  `}>
                    {event.status}
                  </span>
                  {event.message && (
                    <span className="ml-2 text-gray-700">
                      - {event.message}
                    </span>
                  )}
                </div>
                <span className="text-gray-500 text-xs ml-4">
                  {event.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}