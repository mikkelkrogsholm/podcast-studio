'use client';

import { Settings } from '@podcast-studio/shared';
import { useLanguage } from '../contexts/LanguageContext';

interface CurrentSettingsProps {
  settings: Settings;
}

export function CurrentSettings({ settings }: CurrentSettingsProps) {
  const { t } = useLanguage();

  return (
    <div data-testid="current-settings" className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="font-medium text-blue-900 mb-2">{t.settings.title}</h3>
      <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
        <div>
          <span className="font-medium">{t.settings.voice}:</span> {settings.voice}
        </div>
        <div>
          <span className="font-medium">{t.settings.temperature}:</span> {settings.temperature}
        </div>
        <div>
          <span className="font-medium">{t.settings.topP}:</span> {settings.top_p}
        </div>
        <div>
          <span className="font-medium">{t.settings.language}:</span> {settings.language}
        </div>
        <div className="col-span-2">
          <span className="font-medium">VAD {t.settings.silenceThreshold}:</span> {settings.silence_ms}ms
        </div>
      </div>
    </div>
  );
}