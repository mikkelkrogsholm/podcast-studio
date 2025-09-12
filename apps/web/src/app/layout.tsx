import type { Metadata } from 'next';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}