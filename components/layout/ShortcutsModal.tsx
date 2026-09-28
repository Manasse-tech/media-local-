'use client';

import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

interface ShortcutGroup {
  category: string;
  items: { keyCombo: string; description: string; icon?: React.ReactNode }[];
}

interface HudFeedback {
  id: number;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  progress?: number; // 0 to 1
}

export function ShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hudFeedback, setHudFeedback] = useState<HudFeedback | null>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    currentMedia,
    isPlaying,
    togglePlay,
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
    setIsQueueOpen,
    setIsEqualizerOpen,
    playNext,
    playPrevious,
  } = usePlayer();

  const showHud = (feedback: Omit<HudFeedback, 'id'>) => {
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

  // Toggle shortcuts modal with '?' or 'Shift+/' or 'h'
  useHotkeys(['shift+/', 'h'], () => setIsOpen((prev) => !prev), {
    preventDefault: true,
    enableOnFormTags: false,
  });

  // ESC to close modal
  useHotkeys('escape', () => setIsOpen(false), {
    enabled: isOpen,
    enableOnFormTags: true,
  });

  // Global Player Hotkeys
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

  const shortcutGroups: ShortcutGroup[] = [
    {
      category: 'Lecture & Contrôles',
      items: [
        { keyCombo: 'Espace', description: 'Lecture / Pause', icon: <Play className="w-4 h-4 text-emerald-400" /> },
        { keyCombo: '← / →', description: 'Reculer / Avancer de 5s', icon: <RotateCcw className="w-4 h-4 text-blue-400" /> },
        { keyCombo: 'Shift + ← / →', description: 'Piste précédente / suivante', icon: <RotateCw className="w-4 h-4 text-indigo-400" /> },
        { keyCombo: '↑ / ↓', description: 'Ajuster le volume (±5%)', icon: <Volume2 className="w-4 h-4 text-blue-400" /> },
        { keyCombo: 'M', description: 'Couper / Rétablir le son', icon: <VolumeX className="w-4 h-4 text-rose-400" /> },
      ],
    },
    {
      category: 'Navigation & Modes',
      items: [
        { keyCombo: 'S', description: 'Mode Aléatoire (Shuffle)', icon: <Shuffle className="w-4 h-4 text-cyan-400" /> },
        { keyCombo: 'R', description: 'Cycle de répétition (Désactivé / Tout / 1)', icon: <Repeat className="w-4 h-4 text-blue-400" /> },
        { keyCombo: 'F', description: 'Ajouter / Retirer des favoris', icon: <Heart className="w-4 h-4 text-rose-500" /> },
      ],
    },
    {
      category: 'Vues & Panneaux Studio',
      items: [
        { keyCombo: 'L', description: 'Plein écran Lecteur & Paroles synchronisées', icon: <FileText className="w-4 h-4 text-amber-400" /> },
        { keyCombo: 'Q', description: 'Ouvrir la file d\'attente', icon: <ListMusic className="w-4 h-4 text-blue-400" /> },
        { keyCombo: 'E', description: 'Ouvrir l\'égaliseur audio 10 bandes', icon: <Sliders className="w-4 h-4 text-emerald-400" /> },
        { keyCombo: '? / H', description: 'Afficher / Masquer ce guide', icon: <Keyboard className="w-4 h-4 text-slate-300" /> },
      ],
    },
  ];

  return (
    <>
      {/* On-Screen Display (OSD) HUD Feedback Pill */}
      {hudFeedback && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col items-center gap-2 px-5 py-3 rounded-2xl bg-slate-950/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl text-white min-w-[200px]">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              {hudFeedback.icon}
            </div>
            <div className="text-center">
              <span className="text-xs font-bold block">{hudFeedback.label}</span>
              {hudFeedback.sublabel && (
                <span className="text-[11px] text-slate-400 truncate max-w-[180px] block">
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

      {/* Floating Quick Shortcut Guide Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium shadow-xl backdrop-blur-md transition-all active:scale-95 z-30 cursor-pointer group"
        title="Guide des raccourcis clavier (?)"
      >
        <Keyboard className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
        <span className="text-[11px] font-semibold">Raccourcis</span>
        <kbd className="px-1.5 py-0.2 bg-slate-800 text-[10px] text-slate-400 rounded border border-slate-700 font-mono">?</kbd>
      </button>

      {/* Shortcuts Guide Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Raccourcis Clavier Globaux
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-blue-950 text-blue-400 border border-blue-800/60 rounded-full">
                      Actifs
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Contrôlez la lecture, le volume et les vues instantanément depuis n&apos;importe où.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {shortcutGroups.map((group, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    {group.category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {group.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 text-xs text-slate-300">
                          <span className="shrink-0">{item.icon}</span>
                          <span>{item.description}</span>
                        </div>
                        <kbd className="px-2.5 py-1 bg-slate-800 text-blue-300 border border-slate-700 rounded-lg text-xs font-mono font-semibold shadow-sm shrink-0 whitespace-nowrap">
                          {item.keyCombo}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Appuyez sur <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[11px] text-white">Échap</kbd> ou <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[11px] text-white">?</kbd> pour fermer</span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors cursor-pointer"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
