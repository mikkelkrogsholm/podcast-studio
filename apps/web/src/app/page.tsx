'use client';

import { useRealtimeConnection } from '../hooks/useRealtimeConnection';

export default function HomePage() {
  const { status, events, connect, disconnect } = useRealtimeConnection();

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
      <h1 className="text-2xl font-bold mb-6">App ready</h1>
      
      <div className="mb-8">
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