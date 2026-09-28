'use client';

import React, { useRef, useState, useCallback, useSyncExternalStore } from 'react';
import {
  HardDrive,
  FilePlus,
  FolderPlus,
  Sparkles,
  ShieldCheck,
  Music2,
  Film,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderArchive,
  Sliders,
  Radio,
  Tv,
  Trash2,
} from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import { BrowserCapabilities } from '@/utils/browser';
import { DeleteAllImportsModal } from './DeleteAllImportsModal';

interface ImportManagerProps {
  variant?: 'full' | 'compact' | 'modal';
  onClose?: () => void;
  onImportComplete?: (count: number) => void;
}

export function ImportManager({
  variant = 'full',
  onClose,
  onImportComplete,
}: ImportManagerProps) {
  const { importFiles, importDirectory, loadDemoSamples, isScanning, mediaList } = useLibrary();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dirInputFallbackRef = useRef<HTMLInputElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // SSR-safe client capability detection using React standard external store hook
  const hasNativeDirPicker = useSyncExternalStore(
    () => () => {},
    () => BrowserCapabilities.hasFileSystemAccess,
    () => false
  );

  const handleFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    setFeedbackMessage('Lecture et indexation des fichiers en cours...');
    try {
      const added = await importFiles(files);
      if (added > 0) {
        setFeedbackMessage(`${added} fichier(s) importé(s) avec succès !`);
        onImportComplete?.(added);
        setTimeout(() => setFeedbackMessage(null), 4000);
      } else {
        setFeedbackMessage('Aucun fichier multimédia audio/vidéo valide trouvé.');
        setTimeout(() => setFeedbackMessage(null), 3500);
      }
    } catch (err) {
      console.error('Import error:', err);
      setErrorMessage("Erreur lors de l'importation des fichiers.");
    }
  };

  const handleDirectoryImport = async () => {
    setErrorMessage(null);
    if (hasNativeDirPicker) {
      try {
        const added = await importDirectory();
        if (added > 0) {
          setFeedbackMessage(`${added} fichier(s) indexé(s) depuis le dossier !`);
          onImportComplete?.(added);
          setTimeout(() => setFeedbackMessage(null), 4000);
        }
      } catch (err: unknown) {
        // If user cancelled, don't show an error
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('Native directory picker error, trying fallback:', err);
          // Trigger fallback directory input
          dirInputFallbackRef.current?.click();
        }
      }
    } else {
      // Fallback for browsers without File System Access API
      dirInputFallbackRef.current?.click();
    }
  };

  const handleDemoImport = async () => {
    setErrorMessage(null);
    setIsLoadingSamples(true);
    setFeedbackMessage('Génération des échantillons synthétiques et vidéo de démo...');
    try {
      const added = await loadDemoSamples();
      setFeedbackMessage(`${added} échantillons de démonstration chargés.`);
      onImportComplete?.(added);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      console.error('Demo error:', err);
      setErrorMessage("Impossible de charger les fichiers de démonstration.");
    } finally {
      setIsLoadingSamples(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const items = e.dataTransfer.items;
      const files: File[] = [];

      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'file') {
            const f = item.getAsFile();
            if (f) files.push(f);
          }
        }
      } else if (e.dataTransfer.files) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          files.push(e.dataTransfer.files[i]);
        }
      }

      if (files.length > 0) {
        await handleFilesChosen(files as unknown as FileList);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [importFiles]
  );

  return (
    <div
      id="import-manager-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center transition-all ${
        variant === 'full'
          ? 'w-full max-w-4xl mx-auto px-4 py-8 sm:py-12'
          : 'w-full p-6'
      }`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.mp4,.webm,.mkv,.mov,.m4v"
        className="hidden"
        onChange={(e) => {
          handleFilesChosen(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Hidden Directory Fallback Input */}
      <input
        ref={dirInputFallbackRef}
        type="file"
        // @ts-expect-error non-standard HTML directory attributes
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={(e) => {
          handleFilesChosen(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Main Drag-and-Drop Card */}
      <div
        className={`w-full rounded-3xl border-2 transition-all p-6 sm:p-10 text-center flex flex-col items-center ${
          isDragging
            ? 'border-blue-500 bg-blue-950/40 shadow-2xl shadow-blue-500/20 scale-[1.01]'
            : 'border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 hover:border-slate-700/80 shadow-xl'
        }`}
      >
        {/* Glow Header Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-2xl shadow-blue-500/25">
            {isScanning ? (
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            ) : (
              <HardDrive className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            )}
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono font-bold text-cyan-400">
            LOCAL
          </span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          Commencez avec votre bibliothèque locale
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
          Glissez-déposez vos albums, dossiers ou morceaux directement ici. Tous vos fichiers multimédias sont stockés et décodés localement dans votre navigateur, avec une confidentialité totale.
        </p>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-lg mb-6">
          <button
            id="btn-import-files"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <FilePlus className="w-5 h-5" />
            <span>Choisir des fichiers</span>
          </button>

          <button
            id="btn-import-dir"
            onClick={handleDirectoryImport}
            disabled={isScanning}
            className="flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-[0.98] text-slate-100 border border-slate-700 text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="Sélectionner un dossier de fichiers audio et vidéo"
          >
            <FolderPlus className="w-5 h-5 text-amber-400" />
            <span>Choisir un dossier</span>
          </button>
        </div>

        {/* Secondary Demo Import Action */}
        <div className="w-full max-w-lg pt-4 border-t border-slate-800/80 mb-6">
          <button
            id="btn-load-demos"
            onClick={handleDemoImport}
            disabled={isScanning || isLoadingSamples}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-2xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/40 text-indigo-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoadingSamples ? (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-400" />
            )}
            <span>Tester immédiatement avec des échantillons de démonstration</span>
          </button>

          {mediaList.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                {mediaList.length} média(s) importé(s) dans l&apos;application
              </span>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Supprimer tous les imports</span>
              </button>
            </div>
          )}
        </div>

        {/* Status and Feedback Messages */}
        {feedbackMessage && (
          <div className="flex items-center gap-2.5 py-2.5 px-4 rounded-xl bg-blue-950/70 border border-blue-800/50 text-blue-200 text-xs mb-4 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2.5 py-2.5 px-4 rounded-xl bg-rose-950/70 border border-rose-800/50 text-rose-200 text-xs mb-4">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Supported Format Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md pt-2">
          <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Music2 className="w-3 h-3 text-slate-400" /> Formats audio :
          </span>
          {['MP3', 'FLAC', 'WAV', 'AAC', 'M4A', 'OGG'].map((fmt) => (
            <span
              key={fmt}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/70 text-slate-300 border border-slate-700/50"
            >
              .{fmt.toLowerCase()}
            </span>
          ))}

          <span className="text-[11px] text-slate-500 font-medium ml-2 mr-1 flex items-center gap-1">
            <Film className="w-3 h-3 text-slate-400" /> Vidéo :
          </span>
          {['MP4', 'WebM', 'MKV'].map((fmt) => (
            <span
              key={fmt}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/70 text-amber-300/90 border border-amber-800/30"
            >
              .{fmt.toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-6">
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/70 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-left">
            <h4 className="text-xs font-bold text-white">100% Local & Privé</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Aucun fichier n&apos;est transmis sur internet. Vos médias restent dans votre navigateur via IndexedDB.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/70 flex items-start gap-3">
          <Sliders className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-left">
            <h4 className="text-xs font-bold text-white">Moteur Audio Haute Fidélité</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Égaliseur 10 bandes, spatialisation stéréo, pitch shift et analyseur spectral temps réel.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/70 flex items-start gap-3">
          <Radio className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-left">
            <h4 className="text-xs font-bold text-white">Contrôle Système</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Compatible Media Session API pour commandes Bluetooth, widgets verrouillés et Picture-in-Picture.
            </p>
          </div>
        </div>
      </div>

      {variant === 'modal' && onClose && (
        <div className="mt-6 flex justify-end w-full">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
          >
            Fermer
          </button>
        </div>
      )}

      <DeleteAllImportsModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}

export default ImportManager;
