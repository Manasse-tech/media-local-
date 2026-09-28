'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { MediaItem, Playlist, PlayHistoryItem, LyricSegment, LyricsStatus } from '@/types/media';
import {
  getAllMediaFromDB,
  saveMediaBatchToDB,
  updateMediaInDB,
  deleteMediaFromDB,
  clearAllMediaFromDB,
  getAllPlaylistsFromDB,
  savePlaylistToDB,
  deletePlaylistFromDB,
  getHistoryFromDB,
  addHistoryToDB,
  clearHistoryFromDB,
  saveStoredDirectoryHandle,
  getStoredDirectoryHandle,
  updateMediaLyricsInDB,
  deleteMediaLyricsFromDB,
} from '@/lib/db';
import { processLocalFile } from '@/lib/metadata-parser';
import { createDemoAudioTracks, createDemoVideoClip } from '@/lib/demo-samples';
import { transcribeAudioWithGemini } from '@/lib/gemini-transcription';

interface LibraryContextType {
  mediaList: MediaItem[];
  playlists: Playlist[];
  history: PlayHistoryItem[];
  isLoading: boolean;
  isScanning: boolean;
  hasStoredDirectory: boolean;
  importFiles: (files: FileList | File[]) => Promise<number>;
  importDirectory: () => Promise<number>;
  reconnectStoredDirectory: () => Promise<number>;
  loadDemoSamples: () => Promise<number>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleAlbumFavorite: (albumName: string) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
  clearAllLibrary: () => Promise<void>;
  createPlaylist: (title: string, description?: string) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  addMediaToPlaylist: (playlistId: string, mediaId: string) => Promise<void>;
  removeMediaFromPlaylist: (playlistId: string, mediaId: string) => Promise<void>;
  reorderPlaylist: (playlistId: string, fromIndex: number, toIndex: number) => Promise<void>;
  clearPlayHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  recordPlayback: (media: MediaItem, position: number, completed?: boolean) => Promise<void>;
  updateResumePosition: (id: string, position: number) => Promise<void>;
  refreshLibraryAccess: () => Promise<void>;
  transcribeMediaLyrics: (id: string, force?: boolean) => Promise<boolean>;
  updateMediaLyrics: (id: string, segments: LyricSegment[]) => Promise<void>;
  deleteMediaLyrics: (id: string) => Promise<void>;
  updateMediaMetadata: (id: string, title: string, artist: string, album: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [history, setHistory] = useState<PlayHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [hasStoredDirectory, setHasStoredDirectory] = useState(false);

  const mediaListRef = useRef<MediaItem[]>([]);
  useEffect(() => {
    mediaListRef.current = mediaList;
  }, [mediaList]);

  // Transcription functions
  const transcribeMediaLyrics = useCallback(async (id: string, force = false): Promise<boolean> => {
    const target = mediaListRef.current.find((m) => m.id === id);
    if (!target) return false;

    // Skip if already transcribed and not forced
    if (!force && target.lyrics && target.lyrics.length > 0 && target.lyricsStatus === 'completed') {
      return true;
    }

    // Set processing status
    setMediaList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, lyricsStatus: 'processing', lyricsError: undefined } : m))
    );
    await updateMediaInDB(id, { lyricsStatus: 'processing', lyricsError: undefined });

    try {
      let fileBlob: Blob | File | null = target.file || null;
      if (!fileBlob && target.objectUrl) {
        try {
          const res = await fetch(target.objectUrl);
          fileBlob = await res.blob();
        } catch (fetchErr) {
          console.warn('Failed to fetch objectUrl blob:', fetchErr);
        }
      }

      if (!fileBlob) {
        throw new Error('Fichier audio non accessible pour la transcription.');
      }

      const result = await transcribeAudioWithGemini(
        fileBlob,
        target.title,
        target.artist,
        target.duration
      );

      await updateMediaLyricsInDB(
        id,
        result.segments,
        result.status,
        result.language,
        result.error
      );

      setMediaList((prev) =>
        prev.map((m) => {
          if (m.id === id) {
            return {
              ...m,
              lyrics: result.segments,
              lyricsStatus: result.status,
              lyricsLanguage: result.language,
              lyricsGeneratedAt: result.generatedAt || Date.now(),
              lyricsError: result.error,
            };
          }
          return m;
        })
      );
      return true;
    } catch (err) {
      const errMsg = (err as Error).message || 'Erreur transcription';
      await updateMediaInDB(id, { lyricsStatus: 'failed', lyricsError: errMsg });
      setMediaList((prev) =>
        prev.map((m) => (m.id === id ? { ...m, lyricsStatus: 'failed', lyricsError: errMsg } : m))
      );
      return false;
    }
  }, []);

  const updateMediaLyrics = useCallback(async (id: string, segments: LyricSegment[]): Promise<void> => {
    await updateMediaLyricsInDB(id, segments, 'completed');
    setMediaList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, lyrics: segments, lyricsStatus: 'completed' } : m))
    );
  }, []);

  const deleteMediaLyrics = useCallback(async (id: string): Promise<void> => {
    await deleteMediaLyricsFromDB(id);
    setMediaList((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              lyrics: [],
              lyricsStatus: 'idle',
              lyricsLanguage: undefined,
              lyricsGeneratedAt: undefined,
              lyricsError: undefined,
            }
          : m
      )
    );
  }, []);

  const updateMediaMetadata = useCallback(async (id: string, title: string, artist: string, album: string): Promise<void> => {
    await updateMediaInDB(id, { title, artist, album });
    setMediaList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, title, artist, album } : m))
    );
  }, []);

  // Check stored directory handle
  useEffect(() => {
    getStoredDirectoryHandle().then((handle) => {
      setHasStoredDirectory(Boolean(handle));
    });
  }, []);

  // Load from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [savedMedia, savedPlaylists, savedHistory] = await Promise.all([
          getAllMediaFromDB(),
          getAllPlaylistsFromDB(),
          getHistoryFromDB(),
        ]);

        if (!isMounted) return;

        // Restore objectUrls from stored native File objects
        const hydratedMedia: MediaItem[] = savedMedia.map((item) => {
          if (item.file) {
            try {
              const objectUrl = URL.createObjectURL(item.file);
              return { ...item, objectUrl, isAccessible: true };
            } catch {
              return { ...item, isAccessible: false };
            }
          }
          return { ...item, isAccessible: false };
        });

        setMediaList(hydratedMedia);
        setPlaylists(savedPlaylists);
        setHistory(savedHistory);
      } catch (err) {
        console.error('Failed to load library from IndexedDB:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Import files
  const importFiles = useCallback(async (files: FileList | File[]): Promise<number> => {
    setIsScanning(true);
    try {
      const fileArray = Array.from(files);
      const mediaFiles = fileArray.filter((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        return ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'mp4', 'webm', 'mkv', 'mov', 'm4v'].includes(ext);
      });

      if (mediaFiles.length === 0) return 0;

      const newItems: MediaItem[] = [];
      for (const file of mediaFiles) {
        try {
          const item = await processLocalFile(file, (file as unknown as { webkitRelativePath?: string }).webkitRelativePath);
          newItems.push(item);
        } catch (err) {
          console.warn('Failed to parse file:', file.name, err);
        }
      }

      if (newItems.length > 0) {
        // Tag audio tracks with pending transcription status if not already present
        const itemsWithStatus = newItems.map((item) => {
          if (item.type === 'audio' && (!item.lyrics || item.lyrics.length === 0)) {
            return { ...item, lyricsStatus: 'pending' as LyricsStatus };
          }
          return item;
        });

        await saveMediaBatchToDB(itemsWithStatus);
        setMediaList((prev) => [...prev, ...itemsWithStatus]);

        // Background non-blocking auto-transcription queue for newly imported audio tracks
        const audioTracksToTranscribe = itemsWithStatus.filter((i) => i.type === 'audio');
        if (audioTracksToTranscribe.length > 0) {
          setTimeout(async () => {
            for (const item of audioTracksToTranscribe) {
              try {
                await transcribeMediaLyrics(item.id);
              } catch (e) {
                console.warn('Background auto-transcription failed for', item.title, e);
              }
            }
          }, 200);
        }
      }

      return newItems.length;
    } finally {
      setIsScanning(false);
    }
  }, [transcribeMediaLyrics]);

  // Import directory using File System Access API or directory input fallback
  const importDirectory = useCallback(async (): Promise<number> => {
    if (typeof window === 'undefined') return 0;

    // Feature detection for showDirectoryPicker
    if (typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function') {
      try {
        const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
        const files: File[] = [];

        async function readDir(handle: FileSystemDirectoryHandle, path = '') {
          for await (const entry of (handle as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
            if (entry.kind === 'file') {
              const file = await (entry as FileSystemFileHandle).getFile();
              const ext = file.name.split('.').pop()?.toLowerCase() || '';
              if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'mp4', 'webm', 'mkv', 'mov'].includes(ext)) {
                // Attach path
                Object.defineProperty(file, 'webkitRelativePath', {
                  value: `${path}${file.name}`,
                  writable: true,
                });
                files.push(file);
              }
            } else if (entry.kind === 'directory') {
              await readDir(entry as FileSystemDirectoryHandle, `${path}${entry.name}/`);
            }
          }
        }

        await readDir(dirHandle);
        try {
          await saveStoredDirectoryHandle(dirHandle);
          setHasStoredDirectory(true);
        } catch {
          // ignore handle store failure
        }
        return await importFiles(files);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return 0;
        console.warn('Directory picker fallback needed:', err);
      }
    }

    // Fallback: trigger hidden input with webkitdirectory
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
      input.onchange = async () => {
        if (input.files && input.files.length > 0) {
          const count = await importFiles(input.files);
          resolve(count);
        } else {
          resolve(0);
        }
      };
      input.click();
    });
  }, [importFiles]);

  // Reconnect and scan stored directory with permissions
  const reconnectStoredDirectory = useCallback(async (): Promise<number> => {
    try {
      const handle = await getStoredDirectoryHandle();
      if (!handle) return 0;

      const queryPerm = await (handle as unknown as { queryPermission?: (opts: { mode: string }) => Promise<string> }).queryPermission?.({ mode: 'read' });
      if (queryPerm !== 'granted') {
        const reqPerm = await (handle as unknown as { requestPermission?: (opts: { mode: string }) => Promise<string> }).requestPermission?.({ mode: 'read' });
        if (reqPerm !== 'granted') return 0;
      }

      const files: File[] = [];
      async function readDir(dir: FileSystemDirectoryHandle, path = '') {
        for await (const entry of (dir as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
          if (entry.kind === 'file') {
            const file = await (entry as FileSystemFileHandle).getFile();
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'mp4', 'webm', 'mkv', 'mov'].includes(ext)) {
              Object.defineProperty(file, 'webkitRelativePath', {
                value: `${path}${file.name}`,
                writable: true,
              });
              files.push(file);
            }
          } else if (entry.kind === 'directory') {
            await readDir(entry as FileSystemDirectoryHandle, `${path}${entry.name}/`);
          }
        }
      }

      await readDir(handle);
      return await importFiles(files);
    } catch (err) {
      console.warn('Could not reconnect stored directory:', err);
      return 0;
    }
  }, [importFiles]);

  // Load demo samples
  const loadDemoSamples = useCallback(async (): Promise<number> => {
    const [audioDemos, videoDemo] = await Promise.all([
      createDemoAudioTracks(),
      createDemoVideoClip(),
    ]);

    const allDemos = [...audioDemos];
    if (videoDemo) allDemos.push(videoDemo);

    if (allDemos.length > 0) {
      await saveMediaBatchToDB(allDemos);
      setMediaList((prev) => [...prev, ...allDemos]);
    }

    return allDemos.length;
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback(async (id: string) => {
    setMediaList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, isFavorite: !item.isFavorite };
          updateMediaInDB(id, { isFavorite: updated.isFavorite });
          return updated;
        }
        return item;
      })
    );
  }, []);

  // Toggle favorite for an entire album
  const toggleAlbumFavorite = useCallback(async (albumName: string) => {
    setMediaList((prev) => {
      const albumTracks = prev.filter((m) => (m.album || 'Album inconnu') === albumName);
      const allFavorited = albumTracks.length > 0 && albumTracks.every((m) => m.isFavorite);
      const targetState = !allFavorited;

      return prev.map((item) => {
        if ((item.album || 'Album inconnu') === albumName) {
          updateMediaInDB(item.id, { isFavorite: targetState });
          return { ...item, isFavorite: targetState };
        }
        return item;
      });
    });
  }, []);

  // Remove media
  const removeMedia = useCallback(async (id: string) => {
    await deleteMediaFromDB(id);
    setMediaList((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item?.objectUrl) {
        URL.revokeObjectURL(item.objectUrl);
      }
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  // Clear entire library
  const clearLibrary = useCallback(async () => {
    await clearAllMediaFromDB();
    mediaList.forEach((m) => {
      if (m.objectUrl) URL.revokeObjectURL(m.objectUrl);
    });
    setMediaList([]);
  }, [mediaList]);

  // Playlists
  const createPlaylist = useCallback(async (title: string, description?: string): Promise<Playlist> => {
    const newPlaylist: Playlist = {
      id: `playlist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      description,
      mediaIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await savePlaylistToDB(newPlaylist);
    setPlaylists((prev) => [...prev, newPlaylist]);
    return newPlaylist;
  }, []);

  const deletePlaylist = useCallback(async (id: string) => {
    await deletePlaylistFromDB(id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addMediaToPlaylist = useCallback(async (playlistId: string, mediaId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId && !p.mediaIds.includes(mediaId)) {
          const updated = {
            ...p,
            mediaIds: [...p.mediaIds, mediaId],
            updatedAt: Date.now(),
          };
          savePlaylistToDB(updated);
          return updated;
        }
        return p;
      })
    );
  }, []);

  const removeMediaFromPlaylist = useCallback(async (playlistId: string, mediaId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          const updated = {
            ...p,
            mediaIds: p.mediaIds.filter((id) => id !== mediaId),
            updatedAt: Date.now(),
          };
          savePlaylistToDB(updated);
          return updated;
        }
        return p;
      })
    );
  }, []);

  // Play history & resume
  const recordPlayback = useCallback(async (media: MediaItem, position: number, completed = false) => {
    const historyItem: PlayHistoryItem = {
      id: `history_${Date.now()}`,
      mediaId: media.id,
      mediaTitle: media.title,
      mediaArtist: media.artist,
      mediaType: media.type,
      thumbnail: media.thumbnail,
      duration: media.duration,
      position,
      playedAt: Date.now(),
      completed,
    };
    await addHistoryToDB(historyItem);
    setHistory((prev) => [historyItem, ...prev.filter((h) => h.mediaId !== media.id)].slice(0, 50));

    // Update play count & lastPlayedAt
    updateMediaInDB(media.id, {
      playCount: (media.playCount || 0) + 1,
      lastPlayedAt: Date.now(),
      resumePosition: position,
    });
    setMediaList((prev) =>
      prev.map((m) =>
        m.id === media.id
          ? { ...m, playCount: (m.playCount || 0) + 1, lastPlayedAt: Date.now(), resumePosition: position }
          : m
      )
    );
  }, []);

  const updateResumePosition = useCallback(async (id: string, position: number) => {
    await updateMediaInDB(id, { resumePosition: position });
    setMediaList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, resumePosition: position } : m))
    );
  }, []);

  const reorderPlaylist = useCallback(async (playlistId: string, fromIndex: number, toIndex: number) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          const newMediaIds = [...p.mediaIds];
          const [moved] = newMediaIds.splice(fromIndex, 1);
          if (moved) {
            newMediaIds.splice(toIndex, 0, moved);
          }
          const updated = {
            ...p,
            mediaIds: newMediaIds,
            updatedAt: Date.now(),
          };
          savePlaylistToDB(updated);
          return updated;
        }
        return p;
      })
    );
  }, []);

  const refreshLibraryAccess = useCallback(async () => {
    setMediaList((prev) =>
      prev.map((item) => {
        if (item.file) {
          try {
            if (item.objectUrl) {
              URL.revokeObjectURL(item.objectUrl);
            }
            const objectUrl = URL.createObjectURL(item.file);
            return { ...item, objectUrl, isAccessible: true };
          } catch {
            return { ...item, isAccessible: false };
          }
        }
        return item;
      })
    );
  }, []);

  const clearPlayHistory = useCallback(async () => {
    await clearHistoryFromDB();
    setHistory([]);
  }, []);

  return (
    <LibraryContext.Provider
      value={{
        mediaList,
        playlists,
        history,
        isLoading,
        isScanning,
        hasStoredDirectory,
        importFiles,
        importDirectory,
        reconnectStoredDirectory,
        loadDemoSamples,
        toggleFavorite,
        toggleAlbumFavorite,
        removeMedia,
        clearLibrary,
        clearAllLibrary: clearLibrary,
        createPlaylist,
        deletePlaylist,
        addMediaToPlaylist,
        removeMediaFromPlaylist,
        reorderPlaylist,
        clearPlayHistory,
        clearHistory: clearPlayHistory,
        recordPlayback,
        updateResumePosition,
        refreshLibraryAccess,
        transcribeMediaLyrics,
        updateMediaLyrics,
        deleteMediaLyrics,
        updateMediaMetadata,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
