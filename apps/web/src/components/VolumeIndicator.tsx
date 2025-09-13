interface VolumeIndicatorProps {
  level: number; // 0-100
  label: string;
  isMuted: boolean;
  onMuteToggle: () => void;
}

export function VolumeIndicator({ level, label, isMuted, onMuteToggle }: VolumeIndicatorProps) {
  // Create volume bars (10 segments)
  const segments = 10;
  const activeSegments = Math.ceil((level / 100) * segments);

  return (
    <div className="flex items-center gap-3 p-3 bg-elevated rounded-xl shadow-soft">
      <div className="flex items-center gap-2 min-w-[80px]">
        <span className="text-sm font-medium text-ink">{label}</span>
        <button
          onClick={onMuteToggle}
          className={`p-1 rounded ${
            isMuted 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-white/70 text-ink hover:bg-white'
          } transition-colors`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            // Muted icon
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            // Unmuted icon
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="flex-1">
        <div className="flex gap-1 items-end h-8">
          {Array.from({ length: segments }, (_, i) => {
            const isActive = !isMuted && i < activeSegments;
            const height = `${((i + 1) / segments) * 100}%`;
            
            // Color based on level (green -> yellow -> red)
            let bgColor = 'bg-[rgba(0,0,0,0.08)]';
            if (isActive) {
              if (i < segments * 0.6) {
                bgColor = 'bg-green-500';
              } else if (i < segments * 0.8) {
                bgColor = 'bg-yellow-500';
              } else {
                bgColor = 'bg-red-500';
              }
            }
            
            return (
              <div
                key={i}
                className={`w-2 ${bgColor} rounded-sm transition-all duration-100`}
                style={{ height }}
              />
            );
          })}
        </div>
      </div>
      
      <div className="text-xs text-ink-muted min-w-[40px] text-right">
        {isMuted ? 'MUTE' : `${Math.round(level)}%`}
      </div>
    </div>
  );
}
