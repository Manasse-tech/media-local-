'use client';

import React from 'react';
import { History, Play, Trash2, Clock, Film, Music2, RotateCcw } from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { formatTime } from '@/lib/metadata-parser';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';

export function HistoryView() {
  const { history, mediaList, clearHistory } = useLibrary();
  const { playMedia } = usePlayer();

  const handlePlayHistoryItem = (mediaId: string, position?: number) => {
    const item = mediaList.find((m) => m.id === mediaId);
    if (item) {
      playMedia(item);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <History className="w-7 h-7 text-indigo-400" />
            <span>Historique d&apos;écoute</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Dernières lectures effectuées sur cet appareil
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Effacer tout votre historique de lecture ?')) {
                clearHistory();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-900 text-xs text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Effacer l&apos;historique</span>
          </button>
        )}
      </div>

      {/* History Items */}
      {history.length === 0 ? (
        <div className="py-20 text-center text-slate-500 max-w-sm mx-auto space-y-3">
          <History className="w-12 h-12 stroke-1 mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">Aucun historique récent</h3>
          <p className="text-xs text-slate-400">
            Vos lectures audio et vidéo locales s&apos;afficheront ici au fur et à mesure.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {history.map((h) => {
            const media = mediaList.find((m) => m.id === h.mediaId);
            const isVideo = h.mediaType === 'video';
            const dateStr = new Date(h.playedAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={h.id}
                onClick={() => handlePlayHistoryItem(h.mediaId, h.position)}
                className="group flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                    <MediaThumbnail
                      thumbnail={h.thumbnail}
                      type={isVideo ? 'video' : 'audio'}
                      title={h.mediaTitle}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-4 h-4 fill-white text-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                      {h.mediaTitle}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{h.mediaArtist || 'Inconnu'}</span>
                      {isVideo && h.position && h.position > 10 && (
                        <span className="text-amber-400 font-medium flex items-center gap-0.5">
                          <RotateCcw className="w-3 h-3" />
                          Reprendre à {formatTime(h.position)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {dateStr}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-slate-800 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
