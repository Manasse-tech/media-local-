'use client';

import React, { useRef, useState } from 'react';
import {
  Home,
  Music2,
  Disc3,
  Users,
  Radio,
  FolderOpen,
  Film,
  ListMusic,
  Heart,
  History,
  Settings,
  Plus,
  FolderPlus,
  FilePlus,
  Sliders,
  Sparkles,
  RefreshCw,
  Gauge,
} from 'lucide-react';
import { AppRoute } from '@/types/media';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';

interface SidebarProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
}

export function Sidebar({ currentRoute, onRouteChange }: SidebarProps) {
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

  const navItems: { id: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'music', label: 'Musique', icon: Music2 },
    { id: 'videos', label: 'Vidéos', icon: Film },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
    { id: 'favorites', label: 'Favoris', icon: Heart },
    { id: 'history', label: 'Historique', icon: History },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-slate-950/90 border-r border-slate-800/80 shrink-0 select-none text-slate-300 h-full backdrop-blur-md">
      {/* App Branding Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Music2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">
              Local Media
            </h1>
            <span className="text-[11px] font-medium text-blue-400/90">
              Lecteur Local & Offline
            </span>
          </div>
        </div>
      </div>

      {/* Quick Import Actions */}
      <div className="p-3 border-b border-slate-800/40">
        <div className="flex flex-col gap-1.5">
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
          <div className="grid grid-cols-2 gap-1.5">
            <button
              id="sidebar-import-files-btn"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-medium transition-colors cursor-pointer"
              title="Importer des fichiers locaux"
            >
              <FilePlus className="w-3.5 h-3.5 text-blue-400" />
              <span>Fichiers</span>
            </button>
            <button
              id="sidebar-import-dir-btn"
              onClick={() => importDirectory()}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              title="Importer un dossier entier"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Dossier</span>
            </button>
          </div>

          {hasStoredDirectory && (
            <button
              id="sidebar-reconnect-dir-btn"
              disabled={isReconnecting}
              onClick={async () => {
                setIsReconnecting(true);
                try {
                  await reconnectStoredDirectory();
                } finally {
                  setIsReconnecting(false);
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
              title="Resynchroniser le dossier local déjà autorisé"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Synchronisation...' : 'Resynchroniser dossier'}</span>
            </button>
          )}

          {mediaList.length === 0 && (
            <button
              id="sidebar-demo-samples-btn"
              onClick={() => loadDemoSamples()}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Charger démos</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="text-[11px] font-semibold text-slate-400 px-3 py-1 uppercase tracking-wider">
          Bibliothèque
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onRouteChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.id === 'music' && audioCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                  {audioCount}
                </span>
              )}
              {item.id === 'videos' && videoCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                  {videoCount}
                </span>
              )}
              {item.id === 'favorites' && favCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-rose-950/80 text-rose-400 font-medium border border-rose-800/40">
                  {favCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Controls: Equalizer, Volume Normalization & Settings */}
      <div className="p-3 border-t border-slate-800/60 space-y-1">
        <button
          id="sidebar-normalization-btn"
          onClick={toggleVolumeNormalization}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
            volumeNormalization
              ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
          }`}
          title="Normalisation dynamique du volume sonore (EBU R128)"
        >
          <div className="flex items-center gap-2.5">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span>Volume constant</span>
          </div>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              volumeNormalization ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {volumeNormalization ? 'ON' : 'OFF'}
          </span>
        </button>

        <button
          id="sidebar-equalizer-btn"
          onClick={() => setIsEqualizerOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-900/80 transition-colors cursor-pointer"
        >
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Égaliseur Audio</span>
        </button>

        <button
          id="sidebar-settings-btn"
          onClick={() => onRouteChange('settings')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
            currentRoute === 'settings'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4" />
            <span>Paramètres</span>
          </div>
          <span className="text-[10px] text-slate-400">Local v1.0</span>
        </button>
      </div>
    </aside>
  );
}
