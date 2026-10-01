export type MediaType = 'audio' | 'video';

export type LyricsStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review';

export interface LyricWord {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

export interface LyricSegment {
  start: number; // seconds
  end: number;   // seconds
  text: string;
  words?: LyricWord[];
}

export interface MediaItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year?: number;
  track?: number;
  duration: number; // in seconds
  type: MediaType;
  size: number; // in bytes
  mimeType: string;
  extension: string;
  filename: string;
  folder?: string;
  thumbnail?: string; // base64 or objectUrl thumbnail for video/audio
  visualSource?: 'embedded' | 'external' | 'default'; // Origin of the visual
  file?: File; // Native File reference (persisted in IndexedDB)
  objectUrl?: string; // Runtime blob: URL
  addedAt: number;
  lastPlayedAt?: number;
  playCount: number;
  resumePosition?: number; // Last playback position in seconds
  isFavorite: boolean;
  width?: number; // for videos
  height?: number; // for videos
  bitrate?: number;
  sampleRate?: number;
  isAccessible?: boolean; // false if file reference expired
  // Gemini Automatic Lyrics attributes
  lyricsStatus?: LyricsStatus;
  lyrics?: LyricSegment[];
  lyricsLanguage?: string;
  lyricsGeneratedAt?: number;
  lyricsError?: string;
  isAudioModeOnly?: boolean; // When video is played in audio-only mode
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  mediaIds: string[];
  createdAt: number;
  updatedAt: number;
  isSmart?: boolean;
  smartType?: 'genre' | 'year' | 'playCount' | 'recent' | 'favorites';
  smartCriteria?: string;
}

export interface PlayHistoryItem {
  id: string;
  mediaId: string;
  mediaTitle: string;
  mediaArtist?: string;
  mediaType: MediaType;
  thumbnail?: string;
  duration: number;
  position: number;
  playedAt: number;
  completed: boolean;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type VisualizerMode = 'bars' | 'wave' | 'spectrum' | 'circular-spectrum' | 'off';

export interface BrowserCapabilities {
  fileSystemAccess: boolean;
  mediaSession: boolean;
  pictureInPicture: boolean;
  indexedDB: boolean;
  webAudio: boolean;
  serviceWorker: boolean;
  fullscreen: boolean;
}

export type MusicSubTab = 'tracks' | 'albums' | 'artists' | 'genres' | 'folders' | 'playlists';

export type AppRoute = 
  | 'home'
  | 'music'
  | 'albums'
  | 'album_detail'
  | 'artists'
  | 'artist_detail'
  | 'genres'
  | 'genre_detail'
  | 'folders'
  | 'folder_detail'
  | 'videos'
  | 'playlists'
  | 'playlist_detail'
  | 'favorites'
  | 'history'
  | 'search'
  | 'settings';

export type SortField = 'title' | 'artist' | 'album' | 'duration' | 'addedAt' | 'size';
export type SortOrder = 'asc' | 'desc';
