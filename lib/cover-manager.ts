import { useState, useEffect } from 'react';
import { getSettingFromDB, saveSettingToDB } from './db';

// High-fidelity SVG Data URL for default application audio cover
export const DEFAULT_AUDIO_COVER_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="60%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <linearGradient id="discGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="500" height="500" rx="32" fill="url(#bgGrad)"/>
  <rect width="496" height="496" x="2" y="2" rx="30" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>

  <!-- Vinyl grooves -->
  <circle cx="250" cy="250" r="190" fill="none" stroke="rgba(56, 189, 248, 0.08)" stroke-width="2"/>
  <circle cx="250" cy="250" r="160" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1.5"/>
  <circle cx="250" cy="250" r="130" fill="none" stroke="rgba(99, 102, 241, 0.08)" stroke-width="2"/>
  <circle cx="250" cy="250" r="100" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1"/>

  <!-- Center Disc -->
  <circle cx="250" cy="250" r="85" fill="url(#discGrad)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="3" filter="url(#glow)"/>
  
  <!-- Icon: Musical note & sound waves -->
  <path d="M242 195 V275 A22 22 0 1 1 228 255 A22 22 0 0 1 242 275 V215 L285 202 V262 A22 22 0 1 1 271 242 A22 22 0 0 1 285 262 V195 Z" fill="url(#glowGrad)"/>
  <circle cx="228" cy="275" r="9" fill="#38bdf8"/>
  <circle cx="271" cy="262" r="9" fill="#a855f7"/>

  <!-- Equalizer bar accents at the bottom -->
  <g transform="translate(160, 390)" opacity="0.85">
    <rect x="0" y="20" width="8" height="20" rx="4" fill="#38bdf8"/>
    <rect x="16" y="10" width="8" height="30" rx="4" fill="#38bdf8"/>
    <rect x="32" y="0" width="8" height="40" rx="4" fill="#6366f1"/>
    <rect x="48" y="15" width="8" height="25" rx="4" fill="#6366f1"/>
    <rect x="64" y="5" width="8" height="35" rx="4" fill="#818cf8"/>
    <rect x="80" y="18" width="8" height="22" rx="4" fill="#a855f7"/>
    <rect x="96" y="8" width="8" height="32" rx="4" fill="#a855f7"/>
    <rect x="112" y="22" width="8" height="18" rx="4" fill="#c084fc"/>
    <rect x="128" y="12" width="8" height="28" rx="4" fill="#38bdf8"/>
    <rect x="144" y="2" width="8" height="38" rx="4" fill="#6366f1"/>
    <rect x="160" y="16" width="8" height="24" rx="4" fill="#818cf8"/>
    <rect x="176" y="25" width="8" height="15" rx="4" fill="#a855f7"/>
  </g>

  <!-- Typography badge -->
  <text x="250" y="460" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="3">LOCAL MEDIA PLAYER</text>
</svg>`)}`;

// High-fidelity SVG Data URL for default application video thumbnail (16:9)
export const DEFAULT_VIDEO_THUMBNAIL_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
  <defs>
    <radialGradient id="vBgGrad" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="60%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <linearGradient id="vAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="50%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="640" height="360" rx="16" fill="url(#vBgGrad)"/>
  <rect width="636" height="356" x="2" y="2" rx="14" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>

  <!-- Film reel decorative border -->
  <g fill="rgba(255,255,255,0.06)">
    <rect x="20" y="15" width="16" height="12" rx="2"/>
    <rect x="50" y="15" width="16" height="12" rx="2"/>
    <rect x="80" y="15" width="16" height="12" rx="2"/>
    <rect x="110" y="15" width="16" height="12" rx="2"/>
    <rect x="140" y="15" width="16" height="12" rx="2"/>
    <rect x="500" y="15" width="16" height="12" rx="2"/>
    <rect x="530" y="15" width="16" height="12" rx="2"/>
    <rect x="560" y="15" width="16" height="12" rx="2"/>
    <rect x="590" y="15" width="16" height="12" rx="2"/>

    <rect x="20" y="333" width="16" height="12" rx="2"/>
    <rect x="50" y="333" width="16" height="12" rx="2"/>
    <rect x="80" y="333" width="16" height="12" rx="2"/>
    <rect x="110" y="333" width="16" height="12" rx="2"/>
    <rect x="140" y="333" width="16" height="12" rx="2"/>
    <rect x="500" y="333" width="16" height="12" rx="2"/>
    <rect x="530" y="333" width="16" height="12" rx="2"/>
    <rect x="560" y="333" width="16" height="12" rx="2"/>
    <rect x="590" y="333" width="16" height="12" rx="2"/>
  </g>

  <!-- Center Play Button with Film Reel -->
  <circle cx="320" cy="175" r="54" fill="#0f172a" stroke="url(#vAccent)" stroke-width="3"/>
  <polygon points="312,153 338,175 312,197" fill="url(#vAccent)"/>

  <!-- Typography -->
  <text x="320" y="270" text-anchor="middle" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="2">LECTEUR VIDÉO LOCAL</text>
  <text x="320" y="292" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500">Miniature par défaut</text>
</svg>`)}`;

// In-memory cache for configured default audio cover
let cachedCustomAudioCover: string | null | undefined = undefined;

/**
 * Get the currently configured default audio cover (from localStorage, DB or default SVG)
 */
export async function getConfiguredDefaultAudioCover(): Promise<string> {
  if (cachedCustomAudioCover !== undefined && cachedCustomAudioCover !== null) {
    return cachedCustomAudioCover;
  }
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('app_default_audio_cover');
    if (fromStorage) {
      cachedCustomAudioCover = fromStorage;
      return fromStorage;
    }
  }
  try {
    const custom = await getSettingFromDB<string>('default_audio_cover');
    cachedCustomAudioCover = custom || null;
    if (custom && typeof window !== 'undefined') {
      try {
        localStorage.setItem('app_default_audio_cover', custom);
      } catch {
        // quota ignore
      }
    }
    return cachedCustomAudioCover || DEFAULT_AUDIO_COVER_SVG;
  } catch {
    return DEFAULT_AUDIO_COVER_SVG;
  }
}

/**
 * Get synchronous default cover (uses cached value, localStorage or fallback)
 */
export function getDefaultAudioCoverSync(): string {
  if (cachedCustomAudioCover) return cachedCustomAudioCover;
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('app_default_audio_cover');
    if (fromStorage) {
      cachedCustomAudioCover = fromStorage;
      return fromStorage;
    }
  }
  return DEFAULT_AUDIO_COVER_SVG;
}

/**
 * Set a new custom default audio cover and broadcast globally
 */
export async function setConfiguredDefaultAudioCover(dataUrl: string | null): Promise<void> {
  cachedCustomAudioCover = dataUrl || null;
  if (typeof window !== 'undefined') {
    if (dataUrl) {
      try {
        localStorage.setItem('app_default_audio_cover', dataUrl);
      } catch (e) {
        console.warn('LocalStorage quota reached, saved in IndexedDB:', e);
      }
    } else {
      localStorage.removeItem('app_default_audio_cover');
    }
    window.dispatchEvent(new CustomEvent('app-default-cover-changed', { detail: dataUrl || null }));
  }
  await saveSettingToDB('default_audio_cover', dataUrl || null);
}

/**
 * React hook to reactively subscribe to the active default audio cover
 */
export function useDefaultAudioCover(): string {
  const [cover, setCover] = useState<string>(() => getDefaultAudioCoverSync());

  useEffect(() => {
    // Initial async verification against DB
    getConfiguredDefaultAudioCover().then((resolved) => {
      setCover(resolved);
    });

    const handleCoverChange = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      if (customEvent.detail !== undefined) {
        setCover(customEvent.detail || DEFAULT_AUDIO_COVER_SVG);
      } else {
        setCover(getDefaultAudioCoverSync());
      }
    };

    window.addEventListener('app-default-cover-changed', handleCoverChange);
    window.addEventListener('storage', handleCoverChange);
    return () => {
      window.removeEventListener('app-default-cover-changed', handleCoverChange);
      window.removeEventListener('storage', handleCoverChange);
    };
  }, []);

  return cover;
}

/**
 * Search online for official album/track artwork using iTunes Search API (fast, free, high quality)
 */
export async function searchOnlineCover(
  artist: string,
  title: string,
  album?: string
): Promise<string | null> {
  try {
    const cleanArtist = artist && artist !== 'Artiste inconnu' ? artist.trim() : '';
    const cleanTitle = title && title !== 'Titre inconnu' ? title.trim() : '';
    const cleanAlbum = album && !album.includes('inconnu') ? album.trim() : '';

    if (!cleanTitle && !cleanArtist) return null;

    const queryParts = [cleanArtist, cleanAlbum || cleanTitle].filter(Boolean);
    const query = queryParts.join(' ');
    if (!query) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
      // Upgrade from 100x100 to crisp 600x600 artwork
      return data.results[0].artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Safe conversion of byte array to Base64 Data URL without exceeding stack
 */
export function bytesToBase64DataUrl(bytes: Uint8Array, mimeType: string = 'image/jpeg'): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}
