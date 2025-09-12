'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'da' | 'en';

interface Translations {
  title: string;
  audioRecording: {
    title: string;
    startRecording: string;
    stopRecording: string;
    requestingPermission: string;
    status: string;
    recording: string;
    idle: string;
    error: string;
    sessionId: string;
  };
  openaiConnection: {
    title: string;
    connect: string;
    disconnect: string;
    connecting: string;
    connected: string;
    disconnected: string;
    status: string;
    connectionEvents: string;
  };
  language: {
    danish: string;
    english: string;
  };
}

const translations: Record<Language, Translations> = {
  da: {
    title: 'Podcast Studio',
    audioRecording: {
      title: 'Lydoptagelse',
      startRecording: 'Start Optagelse',
      stopRecording: 'Stop Optagelse',
      requestingPermission: 'Anmoder om tilladelse...',
      status: 'Status',
      recording: 'Optager',
      idle: 'Klar',
      error: 'Fejl',
      sessionId: 'Sessions ID',
    },
    openaiConnection: {
      title: 'OpenAI Forbindelse',
      connect: 'Forbind',
      disconnect: 'Afbryd',
      connecting: 'Forbinder...',
      connected: 'Forbundet',
      disconnected: 'Afbrudt',
      status: 'Status',
      connectionEvents: 'Forbindelseshændelser',
    },
    language: {
      danish: 'Dansk',
      english: 'English',
    },
  },
  en: {
    title: 'Podcast Studio',
    audioRecording: {
      title: 'Audio Recording',
      startRecording: 'Start Recording',
      stopRecording: 'Stop Recording',
      requestingPermission: 'Requesting Permission...',
      status: 'Status',
      recording: 'Recording',
      idle: 'Idle',
      error: 'Error',
      sessionId: 'Session ID',
    },
    openaiConnection: {
      title: 'OpenAI Connection',
      connect: 'Connect',
      disconnect: 'Disconnect',
      connecting: 'Connecting...',
      connected: 'Connected',
      disconnected: 'Disconnected',
      status: 'Status',
      connectionEvents: 'Connection Events',
    },
    language: {
      danish: 'Dansk',
      english: 'English',
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('da'); // Default to Danish

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}