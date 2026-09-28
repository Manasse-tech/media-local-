import { MediaItem, Playlist, PlayHistoryItem } from '@/types/media';

const DB_NAME = 'local_media_player_db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = (event.target as IDBOpenDBRequest).transaction!;

      let mediaStore: IDBObjectStore;
      if (!db.objectStoreNames.contains('media')) {
        mediaStore = db.createObjectStore('media', { keyPath: 'id' });
        mediaStore.createIndex('type', 'type', { unique: false });
        mediaStore.createIndex('addedAt', 'addedAt', { unique: false });
        mediaStore.createIndex('isFavorite', 'isFavorite', { unique: false });
      } else {
        mediaStore = tx.objectStore('media');
      }

      if (!mediaStore.indexNames.contains('lyricsStatus')) {
        mediaStore.createIndex('lyricsStatus', 'lyricsStatus', { unique: false });
      }
      if (!mediaStore.indexNames.contains('lyricsGeneratedAt')) {
        mediaStore.createIndex('lyricsGeneratedAt', 'lyricsGeneratedAt', { unique: false });
      }
      if (!mediaStore.indexNames.contains('visualSource')) {
        mediaStore.createIndex('visualSource', 'visualSource', { unique: false });
      }

      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('history')) {
        const historyStore = db.createObjectStore('history', { keyPath: 'id' });
        historyStore.createIndex('playedAt', 'playedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function getAllMediaFromDB(): Promise<MediaItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readonly');
      const store = tx.objectStore('media');
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as MediaItem[];
        resolve(items || []);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get media from IndexedDB:', err);
    return [];
  }
}

export async function saveMediaBatchToDB(items: MediaItem[]): Promise<void> {
  if (items.length === 0) return;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readwrite');
    const store = tx.objectStore('media');
    for (const item of items) {
      // Don't store runtime objectUrl in IDB (it will be recreated)
      const { objectUrl, ...toStore } = item;
      store.put(toStore);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateMediaInDB(id: string, partial: Partial<MediaItem>): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        if (getReq.result) {
          const updated = { ...getReq.result, ...partial };
          delete updated.objectUrl; // runtime only
          store.put(updated);
        } else {
          // If not yet stored, store the partial with id
          store.put({ id, ...partial });
        }
      };
      getReq.onerror = () => {
        console.warn('IDB get error for media:', id);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.warn('IDB updateMedia transaction warning:', tx.error);
        resolve();
      };
    });
  } catch (err) {
    console.warn('Failed to update media in DB:', err);
  }
}

export async function deleteMediaFromDB(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readwrite');
    const store = tx.objectStore('media');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllMediaFromDB(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readwrite');
    const store = tx.objectStore('media');
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Playlists
export async function getAllPlaylistsFromDB(): Promise<Playlist[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('playlists', 'readonly');
      const store = tx.objectStore('playlists');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get playlists:', err);
    return [];
  }
}

export async function savePlaylistToDB(playlist: Playlist): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    const store = tx.objectStore('playlists');
    store.put(playlist);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePlaylistFromDB(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    const store = tx.objectStore('playlists');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// History
export async function getHistoryFromDB(): Promise<PlayHistoryItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as PlayHistoryItem[]) || [];
        list.sort((a, b) => b.playedAt - a.playedAt);
        resolve(list.slice(0, 50)); // Last 50 items
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get history:', err);
    return [];
  }
}

export async function addHistoryToDB(item: PlayHistoryItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearHistoryFromDB(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// App Settings & Persistent Directory Handles
export async function saveSettingToDB(key: string, value: unknown): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('saveSettingToDB error:', err);
  }
}

export async function getSettingFromDB<T = unknown>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? (req.result.value as T) : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveStoredDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key: 'last_directory_handle', value: handle, name: handle.name, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Could not persist directory handle:', err);
  }
}

export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get('last_directory_handle');
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve(req.result.value as FileSystemDirectoryHandle);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Lyrics persistence helpers
export async function updateMediaLyricsInDB(
  id: string,
  lyrics: import('@/types/media').LyricSegment[],
  status: import('@/types/media').LyricsStatus = 'completed',
  language?: string,
  error?: string
): Promise<void> {
  await updateMediaInDB(id, {
    lyrics,
    lyricsStatus: status,
    lyricsLanguage: language,
    lyricsGeneratedAt: Date.now(),
    lyricsError: error,
  });
}

export async function deleteMediaLyricsFromDB(id: string): Promise<void> {
  await updateMediaInDB(id, {
    lyrics: [],
    lyricsStatus: 'idle',
    lyricsLanguage: undefined,
    lyricsGeneratedAt: undefined,
    lyricsError: undefined,
  });
}


