'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  HardDrive,
  Keyboard,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  AlertTriangle,
  Palette,
  Check,
  Sliders,
  Eye,
  Clock,
  Activity,
} from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { formatBytes } from '@/lib/metadata-parser';
import { DeleteAllImportsModal } from '../media/DeleteAllImportsModal';
import {
  getConfiguredDefaultAudioCover,
  setConfiguredDefaultAudioCover,
  DEFAULT_AUDIO_COVER_SVG,
  useDefaultAudioCover,
} from '@/lib/cover-manager';

interface ThemeOption {
  id: string;
  name: string;
  desc: string;
  badge: string;
  gradient: string;
  border: string;
}

const themeOptions: ThemeOption[] = [
  {
    id: 'theme-obsidian',
    name: 'Obsidian Sombre',
    desc: 'Fond noir profond avec reflets métalliques slate',
    badge: 'Standard',
    gradient: 'from-slate-900 via-slate-950 to-black',
    border: 'border-slate-700',
  },
  {
    id: 'theme-midnight',
    name: 'Bleu Nuit (Midnight)',
    desc: 'Atmosphère bleue saphir haute fidélité avec halo lumineux',
    badge: 'Populaire',
    gradient: 'from-blue-950 via-slate-950 to-indigo-950',
    border: 'border-blue-600',
  },
  {
    id: 'theme-galaxy',
    name: 'Violet Galaxie (Cosmic)',
    desc: 'Dégradé cosmique aux tons améthyste et rose profond',
    badge: 'Vibrant',
    gradient: 'from-purple-950 via-slate-950 to-fuchsia-950',
    border: 'border-purple-600',
  },
  {
    id: 'theme-emerald',
    name: 'Émeraude Sombre',
    desc: 'Teinte émeraude et cyan moderne idéale pour l’écoute nocturne',
    badge: 'Apaisant',
    gradient: 'from-emerald-950 via-slate-950 to-cyan-950',
    border: 'border-emerald-600',
  },
  {
    id: 'theme-sunset',
    name: 'Coucher de soleil',
    desc: 'Robe ambre chaleureuse et rouge rubis foncée',
    badge: 'Chaleureux',
    gradient: 'from-amber-950 via-slate-950 to-rose-950',
    border: 'border-amber-600',
  },
];

export function SettingsView() {
  const {
    mediaList,
    playlists,
    loadDemoSamples,
    refreshLibraryAccess,
    importDirectory,
    hasStoredDirectory,
    reconnectStoredDirectory,
  } = useLibrary();
  const { crossfadeDuration, setCrossfadeDuration, sleepTimerRemaining, setSleepTimer } = usePlayer();
  const { locale, t, setLocale } = useLanguage();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanningFolder, setIsScanningFolder] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useLocalStorage<string>('app_theme', 'theme-midnight');
  
  // Default audio cover management
  const activeDefaultCover = useDefaultAudioCover();
  const [defaultCoverPreview, setDefaultCoverPreview] = useState<string>(activeDefaultCover);
  const [isCustomCover, setIsCustomCover] = useState(false);
  const [coverToast, setCoverToast] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  // Custom wallpaper background management
  const [customBgImage, setCustomBgImage] = useState<string | null>(null);
  const [customBgOpacity, setCustomBgOpacity] = useState<number>(0.85);
  const [customBgBlur, setCustomBgBlur] = useState<number>(0);
  const [bgToast, setBgToast] = useState<string | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
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

      const cover = await getConfiguredDefaultAudioCover();
      setDefaultCoverPreview(cover);
      setIsCustomCover(cover !== DEFAULT_AUDIO_COVER_SVG);
    };
    loadSettings();
  }, [activeDefaultCover]);

  const handleSelectTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    window.dispatchEvent(new Event('app-theme-changed'));
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        try {
          localStorage.setItem('app_custom_bg', reader.result);
        } catch {
          console.warn('Storage limit reached');
        }
        setCustomBgImage(reader.result);
        setCustomBgBlur(0);
        localStorage.setItem('app_bg_blur', '0');
        setCustomBgOpacity(0.85);
        localStorage.setItem('app_bg_opacity', '0.85');
        window.dispatchEvent(new Event('app-theme-changed'));
        setBgToast('Image d’arrière-plan appliquée avec netteté d’origine.');
        setTimeout(() => setBgToast(null), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetBg = () => {
    localStorage.removeItem('app_custom_bg');
    localStorage.removeItem('app_bg_blur');
    localStorage.removeItem('app_bg_opacity');
    setCustomBgImage(null);
    setCustomBgBlur(0);
    setCustomBgOpacity(0.85);
    window.dispatchEvent(new Event('app-theme-changed'));
    setBgToast('Fond d’écran rétabli sur le thème par défaut.');
    setTimeout(() => setBgToast(null), 3000);
  };

  const handleOpacityChange = (val: number) => {
    setCustomBgOpacity(val);
    localStorage.setItem('app_bg_opacity', String(val));
    window.dispatchEvent(new Event('app-theme-changed'));
  };

  const handleBlurChange = (val: number) => {
    setCustomBgBlur(val);
    localStorage.setItem('app_bg_blur', String(val));
    window.dispatchEvent(new Event('app-theme-changed'));
  };

  const handleCustomCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        await setConfiguredDefaultAudioCover(reader.result);
        setDefaultCoverPreview(reader.result);
        setIsCustomCover(true);
        setCoverToast('Visuel par défaut personnalisé appliqué à toutes vos musiques sans pochette.');
        setTimeout(() => setCoverToast(null), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaultCover = async () => {
    await setConfiguredDefaultAudioCover(null);
    setDefaultCoverPreview(DEFAULT_AUDIO_COVER_SVG);
    setIsCustomCover(false);
    setCoverToast('Visuel par défaut rétabli sur le logo officiel de l’application.');
    setTimeout(() => setCoverToast(null), 3000);
  };

  const totalSize = mediaList.reduce((acc, m) => acc + (m.size || 0), 0);
  const audioCount = mediaList.filter((m) => m.type === 'audio').length;
  const videoCount = mediaList.filter((m) => m.type === 'video').length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshLibraryAccess();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const shortcuts = [
    { key: 'Espace', action: 'Lecture / Pause' },
    { key: '← / →', action: 'Reculer / Avancer de 5 secondes (10s en vidéo)' },
    { key: '↑ / ↓', action: 'Augmenter / Réduire le volume (+/- 5%)' },
    { key: 'M', action: 'Activer / Désactiver le mode muet' },
    { key: 'F', action: 'Basculer en plein écran vidéo' },
    { key: 'N', action: 'Piste suivante' },
    { key: 'P', action: 'Piste précédente' },
    { key: 'Échap', action: 'Fermer Now Playing ou le lecteur vidéo' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Settings className="w-7 h-7 text-blue-400" />
          <span>Paramètres & Personnalisation</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Personnalisez votre fond d’écran, votre visuel musical par défaut et gérez vos données locales.
        </p>
      </div>

      {/* SECTION: Lecture, Crossfade & Minuteur de Sommeil (Sleep Timer) */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          <span>Lecture, Transition Crossfade & Minuteur de Sommeil</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Crossfade Duration Configuration */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Transition Crossfade entre pistes
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Définissez la durée du fondu enchaîné (overlap) lors du passage d&apos;une piste à une autre.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {[0, 1, 2, 3, 5].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setCrossfadeDuration(sec)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    crossfadeDuration === sec
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {sec === 0 ? 'Désactivé (0s)' : `${sec}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Sleep Timer Configuration */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Minuteur de Sommeil (Sleep Timer)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Arrête automatiquement la lecture après un compte à rebours. {sleepTimerRemaining !== null && (
                <span className="text-purple-400 font-bold block mt-1">
                  ⏱️ Temps restant : {Math.floor(sleepTimerRemaining / 60)} min {sleepTimerRemaining % 60} sec
                </span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => setSleepTimer(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  sleepTimerRemaining === null
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Désactivé
              </button>
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSleepTimer(mins * 60)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    sleepTimerRemaining === mins * 60
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Langue & i18n */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Palette className="w-5 h-5 text-blue-400" />
          <span>{t('language')} (16 langues disponibles)</span>
        </h2>
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <p className="text-xs text-slate-400">
            Choisissez la langue d&apos;affichage de l&apos;interface utilisateur (africaines et internationales).
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {useLanguage().availableLanguages.map((lang) => {
              const isSelected = locale === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setLocale(lang.code)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/40 text-white shadow-md'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:bg-slate-900/60'
                  }`}
                >
                  <span className="text-xl shrink-0">{lang.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate">{lang.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">{lang.nativeName}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION: Personnalisation du Thème & Arrière-plan */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Palette className="w-5 h-5 text-indigo-400" />
          <span>Thème & Arrière-plan de l’application</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {themeOptions.map((theme) => {
            const isSelected = currentTheme === theme.id && !customBgImage;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  if (customBgImage) handleResetBg();
                  handleSelectTheme(theme.id);
                }}
                className={`p-4 rounded-2xl bg-gradient-to-br ${theme.gradient} border transition-all text-left relative cursor-pointer group hover:scale-[1.02] ${
                  isSelected
                    ? `${theme.border} ring-2 ring-blue-500/50 shadow-xl`
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    {theme.name}
                  </span>
                  {isSelected ? (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 font-medium">
                      {theme.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {theme.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Custom imported background option */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Fond d&apos;écran personnalisé
                </h3>
                {customBgImage && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                    Actif
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xl">
                Importez une image depuis votre appareil. Elle apparaît <strong>nettement par défaut</strong> et vous pouvez ajuster le niveau de flou et l&apos;opacité à votre convenance.
              </p>
              {bgToast && (
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{bgToast}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={bgFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBgUpload}
              />
              <button
                onClick={() => bgFileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-md flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{customBgImage ? 'Changer l’image' : 'Importer une image'}</span>
              </button>
              {customBgImage && (
                <button
                  onClick={handleResetBg}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 text-xs font-semibold cursor-pointer transition-colors border border-slate-700/50 flex items-center gap-1.5"
                  title="Revenir au mode standard par défaut"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rétablir par défaut</span>
                </button>
              )}
            </div>
          </div>

          {customBgImage && (
            <div className="pt-4 border-t border-slate-800/60 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Visual preview box */}
                <div className="w-24 h-16 rounded-xl overflow-hidden border border-slate-700/80 bg-black flex items-center justify-center shrink-0 shadow-lg relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={customBgImage}
                    alt="Aperçu fond"
                    className="w-full h-full object-cover transition-all"
                    style={{
                      filter: customBgBlur > 0 ? `blur(${customBgBlur}px)` : 'none',
                      opacity: customBgOpacity,
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-4 h-4 text-white drop-shadow" />
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {/* Blur Slider Control */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Netteté & Flou de l&apos;image</span>
                      </span>
                      <span className="font-mono text-cyan-300 text-[11px] font-bold">
                        {customBgBlur === 0 ? '0px (100% Net)' : `${customBgBlur}px (Flou)`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="35"
                      step="1"
                      value={customBgBlur}
                      onChange={(e) => handleBlurChange(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleBlurChange(0)}
                        className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          customBgBlur === 0
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-800/60'
                        }`}
                      >
                        Netteté d’origine (0px)
                      </button>
                      <button
                        onClick={() => handleBlurChange(12)}
                        className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          customBgBlur === 12
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-800/60'
                        }`}
                      >
                        Flou doux (12px)
                      </button>
                      <button
                        onClick={() => handleBlurChange(24)}
                        className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          customBgBlur === 24
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-800/60'
                        }`}
                      >
                        Flou fort (24px)
                      </button>
                    </div>
                  </div>

                  {/* Opacity Slider Control */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span>Opacité & Intensité</span>
                      <span className="font-mono text-blue-400 text-[11px] font-bold">
                        {Math.round(customBgOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1"
                      step="0.05"
                      value={customBgOpacity}
                      onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Subtil (20%)</span>
                      <span>Équilibré (70%)</span>
                      <span>Max (100%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION: Personnalisation des visuels et pochettes par défaut */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-cyan-400" />
          <span>Visuel par défaut des musiques</span>
        </h2>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Cover Preview */}
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 shrink-0 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={defaultCoverPreview}
              alt="Visuel par défaut"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                {isCustomCover ? 'Image par défaut personnalisée' : 'Logo officiel de l’application'}
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                isCustomCover ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              }`}>
                {isCustomCover ? 'Personnalisé' : 'Logo par défaut'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Ce visuel est automatiquement affiché pour toutes les musiques qui ne disposent d&apos;aucune pochette intégrée (ID3/APIC/M4A). Lorsqu&apos;il est modifié, il s&apos;applique instantanément dans tout le lecteur et vos listes.
            </p>

            {coverToast && (
              <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{coverToast}</span>
              </p>
            )}

            <div className="flex items-center gap-3 mt-3">
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCustomCoverUpload}
              />
              <button
                onClick={() => coverFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Changer l&apos;image par défaut</span>
              </button>

              {isCustomCover && (
                <button
                  onClick={handleResetDefaultCover}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer border border-slate-700/60"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rétablir le logo officiel</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Stockage Local & Bibliothèque */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-400" />
          <span>Bibliothèque & Stockage IndexedDB</span>
        </h2>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-[11px] text-slate-400">Morceaux audio</span>
              <p className="text-lg font-bold text-white font-mono mt-0.5">{audioCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-[11px] text-slate-400">Vidéos</span>
              <p className="text-lg font-bold text-white font-mono mt-0.5">{videoCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-[11px] text-slate-400">Playlists</span>
              <p className="text-lg font-bold text-white font-mono mt-0.5">{playlists.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-[11px] text-slate-400">Volume indexé</span>
              <p className="text-lg font-bold text-white font-mono mt-0.5">{formatBytes(totalSize)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Rafraîchir l&apos;accès aux fichiers</span>
            </button>

            <button
              disabled={isScanningFolder}
              onClick={async () => {
                setIsScanningFolder(true);
                try {
                  await importDirectory();
                } finally {
                  setIsScanningFolder(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
              title="Importer en masse un dossier complet de fichiers"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>{isScanningFolder ? "Indexation..." : "Importer un dossier (Bulk FSA API)"}</span>
            </button>

            {hasStoredDirectory && (
              <button
                disabled={isScanningFolder}
                onClick={async () => {
                  setIsScanningFolder(true);
                  try {
                    await reconnectStoredDirectory();
                  } finally {
                    setIsScanningFolder(false);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                title="Resynchroniser les fichiers à partir de votre dossier stocké"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isScanningFolder ? 'animate-spin' : ''}`} />
                <span>Resynchroniser le dossier</span>
              </button>
            )}

            <button
              onClick={() => loadDemoSamples()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/50 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Charger des morceaux de démo</span>
            </button>
          </div>
        </div>

        {/* Action critique : Supprimer tous les imports avec double confirmation */}
        <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Nettoyage des imports de l&apos;application</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Supprime tous les médias importés dans l&apos;application (musiques, vidéos, pochettes, métadonnées). Vos fichiers d&apos;origine sur votre disque ne sont jamais altérés.
            </p>
          </div>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Supprimer tous les imports</span>
          </button>
        </div>
      </section>

      {/* SECTION: Raccourcis clavier */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-amber-400" />
          <span>Raccourcis clavier globaux</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/70 text-xs"
            >
              <span className="text-slate-300">{s.action}</span>
              <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono font-bold text-[11px] shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: Confidentialité & architecture locale */}
      <section className="p-4 rounded-2xl bg-blue-950/30 border border-blue-800/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-200/90 leading-relaxed">
          <strong className="text-white block mb-0.5">Architecture 100% Hors-Ligne & Confidentielle</strong>
          Tous vos fichiers musicaux et vidéos restent confinés sur votre machine. Aucune donnée audio, vidéo ou métadonnée n&apos;est envoyée sur un serveur distant ou dans le cloud.
        </div>
      </section>

      {/* Boîte de dialogue de double confirmation pour la suppression de tous les imports */}
      <DeleteAllImportsModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
