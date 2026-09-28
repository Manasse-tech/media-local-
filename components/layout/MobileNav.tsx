'use client';

import React from 'react';
import { Home, Music2, Film, ListMusic, Settings } from 'lucide-react';
import { AppRoute } from '@/types/media';

interface MobileNavProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
}

export function MobileNav({ currentRoute, onRouteChange }: MobileNavProps) {
  const tabs: { id: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'music', label: 'Musique', icon: Music2 },
    { id: 'videos', label: 'Vidéos', icon: Film },
    { id: 'playlists', label: 'Listes', icon: ListMusic },
    { id: 'settings', label: 'Réglages', icon: Settings },
  ];

  return (
    <nav className="md:hidden flex items-center justify-around h-16 bg-slate-950/95 border-t border-slate-800/80 px-2 shrink-0 z-30 backdrop-blur-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          currentRoute === tab.id ||
          (tab.id === 'music' && ['albums', 'artists', 'genres', 'folders'].includes(currentRoute));

        return (
          <button
            key={tab.id}
            id={`mobile-nav-${tab.id}`}
            onClick={() => onRouteChange(tab.id)}
            className={`flex flex-col items-center justify-center w-16 h-full py-1 cursor-pointer transition-colors ${
              isActive ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-blue-400' : 'text-slate-400'} transition-transform`} />
            <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
