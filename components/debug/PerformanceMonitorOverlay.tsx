'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Activity, Database, Cpu, X, Zap, HardDrive } from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';

export function PerformanceMonitorOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.6);
  const [memoryMB, setMemoryMB] = useState<number | null>(null);
  const [storageMB, setStorageMB] = useState<number | null>(null);

  const { mediaList } = useLibrary();

  // FPS & Frame Render Tracker
  const lastTimeRef = useRef<number>(0);
  const framesRef = useRef<number>(0);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    let animId: number;

    const tick = () => {
      const now = performance.now();
      framesRef.current += 1;

      if (now - lastTimeRef.current >= 1000) {
        const currentFps = Math.round((framesRef.current * 1000) / (now - lastTimeRef.current));
        const avgFrameTime = parseFloat((1000 / Math.max(1, currentFps)).toFixed(1));
        
        setFps(currentFps);
        setFrameTime(avgFrameTime);

        framesRef.current = 0;
        lastTimeRef.current = now;

        // Check Heap Memory if browser supports performance.memory
        if (typeof window !== 'undefined' && (performance as any).memory) {
          const usedBytes = (performance as any).memory.usedJSHeapSize;
          setMemoryMB(parseFloat((usedBytes / (1024 * 1024)).toFixed(1)));
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Check IndexedDB / Storage estimate
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        if (est.usage) {
          setStorageMB(parseFloat((est.usage / (1024 * 1024)).toFixed(1)));
        }
      });
    }
  }, [mediaList]);

  // Toggle with Alt+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 z-50 w-72 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-4 backdrop-blur-xl animate-in fade-in duration-150 text-white font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider">Moniteur 60 FPS</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 text-slate-400 hover:text-white rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 text-xs">
        {/* FPS Badge */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Taux de rafraîchissement</span>
          </div>
          <span className={`font-mono font-bold ${fps >= 55 ? 'text-emerald-400' : fps >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
            {fps} FPS ({frameTime}ms)
          </span>
        </div>

        {/* JS Memory Heap */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>Mémoire JS Heap</span>
          </div>
          <span className="font-mono font-bold text-blue-400">
            {memoryMB !== null ? `${memoryMB} MB` : 'N/A'}
          </span>
        </div>

        {/* IndexedDB Cursor Storage */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>IndexedDB Fichiers</span>
          </div>
          <span className="font-mono font-bold text-cyan-400">
            {mediaList.length} objets
          </span>
        </div>

        {/* Storage Estimate */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400">
            <HardDrive className="w-3.5 h-3.5 text-purple-400" />
            <span>Taille Cache Disque</span>
          </div>
          <span className="font-mono font-bold text-purple-400">
            {storageMB !== null ? `${storageMB} MB` : '0 MB'}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 text-center">
        Virtualisation `@tanstack` active à 60 FPS • Alt+P pour masquer
      </div>
    </div>
  );
}
