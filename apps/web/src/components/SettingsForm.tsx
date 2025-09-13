"use client";

import { useState, useEffect } from 'react';
import { Settings, SettingsSchema } from '@podcast-studio/shared';
import { useLanguage } from '../contexts/LanguageContext';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { TextArea } from '../ui/TextArea';

interface SettingsFormProps {
  onSettingsChange: (settings: Settings | null) => void;
  disabled?: boolean;
}

const defaultSettings: Settings = {
  model: 'gpt-realtime',
  voice: 'cedar',
  temperature: 0.8,
  top_p: 1.0,
  language: 'da-DK',
  silence_ms: 900,
  persona_prompt: '',
  context_prompt: '',
};

interface ValidationErrors {
  [key: string]: string | undefined;
}

export function SettingsForm({ onSettingsChange, disabled = false }: SettingsFormProps) {
  const { t } = useLanguage();

  // Initialize settings from localStorage using lazy initialization
  const [settings, setSettings] = useState<Settings>(() => {
    const savedSettings = localStorage.getItem('podcast-studio-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Merge with defaults to ensure all fields are present
        const mergedSettings = {
          ...defaultSettings,
          ...parsed,
          // Ensure persona and context prompts are strings (use nullish coalescing to preserve empty strings)
          persona_prompt: parsed.persona_prompt ?? '',
          context_prompt: parsed.context_prompt ?? ''
        };
        const validatedSettings = SettingsSchema.parse(mergedSettings);
        return validatedSettings;
      } catch (error) {
        console.warn('Invalid saved settings, using defaults', error);
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showSaved, setShowSaved] = useState(false);

  // Notify parent when settings change (separate effect)
  useEffect(() => {
    const hasErrors = Object.values(errors).some(Boolean);
    if (!hasErrors) {
      try {
        const validatedSettings = SettingsSchema.parse(settings);
        onSettingsChange(validatedSettings);
      } catch (validationError) {
        onSettingsChange(null);
      }
    } else {
      onSettingsChange(null);
    }
  }, [settings, errors, onSettingsChange]);

  // Save settings to localStorage when changed
  useEffect(() => {
    localStorage.setItem('podcast-studio-settings', JSON.stringify(settings));

    // Show saved confirmation
    setShowSaved(true);
    const timer = setTimeout(() => {
      setShowSaved(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [settings]);

  const validateField = (field: keyof Settings, value: any): string | null => {
    try {
      const fieldSchema = SettingsSchema.shape[field];
      fieldSchema.parse(value);
      return null;
    } catch (error: any) {
      // Custom error messages for specific validation cases
      if (field === 'temperature' || field === 'top_p') {
        if (value < 0.0 || value > 1.0) {
          return 'must be between 0.0 and 1.0';
        }
      }
      if (field === 'silence_ms') {
        if (value <= 0) {
          return 'must be positive';
        }
      }
      if (field === 'persona_prompt' || field === 'context_prompt') {
        if (typeof value === 'string' && value.length > 5000) {
          return t.settings.tooLong;
        }
      }
      return error.errors?.[0]?.message || t.settings.validationError;
    }
  };

  const handleChange = (field: keyof Settings, value: any) => {
    if (disabled) return;

    let parsedValue = value;

    // Convert string inputs to numbers for numeric fields
    if (field === 'temperature' || field === 'top_p') {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) return;
    } else if (field === 'silence_ms') {
      parsedValue = parseInt(value, 10);
      if (isNaN(parsedValue)) return;
    }

    const error = validateField(field, parsedValue);

    setErrors(prev => ({
      ...prev,
      [field]: error || undefined,
    }));

    const newSettings = {
      ...settings,
      [field]: parsedValue,
    };
    setSettings(newSettings);

    // Only update parent if there are no errors
    const hasErrors = Object.values({ ...errors, [field]: error }).some(Boolean);
    if (!hasErrors) {
      try {
        const validatedSettings = SettingsSchema.parse(newSettings);
        onSettingsChange(validatedSettings);
      } catch (validationError) {
        // Settings are not fully valid yet
        onSettingsChange(null);
      }
    } else {
      onSettingsChange(null);
    }
  };

  const handleBlur = (field: keyof Settings) => {
    const value = settings[field];
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error || undefined,
    }));

    // Re-validate the complete settings after blur
    const hasErrors = Object.values({ ...errors, [field]: error }).some(Boolean);
    if (!hasErrors) {
      try {
        const validatedSettings = SettingsSchema.parse(settings);
        onSettingsChange(validatedSettings);
      } catch (validationError) {
        onSettingsChange(null);
      }
    } else {
      onSettingsChange(null);
    }
  };

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="space-y-4">
      {/* Saved confirmation */}
      {showSaved && (
        <div
          className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm flex items-center gap-2"
          data-testid="settings-saved-message"
        >
          <span className="text-green-600">✓</span>
          <span>{t.settings.savedSuccessfully || 'Settings saved successfully'}</span>
        </div>
      )}

      {disabled && (
        <div
          className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm"
          data-testid="settings-locked-message"
        >
          {t.settings.lockedMessage}
        </div>
      )}

      <form data-testid="settings-form" className="space-y-4">
        {/* Model Selector */}
        <div>
          <label htmlFor="model" className="block text-sm font-medium mb-1 text-ink">
            {t.settings.model}
          </label>
          <Select
            id="model"
            name="model"
            value={settings.model}
            onChange={(e) => handleChange('model', e.target.value)}
            disabled={disabled}
          >
            <option value="gpt-realtime">GPT Realtime (Latest)</option>
            <option value="gpt-4o-realtime-preview">GPT-4o Realtime Preview (Legacy)</option>
          </Select>
        </div>

        {/* Voice Selector */}
        <div>
          <label htmlFor="voice" className="block text-sm font-medium mb-1 text-ink">
            {t.settings.voice}
          </label>
          <Select
            id="voice"
            name="voice"
            value={settings.voice}
            onChange={(e) => handleChange('voice', e.target.value)}
            disabled={disabled}
          >
            <option value="cedar">Cedar</option>
            <option value="marin">Marin</option>
            <option value="ash">Ash</option>
            <option value="ballad">Ballad</option>
            <option value="coral">Coral</option>
            <option value="sage">Sage</option>
            <option value="verse">Verse</option>
            <option value="alloy">Alloy</option>
          </Select>
        </div>

        {/* Temperature Slider */}
        <div>
          <label htmlFor="temperature" className="block text-sm font-medium mb-1 text-ink">
            {t.settings.temperature}: {settings['temperature'].toFixed(1)}
            <span className="text-xs text-amber-600 ml-2">
              ⚠️ {t.settings.notSupportedInRealtime || 'Not supported in current models'}
            </span>
          </label>
          <Input
            id="temperature"
            name="temperature"
            type="number"
            min="0.0"
            max="1.0"
            step="0.1"
            value={settings['temperature'].toFixed(1)}
            onChange={(e) => handleChange('temperature', e.target.value)}
            onBlur={() => handleBlur('temperature')}
            disabled={true}
            className="opacity-50 cursor-not-allowed"
          />
          {errors['temperature'] && (
            <div data-testid="temperature-error" className="mt-1 text-sm text-red-600">
              {errors['temperature']}
            </div>
          )}
        </div>

        {/* Top P Slider */}
        <div>
          <label htmlFor="top_p" className="block text-sm font-medium mb-1 text-ink">
            {t.settings.topP}: {settings['top_p'].toFixed(1)}
            <span className="text-xs text-amber-600 ml-2">
              ⚠️ {t.settings.notSupportedInRealtime || 'Not supported in current models'}
            </span>
          </label>
          <Input
            id="top_p"
            name="top_p"
            type="number"
            min="0.0"
            max="1.0"
            step="0.1"
            value={settings['top_p'].toFixed(1)}
            onChange={(e) => handleChange('top_p', e.target.value)}
            onBlur={() => handleBlur('top_p')}
            disabled={true}
            className="opacity-50 cursor-not-allowed"
          />
          {errors['top_p'] && (
            <div data-testid="top_p-error" className="mt-1 text-sm text-red-600">
              {errors['top_p']}
            </div>
          )}
        </div>

        {/* Language Selector */}
        <div>
          <label htmlFor="language" className="block text-sm font-medium mb-1 text-ink">
            {t.settings.language}
          </label>
          <Select
            id="language"
            name="language"
            value={settings.language}
            onChange={(e) => handleChange('language', e.target.value)}
            disabled={disabled}
          >
            <option value="da-DK">Dansk (da-DK)</option>
            <option value="en-US">English (en-US)</option>
          </Select>
        </div>

        {/* Silence Threshold */}
        <div>
          <label htmlFor="silence_ms" className="block text-sm font-medium mb-1 text-ink">
            {t.settings.silenceThreshold} (ms)
          </label>
          <Input
            id="silence_ms"
            name="silence_ms"
            type="number"
            min="100"
            max="5000"
            step="100"
            value={settings['silence_ms']}
            onChange={(e) => handleChange('silence_ms', e.target.value)}
            onBlur={() => handleBlur('silence_ms')}
            disabled={disabled}
          />
          {errors['silence_ms'] && (
            <div data-testid="silence_ms-error" className="mt-1 text-sm text-red-600">
              {errors['silence_ms']}
            </div>
          )}
        </div>

        {/* Persona Prompt */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="persona_prompt" className="block text-sm font-medium text-ink">
              {t.settings.personaPrompt}
            </label>
            {disabled && (
              <span
                data-testid="persona-locked-badge"
                className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded"
              >
                {t.settings.personaLocked}
              </span>
            )}
          </div>
          <TextArea
            id="persona_prompt"
            name="persona_prompt"
            data-testid="persona-prompt"
            rows={4}
            placeholder={t.settings.personaPlaceholder}
            value={settings.persona_prompt || ''}
            onChange={(e) => handleChange('persona_prompt', e.target.value)}
            onBlur={() => handleBlur('persona_prompt')}
            disabled={disabled}
          />
          <div className="flex items-center justify-between mt-1">
            <div
              data-testid="persona-char-count"
              className={`text-xs ${
                (settings.persona_prompt?.length || 0) > 4500
                  ? 'text-red-600 font-medium'
                  : (settings.persona_prompt?.length || 0) > 4000
                  ? 'text-yellow-600 font-medium'
                  : 'text-gray-500'
              }`}
            >
              {settings.persona_prompt?.length || 0}/5000 {t.settings.characterCount}
            </div>
          </div>
          {errors['persona_prompt'] && (
            <div data-testid="persona-error" className="mt-1 text-sm text-red-600">
              {errors['persona_prompt']}
            </div>
          )}
        </div>

        {/* Context Prompt */}
        <div>
          <label htmlFor="context_prompt" className="block text-sm font-medium text-ink mb-1">
            {t.settings.contextPrompt}
          </label>
          <TextArea
            id="context_prompt"
            name="context_prompt"
            data-testid="context-prompt"
            rows={4}
            placeholder={t.settings.contextPlaceholder}
            value={settings.context_prompt || ''}
            onChange={(e) => handleChange('context_prompt', e.target.value)}
            onBlur={() => handleBlur('context_prompt')}
            disabled={disabled}
          />
          <div className="flex items-center justify-between mt-1">
            <div
              data-testid="context-char-count"
              className={`text-xs ${
                (settings.context_prompt?.length || 0) > 4500
                  ? 'text-red-600 font-medium'
                  : (settings.context_prompt?.length || 0) > 4000
                  ? 'text-yellow-600 font-medium'
                  : 'text-gray-500'
              }`}
            >
              {settings.context_prompt?.length || 0}/5000 {t.settings.characterCount}
            </div>
          </div>
          {errors['context_prompt'] && (
            <div data-testid="context-error" className="mt-1 text-sm text-red-600">
              {errors['context_prompt']}
            </div>
          )}
        </div>

        {hasErrors && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
            {t.settings.pleaseFixErrors}
          </div>
        )}
      </form>
    </div>
  );
}