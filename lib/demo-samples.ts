import { MediaItem } from '@/types/media';

// Helper to create a WAV file from an AudioBuffer
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  out.setUint8(0, 'R'.charCodeAt(0));
  out.setUint8(1, 'I'.charCodeAt(0));
  out.setUint8(2, 'F'.charCodeAt(0));
  out.setUint8(3, 'F'.charCodeAt(0));
  pos = 4;
  setUint32(length - 8);
  // WAVE
  out.setUint8(8, 'W'.charCodeAt(0));
  out.setUint8(9, 'A'.charCodeAt(0));
  out.setUint8(10, 'V'.charCodeAt(0));
  out.setUint8(11, 'E'.charCodeAt(0));
  pos = 12;
  // fmt chunk
  out.setUint8(12, 'f'.charCodeAt(0));
  out.setUint8(13, 'm'.charCodeAt(0));
  out.setUint8(14, 't'.charCodeAt(0));
  out.setUint8(15, ' '.charCodeAt(0));
  pos = 16;
  setUint32(16); // subchunk1size
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample

  // data chunk
  out.setUint8(pos, 'd'.charCodeAt(0));
  out.setUint8(pos + 1, 'a'.charCodeAt(0));
  out.setUint8(pos + 2, 't'.charCodeAt(0));
  out.setUint8(pos + 3, 'a'.charCodeAt(0));
  pos += 4;
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
}

// Generate demo ambient audio tracks using OfflineAudioContext
export async function createDemoAudioTracks(): Promise<MediaItem[]> {
  const tracksData = [
    {
      title: 'Midnight Horizon (Chillwave)',
      artist: 'Aura Soundscapes',
      album: 'Echoes of Calm',
      genre: 'Ambient / Lo-Fi',
      year: 2025,
      bpm: 80,
      scale: [261.63, 329.63, 392.0, 493.88, 523.25], // C major pentatonic
      duration: 18,
    },
    {
      title: 'Solar Drift (Deep Space)',
      artist: 'Stellar Frequency',
      album: 'Orbital Dreams',
      genre: 'Electronic',
      year: 2024,
      bpm: 110,
      scale: [220.0, 261.63, 293.66, 329.63, 392.0], // A minor
      duration: 22,
    },
    {
      title: 'Neon Rain (Synthwave Groove)',
      artist: 'Cyber Sunset',
      album: 'Retrofuturism',
      genre: 'Synthwave',
      year: 2025,
      bpm: 120,
      scale: [174.61, 220.0, 261.63, 329.63, 349.23], // F major
      duration: 20,
    },
  ];

  const items: MediaItem[] = [];

  for (const track of tracksData) {
    try {
      const sampleRate = 44100;
      const length = sampleRate * track.duration;
      const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

      // Simple synthesizer music sequence
      const beatSec = 60 / track.bpm;
      const totalBeats = Math.floor(track.duration / beatSec);

      for (let beat = 0; beat < totalBeats; beat++) {
        const time = beat * beatSec;
        const noteFreq = track.scale[beat % track.scale.length];

        // Pad / Lead
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = beat % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(noteFreq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + beatSec * 0.9);

        osc.connect(gain);
        gain.connect(offlineCtx.destination);

        osc.start(time);
        osc.stop(time + beatSec);

        // Soft kick / bass on beat
        if (beat % 2 === 0) {
          const kickOsc = offlineCtx.createOscillator();
          const kickGain = offlineCtx.createGain();
          kickOsc.frequency.setValueAtTime(120, time);
          kickOsc.frequency.exponentialRampToValueAtTime(30, time + 0.25);
          kickGain.gain.setValueAtTime(0.35, time);
          kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

          kickOsc.connect(kickGain);
          kickGain.connect(offlineCtx.destination);
          kickOsc.start(time);
          kickOsc.stop(time + 0.3);
        }
      }

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = audioBufferToWav(renderedBuffer);
      const filename = `${track.artist} - ${track.title}.wav`;
      const file = new File([wavBlob], filename, { type: 'audio/wav' });
      const objectUrl = URL.createObjectURL(file);

      // Create an album art SVG placeholder
      const svgThumb = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e1b4b"/><stop offset="50%" stop-color="%233b82f6"/><stop offset="100%" stop-color="%2306b6d4"/></linearGradient></defs><rect width="400" height="400" fill="url(%23g)"/><circle cx="200" cy="200" r="110" fill="none" stroke="white" stroke-width="4" opacity="0.4"/><polygon points="180,150 250,200 180,250" fill="white" opacity="0.9"/><text x="200" y="340" fill="white" font-family="sans-serif" font-size="18" font-weight="bold" text-anchor="middle">${encodeURIComponent(track.artist)}</text></svg>`;

      // Synchronized lyrics segments for demo audio
      const demoLyrics = [
        {
          start: 0.0,
          end: 4.5,
          text: `♪ Introduction acoustique • ${track.title} ♪`,
          words: [
            { word: '♪', start: 0.0, end: 1.0 },
            { word: 'Intro', start: 1.0, end: 2.5 },
            { word: track.title, start: 2.5, end: 4.5 },
          ],
        },
        {
          start: 4.6,
          end: 9.2,
          text: `Composé par ${track.artist} (${track.genre})`,
          words: [
            { word: 'Composé', start: 4.6, end: 6.0 },
            { word: 'par', start: 6.1, end: 6.8 },
            { word: track.artist, start: 6.9, end: 9.2 },
          ],
        },
        {
          start: 9.3,
          end: 14.5,
          text: 'Spatialisation binaurale 3D et égaliseur 10 bandes activés',
          words: [
            { word: 'Spatialisation', start: 9.3, end: 11.0 },
            { word: '3D', start: 11.1, end: 12.0 },
            { word: 'activée', start: 12.1, end: 14.5 },
          ],
        },
        {
          start: 14.6,
          end: track.duration,
          text: '♪ Clôture harmonique et défilement synchronisé ♪',
          words: [
            { word: '♪', start: 14.6, end: 15.5 },
            { word: 'Harmonie', start: 15.6, end: 17.0 },
            { word: 'Synchronisée', start: 17.1, end: track.duration },
          ],
        },
      ];

      items.push({
        id: `demo_audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: track.title,
        artist: track.artist,
        album: track.album,
        genre: track.genre,
        year: track.year,
        duration: track.duration,
        type: 'audio',
        size: file.size,
        mimeType: 'audio/wav',
        extension: 'wav',
        filename,
        folder: 'Échantillons',
        thumbnail: svgThumb,
        file,
        objectUrl,
        addedAt: Date.now(),
        playCount: 0,
        isFavorite: false,
        isAccessible: true,
        lyricsStatus: 'completed',
        lyrics: demoLyrics,
        lyricsLanguage: 'fr',
        lyricsGeneratedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Failed to synthesize demo audio track:', e);
    }
  }

  return items;
}

// Generate demo video clip using Canvas + MediaRecorder
export async function createDemoVideoClip(): Promise<MediaItem | null> {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return null;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const stream = canvas.captureStream(25); // 25 fps
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recordPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: mimeType }));
      };
    });

    recorder.start();

    // Render 5 seconds of animated visuals
    const durationSec = 8;
    const totalFrames = durationSec * 25;
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const t = frame * 0.04;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // Rotating neon geometric rings
      ctx.save();
      ctx.translate(320, 180);
      ctx.rotate(t * 0.5);

      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `hsl(${(t * 40 + i * 40) % 360}, 80%, 65%)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const r = 50 + i * 25 + Math.sin(t * 2 + i) * 10;
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Foreground text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Vidéo Démo Locale HD (25 fps)', 320, 290);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Animation synthétisée en direct • ${Math.round(progress * 100)}%`, 320, 320);

      if (frame >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
      }
    }, 40);

    const videoBlob = await recordPromise;
    const filename = 'Démo - Animation Particules Géométriques.webm';
    const file = new File([videoBlob], filename, { type: mimeType });
    const objectUrl = URL.createObjectURL(file);

    // Grab thumbnail
    const thumbUrl = canvas.toDataURL('image/jpeg', 0.8);

    return {
      id: `demo_video_${Date.now()}`,
      title: 'Animation Particules Géométriques (Démo)',
      artist: 'Local Media Studio',
      album: 'Vidéos de démonstration',
      genre: 'Animation',
      duration: durationSec,
      type: 'video',
      size: file.size,
      mimeType,
      extension: 'webm',
      filename,
      folder: 'Échantillons',
      thumbnail: thumbUrl,
      file,
      objectUrl,
      addedAt: Date.now(),
      playCount: 0,
      isFavorite: true,
      width: 640,
      height: 360,
      isAccessible: true,
    };
  } catch (err) {
    console.warn('Could not generate sample video:', err);
    return null;
  }
}
