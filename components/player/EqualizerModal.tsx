'use client';

import React from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { EqualizerStudio } from './EqualizerStudio';

export function EqualizerModal() {
  const { isEqualizerOpen, setIsEqualizerOpen } = usePlayer();

  if (!isEqualizerOpen) return null;

  return (
    <div
      id="equalizer-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsEqualizerOpen(false);
        }
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col relative animate-in zoom-in-95 duration-150">
        <EqualizerStudio onClose={() => setIsEqualizerOpen(false)} />
      </div>
    </div>
  );
}
