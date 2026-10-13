'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  Keyboard,
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Shuffle,
  Repeat,
  Heart,
  FileText,
  ListMusic,
  Sliders,
  Sparkles,
  Command,
  Pin,
  Search,
  Check,
  Minimize2,
  Maximize2,
  HelpCircle,
  Radio,
  ExternalLink,
  Dock,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

interface ShortcutItem {
  id: string;
  keyCombo: string;
  keys: string[];
  description: string;
  detail: string;
  icon: React.ReactNode;
  action?: () => void;
  category: 'playback' | 'volume' | 'modes' | 'views';
}

interface HudFeedback {
  id: number;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  progress?: number;
}

const STORAGE_KEY_PINNED = 'app_shortcuts_modal_pinned';

export function ShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_PINNED) === 'true';
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'playback' | 'volume' | 'modes' | 'views'>('all');
  const [lastPressedKey, setLastPressedKey] = useState<string | null>(null);
  const [hudFeedback, setHudFeedback] = useState<HudFeedback | null>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    currentMedia,
    isPlaying,
    togglePlay,
    seek,
    seekRelative,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
    toggleFavorite,
    setIsNowPlayingOpen,
    isNowPlayingOpen,
    setIsQueueOpen,
    isQueueOpen,
    setIsEqualizerOpen,
    isEqualizerOpen,
    setIsVideoPlayerOpen,
    isVideoPlayerOpen,
    isFloatingMiniPlayerOpen,
    toggleFloatingMiniPlayer,
    playNext,
    playPrevious,
  } = usePlayer();

  const showHud = useCallback((feedback: Omit<HudFeedback, 'id'>) => {
    if (hudTimeoutRef.current) {
      clearTimeout(hudTimeoutRef.current);
    }
    const item: HudFeedback = {
      id: Date.now(),
      ...feedback,
    };
    setHudFeedback(item);
    hudTimeoutRef.current = setTimeout(() => {
      setHudFeedback(null);
    }, 1100);
  }, []);

  const handleTogglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_PINNED, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Listen to custom DOM events to open shortcuts guide
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleToggle = () => setIsOpen((prev) => !prev);

    window.addEventListener('open-shortcuts-guide', handleOpen);
    window.addEventListener('toggle-shortcuts-guide', handleToggle);

    return () => {
      window.removeEventListener('open-shortcuts-guide', handleOpen);
      window.removeEventListener('toggle-shortcuts-guide', handleToggle);
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    };
  }, []);

  // Listen to physical keypresses for visual interactive feedback in modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      setLastPressedKey(e.key.toLowerCase());
      const timer = setTimeout(() => {
        setLastPressedKey(null);
      }, 700);
      return () => clearTimeout(timer);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Global Player Hotkeys
  useHotkeys(['shift+/', 'h'], () => setIsOpen((prev) => !prev), {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('escape', () => {
    if (isOpen && !isPinned) {
      setIsOpen(false);
    } else if (isVideoPlayerOpen) {
      setIsVideoPlayerOpen(false);
    } else if (isNowPlayingOpen) {
      setIsNowPlayingOpen(false);
    } else if (isEqualizerOpen) {
      setIsEqualizerOpen(false);
    } else if (isQueueOpen) {
      setIsQueueOpen(false);
    }
  }, {
    enableOnFormTags: false,
  });

  useHotkeys('space', () => {
    togglePlay();
    showHud({
      icon: isPlaying ? <Pause className="w-6 h-6 text-amber-400" /> : <Play className="w-6 h-6 text-emerald-400 fill-current" />,
      label: isPlaying ? 'Pause' : 'Lecture',
      sublabel: currentMedia ? currentMedia.title : undefined,
    });
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('left', () => {
    seekRelative(-5);
    showHud({
      icon: <RotateCcw className="w-6 h-6 text-blue-400" />,
      label: 'Recul de 5 secondes',
      sublabel: '-5s',
    });
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('right', () => {
    seekRelative(5);
    showHud({
      icon: <RotateCw className="w-6 h-6 text-blue-400" />,
      label: 'Avance de 5 secondes',
      sublabel: '+5s',
    });
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('shift+left', () => {
    playPrevious();
    showHud({
      icon: <RotateCcw className="w-6 h-6 text-indigo-400" />,
      label: 'Piste précédente',
    });
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('shift+right', () => {
    playNext();
    showHud({
      icon: <RotateCw className="w-6 h-6 text-indigo-400" />,
      label: 'Piste suivante',
    });
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('home', () => {
    seek(0);
    showHud({
      icon: <RotateCcw className="w-6 h-6 text-blue-400" />,
      label: 'Retour au début',
      sublabel: '00:00',
    });
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('up', () => {
    const newVol = Math.min(1, Math.round((volume + 0.05) * 100) / 100);
    setVolume(newVol);
    showHud({
      icon: <Volume2 className="w-6 h-6 text-blue-400" />,
      label: `Volume ${Math.round(newVol * 100)}%`,
      progress: newVol,
    });
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('down', () => {
    const newVol = Math.max(0, Math.round((volume - 0.05) * 100) / 100);
    setVolume(newVol);
    showHud({
      icon: newVol === 0 ? <VolumeX className="w-6 h-6 text-rose-400" /> : <Volume1 className="w-6 h-6 text-blue-400" />,
      label: `Volume ${Math.round(newVol * 100)}%`,
      progress: newVol,
    });
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('m', () => {
    toggleMute();
    showHud({
      icon: !isMuted ? <VolumeX className="w-6 h-6 text-rose-400" /> : <Volume2 className="w-6 h-6 text-emerald-400" />,
      label: !isMuted ? 'Son coupé (Muet)' : 'Son rétabli',
    });
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('p', () => {
    toggleFloatingMiniPlayer();
    showHud({
      icon: <Pin className="w-6 h-6 text-blue-400" />,
      label: !isFloatingMiniPlayerOpen ? 'Mini-Lecteur Flottant Activé' : 'Mini-Lecteur Ancré',
      sublabel: 'Toujours visible au premier plan',
    });
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('s', () => {
    toggleShuffle();
    showHud({
      icon: <Shuffle className="w-6 h-6 text-blue-400" />,
      label: !shuffle ? 'Mode Aléatoire activé' : 'Mode Aléatoire désactivé',
    });
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('r', () => {
    cycleRepeat();
    showHud({
      icon: <Repeat className="w-6 h-6 text-blue-400" />,
      label: repeat === 'off' ? 'Répéter tout' : repeat === 'all' ? 'Répéter 1 titre' : 'Répétition désactivée',
    });
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('f', () => {
    if (currentMedia) {
      toggleFavorite(currentMedia.id);
      showHud({
        icon: <Heart className="w-6 h-6 text-rose-500 fill-current" />,
        label: !currentMedia.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris',
        sublabel: currentMedia.title,
      });
    }
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('l', () => {
    setIsNowPlayingOpen(true);
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('q', () => {
    setIsQueueOpen(true);
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  useHotkeys('e', () => {
    setIsEqualizerOpen(true);
  }, {
    preventDefault: true,
    enableOnFormTags: false,
  });

  // Master list of all media playback controls with interactive execution handlers
  const shortcutItems: ShortcutItem[] = useMemo(
    () => [
      // PLAYBACK
      {
        id: 'play_pause',
        category: 'playback',
        keyCombo: 'Espace',
        keys: [' ', 'space'],
        description: 'Lecture / Pause',
        detail: 'Bascule instantanément la lecture en cours ou reprend le dernier titre',
        icon: isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400 fill-current" />,
        action: () => togglePlay(),
      },
      {
        id: 'seek_back',
        category: 'playback',
        keyCombo: '←',
        keys: ['arrowleft'],
        description: 'Recul de 5 secondes',
        detail: 'Saut arrière rapide de 5 secondes dans la piste audio ou vidéo',
        icon: <RotateCcw className="w-4 h-4 text-blue-400" />,
        action: () => seekRelative(-5),
      },
      {
        id: 'seek_forward',
        category: 'playback',
        keyCombo: '→',
        keys: ['arrowright'],
        description: 'Avance de 5 secondes',
        detail: 'Saut avant rapide de 5 secondes dans la piste audio ou vidéo',
        icon: <RotateCw className="w-4 h-4 text-blue-400" />,
        action: () => seekRelative(5),
      },
      {
        id: 'prev_track',
        category: 'playback',
        keyCombo: 'Shift + ←',
        keys: ['arrowleft'],
        description: 'Piste précédente',
        detail: 'Passe au titre précédent dans la file d\'attente ou la sélection',
        icon: <RotateCcw className="w-4 h-4 text-indigo-400" />,
        action: () => playPrevious(),
      },
      {
        id: 'next_track',
        category: 'playback',
        keyCombo: 'Shift + →',
        keys: ['arrowright'],
        description: 'Piste suivante',
        detail: 'Passe au titre suivant dans la file d\'attente active',
        icon: <RotateCw className="w-4 h-4 text-indigo-400" />,
        action: () => playNext(),
      },
      {
        id: 'restart_track',
        category: 'playback',
        keyCombo: 'Home',
        keys: ['home'],
        description: 'Retour au début',
        detail: 'Remet la tête de lecture à 00:00 du morceau actuel',
        icon: <RotateCcw className="w-4 h-4 text-cyan-400" />,
        action: () => seek(0),
      },

      // VOLUME
      {
        id: 'volume_up',
        category: 'volume',
        keyCombo: '↑',
        keys: ['arrowup'],
        description: 'Augmenter le volume',
        detail: 'Monte le son par incréments précis de 5%',
        icon: <Volume2 className="w-4 h-4 text-blue-400" />,
        action: () => setVolume(Math.min(1, Math.round((volume + 0.05) * 100) / 100)),
      },
      {
        id: 'volume_down',
        category: 'volume',
        keyCombo: '↓',
        keys: ['arrowdown'],
        description: 'Diminuer le volume',
        detail: 'Baisse le son par incréments précis de 5%',
        icon: <Volume1 className="w-4 h-4 text-blue-400" />,
        action: () => setVolume(Math.max(0, Math.round((volume - 0.05) * 100) / 100)),
      },
      {
        id: 'toggle_mute',
        category: 'volume',
        keyCombo: 'M',
        keys: ['m'],
        description: 'Couper / Rétablir le son (Muet)',
        detail: 'Active ou désactive instantanément le son sans perdre votre réglage de volume',
        icon: <VolumeX className="w-4 h-4 text-rose-400" />,
        action: () => toggleMute(),
      },
      {
        id: 'open_equalizer',
        category: 'volume',
        keyCombo: 'E',
        keys: ['e'],
        description: 'Égaliseur Audio Studio 10 bandes',
        detail: 'Ouvre le processeur DSP Web Audio API avec 10 faders, préampli et courbe de réponse',
        icon: <Sliders className="w-4 h-4 text-emerald-400" />,
        action: () => setIsEqualizerOpen(true),
      },

      // MODES
      {
        id: 'toggle_shuffle',
        category: 'modes',
        keyCombo: 'S',
        keys: ['s'],
        description: 'Mode Aléatoire (Shuffle)',
        detail: 'Mélange intelligemment l\'ordre de lecture de votre file d\'attente',
        icon: <Shuffle className="w-4 h-4 text-cyan-400" />,
        action: () => toggleShuffle(),
      },
      {
        id: 'toggle_repeat',
        category: 'modes',
        keyCombo: 'R',
        keys: ['r'],
        description: 'Cycle de répétition',
        detail: 'Alterne entre Désactivé, Répéter toute la liste et Répéter le titre unique en boucle',
        icon: <Repeat className="w-4 h-4 text-blue-400" />,
        action: () => cycleRepeat(),
      },
      {
        id: 'toggle_favorite',
        category: 'modes',
        keyCombo: 'F',
        keys: ['f'],
        description: 'Ajouter aux favoris (Coup de cœur)',
        detail: 'Marque ou retire le média en cours de lecture de votre liste de coups de cœur',
        icon: <Heart className="w-4 h-4 text-rose-500" />,
        action: () => currentMedia && toggleFavorite(currentMedia.id),
      },

      // VIEWS
      {
        id: 'toggle_floating',
        category: 'views',
        keyCombo: 'P',
        keys: ['p'],
        description: 'Mini-lecteur flottant (Always-on-top)',
        detail: 'Affiche un widget flottant déplaçable avec les commandes de transport au premier plan',
        icon: <Pin className="w-4 h-4 text-blue-400" />,
        action: () => toggleFloatingMiniPlayer(),
      },
      {
        id: 'open_now_playing',
        category: 'views',
        keyCombo: 'L',
        keys: ['l'],
        description: 'Lecteur Plein Écran & Paroles',
        detail: 'Ouvre la vue immersive de lecture avec affichage des paroles karaoké synchronisées',
        icon: <FileText className="w-4 h-4 text-amber-400" />,
        action: () => setIsNowPlayingOpen(true),
      },
      {
        id: 'open_queue',
        category: 'views',
        keyCombo: 'Q',
        keys: ['q'],
        description: 'File d\'attente de lecture',
        detail: 'Ouvre le panneau latéral pour voir et réorganiser les morceaux suivants',
        icon: <ListMusic className="w-4 h-4 text-blue-400" />,
        action: () => setIsQueueOpen(true),
      },
      {
        id: 'close_overlays',
        category: 'views',
        keyCombo: 'Échap',
        keys: ['escape'],
        description: 'Fermer les fenêtres modales',
        detail: 'Ferme la fenêtre active (paroles, égaliseur, file d\'attente ou lecteur vidéo)',
        icon: <X className="w-4 h-4 text-slate-400" />,
        action: () => {
          setIsNowPlayingOpen(false);
          setIsVideoPlayerOpen(false);
          setIsEqualizerOpen(false);
          setIsQueueOpen(false);
          setIsOpen(false);
        },
      },
      {
        id: 'toggle_help',
        category: 'views',
        keyCombo: '? ou H',
        keys: ['?', 'h', '/'],
        description: 'Afficher / Masquer ce guide',
        detail: 'Affiche cette aide interactive complète sur les commandes et raccourcis',
        icon: <Keyboard className="w-4 h-4 text-purple-400" />,
        action: () => setIsOpen((prev) => !prev),
      },
    ],
    [
      isPlaying,
      volume,
      currentMedia,
      isFloatingMiniPlayerOpen,
      togglePlay,
      seek,
      seekRelative,
      playPrevious,
      playNext,
      setVolume,
      toggleMute,
      setIsEqualizerOpen,
      toggleShuffle,
      cycleRepeat,
      toggleFavorite,
      toggleFloatingMiniPlayer,
      setIsNowPlayingOpen,
      setIsQueueOpen,
      setIsVideoPlayerOpen,
    ]
  );

  const filteredShortcuts = useMemo(() => {
    return shortcutItems.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        item.description.toLowerCase().includes(q) ||
        item.keyCombo.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q)
      );
    });
  }, [shortcutItems, activeCategory, searchFilter]);

  const categories = [
    { id: 'all', label: 'Tous' },
    { id: 'playback', label: 'Lecture' },
    { id: 'volume', label: 'Volume' },
    { id: 'modes', label: 'Modes' },
    { id: 'views', label: 'Vues' },
  ];

  return (
    <>
      {/* On-Screen Display (OSD) HUD Feedback Pill */}
      {hudFeedback && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col items-center gap-2 px-5 py-3 rounded-2xl bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl text-white min-w-[200px] max-w-[90vw]">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              {hudFeedback.icon}
            </div>
            <div className="text-center">
              <span className="text-xs font-bold block">{hudFeedback.label}</span>
              {hudFeedback.sublabel && (
                <span className="text-[11px] text-slate-400 truncate max-w-[240px] block">
                  {hudFeedback.sublabel}
                </span>
              )}
            </div>
            {hudFeedback.progress !== undefined && (
              <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-100 rounded-full"
                  style={{ width: `${Math.round(hudFeedback.progress * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shortcuts Guide Modal (Responsive for Mobile, Tablet, Laptop, and Desktop) */}
      {isOpen && (
        <div
          className={`fixed z-[9999] transition-all duration-200 ${
            isPinned
              ? 'right-2 sm:right-4 bottom-20 md:bottom-24 w-[calc(100vw-1rem)] sm:w-96 max-h-[70vh] shadow-2xl rounded-2xl border border-blue-500/40 bg-slate-950/95 backdrop-blur-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6'
              : 'inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in'
          }`}
          onClick={(e) => {
            if (!isPinned && e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full bg-slate-900 border border-slate-800 flex flex-col overflow-hidden ${
              isPinned
                ? 'h-full border-none bg-transparent'
                : 'max-w-2xl max-h-[92dvh] rounded-3xl shadow-2xl animate-in zoom-in-95 duration-150'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-800/90 bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
                  <Keyboard className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
                    <span>Commandes & Raccourcis</span>
                    <span className="hidden sm:inline-flex px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold bg-blue-950 text-blue-400 border border-blue-800/60 rounded-full shrink-0">
                      Actifs
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 truncate">
                    Pilotez la lecture avec vos touches ou touchez pour exécuter
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Pin / Persistent Toggle */}
                <button
                  onClick={handleTogglePin}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isPinned
                      ? 'text-blue-400 bg-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={isPinned ? 'Détacher le mode persistant' : 'Épingler ce guide (Mode persistant)'}
                >
                  <Pin className={`w-4 h-4 ${isPinned ? 'rotate-45' : ''}`} />
                </button>

                {/* Close */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search and Category Filter Toolbar */}
            <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher une commande (ex: volume, pause, muet)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none shrink-0">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ${
                      activeCategory === c.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shortcuts Content List */}
            <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-2">
              {filteredShortcuts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Keyboard className="w-10 h-10 mx-auto text-slate-600 stroke-1" />
                  <p className="text-xs">Aucune commande ne correspond à votre recherche</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredShortcuts.map((item) => {
                    const isMatchedKey = lastPressedKey && item.keys.includes(lastPressedKey);

                    return (
                      <div
                        key={item.id}
                        onClick={() => item.action?.()}
                        className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isMatchedKey
                            ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-500/50 scale-[1.01]'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/60 active:scale-[0.99]'
                        }`}
                        title="Cliquez pour exécuter cette action"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0 group-hover:scale-105 transition-transform">
                            {item.icon}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-white block truncate group-hover:text-blue-400 transition-colors">
                              {item.description}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {item.detail}
                            </span>
                          </div>
                        </div>

                        <kbd className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-900 text-blue-300 border border-slate-700 rounded-lg text-[11px] sm:text-xs font-mono font-semibold shadow-sm shrink-0 whitespace-nowrap group-hover:border-blue-500 transition-colors">
                          {item.keyCombo}
                        </kbd>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <span className="hidden sm:inline">
                Astuce : Cliquez sur n&apos;importe quelle commande pour la déclencher instantanément
              </span>
              <span className="sm:hidden">
                Touchez une ligne pour l&apos;activer
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors cursor-pointer text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
