'use client';

import React, { useState, useEffect } from 'react';
import { MediaItem } from '@/types/media';
import { useLibrary } from '@/context/LibraryContext';
import { X, Edit3, Type, Users, Disc } from 'lucide-react';

interface EditMetadataModalProps {
  track: MediaItem;
  isOpen: boolean;
  onClose: () => void;
}

export function EditMetadataModal({ track, isOpen, onClose }: EditMetadataModalProps) {
  const { updateMediaMetadata } = useLibrary();
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const [album, setAlbum] = useState(track.album || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(track.title);
    setArtist(track.artist);
    setAlbum(track.album || '');
  }, [track]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await updateMediaMetadata(
        track.id,
        title.trim(),
        artist.trim() || 'Artiste inconnu',
        album.trim() || 'Album inconnu'
      );
      onClose();
    } catch (err) {
      console.error('Error saving metadata:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4.5 h-4.5 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Modifier les métadonnées
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Filename Readonly Info */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Fichier d&apos;origine</span>
            <span className="text-[11px] text-slate-300 font-mono break-all">{track.filename}</span>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-slate-500" />
              <span>Titre du morceau *</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Mon Morceau Préféré"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
            />
          </div>

          {/* Artist Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Artiste</span>
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Ex: Artiste / Chanteur"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
            />
          </div>

          {/* Album Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-slate-500" />
              <span>Album</span>
            </label>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              placeholder="Ex: Album / Single"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
