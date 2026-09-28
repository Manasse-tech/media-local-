'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Music, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6 text-center select-none">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center animate-pulse">
          <AlertCircle className="w-12 h-12 text-blue-500" />
        </div>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
        Page Introuvable (404)
      </h1>
      <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
        Le chemin d&apos;accès demandé est inexistant. Retournez sur l&apos;application principale pour profiter de votre musique locale de Côte d&apos;Ivoire et de vos playlists.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
        >
          <Home className="w-4 h-4" />
          <span>Retourner à l&apos;accueil</span>
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all border border-slate-800/80"
        >
          <Music className="w-4 h-4 text-blue-400" />
          <span>Ma Musique</span>
        </Link>
      </div>
    </div>
  );
}
