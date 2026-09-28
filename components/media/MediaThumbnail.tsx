'use client';

import React, { useState } from 'react';
import { Music2, Film } from 'lucide-react';
import { DEFAULT_VIDEO_THUMBNAIL_SVG, useDefaultAudioCover, DEFAULT_AUDIO_COVER_SVG } from '@/lib/cover-manager';

interface MediaThumbnailProps {
  thumbnail?: string;
  type: 'audio' | 'video';
  title?: string;
  className?: string;
}

export function MediaThumbnail({ thumbnail, type, title, className = 'w-12 h-12 rounded-xl' }: MediaThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const defaultAudioCover = useDefaultAudioCover();

  // If thumbnail is absent, empty or matches default SVG, use the user-configured default audio cover
  const isDefaultOrEmpty = !thumbnail || thumbnail === DEFAULT_AUDIO_COVER_SVG;

  const activeThumbnail = !hasError && !isDefaultOrEmpty
    ? thumbnail
    : (type === 'video' ? DEFAULT_VIDEO_THUMBNAIL_SVG : defaultAudioCover);

  if (activeThumbnail) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={activeThumbnail}
        alt={title || 'Cover'}
        className={`${className} object-cover shadow-sm`}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    );
  }

  if (type === 'video') {
    return (
      <div className={`${className} bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center border border-indigo-500/20 shadow-inner group-hover:scale-105 transition-transform`}>
        <Film className="w-5 h-5 text-indigo-400 drop-shadow" />
      </div>
    );
  }

  return (
    <div className={`${className} bg-gradient-to-br from-cyan-950 via-blue-950 to-slate-900 flex items-center justify-center border border-cyan-500/20 shadow-inner group-hover:scale-105 transition-transform`}>
      <Music2 className="w-5 h-5 text-cyan-400 drop-shadow" />
    </div>
  );
}
