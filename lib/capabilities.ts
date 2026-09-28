import { BrowserCapabilities } from '@/types/media';
export { BrowserCapabilities as BrowserCapabilitiesService } from '@/utils/browser';
export { BrowserCapabilities as default } from '@/utils/browser';

export interface DetailedBrowserCapabilities {
  hasIndexedDB: boolean;
  hasFileSystemAccess: boolean;
  hasAudioElement: boolean;
  hasVideoElement: boolean;
  hasMediaSession: boolean;
  hasWebAudio: boolean;
  hasPictureInPicture: boolean;
  hasFullscreen: boolean;
  hasServiceWorker: boolean;
  hasWebWorkers: boolean;
}

export function getBrowserCapabilities(): DetailedBrowserCapabilities {
  if (typeof window === 'undefined') {
    return {
      hasIndexedDB: false,
      hasFileSystemAccess: false,
      hasAudioElement: false,
      hasVideoElement: false,
      hasMediaSession: false,
      hasWebAudio: false,
      hasPictureInPicture: false,
      hasFullscreen: false,
      hasServiceWorker: false,
      hasWebWorkers: false,
    };
  }

  const hasFileSystemAccess = typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';
  const hasMediaSession = 'mediaSession' in navigator;
  const hasPictureInPicture = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && !!document.pictureInPictureEnabled;
  const hasIndexedDB = 'indexedDB' in window && window.indexedDB !== null;
  const hasWebAudio = typeof window.AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined';
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasFullscreen = typeof document !== 'undefined' && 'fullscreenEnabled' in document && !!document.fullscreenEnabled;
  const hasAudioElement = typeof Audio !== 'undefined';
  const hasVideoElement = typeof document !== 'undefined' && typeof document.createElement('video').canPlayType === 'function';
  const hasWebWorkers = typeof Worker !== 'undefined';

  return {
    hasIndexedDB,
    hasFileSystemAccess,
    hasAudioElement,
    hasVideoElement,
    hasMediaSession,
    hasWebAudio,
    hasPictureInPicture,
    hasFullscreen,
    hasServiceWorker,
    hasWebWorkers,
  };
}

export function detectBrowserCapabilities(): BrowserCapabilities {
  const detailed = getBrowserCapabilities();
  return {
    fileSystemAccess: detailed.hasFileSystemAccess,
    mediaSession: detailed.hasMediaSession,
    pictureInPicture: detailed.hasPictureInPicture,
    indexedDB: detailed.hasIndexedDB,
    webAudio: detailed.hasWebAudio,
    serviceWorker: detailed.hasServiceWorker,
    fullscreen: detailed.hasFullscreen,
  };
}
