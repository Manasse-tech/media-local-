import { MediaItem, MediaType } from '@/types/media';
import {
  bytesToBase64DataUrl,
  searchOnlineCover,
  getConfiguredDefaultAudioCover,
  DEFAULT_VIDEO_THUMBNAIL_SVG,
} from './cover-manager';

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;

  if (hours > 0) {
    return `${hours}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function cleanNameFromFile(filename: string): { title: string; artist: string; album: string } {
  // Strip extension
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Look for patterns like "Artist - Title", "01 - Artist - Title", "01. Artist - Title"
  let clean = withoutExt.replace(/^\d+[\s.-]+/, ''); // remove leading track number
  
  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(' - ').trim(),
        album: 'Single / Inconnu',
      };
    }
  }

  return {
    title: clean.trim() || 'Titre inconnu',
    artist: 'Artiste inconnu',
    album: 'Album inconnu',
  };
}

// Helper: Extract picture from MP4 / M4A / AAC container
async function parseMp4Cover(file: File): Promise<string | undefined> {
  try {
    const slice = file.slice(0, Math.min(file.size, 2 * 1024 * 1024));
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const len = bytes.length;

    // Search for 'covr' fourcc
    for (let i = 0; i < len - 16; i++) {
      if (
        bytes[i] === 0x63 && // 'c'
        bytes[i + 1] === 0x6f && // 'o'
        bytes[i + 2] === 0x76 && // 'v'
        bytes[i + 3] === 0x72 // 'r'
      ) {
        // Look ahead for 'data' inside covr
        const maxSearch = Math.min(len - 8, i + 64);
        for (let j = i + 4; j < maxSearch; j++) {
          if (
            bytes[j] === 0x64 && // 'd'
            bytes[j + 1] === 0x61 && // 'a'
            bytes[j + 2] === 0x74 && // 't'
            bytes[j + 3] === 0x61 // 'a'
          ) {
            // j is at 'data' atom
            // Header is 4 bytes size, 4 bytes 'data', 4 bytes type (13 = jpg, 14 = png), 4 bytes locale
            const atomStart = j - 4;
            const view = new DataView(buffer, atomStart);
            const dataSize = view.getUint32(0);
            const dataType = view.getUint32(8); // 13 = JPEG, 14 = PNG
            const mime = dataType === 14 ? 'image/png' : 'image/jpeg';
            const imgStart = atomStart + 16;
            const imgEnd = Math.min(len, atomStart + dataSize);
            if (imgEnd > imgStart) {
              const imgBytes = bytes.subarray(imgStart, imgEnd);
              return bytesToBase64DataUrl(imgBytes, mime);
            }
          }
        }
      }
    }
  } catch {
    // Ignore MP4 cover parse error
  }
  return undefined;
}

// Helper: Extract picture from FLAC file
async function parseFlacCover(file: File): Promise<string | undefined> {
  try {
    const slice = file.slice(0, Math.min(file.size, 2 * 1024 * 1024));
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    if (bytes.length < 8) return undefined;
    // Check 'fLaC' marker
    if (
      bytes[0] !== 0x66 ||
      bytes[1] !== 0x4c ||
      bytes[2] !== 0x61 ||
      bytes[3] !== 0x43
    ) {
      return undefined;
    }

    let offset = 4;
    let isLast = false;

    while (offset + 4 < bytes.length && !isLast) {
      const header = view.getUint8(offset);
      isLast = (header & 0x80) !== 0;
      const blockType = header & 0x7f;
      const blockLength =
        (view.getUint8(offset + 1) << 16) |
        (view.getUint8(offset + 2) << 8) |
        view.getUint8(offset + 3);

      offset += 4;
      if (blockType === 6 && offset + blockLength <= bytes.length) {
        // PICTURE block
        const picView = new DataView(buffer, offset);
        // 4 bytes: picture type
        let picOffset = 4;
        const mimeLength = picView.getUint32(picOffset);
        picOffset += 4;
        let mime = '';
        for (let m = 0; m < mimeLength; m++) {
          mime += String.fromCharCode(picView.getUint8(picOffset + m));
        }
        picOffset += mimeLength;
        const descLength = picView.getUint32(picOffset);
        picOffset += 4 + descLength;
        picOffset += 16; // width (4), height (4), depth (4), colors (4)
        const dataLength = picView.getUint32(picOffset);
        picOffset += 4;

        if (offset + picOffset + dataLength <= bytes.length) {
          const imgBytes = bytes.subarray(offset + picOffset, offset + picOffset + dataLength);
          return bytesToBase64DataUrl(imgBytes, mime || 'image/jpeg');
        }
      }

      offset += blockLength;
    }
  } catch {
    // Ignore FLAC cover parse error
  }
  return undefined;
}

// Lightweight ID3v2 and multimedia tag parser
export async function parseAudioTags(file: File): Promise<{
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  thumbnail?: string;
  visualSource?: 'embedded' | 'external' | 'default';
}> {
  try {
    // 1. Check ID3 tag
    const headerSlice = file.slice(0, 10);
    const headerBuf = await headerSlice.arrayBuffer();
    const headerView = new DataView(headerBuf);

    let tags: {
      title?: string;
      artist?: string;
      album?: string;
      genre?: string;
      year?: number;
      thumbnail?: string;
      visualSource?: 'embedded' | 'external' | 'default';
    } = {};

    if (
      headerBuf.byteLength >= 10 &&
      String.fromCharCode(headerView.getUint8(0), headerView.getUint8(1), headerView.getUint8(2)) === 'ID3'
    ) {
      const majorVersion = headerView.getUint8(3); // 2, 3 or 4
      const tagSize =
        ((headerView.getUint8(6) & 0x7f) << 21) |
        ((headerView.getUint8(7) & 0x7f) << 14) |
        ((headerView.getUint8(8) & 0x7f) << 7) |
        (headerView.getUint8(9) & 0x7f);

      // Read full ID3 tag up to 4MB to capture high-res covers
      const readSize = Math.min(file.size, tagSize + 10, 4 * 1024 * 1024);
      const fullSlice = file.slice(0, readSize);
      const buffer = await fullSlice.arrayBuffer();
      const view = new DataView(buffer);
      const maxOffset = Math.min(buffer.byteLength, tagSize + 10);
      let offset = 10;

      while (offset + 10 < maxOffset) {
        if (view.getUint8(offset) === 0) break; // Padding reached

        const frameId = String.fromCharCode(
          view.getUint8(offset),
          view.getUint8(offset + 1),
          view.getUint8(offset + 2),
          view.getUint8(offset + 3)
        );

        let frameSize = 0;
        if (majorVersion === 4) {
          frameSize =
            ((view.getUint8(offset + 4) & 0x7f) << 21) |
            ((view.getUint8(offset + 5) & 0x7f) << 14) |
            ((view.getUint8(offset + 6) & 0x7f) << 7) |
            (view.getUint8(offset + 7) & 0x7f);
        } else {
          frameSize = view.getUint32(offset + 4);
        }

        if (frameSize <= 0 || offset + 10 + frameSize > buffer.byteLength) break;

        const frameDataOffset = offset + 10;
        const textDecoder = new TextDecoder('utf-8');

        if (['TIT2', 'TPE1', 'TALB', 'TCON', 'TYER', 'TDRC'].includes(frameId)) {
          const encoding = view.getUint8(frameDataOffset);
          const textBytes = new Uint8Array(buffer, frameDataOffset + 1, frameSize - 1);
          let text = '';
          if (encoding === 0) {
            text = new TextDecoder('iso-8859-1').decode(textBytes);
          } else if (encoding === 1 || encoding === 2) {
            text = new TextDecoder('utf-16').decode(textBytes);
          } else {
            text = textDecoder.decode(textBytes);
          }
          text = text.replace(/\0/g, '').trim();

          if (frameId === 'TIT2') tags.title = text;
          if (frameId === 'TPE1') tags.artist = text;
          if (frameId === 'TALB') tags.album = text;
          if (frameId === 'TCON') tags.genre = text;
          if (frameId === 'TYER' || frameId === 'TDRC') {
            const y = parseInt(text.slice(0, 4), 10);
            if (!isNaN(y)) tags.year = y;
          }
        } else if (frameId === 'APIC' && !tags.thumbnail) {
          try {
            let pos = frameDataOffset + 1; // skip encoding byte
            let mime = '';
            while (pos < frameDataOffset + frameSize && view.getUint8(pos) !== 0) {
              mime += String.fromCharCode(view.getUint8(pos));
              pos++;
            }
            pos++; // skip null
            pos++; // skip picture type byte
            while (pos < frameDataOffset + frameSize && view.getUint8(pos) !== 0) {
              pos++;
            }
            pos++; // skip null

            if (pos < frameDataOffset + frameSize) {
              const imgData = new Uint8Array(buffer, pos, frameDataOffset + frameSize - pos);
              tags.thumbnail = bytesToBase64DataUrl(imgData, mime || 'image/jpeg');
              tags.visualSource = 'embedded';
            }
          } catch {
            // Ignore APIC error
          }
        }

        offset += 10 + frameSize;
      }
    }

    // 2. If no thumbnail from ID3, check MP4/M4A covr atom
    if (!tags.thumbnail) {
      const mp4Cover = await parseMp4Cover(file);
      if (mp4Cover) {
        tags.thumbnail = mp4Cover;
        tags.visualSource = 'embedded';
      }
    }

    // 3. If still no thumbnail, check FLAC picture
    if (!tags.thumbnail) {
      const flacCover = await parseFlacCover(file);
      if (flacCover) {
        tags.thumbnail = flacCover;
        tags.visualSource = 'embedded';
      }
    }

    return tags;
  } catch {
    return {};
  }
}

// Generate thumbnail for video
export async function generateVideoThumbnail(
  file: File,
  videoUrl: string
): Promise<{ thumbnail?: string; duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    const timeout = setTimeout(() => {
      cleanup();
      resolve({ duration: 0, width: 0, height: 0 });
    }, 6000);

    const cleanup = () => {
      clearTimeout(timeout);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      // Seek to 1 second or 10%
      const seekTime = Math.min(1.0, duration > 2 ? 1.0 : duration * 0.2);
      video.currentTime = seekTime;

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          // Scale down thumbnail to save memory (max 480px width)
          const targetW = 400;
          const targetH = Math.round((height / width) * targetW) || 225;
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, targetW, targetH);
            const thumbUrl = canvas.toDataURL('image/jpeg', 0.7);
            cleanup();
            resolve({ thumbnail: thumbUrl, duration, width, height });
            return;
          }
        } catch {
          // ignore
        }
        cleanup();
        resolve({ duration, width, height });
      };
    };

    video.onerror = () => {
      cleanup();
      resolve({ duration: 0, width: 0, height: 0 });
    };
  });
}

// Load audio duration using HTMLAudioElement
export async function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = url;

    const timeout = setTimeout(() => {
      audio.src = '';
      resolve(0);
    }, 4000);

    audio.onloadedmetadata = () => {
      clearTimeout(timeout);
      const dur = audio.duration || 0;
      audio.src = '';
      resolve(dur);
    };

    audio.onerror = () => {
      clearTimeout(timeout);
      audio.src = '';
      resolve(0);
    };
  });
}

export async function processLocalFile(file: File, relativePath?: string): Promise<MediaItem> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isVideo = ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'ogv'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'weba', 'opus'].includes(ext);
  const type: MediaType = isVideo ? 'video' : 'audio';

  const id = `media_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const clean = cleanNameFromFile(file.name);
  const objectUrl = URL.createObjectURL(file);

  let duration = 0;
  let thumbnail: string | undefined = undefined;
  let title = clean.title;
  let artist = clean.artist;
  let album = clean.album;
  let genre = 'Général';
  let year: number | undefined = undefined;
  let width: number | undefined = undefined;
  let height: number | undefined = undefined;

  // Determine folder
  const folder = relativePath
    ? relativePath.split('/').slice(0, -1).join('/') || 'Dossier principal'
    : 'Local';

  let visualSource: 'embedded' | 'external' | 'default' = 'default';

  if (isVideo) {
    const videoData = await generateVideoThumbnail(file, objectUrl);
    duration = videoData.duration;
    width = videoData.width;
    height = videoData.height;
    genre = 'Vidéo';
    if (videoData.thumbnail) {
      thumbnail = videoData.thumbnail;
      visualSource = 'embedded';
    } else {
      thumbnail = DEFAULT_VIDEO_THUMBNAIL_SVG;
      visualSource = 'default';
    }
  } else if (isAudio) {
    const [tags, audioDur] = await Promise.all([
      parseAudioTags(file),
      getAudioDuration(objectUrl),
    ]);
    duration = audioDur;
    if (tags.title) title = tags.title;
    if (tags.artist) artist = tags.artist;
    if (tags.album) album = tags.album;
    if (tags.genre) genre = tags.genre;
    if (tags.year) year = tags.year;

    if (tags.thumbnail) {
      thumbnail = tags.thumbnail;
      visualSource = 'embedded';
    } else {
      // Search online cover first, fallback to configured default app logo
      try {
        const extCover = await searchOnlineCover(artist, title, album);
        if (extCover) {
          thumbnail = extCover;
          visualSource = 'external';
        } else {
          thumbnail = await getConfiguredDefaultAudioCover();
          visualSource = 'default';
        }
      } catch {
        thumbnail = await getConfiguredDefaultAudioCover();
        visualSource = 'default';
      }
    }
  }

  return {
    id,
    title,
    artist,
    album,
    genre,
    year,
    duration,
    type,
    size: file.size,
    mimeType: file.type || (isVideo ? 'video/mp4' : 'audio/mpeg'),
    extension: ext,
    filename: file.name,
    folder,
    thumbnail,
    visualSource,
    file,
    objectUrl,
    addedAt: Date.now(),
    playCount: 0,
    isFavorite: false,
    width,
    height,
    isAccessible: true,
  };
}
