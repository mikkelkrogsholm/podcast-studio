import { VolumeIndicator } from './VolumeIndicator';

interface VolumeLevel {
  mikkel: number;
  freja: number;
}

interface MuteState {
  mikkel: boolean;
  freja: boolean;
}

interface DualTrackControlsProps {
  volumeLevels: VolumeLevel;
  muteState: MuteState;
  isRecording: boolean;
  onMuteToggle: (track: 'mikkel' | 'freja', muted: boolean) => void;
}

export function DualTrackControls({ 
  volumeLevels, 
  muteState, 
  isRecording,
  onMuteToggle 
}: DualTrackControlsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-800">Audio Levels</h3>
      
      <div className="space-y-3">
        <VolumeIndicator
          level={volumeLevels.mikkel}
          label="Mikkel"
          isMuted={muteState.mikkel}
          onMuteToggle={() => onMuteToggle('mikkel', !muteState.mikkel)}
        />
        
        <VolumeIndicator
          level={volumeLevels.freja}
          label="Freja"
          isMuted={muteState.freja}
          onMuteToggle={() => onMuteToggle('freja', !muteState.freja)}
        />
      </div>
      
      {!isRecording && (
        <p className="text-sm text-gray-500 mt-2">
          Start recording to see live audio levels
        </p>
      )}
    </div>
  );
}