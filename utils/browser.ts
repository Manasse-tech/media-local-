/**
 * BrowserCapabilities Service
 * 
 * Detects modern Web platform APIs for offline media playback:
 * - File System Access API (showDirectoryPicker)
 * - Media Session API (navigator.mediaSession)
 * - Picture-in-Picture (document.pictureInPictureEnabled)
 * - Web Audio API (AudioContext)
 * - IndexedDB (window.indexedDB)
 */

export interface BrowserCapabilitiesMap {
  hasFileSystemAccess: boolean;
  hasMediaSession: boolean;
  hasPictureInPicture: boolean;
  hasWebAudio: boolean;
  hasIndexedDB: boolean;
  hasAudioElement: boolean;
  hasVideoElement: boolean;
  hasFullscreen: boolean;
  hasServiceWorker: boolean;
  hasWebWorkers: boolean;
}

export type BrowserFeature = keyof BrowserCapabilitiesMap;

class BrowserCapabilitiesService {
  private cachedCapabilities: BrowserCapabilitiesMap | null = null;

  /**
   * Queries and returns the complete capabilities object.
   */
  public getCapabilities(): BrowserCapabilitiesMap {
    if (this.cachedCapabilities) {
      return this.cachedCapabilities;
    }

    if (typeof window === 'undefined') {
      return {
        hasFileSystemAccess: false,
        hasMediaSession: false,
        hasPictureInPicture: false,
        hasWebAudio: false,
        hasIndexedDB: false,
        hasAudioElement: false,
        hasVideoElement: false,
        hasFullscreen: false,
        hasServiceWorker: false,
        hasWebWorkers: false,
      };
    }

    const hasFileSystemAccess =
      typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';

    const hasMediaSession =
      'mediaSession' in navigator && typeof navigator.mediaSession !== 'undefined';

    const hasPictureInPicture =
      typeof document !== 'undefined' &&
      'pictureInPictureEnabled' in document &&
      Boolean(document.pictureInPictureEnabled);

    const hasWebAudio =
      typeof window.AudioContext !== 'undefined' ||
      typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined';

    const hasIndexedDB =
      'indexedDB' in window && window.indexedDB !== null && typeof window.indexedDB !== 'undefined';

    const hasAudioElement = typeof Audio !== 'undefined';

    const hasVideoElement =
      typeof document !== 'undefined' &&
      typeof document.createElement('video').canPlayType === 'function';

    const hasFullscreen =
      typeof document !== 'undefined' &&
      ('fullscreenEnabled' in document && Boolean(document.fullscreenEnabled) ||
       'webkitFullscreenEnabled' in document);

    const hasServiceWorker = 'serviceWorker' in navigator;

    const hasWebWorkers = typeof Worker !== 'undefined';

    this.cachedCapabilities = {
      hasFileSystemAccess,
      hasMediaSession,
      hasPictureInPicture,
      hasWebAudio,
      hasIndexedDB,
      hasAudioElement,
      hasVideoElement,
      hasFullscreen,
      hasServiceWorker,
      hasWebWorkers,
    };

    return this.cachedCapabilities;
  }

  /**
   * Check if a specific browser feature is supported.
   */
  public isSupported(feature: BrowserFeature): boolean {
    const caps = this.getCapabilities();
    return Boolean(caps[feature]);
  }

  /**
   * Direct convenience getters
   */
  public get hasFileSystemAccess(): boolean {
    return this.isSupported('hasFileSystemAccess');
  }

  public get hasMediaSession(): boolean {
    return this.isSupported('hasMediaSession');
  }

  public get hasPictureInPicture(): boolean {
    return this.isSupported('hasPictureInPicture');
  }

  public get hasWebAudio(): boolean {
    return this.isSupported('hasWebAudio');
  }

  public get hasIndexedDB(): boolean {
    return this.isSupported('hasIndexedDB');
  }

  /**
   * Invalidate cache (e.g. if permissions or environment change)
   */
  public refresh(): BrowserCapabilitiesMap {
    this.cachedCapabilities = null;
    return this.getCapabilities();
  }
}

// Export singleton instance as default and named
export const BrowserCapabilities = new BrowserCapabilitiesService();
export default BrowserCapabilities;
