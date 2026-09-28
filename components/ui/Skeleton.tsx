'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-800/80 rounded-lg ${className}`}
    />
  );
}

export function MediaRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/40 animate-pulse">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-slate-800 shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <div className="h-3.5 bg-slate-800 rounded w-1/3" />
          <div className="h-2.5 bg-slate-800/60 rounded w-1/4" />
        </div>
      </div>
      <div className="h-3 bg-slate-800 rounded w-12 shrink-0" />
    </div>
  );
}

export function MediaGridSkeleton() {
  return (
    <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/40 space-y-3 animate-pulse">
      <div className="w-full aspect-square bg-slate-800 rounded-xl" />
      <div className="space-y-1.5">
        <div className="h-3 bg-slate-800 rounded w-3/4" />
        <div className="h-2.5 bg-slate-800/60 rounded w-1/2" />
      </div>
    </div>
  );
}

export function LibraryListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <MediaRowSkeleton key={i} />
      ))}
    </div>
  );
}
