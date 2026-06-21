import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Sparkles, Music, Star, Wind } from "lucide-react";

class GlobalAmbientSoundscape {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  
  // Audio Nodes
  private masterGain: GainNode | null = null;
  private waveNoiseSource: AudioBufferSourceNode | null = null;
  private waveGain: GainNode | null = null;
  private waveFilter: BiquadFilterNode | null = null;
  private waveLfo: OscillatorNode | null = null;
  
  private padOscillators: OscillatorNode[] = [];
  private padGains: GainNode[] = [];
  private padFilter: BiquadFilterNode | null = null;
  private padLfo: OscillatorNode | null = null;
  
  private starTimer: NodeJS.Timeout | null = null;

  constructor() {}

  public start() {
    if (this.isRunning) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();
      
      // Master output stage with slow comfortable fade-in
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 3.0);
      this.masterGain.connect(this.ctx.destination);

      /**
       * 1. THE CELESTIAL WAVE WINDS (Procedural Noise)
       */
      // Create a 5-second white noise buffer
      const bufferSize = this.ctx.sampleRate * 5;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const channelData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        channelData[i] = Math.random() * 2 - 1;
      }

      this.waveNoiseSource = this.ctx.createBufferSource();
      this.waveNoiseSource.buffer = noiseBuffer;
      this.waveNoiseSource.loop = true;

      this.waveGain = this.ctx.createGain();
      // Keep background wind very soft and subtle
      this.waveGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

      this.waveFilter = this.ctx.createBiquadFilter();
      this.waveFilter.type = "bandpass";
      this.waveFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);
      this.waveFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

      // Low frequency modulator to slide the wind filter frequency back and forth
      this.waveLfo = this.ctx.createOscillator();
      this.waveLfo.type = "sine";
      this.waveLfo.frequency.setValueAtTime(0.07, this.ctx.currentTime); // ~14s tidal sweep

      const waveLfoGain = this.ctx.createGain();
      waveLfoGain.gain.setValueAtTime(120, this.ctx.currentTime); // scale sweep +/- 120Hz

      this.waveLfo.connect(waveLfoGain);
      waveLfoGain.connect(this.waveFilter.frequency);

      // Connect Wave route
      this.waveNoiseSource.connect(this.waveFilter);
      this.waveFilter.connect(this.waveGain);
      this.waveGain.connect(this.masterGain);

      // Launch LFO and Noise stream
      this.waveLfo.start();
      this.waveNoiseSource.start();

      /**
       * 2. THE WARM CELESTIAL DRONE (Evolving Chord Pad)
       */
      this.padFilter = this.ctx.createBiquadFilter();
      this.padFilter.type = "lowpass";
      this.padFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
      this.padFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      // Slow sweeping LFO for the pad filter
      this.padLfo = this.ctx.createOscillator();
      this.padLfo.type = "sine";
      this.padLfo.frequency.setValueAtTime(0.04, this.ctx.currentTime); // ~25s cycle
      
      const padLfoGain = this.ctx.createGain();
      padLfoGain.gain.setValueAtTime(80, this.ctx.currentTime);

      this.padLfo.connect(padLfoGain);
      padLfoGain.connect(this.padFilter.frequency);
      this.padLfo.start();

      // Soft harmonic frequencies (A minor 9th / C Major 7th feel)
      const baseFrequencies = [
        110.00, // A2
        165.00, // E3
        220.00, // A3
        261.63, // C4
        329.63, // E4
        392.00, // G4
      ];

      baseFrequencies.forEach((freq, idx) => {
        if (!this.ctx || !this.padFilter || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        // Slightly detune for warm analog wobble-width chorus
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, this.ctx.currentTime);

        // Gentle volume base for each oscillator
        const targetVol = idx < 2 ? 0.025 : 0.015;
        oscGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);

        // Connect slow beat LFOs so tones pulse organic-wise
        const pulseLfo = this.ctx.createOscillator();
        pulseLfo.type = "sine";
        pulseLfo.frequency.setValueAtTime(0.03 + idx * 0.012, this.ctx.currentTime);
        
        const pulseLfoGain = this.ctx.createGain();
        pulseLfoGain.gain.setValueAtTime(0.008, this.ctx.currentTime);

        pulseLfo.connect(pulseLfoGain);
        pulseLfoGain.connect(oscGain.gain);

        pulseLfo.start();
        osc.connect(oscGain);
        oscGain.connect(this.padFilter);

        osc.start();

        this.padOscillators.push(osc);
        this.padOscillators.push(pulseLfo);
        this.padGains.push(oscGain);
        this.padGains.push(pulseLfoGain);
      });

      this.padFilter.connect(this.masterGain);

      /**
       * 3. THE SPORADIC STAR TWINKLES (Pentatonic Bell Sparks)
       */
      const triggerTwinkle = () => {
        if (!this.ctx || !this.isRunning || !this.masterGain) return;

        const pentatonicScale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5, D5, E5, G5, A5, C6
        const randomFreq = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];

        // Create oscillator & envelope gain for bell spark
        const bellOsc = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();

        bellOsc.type = "sine";
        bellOsc.frequency.setValueAtTime(randomFreq, this.ctx.currentTime);

        // Soft bell envelope: instant trigger, slow winded exponential release
        bellGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        bellGain.gain.exponentialRampToValueAtTime(0.04, this.ctx.currentTime + 0.05); // Attack
        bellGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 3.5); // Warm Decay

        bellOsc.connect(bellGain);
        bellGain.connect(this.masterGain);

        bellOsc.start();
        
        // Auto clean bell components
        setTimeout(() => {
          try {
            bellOsc.stop();
            bellOsc.disconnect();
            bellGain.disconnect();
          } catch (e) {}
        }, 4000);

        // Schedule next twinkle with randomized sleep interval
        const nextTime = 3000 + Math.random() * 5000; // 3s to 8s
        this.starTimer = setTimeout(triggerTwinkle, nextTime);
      };

      // Trigger first twinkle
      this.starTimer = setTimeout(triggerTwinkle, 2000);

      this.isRunning = true;
    } catch (err) {
      console.warn("Global Ambient Soundscape failed to compile AudioContext:", err);
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.starTimer) {
      clearTimeout(this.starTimer);
      this.starTimer = null;
    }

    if (this.ctx && this.masterGain) {
      try {
        // Smoothly fade out stardust audio to zero
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);
      } catch (e) {}

      const cleanCtx = this.ctx;
      const cleanOscs = [...this.padOscillators];
      const cleanWaveOsc = this.waveLfo;
      const cleanWaveSrc = this.waveNoiseSource;

      setTimeout(() => {
        try {
          cleanOscs.forEach(o => { o.stop(); o.disconnect(); });
          if (cleanWaveOsc) { cleanWaveOsc.stop(); cleanWaveOsc.disconnect(); }
          if (cleanWaveSrc) { cleanWaveSrc.stop(); cleanWaveSrc.disconnect(); }
          cleanCtx.close();
        } catch (e) {}
      }, 2100);

      this.padOscillators = [];
      this.padGains = [];
      this.waveNoiseSource = null;
      this.waveLfo = null;
      this.padLfo = null;
      this.ctx = null;
      this.masterGain = null;
    }
  }

  public getIsPlaying(): boolean {
    return this.isRunning;
  }
}

export default function AmbientSoundscapeControl() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const soundscapeRef = useRef<GlobalAmbientSoundscape | null>(null);

  useEffect(() => {
    soundscapeRef.current = new GlobalAmbientSoundscape();
    // Auto show a helpful cozy notice on load
    const noticeTimer = setTimeout(() => {
      setShowTooltip(true);
    }, 1500);

    return () => {
      soundscapeRef.current?.stop();
      clearTimeout(noticeTimer);
    };
  }, []);

  const handleToggle = () => {
    if (!soundscapeRef.current) return;

    if (isPlaying) {
      soundscapeRef.current.stop();
      setIsPlaying(false);
    } else {
      soundscapeRef.current.start();
      setIsPlaying(true);
      setShowTooltip(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-auto">
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="px-4 py-2.5 rounded-2xl border border-amber-500/15 bg-black/85 backdrop-blur-md text-xs font-light text-zinc-300 max-w-xs shadow-2xl flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div className="text-left leading-relaxed">
              Ascend inside <span className="text-amber-200 font-normal">Poetic Ambient audio</span>. Toggle the soundscape.
            </div>
            <button 
              onClick={() => setShowTooltip(false)}
              className="text-zinc-500 hover:text-zinc-300 text-[10px] pl-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleToggle}
        className={`group relative w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-500 cursor-pointer shadow-lg
          ${isPlaying 
            ? "border-amber-400 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.5)]" 
            : "border-white/10 bg-[#06060c]/80 hover:bg-[#0d0d15]/90 hover:border-amber-400/40 text-zinc-400 hover:text-amber-200"
          }`}
        title={isPlaying ? "Dute Ambient Soundtrack" : "Activate Sleepy Ambient soundscape"}
      >
        {/* Interactive soundwave ripples around active button */}
        {isPlaying && (
          <>
            <span className="absolute inset-0 rounded-full bg-amber-400/10 animate-ping duration-[3500ms] pointer-events-none" />
            <span className="absolute inset-2 rounded-full bg-indigo-500/10 animate-ping duration-[2500ms] pointer-events-none" />
          </>
        )}

        <div className="relative">
          {isPlaying ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
            >
              <Music className="w-5 h-5 text-amber-300" />
            </motion.div>
          ) : (
            <VolumeX className="w-5 h-5 text-zinc-400 group-hover:text-amber-300 transition-colors" />
          )}

          {/* Spark point */}
          {isPlaying && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </div>

        {/* Vertical floating mini visualizer nodes adjacent to sound helper */}
        {isPlaying && (
          <div className="absolute right-14 flex items-center gap-1 bg-black/70 border border-amber-400/20 rounded-full px-3 py-1.5 h-8 backdrop-blur-sm">
            <span className="w-[2px] h-3 rounded-full bg-amber-400 animate-pulse duration-700" />
            <span className="w-[2px] h-4 rounded-full bg-amber-400 animate-pulse duration-1000" style={{ animationDelay: "150ms" }} />
            <span className="w-[2px] h-2.5 rounded-full bg-amber-400 animate-pulse duration-500" style={{ animationDelay: "300ms" }} />
            <span className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest pl-1">Celestial Pad</span>
          </div>
        )}
      </button>
    </div>
  );
}
