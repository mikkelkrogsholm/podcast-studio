import type { Metadata } from 'next';
import { LanguageProvider } from '../contexts/LanguageContext';

export const metadata: Metadata = {
  title: 'Podcast Studio',
  description: 'Browser-based podcast studio with AI co-host',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}