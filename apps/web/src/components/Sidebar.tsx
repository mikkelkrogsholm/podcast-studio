import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  current?: 'home' | 'sessions' | 'settings';
}

export function Sidebar({ current = 'home' }: SidebarProps) {
  const { language, setLanguage, t } = useLanguage();
  const item = (label: string, active: boolean) => (
    <div
      className={`px-4 py-2 rounded-xl transition-ui cursor-default ${active ? 'bg-elevated' : 'hover:bg-elevated/70'}`}
    >
      <span className="text-ink font-medium">{label}</span>
    </div>
  );

  return (
    <aside className="card p-4 h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Podcast Studio</h1>
      </div>
      <nav className="space-y-1">
        {item('Home', current === 'home')}
        {item('Sessions', current === 'sessions')}
        {item('Settings', current === 'settings')}
      </nav>
      <div className="mt-8">
        <div className="text-sm text-ink-muted mb-2">Language</div>
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage('da')}
            className={`px-3 py-1 rounded-full transition-ui ${
              language === 'da' ? 'bg-[var(--accent)] text-white' : 'bg-elevated text-ink hover:bg-elevated/90'
            }`}
          >
            {t.language.danish}
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-full transition-ui ${
              language === 'en' ? 'bg-[var(--accent)] text-white' : 'bg-elevated text-ink hover:bg-elevated/90'
            }`}
          >
            {t.language.english}
          </button>
        </div>
      </div>
    </aside>
  );
}
