'use client';

import React from 'react';
import { X, Info, FileText, Music2, Film, CheckCircle2, AlertTriangle, HardDrive, Sparkles, RefreshCw } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { useLibrary } from '@/context/LibraryContext';
import { formatBytes, formatTime } from '@/lib/metadata-parser';

export function MediaInfoModal() {
  const { activeMediaInfoItem, setActiveMediaInfoItem } = usePlayer();
  const { transcribeMediaLyrics } = useLibrary();

  if (!activeMediaInfoItem) return null;

  const item = activeMediaInfoItem;
  const isVideo = item.type === 'video';

  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return 'Non renseignée';
    try {
      return new Date(timestamp).toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return new Date(timestamp).toLocaleDateString('fr-FR');
    }
  };

  const visualSourceLabels: Record<string, string> = {
    embedded: 'Pochette intégrée dans le fichier (ID3/Tags)',
    external: 'Correspondance en ligne (MusicBrainz / iTunes)',
    default: 'Visuel par défaut de l’application',
  };

  const lyricsStatusLabels: Record<string, string> = {
    idle: 'Non transcrit',
    pending: 'En file d’attente pour transcription',
    processing: 'Transcription Gemini en cours...',
    ready: 'Paroles synchronisées prêtes',
    failed: 'Transcription non disponible',
  };

  const details = [
    { label: 'Titre', value: item.title },
    { label: 'Artiste / Créateur', value: item.artist },
    { label: 'Album', value: item.album },
    { label: 'Genre', value: item.genre },
    { label: 'Année', value: item.year ? String(item.year) : 'Non renseignée' },
    { label: 'Nom du fichier', value: item.filename },
    { label: 'Dossier source', value: item.folder || 'Racine' },
    { label: 'Format / Extension', value: item.extension.toUpperCase() },
    { label: 'Type MIME', value: item.mimeType },
    { label: 'Taille du fichier', value: formatBytes(item.size) },
    { label: 'Durée', value: `${formatTime(item.duration)} (${Math.round(item.duration)} secondes)` },
    {
      label: isVideo ? 'Miniature vidéo' : 'Pochette / Visuel',
      value: visualSourceLabels[item.visualSource || 'default'] || (item.thumbnail ? 'Pochette disponible' : 'Visuel par défaut'),
    },
    {
      label: 'Paroles (Gemini)',
      value: lyricsStatusLabels[item.lyricsStatus || 'idle'] || (item.lyrics?.length ? 'Paroles disponibles' : 'Non transcrit'),
    },
    ...(item.lyrics && item.lyrics.length > 0
      ? [
          { label: 'Lignes synchronisées', value: `${item.lyrics.length} segments` },
          { label: 'Langue détectée', value: item.lyricsLanguage?.toUpperCase() || 'Automatique' },
          ...(item.lyricsGeneratedAt
            ? [{ label: 'Date transcription', value: formatDateTime(item.lyricsGeneratedAt) }]
            : []),
        ]
      : []),
    ...(isVideo && item.width && item.height
      ? [
          { label: 'Résolution vidéo', value: `${item.width} × ${item.height} px` },
          { label: 'Format d’image', value: `${(item.width / item.height).toFixed(2)}:1` },
        ]
      : []),
    { label: 'Date d’ajout', value: formatDateTime(item.addedAt) },
    { label: 'Nombre d’écoutes', value: `${item.playCount || 0} fois` },
    ...(item.resumePosition && item.resumePosition > 0
      ? [{ label: 'Position de reprise', value: formatTime(item.resumePosition) }]
      : []),
  ];

  return (
    <div
      id="media-info-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setActiveMediaInfoItem(null);
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 text-white shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              {isVideo ? <Film className="w-5 h-5" /> : <Music2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base">Informations sur le média</h3>
              <p className="text-xs text-slate-400">Propriétés locales et métadonnées</p>
            </div>
          </div>
          <button
            onClick={() => setActiveMediaInfoItem(null)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Accessibility Status Pill */}
        <div className="my-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {item.isAccessible !== false ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300">Fichier local accessible</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-amber-300">Référence locale expirée / déplacée</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Stockage IndexedDB</span>
        </div>

        {/* Detailed Grid */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1 my-2">
          {details.map((d) => (
            <div
              key={d.label}
              className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-950/30 text-xs border border-slate-800/40"
            >
              <span className="text-slate-400 font-medium">{d.label}</span>
              <span className="text-slate-200 font-semibold truncate max-w-[240px] text-right font-mono">
                {d.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={async () => {
              await transcribeMediaLyrics(item.id, true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transcrire avec Gemini IA</span>
          </button>
          <button
            onClick={() => setActiveMediaInfoItem(null)}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
