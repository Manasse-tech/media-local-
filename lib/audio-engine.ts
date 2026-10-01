export interface EqualizerBand {
  frequency: number;
  gain: number; // -12dB to +12dB
  filterNode?: BiquadFilterNode;
}

export type EqualizerPresetName =
  | 'Flat'
  | 'Acoustic'
  | 'Bass Boost'
  | 'Bass Reducer'
  | 'Classical'
  | 'Club'
  | 'Dance'
  | 'Deep'
  | 'Electronic'
  | 'Hip-Hop'
  | 'Jazz'
  | 'Latin'
  | 'Loudness'
  | 'Lounge'
  | 'Piano'
  | 'Pop'
  | 'R&B'
  | 'Rock'
  | 'Small Speakers'
  | 'Spoken Word'
  | 'Treble Boost'
  | 'Vocal Boost';

export const EQUALIZER_PRESETS: Record<EqualizerPresetName, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Acoustic: [3.5, 3.5, 2.5, 1, 1.5, 1.5, 2.5, 3, 3, 2],
  'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  'Bass Reducer': [-6, -5, -4, -2, 0, 0, 0, 0, 0, 0],
  Classical: [4, 3, 2, 1.5, -1, -1, 0, 1.5, 2.5, 3],
  Club: [0, 0, 2, 3.5, 3.5, 3.5, 2, 0, 0, 0],
  Dance: [5, 4, 2, 0, 0, 1.5, 3, 3.5, 3, 0],
  Deep: [4.5, 3.5, 2, 1, 2, 1.5, 0.5, -1.5, -3, -4],
  Electronic: [4.5, 3.5, 1, -1.5, -2, 1, 2.5, 3.5, 4, 4.5],
  'Hip-Hop': [5, 4.5, 1.5, 2, -1, -1, 1.5, -1, 2, 3],
  Jazz: [3, 2, 1, 1.5, -1, -1, 0, 1, 2, 3],
  Latin: [3, 2, 0, 0, -1, -1, -1, 1, 2.5, 3.5],
  Loudness: [6, 4.5, 0, 0, -1.5, 0, -0.5, -5, 5, 1],
  Lounge: [-2, -1, 0, 1.5, 3, 2, 0, -1.5, 1.5, 0.5],
  Piano: [2, 1.5, 0, 2, 2.5, 1.5, 2.5, 3, 2, 2],
  Pop: [-1.5, -1, 1, 2.5, 3.5, 3, 1, -1, -1.5, -2],
  'R&B': [2.5, 5, 4, 1, -1.5, -1, 1.5, 2.5, 3, 3.5],
  Rock: [4.5, 3, 2, -1, -1.5, 1, 2.5, 3.5, 4, 4],
  'Small Speakers': [6, 4.5, 3.5, 2, 0, -1.5, -2, -2, -1.5, 0],
  'Spoken Word': [-3, -1, 0, 0.5, 3, 3.5, 3, 1.5, -1, -2.5],
  'Treble Boost': [0, 0, 0, 0, 0, 0, 1.5, 3.5, 5, 6],
  'Vocal Boost': [-2, -2, -1, 1.5, 3.5, 3.5, 2, 1, -1, -2],
};

export const FREQUENCY_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export type RoomAcousticPreset =
  | 'Off'
  | 'Studio'
  | 'Living Room'
  | 'Concert Hall'
  | 'Cathedral'
  | 'Binaural 360';

export interface Spatial3DConfig {
  enabled: boolean;
  azimuth: number; // -180 to +180 deg
  elevation: number; // -90 to +90 deg
  distance: number; // 0.5 to 5.0 meters
  crossfeed: number; // 0 (off) to 1.0 (full crossfeed)
  roomPreset: RoomAcousticPreset;
  reverbWet: number; // 0 to 1
  spatialWidth: number; // 0 to 200%
}

const STORAGE_KEY_EQ_STATE = 'local_media_equalizer_state';

class AudioEngine {
  private ctx: AudioContext | null = null;
  // WeakMap preserves MediaElementAudioSourceNode instances per DOM element to avoid InvalidStateError
  private sourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private activeSourceNode: MediaElementAudioSourceNode | null = null;
  private connectedElement: HTMLMediaElement | null = null;
  private analyser: AnalyserNode | null = null;
  private panner: StereoPannerNode | null = null;
  private preampGainNode: GainNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private compressor: DynamicsCompressorNode | null = null;
  private gainNode: GainNode | null = null;
  private isNormalized = false;
  private isInitialized = false;
  private isBypassed = false;
  private currentBandGains: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  private currentBassGain = 0;
  private currentTrebleGain = 0;
  private currentPreampGain = 0; // in dB
  private currentBalance = 0;
  private currentQFactor = 1.4;

  // 3D Binaural & Acoustic Simulation Nodes
  private spatialDryGain: GainNode | null = null;
  private spatialWetGain: GainNode | null = null;
  private spatialPostSum: GainNode | null = null;
  private panner3D: PannerNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbDryGain: GainNode | null = null;

  // Audiophile Crossfeed Matrix Nodes (Bauer / Chu Moy filter for fatigue-free headphone listening)
  private crossfeedSplitter: ChannelSplitterNode | null = null;
  private crossfeedMerger: ChannelMergerNode | null = null;
  private crossfeedDelayL: DelayNode | null = null;
  private crossfeedDelayR: DelayNode | null = null;
  private crossfeedFilterL: BiquadFilterNode | null = null;
  private crossfeedFilterR: BiquadFilterNode | null = null;
  private crossfeedGainL: GainNode | null = null;
  private crossfeedGainR: GainNode | null = null;
  private directGainL: GainNode | null = null;
  private directGainR: GainNode | null = null;

  private spatialConfig: Spatial3DConfig = {
    enabled: false,
    azimuth: 0,
    elevation: 0,
    distance: 1.5,
    crossfeed: 0.35,
    roomPreset: 'Studio',
    reverbWet: 0.25,
    spatialWidth: 1.0,
  };

  constructor() {
    this.loadSettingsFromStorage();
  }

  private loadSettingsFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EQ_STATE);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.bandGains) && parsed.bandGains.length === 10) {
          this.currentBandGains = parsed.bandGains;
        }
        if (typeof parsed.bass === 'number') this.currentBassGain = parsed.bass;
        if (typeof parsed.treble === 'number') this.currentTrebleGain = parsed.treble;
        if (typeof parsed.preamp === 'number') this.currentPreampGain = parsed.preamp;
        if (typeof parsed.balance === 'number') this.currentBalance = parsed.balance;
        if (typeof parsed.qFactor === 'number') this.currentQFactor = parsed.qFactor;
        if (typeof parsed.isBypassed === 'boolean') this.isBypassed = parsed.isBypassed;
        if (typeof parsed.isNormalized === 'boolean') this.isNormalized = parsed.isNormalized;
      }
    } catch {
      // ignore
    }
  }

  private saveSettingsToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const data = {
        bandGains: this.currentBandGains,
        bass: this.currentBassGain,
        treble: this.currentTrebleGain,
        preamp: this.currentPreampGain,
        balance: this.currentBalance,
        qFactor: this.currentQFactor,
        isBypassed: this.isBypassed,
        isNormalized: this.isNormalized,
      };
      localStorage.setItem(STORAGE_KEY_EQ_STATE, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('audio-engine-state-changed'));
    } catch {
      // ignore
    }
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Fills a pre-allocated Uint8Array with frequency spectrum data without heap allocations.
   * Returns true if active frequency data was copied, false otherwise.
   */
  public fillFrequencyData(targetArray: Uint8Array<ArrayBuffer>): boolean {
    if (this.analyser && this.isAttached()) {
      this.analyser.getByteFrequencyData(targetArray);
      return true;
    }
    return false;
  }

  /**
   * Fills a pre-allocated Uint8Array with waveform time-domain data without heap allocations.
   * Returns true if active waveform data was copied, false otherwise.
   */
  public fillTimeDomainData(targetArray: Uint8Array<ArrayBuffer>): boolean {
    if (this.analyser && this.isAttached()) {
      this.analyser.getByteTimeDomainData(targetArray);
      return true;
    }
    return false;
  }

  public isAttached(): boolean {
    return Boolean(
      this.connectedElement &&
      this.isInitialized &&
      this.ctx &&
      this.ctx.state !== 'closed'
    );
  }

  public getAudioContextState(): AudioContextState | 'uninitialized' {
    return this.ctx?.state || 'uninitialized';
  }

  public getConnectedElement(): HTMLMediaElement | null {
    return this.connectedElement;
  }

  public getBandGains(): number[] {
    return [...this.currentBandGains];
  }

  public getBassGain(): number {
    return this.currentBassGain;
  }

  public getTrebleGain(): number {
    return this.currentTrebleGain;
  }

  public getPreampGain(): number {
    return this.currentPreampGain;
  }

  public getBalance(): number {
    return this.currentBalance;
  }

  public getQFactor(): number {
    return this.currentQFactor;
  }

  public getBypassState(): boolean {
    return this.isBypassed;
  }

  public getIsNormalized(): boolean {
    return this.isNormalized;
  }

  /**
   * Ensures the Web Audio API DSP processing graph exists and is connected to the destination.
   * This graph is built once and stays alive throughout the app lifecycle.
   */
  public ensureAudioGraph(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.ctx && this.preampGainNode && this.analyser && this.filters.length === 10) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return false;

      if (!this.ctx) {
        this.ctx = new AudioCtxClass();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.82;

      // Pre-amp gain stage
      this.preampGainNode = this.ctx.createGain();
      const preampLinear = Math.pow(10, (this.isBypassed ? 0 : this.currentPreampGain) / 20);
      this.preampGainNode.gain.value = preampLinear;

      // Bass boost filter (lowshelf)
      this.bassFilter = this.ctx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 100;
      this.bassFilter.gain.value = this.isBypassed ? 0 : this.currentBassGain;

      // Treble boost filter (highshelf)
      this.trebleFilter = this.ctx.createBiquadFilter();
      this.trebleFilter.type = 'highshelf';
      this.trebleFilter.frequency.value = 8000;
      this.trebleFilter.gain.value = this.isBypassed ? 0 : this.currentTrebleGain;

      // 10-band peaking filters
      this.filters = FREQUENCY_BANDS.map((freq, idx) => {
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = this.currentQFactor;
        filter.gain.value = this.isBypassed ? 0 : (this.currentBandGains[idx] || 0);
        return filter;
      });

      // Stereo panner for balance (if supported)
      if (this.ctx.createStereoPanner) {
        this.panner = this.ctx.createStereoPanner();
        this.panner.pan.value = this.currentBalance;
      }

      // Dynamics compressor for volume normalization (EBU R128 level matching simulation)
      this.compressor = this.ctx.createDynamicsCompressor();
      if (this.isNormalized) {
        this.compressor.threshold.value = -24; // dB
        this.compressor.ratio.value = 4;
      } else {
        this.compressor.threshold.value = 0;
        this.compressor.ratio.value = 1;
      }
      this.compressor.knee.value = 12; // dB
      this.compressor.attack.value = 0.003; // seconds
      this.compressor.release.value = 0.25; // seconds

      // Master gain node for smooth crossfade & volume ramping
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 1.0;

      // 3D Spatializer nodes & Wet/Dry Routing
      this.spatialDryGain = this.ctx.createGain();
      this.spatialWetGain = this.ctx.createGain();
      this.spatialPostSum = this.ctx.createGain();

      this.spatialDryGain.gain.value = this.spatialConfig.enabled ? 0.0 : 1.0;
      this.spatialWetGain.gain.value = this.spatialConfig.enabled ? 1.0 : 0.0;
      this.spatialPostSum.gain.value = 1.0;

      // 3D Panner (HRTF)
      this.panner3D = this.ctx.createPanner();
      this.panner3D.panningModel = 'HRTF';
      this.panner3D.distanceModel = 'inverse';
      this.panner3D.refDistance = 1;
      this.panner3D.maxDistance = 10000;
      this.panner3D.rolloffFactor = 1;
      this.panner3D.coneInnerAngle = 360;

      // Audiophile Crossfeed Matrix
      this.crossfeedSplitter = this.ctx.createChannelSplitter(2);
      this.crossfeedMerger = this.ctx.createChannelMerger(2);

      this.crossfeedDelayL = this.ctx.createDelay(0.01);
      this.crossfeedDelayR = this.ctx.createDelay(0.01);
      this.crossfeedDelayL.delayTime.value = 0.0004;
      this.crossfeedDelayR.delayTime.value = 0.0004;

      this.crossfeedFilterL = this.ctx.createBiquadFilter();
      this.crossfeedFilterR = this.ctx.createBiquadFilter();
      this.crossfeedFilterL.type = 'lowpass';
      this.crossfeedFilterR.type = 'lowpass';
      this.crossfeedFilterL.frequency.value = 700;
      this.crossfeedFilterR.frequency.value = 700;

      this.crossfeedGainL = this.ctx.createGain();
      this.crossfeedGainR = this.ctx.createGain();
      const crossVal = this.spatialConfig.crossfeed * 0.35;
      this.crossfeedGainL.gain.value = crossVal;
      this.crossfeedGainR.gain.value = crossVal;

      this.directGainL = this.ctx.createGain();
      this.directGainR = this.ctx.createGain();
      this.directGainL.gain.value = 1.0;
      this.directGainR.gain.value = 1.0;

      this.crossfeedSplitter.connect(this.directGainL, 0);
      this.directGainL.connect(this.crossfeedMerger, 0, 0);

      this.crossfeedSplitter.connect(this.directGainR, 1);
      this.directGainR.connect(this.crossfeedMerger, 0, 1);

      this.crossfeedSplitter.connect(this.crossfeedDelayL, 0);
      this.crossfeedDelayL.connect(this.crossfeedFilterL);
      this.crossfeedFilterL.connect(this.crossfeedGainL);
      this.crossfeedGainL.connect(this.crossfeedMerger, 0, 1);

      this.crossfeedSplitter.connect(this.crossfeedDelayR, 1);
      this.crossfeedDelayR.connect(this.crossfeedFilterR);
      this.crossfeedFilterR.connect(this.crossfeedGainR);
      this.crossfeedGainR.connect(this.crossfeedMerger, 0, 0);

      // Acoustic Convolver Reverb
      this.convolver = this.ctx.createConvolver();
      const impulse = this.generateRoomImpulse(this.spatialConfig.roomPreset);
      if (impulse) {
        this.convolver.buffer = impulse;
      }
      this.reverbWetGain = this.ctx.createGain();
      this.reverbDryGain = this.ctx.createGain();
      this.reverbWetGain.gain.value = this.spatialConfig.reverbWet;
      this.reverbDryGain.gain.value = 1.0;

      // Connect DSP chain:
      // preamp -> bass -> treble -> filters (0..9) -> panner
      let lastNode: AudioNode = this.preampGainNode;

      lastNode.connect(this.bassFilter);
      lastNode = this.bassFilter;

      lastNode.connect(this.trebleFilter);
      lastNode = this.trebleFilter;

      for (const filter of this.filters) {
        lastNode.connect(filter);
        lastNode = filter;
      }

      if (this.panner) {
        lastNode.connect(this.panner);
        lastNode = this.panner;
      }

      // Branch to dry and wet spatializer paths
      lastNode.connect(this.spatialDryGain);
      this.spatialDryGain.connect(this.spatialPostSum);

      lastNode.connect(this.crossfeedSplitter);
      this.crossfeedMerger.connect(this.panner3D);

      // From panner3D through reverb matrix
      const preWetSum = this.ctx.createGain();
      preWetSum.gain.value = 1.0;

      this.panner3D.connect(this.reverbDryGain);
      this.reverbDryGain.connect(preWetSum);

      this.panner3D.connect(this.convolver);
      this.convolver.connect(this.reverbWetGain);
      this.reverbWetGain.connect(preWetSum);

      preWetSum.connect(this.spatialWetGain);
      this.spatialWetGain.connect(this.spatialPostSum);

      // Update 3D coordinates
      this.applySpatialCoordinates();

      // Connect post-spatial sum through compressor, gainNode, analyser to destination
      this.spatialPostSum.connect(this.compressor);
      this.compressor.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      return true;
    } catch (err) {
      console.warn('Web Audio API DSP graph initialization warning:', err);
      return false;
    }
  }

  /**
   * Connects any HTMLMediaElement (audio or video) to the equalizer DSP graph.
   * Uses a WeakMap to guarantee createMediaElementSource is called strictly once per element.
   */
  public connectElement(mediaElement: HTMLMediaElement): boolean {
    if (typeof window === 'undefined' || !mediaElement) return false;

    const graphReady = this.ensureAudioGraph();
    if (!graphReady || !this.ctx || !this.preampGainNode) {
      return false;
    }

    if (this.connectedElement === mediaElement && this.isInitialized) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    try {
      let sourceNode = this.sourceMap.get(mediaElement);
      if (!sourceNode) {
        sourceNode = this.ctx.createMediaElementSource(mediaElement);
        this.sourceMap.set(mediaElement, sourceNode);
      }

      // Disconnect previous active source if changing elements
      if (this.activeSourceNode && this.activeSourceNode !== sourceNode) {
        try {
          this.activeSourceNode.disconnect();
        } catch {
          // ignore
        }
      }

      // Route through the equalizer preamp stage
      sourceNode.connect(this.preampGainNode);
      this.activeSourceNode = sourceNode;
      this.connectedElement = mediaElement;
      this.isInitialized = true;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      window.dispatchEvent(new CustomEvent('audio-engine-state-changed'));
      return true;
    } catch (err) {
      console.warn('Web Audio API connectElement error:', err);
      return false;
    }
  }

  /**
   * Backward-compatible init method
   */
  public init(mediaElement?: HTMLMediaElement): boolean {
    if (mediaElement) {
      return this.connectElement(mediaElement);
    }
    return this.ensureAudioGraph();
  }

  public setVolumeNormalization(enabled: boolean) {
    this.isNormalized = enabled;
    if (this.compressor && this.ctx) {
      if (enabled) {
        this.compressor.threshold.setTargetAtTime(-24, this.ctx.currentTime, 0.05);
        this.compressor.ratio.setTargetAtTime(4, this.ctx.currentTime, 0.05);
      } else {
        // Transparent passthrough
        this.compressor.threshold.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        this.compressor.ratio.setTargetAtTime(1, this.ctx.currentTime, 0.05);
      }
    }
    this.saveSettingsToStorage();
  }

  public setMasterGain(vol: number): void {
    if (this.gainNode && this.ctx) {
      const clamped = Math.max(0, Math.min(1, vol));
      this.gainNode.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.01);
    }
  }

  public async crossfadeTo(targetGain: number, durationSeconds: number = 1.5): Promise<void> {
    if (!this.gainNode || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(targetGain, now + durationSeconds);
    return new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));
  }

  public setPreampGain(gainDb: number) {
    this.currentPreampGain = gainDb;
    if (this.preampGainNode && this.ctx) {
      const linear = Math.pow(10, (this.isBypassed ? 0 : gainDb) / 20);
      this.preampGainNode.gain.setTargetAtTime(linear, this.ctx.currentTime, 0.05);
    }
    this.saveSettingsToStorage();
  }

  public setBandGain(bandIndex: number, gainDb: number) {
    this.currentBandGains[bandIndex] = gainDb;
    if (this.filters[bandIndex] && this.ctx) {
      const target = this.isBypassed ? 0 : gainDb;
      this.filters[bandIndex].gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    this.saveSettingsToStorage();
  }

  public setBassGain(gainDb: number) {
    this.currentBassGain = gainDb;
    if (this.bassFilter && this.ctx) {
      const target = this.isBypassed ? 0 : gainDb;
      this.bassFilter.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    this.saveSettingsToStorage();
  }

  public setTrebleGain(gainDb: number) {
    this.currentTrebleGain = gainDb;
    if (this.trebleFilter && this.ctx) {
      const target = this.isBypassed ? 0 : gainDb;
      this.trebleFilter.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    this.saveSettingsToStorage();
  }

  public setFilterQ(qValue: number) {
    this.currentQFactor = qValue;
    if (this.ctx) {
      this.filters.forEach((filter) => {
        filter.Q.setTargetAtTime(qValue, this.ctx!.currentTime, 0.05);
      });
    }
    this.saveSettingsToStorage();
  }

  public setBalance(pan: number) {
    this.currentBalance = Math.max(-1, Math.min(1, pan));
    if (this.panner && this.ctx) {
      this.panner.pan.setTargetAtTime(this.currentBalance, this.ctx.currentTime, 0.05);
    }
    this.saveSettingsToStorage();
  }

  public setBypass(bypassed: boolean) {
    this.isBypassed = bypassed;
    if (!this.ctx) {
      this.saveSettingsToStorage();
      return;
    }

    const time = this.ctx.currentTime;
    // Set preamp
    if (this.preampGainNode) {
      const linear = bypassed ? 1.0 : Math.pow(10, this.currentPreampGain / 20);
      this.preampGainNode.gain.setTargetAtTime(linear, time, 0.05);
    }
    // Set bass & treble
    if (this.bassFilter) {
      this.bassFilter.gain.setTargetAtTime(bypassed ? 0 : this.currentBassGain, time, 0.05);
    }
    if (this.trebleFilter) {
      this.trebleFilter.gain.setTargetAtTime(bypassed ? 0 : this.currentTrebleGain, time, 0.05);
    }
    // Set all 10 bands
    this.filters.forEach((filter, idx) => {
      filter.gain.setTargetAtTime(bypassed ? 0 : this.currentBandGains[idx], time, 0.05);
    });
    this.saveSettingsToStorage();
  }

  public applyPreset(presetName: EqualizerPresetName) {
    const values = EQUALIZER_PRESETS[presetName] || EQUALIZER_PRESETS.Flat;
    values.forEach((gain, i) => {
      this.setBandGain(i, gain);
    });
  }

  /**
   * Calculates the exact mathematical frequency response curve (in dB)
   * across the frequency spectrum by querying Web Audio API's BiquadFilterNodes
   */
  public getCombinedFrequencyResponse(frequencyHzList: Float32Array): Float32Array {
    const length = frequencyHzList.length;
    const totalDb = new Float32Array(length);

    // Preamp offset
    const preampOffset = this.isBypassed ? 0 : this.currentPreampGain;
    for (let i = 0; i < length; i++) {
      totalDb[i] = preampOffset;
    }

    if (this.isBypassed || !this.filters.length) {
      return totalDb;
    }

    const tempMag = new Float32Array(length);
    const tempPhase = new Float32Array(length);

    const freqInput = frequencyHzList as unknown as Float32Array<ArrayBuffer>;
    const magOutput = tempMag as unknown as Float32Array<ArrayBuffer>;
    const phaseOutput = tempPhase as unknown as Float32Array<ArrayBuffer>;

    // Sum bass filter response
    if (this.bassFilter) {
      this.bassFilter.getFrequencyResponse(freqInput, magOutput, phaseOutput);
      for (let i = 0; i < length; i++) {
        const val = tempMag[i];
        if (val > 0.00001) {
          totalDb[i] += 20 * Math.log10(val);
        }
      }
    }

    // Sum treble filter response
    if (this.trebleFilter) {
      this.trebleFilter.getFrequencyResponse(freqInput, magOutput, phaseOutput);
      for (let i = 0; i < length; i++) {
        const val = tempMag[i];
        if (val > 0.00001) {
          totalDb[i] += 20 * Math.log10(val);
        }
      }
    }

    // Sum 10 peaking filters
    for (const filter of this.filters) {
      filter.getFrequencyResponse(freqInput, magOutput, phaseOutput);
      for (let i = 0; i < length; i++) {
        const val = tempMag[i];
        if (val > 0.00001) {
          totalDb[i] += 20 * Math.log10(val);
        }
      }
    }

    return totalDb;
  }

  public resume() {
    this.ensureAudioGraph();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private generateRoomImpulse(preset: RoomAcousticPreset): AudioBuffer | null {
    if (!this.ctx || preset === 'Off') return null;
    let duration = 0.5;
    let decay = 3.0;

    switch (preset) {
      case 'Studio':
        duration = 0.35;
        decay = 4.5;
        break;
      case 'Living Room':
        duration = 0.75;
        decay = 3.2;
        break;
      case 'Concert Hall':
        duration = 2.2;
        decay = 2.0;
        break;
      case 'Cathedral':
        duration = 3.8;
        decay = 1.5;
        break;
      case 'Binaural 360':
        duration = 1.1;
        decay = 2.4;
        break;
    }

    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const factor = Math.pow(1 - i / length, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return buffer;
  }

  private applySpatialCoordinates() {
    if (!this.panner3D || !this.ctx) return;
    const { azimuth, elevation, distance } = this.spatialConfig;
    const radAzimuth = (azimuth * Math.PI) / 180;
    const radElevation = (elevation * Math.PI) / 180;

    const x = distance * Math.sin(radAzimuth) * Math.cos(radElevation);
    const y = distance * Math.sin(radElevation);
    const z = -distance * Math.cos(radAzimuth) * Math.cos(radElevation);

    const t = this.ctx.currentTime;
    if (this.panner3D.positionX) {
      this.panner3D.positionX.setTargetAtTime(x, t, 0.05);
      this.panner3D.positionY.setTargetAtTime(y, t, 0.05);
      this.panner3D.positionZ.setTargetAtTime(z, t, 0.05);
    } else {
      (this.panner3D as unknown as { setPosition: (x: number, y: number, z: number) => void }).setPosition(x, y, z);
    }
  }

  public setSpatialEnabled(enabled: boolean) {
    this.spatialConfig.enabled = enabled;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.spatialDryGain && this.spatialWetGain) {
      this.spatialDryGain.gain.setTargetAtTime(enabled ? 0.0 : 1.0, t, 0.05);
      this.spatialWetGain.gain.setTargetAtTime(enabled ? 1.0 : 0.0, t, 0.05);
    }
  }

  public getSpatialConfig(): Spatial3DConfig {
    return { ...this.spatialConfig };
  }

  public setSpatialAzimuth(deg: number) {
    this.spatialConfig.azimuth = deg;
    this.applySpatialCoordinates();
  }

  public setSpatialElevation(deg: number) {
    this.spatialConfig.elevation = deg;
    this.applySpatialCoordinates();
  }

  public setSpatialDistance(meters: number) {
    this.spatialConfig.distance = meters;
    this.applySpatialCoordinates();
  }

  public setSpatialCrossfeed(crossfeed: number) {
    this.spatialConfig.crossfeed = crossfeed;
    if (!this.ctx || !this.crossfeedGainL || !this.crossfeedGainR) return;
    const crossVal = Math.max(0, Math.min(1, crossfeed)) * 0.35;
    const t = this.ctx.currentTime;
    this.crossfeedGainL.gain.setTargetAtTime(crossVal, t, 0.05);
    this.crossfeedGainR.gain.setTargetAtTime(crossVal, t, 0.05);
  }

  public setSpatialRoomPreset(preset: RoomAcousticPreset) {
    this.spatialConfig.roomPreset = preset;
    if (!this.ctx || !this.convolver) return;
    const impulse = this.generateRoomImpulse(preset);
    this.convolver.buffer = impulse;
  }

  public setSpatialReverbWet(wet: number) {
    this.spatialConfig.reverbWet = wet;
    if (!this.ctx || !this.reverbWetGain) return;
    this.reverbWetGain.gain.setTargetAtTime(Math.max(0, Math.min(1, wet)), this.ctx.currentTime, 0.05);
  }
}

export const audioEngine = new AudioEngine();
