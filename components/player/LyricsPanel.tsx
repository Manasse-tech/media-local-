'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Music2,
  RefreshCw,
  Edit3,
  Check,
  X,
  AlertCircle,
  Clock,
  Volume2,
  Languages,
  CheckCircle2,
} from 'lucide-react';
import { MediaItem, LyricSegment, LyricsStatus } from '@/types/media';
import { useLibrary } from '@/context/LibraryContext';

interface LyricsPanelProps {
  currentMedia: MediaItem | null;
  position: number;
  onSeek: (seconds: number) => void;
}

export function LyricsPanel({ currentMedia, position, onSeek }: LyricsPanelProps) {
  const { transcribeMediaLyrics, updateMediaLyrics, deleteMediaLyrics } = useLibrary();

  const [isEditing, setIsEditing] = useState(false);
  const [editableSegments, setEditableSegments] = useState<LyricSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync lyrics segments from media
  const segments: LyricSegment[] = useMemo(() => {
    if (!currentMedia || !currentMedia.lyrics) return [];
    return currentMedia.lyrics;
  }, [currentMedia]);

  const lyricsStatus: LyricsStatus = currentMedia?.lyricsStatus || (segments.length > 0 ? 'completed' : 'idle');

  // Find active segment index based on current position
  const activeIndex = useMemo(() => {
    if (segments.length === 0) return -1;

    let matchIdx = -1;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (position >= seg.start && position <= seg.end) {
        return i;
      }
      if (position >= seg.start) {
        matchIdx = i;
      }
    }
    return matchIdx;
  }, [segments, position]);

  // Smooth auto-scroll to active lyric line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current && !isEditing) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isEditing]);

  const handleTranscribe = async (force = false) => {
    if (!currentMedia) return;
    setIsTranscribing(true);
    try {
      await transcribeMediaLyrics(currentMedia.id, force);
    } catch (e) {
      console.warn('Transcription error:', e);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!currentMedia) return;
    const sorted = [...editableSegments].sort((a, b) => a.start - b.start);
    await updateMediaLyrics(currentMedia.id, sorted);
    setIsEditing(false);
  };

  const handleAddSegment = () => {
    const lastSeg = editableSegments[editableSegments.length - 1];
    const newStart = lastSeg ? lastSeg.end + 0.5 : 0;
    setEditableSegments((prev) => [
      ...prev,
      {
        start: parseFloat(newStart.toFixed(1)),
        end: parseFloat((newStart + 4).toFixed(1)),
        text: 'Nouvelle ligne de parole',
      },
    ]);
  };

  const handleRemoveSegment = (index: number) => {
    setEditableSegments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1).padStart(4, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 shrink-0 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Paroles Synchronisées
          </span>
          {currentMedia?.lyricsLanguage && (
            <span className="flex items-center gap-1 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
              <Languages className="w-2.5 h-2.5" />
              {currentMedia.lyricsLanguage}
            </span>
          )}
        </div>

        {/* Status Indicator & Action Buttons */}
        <div className="flex items-center gap-2">
          {lyricsStatus === 'processing' || isTranscribing ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 text-[11px] font-medium animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Analyse des paroles...</span>
            </span>
          ) : lyricsStatus === 'completed' ? (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 text-[10px] font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Paroles disponibles</span>
            </span>
          ) : lyricsStatus === 'needs_review' ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/50 text-[10px] font-medium">
              <AlertCircle className="w-3 h-3" />
              <span>Transcription à vérifier</span>
            </span>
          ) : null}

          {/* Edit / Retranscribe buttons */}
          {currentMedia && (
            <div className="flex items-center gap-1">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => handleTranscribe(true)}
                    disabled={isTranscribing || lyricsStatus === 'processing'}
                    className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="Retranscrire avec Gemini IA"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTranscribing ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => {
                      setEditableSegments(JSON.parse(JSON.stringify(segments)));
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Modifier manuellement les paroles"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span className="hidden sm:inline">Éditer</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Sauvegarder</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Annuler"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      {isEditing ? (
        /* Manual Editing Mode */
        <div className="flex-1 flex flex-col p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-400">
              Ajustez les textes et repères temporels (début / fin en secondes) :
            </p>
            <button
              onClick={handleAddSegment}
              className="px-2 py-0.5 text-[10px] font-semibold text-cyan-300 bg-cyan-950 border border-cyan-800 rounded hover:bg-cyan-900 transition-colors"
            >
              + Ajouter une ligne
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {editableSegments.map((seg, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 bg-slate-950/80 border border-slate-800 rounded-xl"
              >
                <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono text-slate-400">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={seg.start}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditableSegments((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, start: val } : s))
                      );
                    }}
                    className="w-14 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-cyan-300 text-center"
                    title="Timestamp début"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={seg.end}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditableSegments((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, end: val } : s))
                      );
                    }}
                    className="w-14 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-cyan-300 text-center"
                    title="Timestamp fin"
                  />
                </div>

                <input
                  type="text"
                  value={seg.text}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditableSegments((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, text: val } : s))
                    );
                  }}
                  className="flex-1 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                />

                <button
                  onClick={() => handleRemoveSegment(idx)}
                  className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-slate-900 transition-colors"
                  title="Supprimer la ligne"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : lyricsStatus === 'processing' || isTranscribing ? (
        /* Processing Loading State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative w-16 h-16 flex items-center justify-center mb-4">
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Sparkles className="w-6 h-6 text-white animate-spin" />
            </div>
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">Analyse des paroles par Gemini IA</h4>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Extraction acoustique verbatim et génération des repères temporels mot à mot...
          </p>
          <div className="w-48 h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
            <div className="w-full h-full bg-cyan-500 animate-pulse" />
          </div>
        </div>
      ) : segments.length === 0 ? (
        /* Empty / Idle State */
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
          <Music2 className="w-10 h-10 mb-3 opacity-40 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">Aucune parole générée pour le moment</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            {currentMedia
              ? "Cliquez ci-dessous pour déclencher l'analyse verbatim et la synchronisation avec Gemini."
              : 'Sélectionnez un morceau pour afficher ses paroles.'}
          </p>
          {currentMedia && (
            <button
              onClick={() => handleTranscribe(true)}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transcrire avec Gemini</span>
            </button>
          )}
        </div>
      ) : (
        /* Real-Time Synchronized Lyrics View */
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 text-center select-none"
        >
          {segments.map((segment, idx) => {
            const isActive = idx === activeIndex;
            const isPast = activeIndex >= 0 && idx < activeIndex;

            return (
              <div
                key={`${segment.start}_${idx}`}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek(segment.start)}
                className={`group py-2.5 px-4 rounded-2xl transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 border border-cyan-500/30 text-white font-bold text-base md:text-xl shadow-lg shadow-cyan-500/10 scale-105'
                    : isPast
                    ? 'text-slate-400 hover:text-slate-200 text-sm md:text-base opacity-75'
                    : 'text-slate-500 hover:text-slate-300 text-sm md:text-base opacity-60'
                }`}
              >
                {/* Text Line with word highlighting if available */}
                <p className="leading-relaxed transition-colors">
                  {segment.words && segment.words.length > 0 ? (
                    segment.words.map((w, wIdx) => {
                      const isWordActive =
                        position >= w.start && (position <= w.end || position <= segment.end);
                      return (
                        <span
                          key={wIdx}
                          className={`inline-block mr-1 transition-colors ${
                            isWordActive && isActive ? 'text-cyan-300 underline decoration-cyan-400/40' : ''
                          }`}
                        >
                          {w.word}
                        </span>
                      );
                    })
                  ) : (
                    segment.text
                  )}
                </p>

                {/* Sub-label timestamp tag */}
                <span className="text-[10px] text-cyan-400/70 opacity-0 group-hover:opacity-100 transition-opacity font-mono mt-1 inline-flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {formatSeconds(segment.start)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
