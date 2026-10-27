/**
 * Procedural Web Audio Engine for Car Parking Multiplayer 3D
 * Generates realistic engine hum, RPM harmonics, turbo blow-off, tire screech, horn, and parking radar beeps
 */
export class EngineAudio {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isStarted: boolean = false;

  // Oscillators & Nodes for engine sound
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private distortion: WaveShaperNode | null = null;

  // Tire screech nodes
  private screechGain: GainNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;
  private screechNoiseSource: AudioBufferSourceNode | null = null;

  // Horn nodes
  private hornGain: GainNode | null = null;
  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;

  // Parking sensor
  private lastBeepTime: number = 0;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public init() {
    if (this.isStarted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.setupEngineSynth();
      this.setupTireScreech();
      this.setupHorn();
      this.isStarted = true;
    } catch {
      // Audio not supported or blocked
    }
  }

  private makeDistortionCurve(amount: number = 20) {
    const k = typeof amount === 'number' ? amount : 20;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private setupEngineSynth() {
    if (!this.ctx) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.distortion = this.ctx.createWaveShaper();
    this.distortion.curve = this.makeDistortionCurve(15);
    this.distortion.oversample = '2x';

    // Primary engine cylinder firing oscillator (sawtooth)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(38, this.ctx.currentTime); // ~900 RPM idle

    // Secondary harmonic oscillator (triangle for rumble body)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(57, this.ctx.currentTime);

    // Deep sub-bass exhaust rumble
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subOsc.frequency.setValueAtTime(19, this.ctx.currentTime);

    this.osc1.connect(this.distortion);
    this.osc2.connect(this.distortion);
    this.subOsc.connect(this.engineGain);

    this.distortion.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.osc1.start();
    this.osc2.start();
    this.subOsc.start();
  }

  private setupTireScreech() {
    if (!this.ctx) return;

    // Create white noise buffer for tire friction
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.screechNoiseSource = this.ctx.createBufferSource();
    this.screechNoiseSource.buffer = noiseBuffer;
    this.screechNoiseSource.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.screechNoiseSource.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.ctx.destination);

    this.screechNoiseSource.start();
  }

  private setupHorn() {
    if (!this.ctx) return;

    this.hornGain = this.ctx.createGain();
    this.hornGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.hornOsc1 = this.ctx.createOscillator();
    this.hornOsc1.type = 'triangle';
    this.hornOsc1.frequency.setValueAtTime(440, this.ctx.currentTime); // High tone A4

    this.hornOsc2 = this.ctx.createOscillator();
    this.hornOsc2.type = 'triangle';
    this.hornOsc2.frequency.setValueAtTime(349.2, this.ctx.currentTime); // Low tone F4

    this.hornOsc1.connect(this.hornGain);
    this.hornOsc2.connect(this.hornGain);
    this.hornGain.connect(this.ctx.destination);

    this.hornOsc1.start();
    this.hornOsc2.start();
  }

  public updateEngine(rpm: number, throttle: number, speedKmh: number, isDrifting: boolean, isBraking: boolean) {
    if (!this.ctx || !this.isStarted || this.isMuted) return;

    const t = this.ctx.currentTime;

    // RPM mapping: 900 to 7500 -> base fundamental freq ~32Hz to 280Hz
    const normalizedRpm = Math.min(Math.max((rpm - 900) / (7200 - 900), 0), 1);
    const baseFreq = 34 + normalizedRpm * 220;

    if (this.osc1 && this.osc2 && this.subOsc) {
      this.osc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
      this.osc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.05);
      this.subOsc.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);
    }

    if (this.engineFilter) {
      const filterCutoff = 350 + throttle * 1200 + normalizedRpm * 800;
      this.engineFilter.frequency.setTargetAtTime(filterCutoff, t, 0.06);
    }

    if (this.engineGain) {
      const targetGain = 0.06 + throttle * 0.14 + normalizedRpm * 0.08;
      this.engineGain.gain.setTargetAtTime(targetGain, t, 0.04);
    }

    // Tire screech volume
    if (this.screechGain && this.screechFilter) {
      let screechIntensity = 0;
      if (isDrifting && speedKmh > 12) {
        screechIntensity = Math.min(0.28, 0.08 + speedKmh * 0.003);
      } else if (isBraking && speedKmh > 25) {
        screechIntensity = Math.min(0.22, (speedKmh / 100) * 0.2);
      }

      this.screechGain.gain.setTargetAtTime(screechIntensity, t, 0.08);
      const screechFreq = 1000 + Math.min(speedKmh * 12, 1800);
      this.screechFilter.frequency.setTargetAtTime(screechFreq, t, 0.08);
    }
  }

  public triggerTurboBlowoff() {
    if (!this.ctx || !this.isStarted || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Chirp + hiss
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.35);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, t);
      filter.Q.setValueAtTime(4.0, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.4);
    } catch {
      // safe fallback
    }
  }

  public triggerGearShiftClick() {
    if (!this.ctx || !this.isStarted || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.09);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    } catch {
      // safe fallback
    }
  }

  public setHorn(active: boolean) {
    if (!this.ctx || !this.hornGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    this.hornGain.gain.setTargetAtTime(active ? 0.25 : 0, t, 0.03);
  }

  public updateParkingSensor(distanceMeters: number) {
    if (!this.ctx || !this.isStarted || this.isMuted) return;
    if (distanceMeters > 3.0) return; // out of sensor range

    const now = performance.now();
    // Intervals: 3m -> 700ms, 1m -> 250ms, 0.35m -> 80ms (solid tone)
    const intervalMs = Math.max(70, Math.min(800, distanceMeters * 220));

    if (now - this.lastBeepTime > intervalMs) {
      this.lastBeepTime = now;
      this.playParkingSensorBeep(distanceMeters);
    }
  }

  private playParkingSensorBeep(distance: number) {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Higher pitch as you get closer: 1200Hz to 2000Hz
      const freq = 1200 + Math.max(0, (3.0 - distance) / 3.0) * 900;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const duration = distance < 0.4 ? 0.12 : 0.05;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + duration);
    } catch {
      // safe fallback
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.engineGain) {
      if (this.isMuted) {
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    }
    return this.isMuted;
  }

  public getMuted() {
    return this.isMuted;
  }
}

export const globalAudio = new EngineAudio();
