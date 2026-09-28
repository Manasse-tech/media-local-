/**
 * Covers & Thumbnails Management
 * Handles:
 * - Embedded cover extraction & DataURL conversion
 * - External cover art search (iTunes / Open Music API)
 * - Default configurable application cover and video thumbnail
 * - In-memory and IndexedDB caching
 */

// Generate default application audio cover as a crisp SVG Data URL
export function getDefaultAudioCover(title = '', artist = ''): string {
  const safeTitle = escapeXml(title || 'Local Media');
  const safeArtist = escapeXml(artist || 'Lecteur Audio');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#083344" />
    </linearGradient>
    <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>
  </defs>
  <rect width="500" height="500" rx="40" fill="url(#bgGrad)" />
  <circle cx="250" cy="220" r="110" fill="#1e293b" opacity="0.6" stroke="#334155" stroke-width="3" />
  
  <!-- Waveform / Sound icon -->
  <g transform="translate(195, 165) scale(1.5)" fill="url(#iconGrad)">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </g>
  
  <!-- Subtle equalizer bars -->
  <g transform="translate(160, 310)" fill="url(#iconGrad)" opacity="0.8">
    <rect x="10" y="20" width="10" height="30" rx="5" />
    <rect x="30" y="10" width="10" height="40" rx="5" />
    <rect x="50" y="5" width="10" height="45" rx="5" />
    <rect x="70" y="15" width="10" height="35" rx="5" />
    <rect x="90" y="0" width="10" height="50" rx="5" />
    <rect x="110" y="12" width="10" height="38" rx="5" />
    <rect x="130" y="22" width="10" height="28" rx="5" />
    <rect x="150" y="8" width="10" height="42" rx="5" />
  </g>
  
  <!-- Text Label -->
  <text x="250" y="405" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="#f8fafc" letter-spacing="0.5">${safeTitle.slice(0, 30)}</text>
  <text x="250" y="435" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#94a3b8">${safeArtist.slice(0, 35)}</text>
  <text x="250" y="465" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#38bdf8" opacity="0.8">LOCAL MEDIA PLAYER</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Generate default video thumbnail as a crisp SVG Data URL
export function getDefaultVideoThumbnail(title = ''): string {
  const safeTitle = escapeXml(title || 'Vidéo');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
  <defs>
    <linearGradient id="vidBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#1e1035" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="filmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
  </defs>
  <rect width="640" height="360" rx="16" fill="url(#vidBg)" />
  
  <!-- Slate / Film icon -->
  <circle cx="320" cy="160" r="55" fill="#1e1b4b" opacity="0.7" stroke="#4338ca" stroke-width="2" />
  <polygon points="310,140 340,160 310,180" fill="url(#filmGrad)" />
  
  <!-- Title -->
  <text x="320" y="260" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="600" fill="#f8fafc">${safeTitle.slice(0, 45)}</text>
  <text x="320" y="290" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" fill="#818cf8">LECTEUR VIDÉO HD</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Convert Blob to Data URL
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Conversion to DataURL failed'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Search external cover (e.g. iTunes API) with strict 2.5-second timeout
export async function searchExternalCover(
  title: string,
  artist: string,
  album?: string
): Promise<string | null> {
  // If no artist or generic title, skip
  if (!title || title === 'Titre inconnu' || (!artist && !album)) {
    return null;
  }

  const cleanQuery = [title, artist !== 'Artiste inconnu' ? artist : '', album && album !== 'Album inconnu' ? album : '']
    .filter(Boolean)
    .join(' ');

  if (!cleanQuery.trim()) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
      cleanQuery
    )}&entity=song&limit=1`;

    const res = await fetch(itunesUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
      // Upgrade artwork resolution to 600x600
      const artwork = (data.results[0].artworkUrl100 as string).replace('100x100bb', '600x600bb');
      return artwork;
    }
  } catch {
    // Network offline or timeout - return null to fallback safely
  }

  return null;
}
