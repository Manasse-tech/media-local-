'use client';

import React, { useRef, useState } from 'react';
import {
  Home,
  Music2,
  Film,
  ListMusic,
  Heart,
  History,
  Settings,
  Sliders,
  Gauge,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Sparkles,
  Keyboard,
} from 'lucide-react';
import { AppRoute } from '@/types/media';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';

interface HeaderProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
}

export function Header({ currentRoute, onRouteChange }: HeaderProps) {
  const {
    mediaList,
    importFiles,
    importDirectory,
    loadDemoSamples,
    hasStoredDirectory,
    reconnectStoredDirectory,
  } = useLibrary();
  const { setIsEqualizerOpen, volumeNormalization, toggleVolumeNormalization } = usePlayer();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const audioCount = mediaList.filter((m) => m.type === 'audio').length;
  const videoCount = mediaList.filter((m) => m.type === 'video').length;
  const favCount = mediaList.filter((m) => m.isFavorite).length;

  const mainNavItems: { id: AppRoute; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'music', label: 'Musique', icon: Music2, badge: audioCount },
    { id: 'videos', label: 'Vidéos', icon: Film, badge: videoCount },
    { id: 'favorites', label: 'Favoris', icon: Heart, badge: favCount },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'settings', label: 'Réglages', icon: Settings },
  ];

  return (
    <header className="w-full bg-slate-950/65 border-b border-white/[0.08] px-3 sm:px-5 py-3 flex items-center justify-between gap-2 shrink-0 select-none z-30 backdrop-blur-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            await importFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Brand & Main Navigation */}
      <div className="flex items-center gap-3 sm:gap-6 min-w-0">
        {/* App Logo */}
        <button
          onClick={() => onRouteChange('home')}
          className="flex items-center gap-2.5 cursor-pointer group text-left shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Music2 className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">
              Local Media
            </h1>
            <span className="text-[10px] font-medium text-blue-400/90">
              Lecteur Offline
            </span>
          </div>
        </button>

        {/* Top Navbar Items - Adaptive from lg */}
        <nav className="hidden lg:flex items-center gap-1 min-w-0">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentRoute === item.id ||
              (item.id === 'music' && ['albums', 'artists', 'genres', 'folders'].includes(currentRoute));

            return (
              <button
                key={item.id}
                id={`top-nav-${item.id}`}
                onClick={() => onRouteChange(item.id)}
                title={item.label}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="hidden xl:inline">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Controls & Quick Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Import Fichiers */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-medium transition-colors cursor-pointer shrink-0"
          title="Importer des fichiers locaux"
        >
          <FilePlus className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden lg:inline">Fichiers</span>
        </button>

        {/* Import Dossier */}
        <button
          onClick={() => importDirectory()}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-700/50 text-slate-200 text-xs font-medium transition-colors cursor-pointer shrink-0"
          title="Importer un dossier entier"
        >
          <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden xl:inline">Dossier</span>
        </button>

        {hasStoredDirectory && (
          <button
            disabled={isReconnecting}
            onClick={async () => {
              setIsReconnecting(true);
              try {
                await reconnectStoredDirectory();
              } finally {
                setIsReconnecting(false);
              }
            }}
            className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 transition-colors cursor-pointer shrink-0"
            title="Resynchroniser le dossier"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${isReconnecting ? 'animate-spin' : ''}`} />
          </button>
        )}

        {mediaList.length === 0 && (
          <button
            onClick={() => loadDemoSamples()}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Démos</span>
          </button>
        )}

        {/* Volume Normalization toggle */}
        <button
          onClick={toggleVolumeNormalization}
          className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
            volumeNormalization
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
          }`}
          title="Normalisation dynamique du volume (EBU R128)"
        >
          <Gauge className={`w-4 h-4 ${volumeNormalization ? 'text-cyan-400' : 'text-slate-400'}`} />
        </button>

        {/* Keyboard Shortcuts Guide */}
        <button
          onClick={() => window.dispatchEvent(new Event('toggle-shortcuts-guide'))}
          className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer shrink-0"
          title="Raccourcis Clavier (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Equalizer */}
        <button
          onClick={() => setIsEqualizerOpen(true)}
          className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
          title="Égaliseur Audio"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
