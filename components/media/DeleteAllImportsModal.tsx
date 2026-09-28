'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';

interface DeleteAllImportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ACCEPTED_APP_NAMES = ['local media player', 'mon player', 'local media'];
const REQUIRED_CONFIRMATION_TEXT = 'Je veux supprimer les dossiers importés';

export function DeleteAllImportsModal({ isOpen, onClose, onSuccess }: DeleteAllImportsModalProps) {
  const { mediaList, clearAllLibrary } = useLibrary();
  const { currentMedia, stopPlayback, clearQueue } = usePlayer();

  const [appNameInput, setAppNameInput] = useState('');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const audioCount = mediaList.filter((m) => m.type === 'audio').length;
  const videoCount = mediaList.filter((m) => m.type === 'video').length;

  const normalizedAppName = appNameInput.trim().toLowerCase();
  const isAppNameValid = ACCEPTED_APP_NAMES.includes(normalizedAppName);

  // Exact comparison after reasonable whitespace normalization
  const normalizedConfirmation = confirmationInput.trim().replace(/\s+/g, ' ');
  const isConfirmationValid = normalizedConfirmation === REQUIRED_CONFIRMATION_TEXT;

  // Button disabled until both conditions are met
  const isDeleteEnabled = isAppNameValid && isConfirmationValid && !isDeleting;

  const handleDelete = async () => {
    if (!isDeleteEnabled) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      // If active media is currently playing, stop it immediately and clear queue
      if (currentMedia) {
        stopPlayback();
      }
      clearQueue();

      // 1. Perform backend verification and cleanup execution
      const res = await fetch('/api/imports/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'current-device-user',
        },
        body: JSON.stringify({
          appName: appNameInput.trim(),
          confirmationText: normalizedConfirmation,
          userId: 'current-device-user',
          mediaIds: mediaList.map((m) => m.id),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de la validation de suppression par le serveur.');
      }

      // 2. Perform local cleanup of all application imports, caches, thumbnails and lyrics
      await clearAllLibrary();

      setSuccessMessage('Tous les imports ont été supprimés.');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue lors de la suppression.';
      setErrorMessage(msg);
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="bg-slate-900 border border-rose-900/60 rounded-2xl w-full max-w-lg p-6 text-white shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Fermer la boîte de dialogue"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h2 id="delete-modal-title" className="text-lg font-bold text-white leading-tight">
              Supprimer tous les imports
            </h2>
            <p className="text-xs text-rose-300/90 font-medium mt-0.5">
              Action irréversible sur les données de l’application
            </p>
          </div>
        </div>

        {/* Recap Notice */}
        <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-200 space-y-2">
          <p className="font-semibold text-rose-100 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Vous êtes sur le point de supprimer {audioCount} musique(s) et {videoCount} vidéo(s) importée(s).
            </span>
          </p>
          <p className="text-slate-300 leading-relaxed">
            Cette fonctionnalité supprime uniquement les musiques, vidéos, pochettes générées, miniatures, paroles
            synchronisées Gemini et métadonnées associées dans l’application. Vos fichiers originaux sur votre disque
            ne seront <strong>jamais</strong> altérés ni supprimés.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Form fields for double confirmation */}
        <div className="space-y-4">
          {/* Champ 1 */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Nom de l’application
              <span className="text-slate-400 font-normal ml-1.5">(ex: Local Media Player ou Mon Player)</span>
            </label>
            <input
              type="text"
              value={appNameInput}
              onChange={(e) => setAppNameInput(e.target.value)}
              placeholder="Écrivez le nom exact de l'application"
              disabled={isDeleting || !!successMessage}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border transition-colors outline-none ${
                appNameInput.length > 0
                  ? isAppNameValid
                    ? 'border-emerald-500/80 text-emerald-200 focus:border-emerald-500'
                    : 'border-rose-500/80 text-rose-200 focus:border-rose-500'
                  : 'border-slate-700 text-white focus:border-blue-500'
              }`}
            />
            {appNameInput.length > 0 && !isAppNameValid && (
              <p className="text-[11px] text-rose-400 mt-1">
                Le nom ne correspond pas. Nom attendu : Local Media Player
              </p>
            )}
          </div>

          {/* Champ 2 */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Confirmation
              <span className="text-slate-400 font-normal ml-1.5">
                (Tapez exactement : <span className="text-amber-300 font-mono select-all">Je veux supprimer les dossiers importés</span>)
              </span>
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Je veux supprimer les dossiers importés"
              disabled={isDeleting || !!successMessage}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-950 border transition-colors outline-none ${
                confirmationInput.length > 0
                  ? isConfirmationValid
                    ? 'border-emerald-500/80 text-emerald-200 focus:border-emerald-500'
                    : 'border-rose-500/80 text-rose-200 focus:border-rose-500'
                  : 'border-slate-700 text-white focus:border-blue-500'
              }`}
            />
            {confirmationInput.length > 0 && !isConfirmationValid && (
              <p className="text-[11px] text-rose-400 mt-1">
                Texte attendu : <em>Je veux supprimer les dossiers importés</em>
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isDeleteEnabled}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
              isDeleteEnabled
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Suppression en cours...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Supprimer tous les imports</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
