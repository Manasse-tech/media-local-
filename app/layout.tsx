import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Local Media Player',
  description: 'Lecteur audio et vidéo local et performant avec indexation locale IndexedDB, playlists, égaliseur et lecteur plein écran.',
  openGraph: {
    title: 'Local Media Player',
    description: 'Lecteur audio et vidéo local et performant avec indexation locale IndexedDB, playlists, égaliseur et lecteur plein écran.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Local Media Player',
    description: 'Lecteur audio et vidéo local et performant avec indexation locale IndexedDB, playlists, égaliseur et lecteur plein écran.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
