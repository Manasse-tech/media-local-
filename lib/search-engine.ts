import FlexSearch from 'flexsearch';
import { MediaItem } from '@/types/media';

interface FlexSearchDocIndex {
  add: (doc: unknown) => void;
  search: (query: string, options?: unknown) => { result?: { id?: string | number }[] }[];
}

export class MediaSearchEngine {
  private index: FlexSearchDocIndex;
  private mediaMap: Map<string, MediaItem> = new Map();

  constructor() {
    this.index = (new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['title', 'artist', 'album', 'filename', 'folder', 'extension'],
        store: ['id', 'title', 'artist', 'album', 'type', 'duration'],
      },
      tokenize: 'forward',
      context: true,
      cache: true,
    }) as unknown) as FlexSearchDocIndex;
  }

  public updateIndex(mediaList: MediaItem[]): void {
    this.mediaMap.clear();
    mediaList.forEach((item) => {
      this.mediaMap.set(item.id, item);
      this.index.add(item);
    });
  }

  public search(query: string, limit = 100): MediaItem[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const searchResults = this.index.search(query, {
      limit,
      enrich: true,
    });

    const matchedIds = new Set<string>();

    searchResults.forEach((fieldResult: { result?: { id?: string | number }[] }) => {
      if (fieldResult.result) {
        fieldResult.result.forEach((doc: { id?: string | number } | string | number) => {
          if (doc) {
            const id = typeof doc === 'object' ? doc.id : doc;
            if (id) matchedIds.add(String(id));
          }
        });
      }
    });

    const matches: MediaItem[] = [];

    // Retrieve from map based on matched IDs
    matchedIds.forEach((id) => {
      const item = this.mediaMap.get(id);
      if (item) matches.push(item);
    });

    // Sub-string/Fuzzy fallback boost if FlexSearch missed partial tokens
    if (matches.length < limit) {
      this.mediaMap.forEach((item) => {
        if (!matchedIds.has(item.id)) {
          const t = item.title.toLowerCase();
          const a = item.artist.toLowerCase();
          const al = (item.album || '').toLowerCase();
          const fp = (item.folder || '').toLowerCase();
          const fn = (item.filename || '').toLowerCase();

          if (t.includes(trimmed) || a.includes(trimmed) || al.includes(trimmed) || fp.includes(trimmed) || fn.includes(trimmed)) {
            matches.push(item);
            matchedIds.add(item.id);
          }
        }
      });
    }

    return matches.slice(0, limit);
  }
}

export const searchEngine = new MediaSearchEngine();
