'use client';

import React, { useState, useEffect } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { AppRoute, MusicSubTab } from '@/types/media';

// Layout
import { Header } from './layout/Header';
import { MobileNav } from './layout/MobileNav';

// Player Components
import { MiniPlayer } from './player/MiniPlayer';
import { NowPlayingModal } from './player/NowPlayingModal';
import { VideoPlayerOverlay } from './player/VideoPlayerOverlay';
import { EqualizerModal } from './player/EqualizerModal';
import { QueueDrawer } from './player/QueueDrawer';
import { MediaInfoModal } from './media/MediaInfoModal';

// Views
import { HomeView } from './views/HomeView';
import { MusicView } from './views/MusicView';
import { VideosView } from './views/VideosView';
import { PlaylistsView } from './views/PlaylistsView';
import { PlaylistDetailView } from './views/PlaylistDetailView';
import { FavoritesView } from './views/FavoritesView';
import { HistoryView } from './views/HistoryView';
import { SearchView } from './views/SearchView';
import { SettingsView } from './views/SettingsView';
import { AlbumDetailView } from './views/AlbumDetailView';
import { ArtistDetailView } from './views/ArtistDetailView';

import { ShortcutsModal } from './layout/ShortcutsModal';
import { PerformanceMonitorOverlay } from './debug/PerformanceMonitorOverlay';
import { HapticVisualizer } from './ui/HapticVisualizer';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface NavigationState {
  route: AppRoute;
  musicTab: MusicSubTab;
  album: string | null;
  artist: string | null;
}

export function AppShell() {
  const { isScanning } = useLibrary();
  const { currentMedia, setIsNowPlayingOpen } = usePlayer();

  const [currentRoute, setCurrentRoute] = useState<AppRoute>('home');
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [activeArtist, setActiveArtist] = useState<string | null>(null);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [musicInitialTab, setMusicInitialTab] = useState<MusicSubTab>('tracks');
  const [activeThemeClass] = useLocalStorage<string>('app_theme', 'theme-midnight');
  const [customBgImage, setCustomBgImage] = useState<string | null>(null);
  const [customBgOpacity, setCustomBgOpacity] = useState<number>(0.85);
  const [customBgBlur, setCustomBgBlur] = useState<number>(0);

  // Robust navigation history stack to restore exact previous route and sub-tab on Back
  const [navHistory, setNavHistory] = useState<NavigationState[]>([]);

  useEffect(() => {
    const syncBackground = () => {
      const savedBg = localStorage.getItem('app_custom_bg') || null;
      setCustomBgImage(savedBg);

      const savedOpacity = localStorage.getItem('app_bg_opacity');
      if (savedOpacity !== null) {
        const op = parseFloat(savedOpacity);
        if (!isNaN(op)) setCustomBgOpacity(op);
      }

      const savedBlur = localStorage.getItem('app_bg_blur');
      if (savedBlur !== null) {
        const bl = parseFloat(savedBlur);
        if (!isNaN(bl)) setCustomBgBlur(bl);
      } else {
        setCustomBgBlur(0);
      }
    };

    syncBackground();

    window.addEventListener('storage', syncBackground);
    window.addEventListener('app-theme-changed', syncBackground);
    return () => {
      window.removeEventListener('storage', syncBackground);
      window.removeEventListener('app-theme-changed', syncBackground);
    };
  }, []);

  const navigateTo = (route: AppRoute) => {
    setActiveAlbum(null);
    setActiveArtist(null);
    setActivePlaylistId(null);
    setNavHistory([]);
    setCurrentRoute(route);
    setIsNowPlayingOpen(false);
  };

  const handleOpenAlbum = (albumName: string) => {
    setNavHistory((prev) => [
      ...prev,
      { route: currentRoute, musicTab: musicInitialTab, album: activeAlbum, artist: activeArtist },
    ]);
    setActiveAlbum(albumName);
    setActiveArtist(null);
    setActivePlaylistId(null);
  };

  const handleOpenArtist = (artistName: string) => {
    setNavHistory((prev) => [
      ...prev,
      { route: currentRoute, musicTab: musicInitialTab, album: activeAlbum, artist: activeArtist },
    ]);
    setActiveArtist(artistName);
    setActiveAlbum(null);
    setActivePlaylistId(null);
  };

  const handleOpenPlaylist = (playlistId: string) => {
    setNavHistory((prev) => [
      ...prev,
      { route: currentRoute, musicTab: musicInitialTab, album: activeAlbum, artist: activeArtist },
    ]);
    setActivePlaylistId(playlistId);
    setActiveAlbum(null);
    setActiveArtist(null);
  };

  const handleBackFromPlaylist = () => {
    setActivePlaylistId(null);
    if (navHistory.length > 0) {
      const last = navHistory[navHistory.length - 1];
      setNavHistory((prev) => prev.slice(0, -1));
      setCurrentRoute(last.route);
      setMusicInitialTab(last.musicTab);
      setActiveAlbum(last.album);
      setActiveArtist(last.artist);
    }
  };

  const handleBackFromAlbum = () => {
    setActiveAlbum(null);
    if (navHistory.length > 0) {
      const last = navHistory[navHistory.length - 1];
      setNavHistory((prev) => prev.slice(0, -1));
      setCurrentRoute(last.route);
      setMusicInitialTab(last.musicTab);
      setActiveArtist(last.artist);
    }
  };

  const handleBackFromArtist = () => {
    setActiveArtist(null);
    if (navHistory.length > 0) {
      const last = navHistory[navHistory.length - 1];
      setNavHistory((prev) => prev.slice(0, -1));
      setCurrentRoute(last.route);
      setMusicInitialTab(last.musicTab);
      setActiveAlbum(last.album);
    }
  };

  return (
    <div className={`app-stage flex flex-col h-screen w-screen bg-slate-950/95 text-slate-100 overflow-hidden font-sans select-none relative ${activeThemeClass}`}>
      {/* Custom wallpaper background layer with dynamic sharpness / blur controls */}
      {customBgImage && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-300"
          style={{ opacity: customBgOpacity }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={customBgImage}
            alt="Fond d'écran"
            className="w-full h-full object-cover transition-all duration-300"
            style={{
              filter: customBgBlur > 0 ? `blur(${customBgBlur}px)` : 'none',
              transform: customBgBlur > 0 ? `scale(${1 + (customBgBlur * 0.004)})` : 'scale(1)',
            }}
          />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
        {/* Top Header Navbar */}
        <Header currentRoute={currentRoute} onRouteChange={navigateTo} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          {/* Scanning status banner */}
          {isScanning && (
            <div className="bg-blue-600/90 text-white text-xs py-1.5 px-4 text-center font-medium animate-pulse flex items-center justify-center gap-2 shrink-0 z-20">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Indexation des fichiers locaux et extraction des métadonnées...</span>
            </div>
          )}

          {/* Dynamic Route View */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {activeAlbum ? (
              <AlbumDetailView
                albumName={activeAlbum}
                onBack={handleBackFromAlbum}
                onOpenArtist={handleOpenArtist}
              />
            ) : activeArtist ? (
              <ArtistDetailView
                artistName={activeArtist}
                onBack={handleBackFromArtist}
                onOpenAlbum={handleOpenAlbum}
              />
            ) : activePlaylistId ? (
              <PlaylistDetailView
                playlistId={activePlaylistId}
                onBack={handleBackFromPlaylist}
              />
            ) : currentRoute === 'home' ? (
              <HomeView
                onRouteChange={navigateTo}
                onOpenAlbum={handleOpenAlbum}
                onOpenPlaylist={handleOpenPlaylist}
              />
            ) : currentRoute === 'music' || currentRoute === 'albums' || currentRoute === 'artists' || currentRoute === 'genres' || currentRoute === 'folders' ? (
              <MusicView
                key={currentRoute}
                initialTab={
                  currentRoute === 'albums'
                    ? 'albums'
                    : currentRoute === 'artists'
                    ? 'artists'
                    : currentRoute === 'genres'
                    ? 'genres'
                    : currentRoute === 'folders'
                    ? 'folders'
                    : musicInitialTab
                }
                onTabChange={(tab) => setMusicInitialTab(tab)}
                onOpenAlbum={handleOpenAlbum}
                onOpenArtist={handleOpenArtist}
                onOpenGenre={() => {}}
                onOpenFolder={() => {}}
                onOpenPlaylist={handleOpenPlaylist}
                onRouteChange={navigateTo}
              />
            ) : currentRoute === 'videos' ? (
              <VideosView />
            ) : currentRoute === 'playlists' ? (
              <PlaylistsView onOpenPlaylist={handleOpenPlaylist} />
            ) : currentRoute === 'favorites' ? (
              <FavoritesView onOpenAlbum={handleOpenAlbum} />
            ) : currentRoute === 'history' ? (
              <HistoryView />
            ) : currentRoute === 'search' ? (
              <SearchView
                onOpenAlbum={handleOpenAlbum}
                onOpenArtist={handleOpenArtist}
                onOpenPlaylist={handleOpenPlaylist}
              />
            ) : currentRoute === 'settings' ? (
              <SettingsView />
            ) : null}
          </main>

          {/* MiniPlayer (Persistent bottom bar) */}
          <MiniPlayer />

          {/* Mobile Navigation Bar */}
          <MobileNav currentRoute={currentRoute} onRouteChange={navigateTo} />
        </div>
      </div>

      {/* Global Modals & Overlays */}
      <NowPlayingModal />
      <VideoPlayerOverlay />
      <EqualizerModal />
      <QueueDrawer />
      <MediaInfoModal />
      <ShortcutsModal />
      <PerformanceMonitorOverlay />
      <HapticVisualizer />
    </div>
  );
}
