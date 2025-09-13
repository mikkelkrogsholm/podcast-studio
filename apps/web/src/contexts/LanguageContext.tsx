'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

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
    testMode: string;
    duration: string;
    failedToCreate: string;
    failedToStart: string;
    failedToStop: string;
    failedToUpload: string;
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
    failed: string;
    initializing: string;
    pleaseConnectFirst: string;
  };
  language: {
    danish: string;
    english: string;
  };
  toolbar: {
    settings: string;
    connection: string;
    record: string;
    pause: string;
    resume: string;
    stop: string;
    interrupt: string;
    sessions: string;
  };
  ui: {
    show: string;
    hide: string;
    notConfigured: string;
    mute: string;
    on: string;
  };
  tooltips: {
    settings: string;
    connection: string;
    connectionConnected: string;
    connectionDisconnected: string;
    record: string;
    pause: string;
    resume: string;
    stop: string;
    interrupt: string;
    sessions: string;
    mute: string;
    unmute: string;
  };
  transcript: {
    title: string;
    human: string;
    ai: string;
    noMessages: string;
    willAppearHere: string;
    startSpeaking: string;
  };
  sessionRecovery: {
    title: string;
    previousSessions: string;
    resume: string;
    continueRecording: string;
    noIncompleteSessions: string;
    incompleteSessions: string;
    recoveryMessage: string;
    failedToLoad: string;
    failedToResume: string;
    stopCurrentFirst: string;
    sessionHistory: string;
    loadingSessions: string;
    errorLoadingSessions: string;
    retry: string;
    refresh: string;
    markComplete: string;
    noSessionsFound: string;
    current: string;
    created: string;
    completed: string;
    lastActivity: string;
    audioFiles: string;
    resumeRecording: string;
    markAsComplete: string;
    failedToLoadDetails: string;
    showingLatest: string;
    statusActive: string;
    statusIncomplete: string;
    statusCompleted: string;
  };
  alerts: {
    pleaseConnectFirst: string;
    failedToCreateSession: string;
    failedToLoadSession: string;
    failedToResumeSession: string;
    stopCurrentRecording: string;
  };
  settings: {
    title: string;
    model: string;
    voice: string;
    temperature: string;
    topP: string;
    language: string;
    silenceThreshold: string;
    lockedMessage: string;
    validationError: string;
    notSupportedInRealtime: string;
    pleaseFixErrors: string;
    personaPrompt: string;
    contextPrompt: string;
    personaPlaceholder: string;
    contextPlaceholder: string;
    characterCount: string;
    tooLong: string;
    personaLocked: string;
  };
  download: {
    title: string;
    downloadMikkelAudio: string;
    downloadFrejaAudio: string;
    downloadTranscriptJson: string;
    downloadTranscriptMarkdown: string;
    downloading: string;
    downloadFailed: string;
    noAudioFiles: string;
  };
  sessionManagement: {
    stoppingSesssion: string;
    sessionStopped: string;
    failedToStopSession: string;
    aiInterrupted: string;
    reconnecting: string;
    reconnectFailed: string;
    maxReconnectAttempts: string;
  };
  sessionHistory: {
    title: string;
    noSessions: string;
    titleColumn: string;
    dateColumn: string;
    durationColumn: string;
    statusColumn: string;
    backToSessions: string;
    sessionNotFound: string;
    loadingError: string;
    next: string;
    previous: string;
    downloadHuman: string;
    downloadAi: string;
    downloadTranscript: string;
    downloadSession: string;
    messageCount: string;
    personaPrompt: string;
    contextPrompt: string;
    sessionDetails: string;
    audioFiles: string;
    downloads: string;
    transcriptPreview: string;
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
      testMode: 'Testindstilling',
      duration: 'Varighed',
      failedToCreate: 'Kunne ikke oprette session',
      failedToStart: 'Kunne ikke starte optagelse',
      failedToStop: 'Kunne ikke stoppe optagelse',
      failedToUpload: 'Kunne ikke uploade lydfil',
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
      failed: 'Fejlet',
      initializing: 'Initialiserer...',
      pleaseConnectFirst: 'Forbind venligst til OpenAI først',
    },
    language: {
      danish: 'Dansk',
      english: 'English',
    },
    toolbar: {
      settings: 'Indstillinger',
      connection: 'Forbindelse',
      record: 'Start',
      pause: 'Pause',
      resume: 'Fortsæt',
      stop: 'Stop',
      interrupt: 'Afbryd',
      sessions: 'Sessioner',
    },
    ui: {
      show: 'Vis',
      hide: 'Skjul',
      notConfigured: 'Indstillinger er ikke sat endnu.',
      mute: 'Slå lyd fra',
      on: 'Tænd',
    },
    tooltips: {
      settings: 'Indstillinger',
      connection: 'Forbindelse',
      connectionConnected: 'Forbundet',
      connectionDisconnected: 'Afbrudt',
      record: 'Start optagelse',
      pause: 'Pause',
      resume: 'Fortsæt',
      stop: 'Stop optagelse og afslut session',
      interrupt: 'Afbryd AI tale',
      sessions: 'Sessioner',
      mute: 'Slå lyd fra',
      unmute: 'Slå lyd til',
    },
    transcript: {
      title: 'Transkription',
      human: 'Menneske',
      ai: 'AI',
      noMessages: 'Ingen beskeder endnu',
      willAppearHere: 'Transkription vil blive vist her under optagelse...',
      startSpeaking: 'Begynd at tale for at se live transkription',
    },
    sessionRecovery: {
      title: 'Sessionsgendannelse',
      previousSessions: 'Tidligere sessioner',
      resume: 'Genoptag',
      continueRecording: 'Fortsæt optagelse',
      noIncompleteSessions: 'Ingen ufuldstændige sessioner',
      incompleteSessions: 'Ufuldstændige sessioner fundet',
      recoveryMessage: 'Nogle optagelser blev afbrudt og kan indeholde gendannelig lyddata.',
      failedToLoad: 'Kunne ikke indlæse session',
      failedToResume: 'Kunne ikke genoptage session',
      stopCurrentFirst: 'Stop venligst den nuværende optagelse først',
      sessionHistory: 'Sessionshistorik',
      loadingSessions: 'Indlæser sessioner...',
      errorLoadingSessions: 'Fejl ved indlæsning af sessioner',
      retry: 'Prøv igen',
      refresh: 'Opdater',
      markComplete: 'Marker afsluttet',
      noSessionsFound: 'Ingen sessioner fundet.',
      current: 'Nuværende',
      created: 'Oprettet',
      completed: 'Afsluttet',
      lastActivity: 'Sidste aktivitet',
      audioFiles: 'Lydfiler',
      resumeRecording: 'Genoptag optagelse',
      markAsComplete: 'Marker som afsluttet',
      failedToLoadDetails: 'Kunne ikke indlæse sessionsdetaljer.',
      showingLatest: 'Viser de seneste 10 sessioner af {total} i alt',
      statusActive: 'Aktiv',
      statusIncomplete: 'Ufuldstændig',
      statusCompleted: 'Afsluttet',
    },
    alerts: {
      pleaseConnectFirst: 'Forbind venligst til OpenAI først',
      failedToCreateSession: 'Kunne ikke oprette session',
      failedToLoadSession: 'Kunne ikke indlæse sessionsdetaljer',
      failedToResumeSession: 'Kunne ikke genoptage session',
      stopCurrentRecording: 'Stop venligst den nuværende optagelse først',
    },
    settings: {
      title: 'Indstillinger',
      model: 'Model',
      voice: 'Stemme',
      temperature: 'Temperatur',
      topP: 'Top P',
      language: 'Sprog',
      silenceThreshold: 'Stilhedstærskel',
      lockedMessage: 'Indstillinger er låst under optagelse',
      validationError: 'Ugyldig værdi',
      notSupportedInRealtime: 'Ikke understøttet i nuværende model',
      pleaseFixErrors: 'Ret venligst fejlene før du fortsætter',
      personaPrompt: 'Persona (Freja)',
      contextPrompt: 'Dagens kontekst',
      personaPlaceholder: 'Beskriv hvordan Freja skal opføre sig som AI co-host...',
      contextPlaceholder: 'Beskriv dagens emne eller kontekst for samtalen...',
      characterCount: 'tegn',
      tooLong: 'For langt (maks 5000 tegn)',
      personaLocked: 'Persona låst',
    },
    download: {
      title: 'Downloads',
      downloadMikkelAudio: 'Download Mikkels lydspor',
      downloadFrejaAudio: 'Download Frejas lydspor',
      downloadTranscriptJson: 'Download transkription (JSON)',
      downloadTranscriptMarkdown: 'Download transkription (Markdown)',
      downloading: 'Downloader...',
      downloadFailed: 'Download fejlede',
      noAudioFiles: 'Ingen lydfiler tilgængelige',
    },
    sessionManagement: {
      stoppingSesssion: 'Stopper session...',
      sessionStopped: 'Session stoppet',
      failedToStopSession: 'Kunne ikke stoppe session',
      aiInterrupted: 'AI afbrudt',
      reconnecting: 'Genopretter forbindelse...',
      reconnectFailed: 'Genopretning fejlede',
      maxReconnectAttempts: 'Maksimale genopretningsforsøg nået',
    },
    sessionHistory: {
      title: 'Sessionshistorik',
      noSessions: 'Ingen sessioner fundet',
      titleColumn: 'Titel',
      dateColumn: 'Dato',
      durationColumn: 'Varighed',
      statusColumn: 'Status',
      backToSessions: 'Tilbage til Sessioner',
      sessionNotFound: 'Session ikke fundet',
      loadingError: 'Fejl ved indlæsning',
      next: 'Næste',
      previous: 'Forrige',
      downloadHuman: 'Download Mikkels lydspor',
      downloadAi: 'Download Frejas lydspor',
      downloadTranscript: 'Download Transskription',
      downloadSession: 'Download Session',
      messageCount: 'beskeder',
      personaPrompt: 'Persona Prompt',
      contextPrompt: 'Kontekst Prompt',
      sessionDetails: 'Sessionsdetaljer',
      audioFiles: 'Lydfiler',
      downloads: 'Downloads',
      transcriptPreview: 'Transskriptionsforhåndsvisning',
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
      testMode: 'Test Mode',
      duration: 'Duration',
      failedToCreate: 'Failed to create session',
      failedToStart: 'Failed to start recording',
      failedToStop: 'Failed to stop recording',
      failedToUpload: 'Failed to upload audio file',
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
      failed: 'Failed',
      initializing: 'Initializing...',
      pleaseConnectFirst: 'Please connect to OpenAI first',
    },
    language: {
      danish: 'Dansk',
      english: 'English',
    },
    toolbar: {
      settings: 'Settings',
      connection: 'Connection',
      record: 'Record',
      pause: 'Pause',
      resume: 'Resume',
      stop: 'Stop',
      interrupt: 'Interrupt',
      sessions: 'Sessions',
    },
    ui: {
      show: 'Show',
      hide: 'Hide',
      notConfigured: 'Settings are not configured yet.',
      mute: 'Mute',
      on: 'On',
    },
    tooltips: {
      settings: 'Settings',
      connection: 'Connection',
      connectionConnected: 'Connected',
      connectionDisconnected: 'Disconnected',
      record: 'Start recording',
      pause: 'Pause',
      resume: 'Resume',
      stop: 'Stop recording and finish session',
      interrupt: 'Interrupt AI speech',
      sessions: 'Sessions',
      mute: 'Mute',
      unmute: 'Unmute',
    },
    transcript: {
      title: 'Transcript',
      human: 'Human',
      ai: 'AI',
      noMessages: 'No messages yet',
      willAppearHere: 'Transcript will appear here during recording...',
      startSpeaking: 'Start speaking to see live transcription',
    },
    sessionRecovery: {
      title: 'Session Recovery',
      previousSessions: 'Previous Sessions',
      resume: 'Resume',
      continueRecording: 'Continue Recording',
      noIncompleteSessions: 'No incomplete sessions',
      incompleteSessions: 'Incomplete Sessions Found',
      recoveryMessage: 'Some recording sessions were interrupted and may contain recoverable audio data.',
      failedToLoad: 'Failed to load session',
      failedToResume: 'Failed to resume session',
      stopCurrentFirst: 'Please stop the current recording first',
      sessionHistory: 'Session History',
      loadingSessions: 'Loading sessions...',
      errorLoadingSessions: 'Error loading sessions',
      retry: 'Retry',
      refresh: 'Refresh',
      markComplete: 'Mark Complete',
      noSessionsFound: 'No sessions found.',
      current: 'Current',
      created: 'Created',
      completed: 'Completed',
      lastActivity: 'Last activity',
      audioFiles: 'Audio Files',
      resumeRecording: 'Resume Recording',
      markAsComplete: 'Mark as Complete',
      failedToLoadDetails: 'Failed to load session details.',
      showingLatest: 'Showing latest 10 sessions of {total} total',
      statusActive: 'Active',
      statusIncomplete: 'Incomplete',
      statusCompleted: 'Completed',
    },
    alerts: {
      pleaseConnectFirst: 'Please connect to OpenAI first',
      failedToCreateSession: 'Failed to create session',
      failedToLoadSession: 'Failed to load session details',
      failedToResumeSession: 'Failed to resume session',
      stopCurrentRecording: 'Please stop the current recording first',
    },
    settings: {
      title: 'Settings',
      model: 'Model',
      voice: 'Voice',
      temperature: 'Temperature',
      topP: 'Top P',
      language: 'Language',
      silenceThreshold: 'Silence Threshold',
      lockedMessage: 'Settings are locked during recording',
      validationError: 'Invalid value',
      notSupportedInRealtime: 'Not supported in current model',
      pleaseFixErrors: 'Please fix the errors before continuing',
      personaPrompt: 'Persona (Freja)',
      contextPrompt: 'Today\'s Context',
      personaPlaceholder: 'Describe how Freja should behave as AI co-host...',
      contextPlaceholder: 'Describe today\'s topic or conversation context...',
      characterCount: 'characters',
      tooLong: 'Too long (max 5000 characters)',
      personaLocked: 'Persona locked',
    },
    download: {
      title: 'Downloads',
      downloadMikkelAudio: 'Download Mikkel\'s Audio',
      downloadFrejaAudio: 'Download Freja\'s Audio',
      downloadTranscriptJson: 'Download Transcript (JSON)',
      downloadTranscriptMarkdown: 'Download Transcript (Markdown)',
      downloading: 'Downloading...',
      downloadFailed: 'Download failed',
      noAudioFiles: 'No audio files available',
    },
    sessionManagement: {
      stoppingSesssion: 'Stopping session...',
      sessionStopped: 'Session stopped',
      failedToStopSession: 'Failed to stop session',
      aiInterrupted: 'AI interrupted',
      reconnecting: 'Reconnecting...',
      reconnectFailed: 'Reconnection failed',
      maxReconnectAttempts: 'Maximum reconnection attempts reached',
    },
    sessionHistory: {
      title: 'Session History',
      noSessions: 'No sessions found',
      titleColumn: 'Title',
      dateColumn: 'Date',
      durationColumn: 'Duration',
      statusColumn: 'Status',
      backToSessions: 'Back to Sessions',
      sessionNotFound: 'Session not found',
      loadingError: 'Loading error',
      next: 'Next',
      previous: 'Previous',
      downloadHuman: 'Download Mikkel\'s Audio',
      downloadAi: 'Download Freja\'s Audio',
      downloadTranscript: 'Download Transcript',
      downloadSession: 'Download Session',
      messageCount: 'messages',
      personaPrompt: 'Persona Prompt',
      contextPrompt: 'Context Prompt',
      sessionDetails: 'Session Details',
      audioFiles: 'Audio Files',
      downloads: 'Downloads',
      transcriptPreview: 'Transcript Preview',
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

  // Load saved language and sync <html lang>
  React.useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('ui-language') : null;
    if (saved === 'da' || saved === 'en') setLanguage(saved);
  }, []);

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('ui-language', language);
    }
  }, [language]);

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
