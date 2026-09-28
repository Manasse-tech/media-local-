'use client';

import React from 'react';
import { X, ListMusic, Trash2, ArrowUp, ArrowDown, Play, CornerDownRight, Music2, Film } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';
import { formatTime } from '@/lib/metadata-parser';

export function QueueDrawer() {
  const {
    queue,
    queueIndex,
    isQueueOpen,
    setIsQueueOpen,
    playMedia,
    removeFromQueue,
    reorderQueue,
    clearQueue,
  } = usePlayer();

  if (!isQueueOpen) return null;

  const moveUp = (index: number) => {
    if (index > 0) reorderQueue(index, index - 1);
  };

  const moveDown = (index: number) => {
    if (index < queue.length - 1) reorderQueue(index, index + 1);
  };

  return (
    <div
      id="queue-drawer-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsQueueOpen(false);
      }}
    >
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 text-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">File d&apos;attente</h3>
              <p className="text-xs text-slate-400">{queue.length} titre(s) en attente</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-xs text-slate-400 transition-colors"
                title="Vider la file"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vider</span>
              </button>
            )}
            <button
              onClick={() => setIsQueueOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {queue.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <ListMusic className="w-12 h-12 stroke-1 mb-2 text-slate-600" />
              <p className="text-sm font-medium">La file d&apos;attente est vide</p>
              <p className="text-xs mt-1">Ajoutez des pistes depuis votre bibliothèque</p>
            </div>
          ) : (
            queue.map((item, idx) => {
              const isCurrent = idx === queueIndex;
              return (
                <div
                  key={`${item.id}_${idx}`}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all group ${
                    isCurrent
                      ? 'bg-blue-600/20 border-blue-500/50 text-white'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/70 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Thumbnail & info */}
                  <div
                    onClick={() => playMedia(item)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                      <MediaThumbnail
                        thumbnail={item.thumbnail}
                        type={item.type}
                        title={item.title}
                        className="w-full h-full object-cover"
                      />
                      {isCurrent && (
                        <div className="absolute inset-0 bg-blue-600/60 flex items-center justify-center">
                          <Play className="w-4 h-4 fill-white text-white" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-blue-400' : 'text-white'}`}>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {item.artist} • {formatTime(item.duration)}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 hover:text-white disabled:opacity-20 rounded"
                      title="Monter"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === queue.length - 1}
                      className="p-1 hover:text-white disabled:opacity-20 rounded"
                      title="Descendre"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromQueue(idx)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded"
                      title="Retirer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
