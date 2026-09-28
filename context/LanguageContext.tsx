'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Locale = 'fr' | 'en';

export const translations = {
  fr: {
    music: "Musique",
    videos: "Vidéos",
    home: "Accueil",
    playlists: "Playlists",
    favorites: "Favoris",
    history: "Historique",
    settings: "Réglages",
    searchPlaceholder: "Rechercher morceaux, vidéos, albums, artistes, playlists...",
    filterTracks: "Filtrer les morceaux...",
    title: "Titre",
    artist: "Artiste",
    album: "Album",
    duration: "Durée",
    size: "Taille",
    dateAdded: "Date d'ajout",
    importFiles: "Fichiers",
    importFolder: "Dossier",
    demos: "Démos",
    localStats: "Statistiques locales",
    lyrics: "Paroles",
    transcribe: "Transcrire avec Gemini IA",
    editMetadata: "Modifier les métadonnées",
    removeFromLib: "Retirer de la bibliothèque",
    search: "Rechercher",
    tracksCount: "piste(s) audio indexée(s)",
    noTracks: "Aucun titre correspondant trouvé",
    albums: "Albums",
    artists: "Artistes",
    genres: "Genres",
    folders: "Dossiers",
    tracksTab: "Titres",
    playNow: "Lire maintenant",
    playNext: "Lire juste après",
    addToQueue: "Ajouter à la file",
    addToPlaylist: "Ajouter à une playlist",
    fileInfo: "Informations du fichier",
    deleteLyrics: "Supprimer les paroles",
    language: "Langue",
    toggleLanguage: "Switch to English",
    theme: "Thème",
    nowPlaying: "En cours de lecture",
    volume: "Volume",
    sleepTimer: "Minuteur de sommeil",
    crossfade: "Fondu enchaîné",
    visualizer: "Visualiseur",
    vinyl: "Disque Vinyle",
    visualizerBars: "Barres de Fréquence",
    customBg: "Arrière-plan personnalisé",
    normalizer: "Normalisation du Volume"
  },
  en: {
    music: "Music",
    videos: "Videos",
    home: "Home",
    playlists: "Playlists",
    favorites: "Favorites",
    history: "History",
    settings: "Settings",
    searchPlaceholder: "Search tracks, videos, albums, artists, playlists...",
    filterTracks: "Filter tracks...",
    title: "Title",
    artist: "Artist",
    album: "Album",
    duration: "Duration",
    size: "Size",
    dateAdded: "Date added",
    importFiles: "Files",
    importFolder: "Folder",
    demos: "Demos",
    localStats: "Local statistics",
    lyrics: "Lyrics",
    transcribe: "Transcribe with Gemini AI",
    editMetadata: "Edit metadata",
    removeFromLib: "Remove from library",
    search: "Search",
    tracksCount: "indexed audio track(s)",
    noTracks: "No matching tracks found",
    albums: "Albums",
    artists: "Artists",
    genres: "Genres",
    folders: "Folders",
    tracksTab: "Tracks",
    playNow: "Play now",
    playNext: "Play next",
    addToQueue: "Add to queue",
    addToPlaylist: "Add to playlist",
    fileInfo: "File information",
    deleteLyrics: "Delete lyrics",
    language: "Language",
    toggleLanguage: "Passer en Français",
    theme: "Theme",
    nowPlaying: "Now Playing",
    volume: "Volume",
    sleepTimer: "Sleep Timer",
    crossfade: "Crossfade",
    visualizer: "Visualizer",
    vinyl: "Vinyl Record",
    visualizerBars: "Frequency Bars",
    customBg: "Custom Background",
    normalizer: "Volume Normalization"
  }
};

type Translations = typeof translations.fr;
export type TranslationKey = keyof Translations;

interface LanguageContextType {
  locale: Locale;
  t: (key: TranslationKey) => string;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    const saved = localStorage.getItem('app_locale') as Locale;
    if (saved && (saved === 'fr' || saved === 'en')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('app_locale', newLocale);
    window.dispatchEvent(new Event('app-locale-changed'));
  };

  const toggleLocale = () => {
    setLocale(locale === 'fr' ? 'en' : 'fr');
  };

  const t = (key: TranslationKey): string => {
    return translations[locale][key] || translations['fr'][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ locale, t, setLocale, toggleLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
