'use client';

import React from 'react';
import { LanguageProvider } from '@/context/LanguageContext';
import { LibraryProvider } from '@/context/LibraryContext';
import { PlayerProvider } from '@/context/PlayerContext';
import { AppShell } from '@/components/AppShell';

export default function Page() {
  return (
    <LanguageProvider>
      <LibraryProvider>
        <PlayerProvider>
          <AppShell />
        </PlayerProvider>
      </LibraryProvider>
    </LanguageProvider>
  );
}
