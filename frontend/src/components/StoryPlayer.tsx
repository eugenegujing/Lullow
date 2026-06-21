import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, RotateCcw, ArrowLeft, Volume2, VolumeX, Sparkles, BookOpen, Clock, Heart, Headphones } from "lucide-react";
import BackgroundGradientAnimation from "./BackgroundGradientAnimation";
import { ThemeType } from "./BackgroundGradientAnimation";
import GlowEffect from "./GlowEffect";

interface StoryPlayerProps {
  prompt: string;
  onBack: () => void;
  activeTheme?: ThemeType;
}

interface StoryChapter {
  title: string;
  paragraphs: string[];
  duration: number; // simulated chapter duration in seconds
}

// Procedural client-side bedtime story generator matching themes
const generateBedtimeStory = (prompt: string): StoryChapter => {
  const lower = prompt.toLowerCase();
  
  if (lower.includes("anxious") || lower.includes("worry") || lower.includes("fear") || lower.includes("stres") || lower.includes("tired") || lower.includes("scared")) {
    return {
      title: "The Whispering Sanctuary of Silverwood",
      paragraphs: [
        "In the quiet heart of the ancient Silverwood, where the leaves breathe with a gentle, glowing luminescence, there stands a thousand-year-old willow tree. Its branches sweep low to the earth, creating a safe sanctuary of pure, untouched silence.",
        "As you walk along the soft, mossy path, the warm fragrance of sleeping bluebells wraps around you like a protective velvet blanket. The cool wind carries no worries, no schedules, and no demands. Only the rhythm of the whispering woods.",
        "A quiet silver owl named Lora rests upon a soft canopy branch. She gently unfurls her velvet wings, scattering a fine prism of sparkling lunar dust that floats down to settle on your eyelids, fading every worldly anxiety.",
        "You find a soft bed of silver-moss beneath the willow's safe embrace. High above, the starry constellations draw slow, warm circles in the cosmic vault, whispering that you have survived today's gravity. You have done enough.",
        "The gentle amber lantern beside you casts a warm, golden pool of safety. As the earth sleeps, you are cradled by the galaxy's heartbeat, slowly merging with the deep, warm tide of sweet rest."
      ],
      duration: 50 // 10 seconds per paragraph
    };
  } else if (lower.includes("ocean") || lower.includes("water") || lower.includes("sea") || lower.includes("blue") || lower.includes("whale")) {
    return {
      title: "The Quiet Sleep of the Indigo Deep",
      paragraphs: [
        "Deep below the gentle crest of the twilight waves resides a peaceful city of ancient coral, glowing with soft neon blues and gold. Here, the ocean does not roar; it breathes in a slow, rhythmic tide that hums a heavy, comforting lullaby.",
        "You float weightlessly down through the pleasant, warm depths of the water, guided by tiny star-fish whose lights glow with a steady, soothing amber. Every ounce of fatigue leaves your tired limbs.",
        "In the beautiful distance, the great celestial whale, Barnaby, sings a low, deep-frequency melody that resonances through the sweet water. It is a song of infinite calm, cleansing your mind of the day’s noisy echoes.",
        "You look up through the crystal marine water to see the soft outline of the moon rippling on the surface. It looks like a shining pearl, guarding the gateway to the dreamworld, whispering of absolute comfort.",
        "Wrapped in the cool, gentle embrace of ocean currents, you rest on a bed of silver sand. Let the tides rock your spirit into absolute calm, as you slowly sink into sweet dreams."
      ],
      duration: 50
    };
  } else if (lower.includes("star") || lower.includes("space") || lower.includes("universe") || lower.includes("sky") || lower.includes("nebula") || lower.includes("galaxy")) {
    return {
      title: "The Stardust Cradle of Andromeda",
      paragraphs: [
        "On the outer fringe of the cosmic nebula clouds, where stellar currents flow like warm silk through the cosmic void, a lone ship rests with its sails drawn. There is no noise here—only the quiet majesty of a trillion infant suns.",
        "You are floating gently upon a peaceful river of stardust, looking down upon the slowly rotating rings of a distant sapphire planet. The rings glow with a soft, warm iridescence, humming a golden song of cosmic tranquility.",
        "The celestial keeper of dreams gently navigates through the stars, pouring soft streams of golden light into your vessel. Each amber drop carries a dream of weightless warmth, washing away all worldly concerns.",
        "The galaxy has drawn its starry blanket around your shoulders. The constellations glow with a protective warmth, shining like tiny golden nightlights to keep your rest safe and sacred through the cosmic darkness.",
        "Close your eyes now, as the starship drifts deeper into the velvet folds of the universe. There is nothing but the infinite embrace of the cosmic cradle, rockying you into deep celestial sleep."
      ],
      duration: 50
    };
  }

  // General fantasy default story
  return {
    title: `The Bedtime Legend of the Celestial Meadow`,
    paragraphs: [
      `In a hidden celestial meadow where the stars descend to rest on clover petals, a peaceful path unfolds. The night is perfectly quiet, and the gentle breeze is scented with sweet lavender and the quiet dreams of the cosmos.`,
      `The thoughts of "${prompt.slice(0, 30)}${prompt.length > 30 ? "..." : ""}" begin to dissolve, turning into tiny fireflies that spiral gently up into the night. Watching them float away, you feel lighter, as if a soft cloud is lifting you up.`,
      `A golden trail of light stretches ahead, leading to the silent pavilion of stars. Here, the air is warm and comfortable, and the music is a slow, rhythmic chime that matches your own slow pulse.`,
      `You lay down on a pristine bed of warm lunar feathers. The sky above is a canvas of deep violet, with stars swirling in a slow, hypnotic spiral, holding you in a protective, comforting embrace.`,
      `Every single word of the day fades into absolute quiet. The night has taken your concerns, leaving you with only the soft, warm golden glow of the bedtime lamp. Rest now, celestial traveler, your dream is ready.`
    ],
    duration: 50
  };
};

// Procedural Ambient Synthesizer using Web Audio API
class BedtimeSynth {
  private ctx: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private filterNode: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isRunning: boolean = false;
  private lfo: OscillatorNode | null = null;

  constructor() {}

  public start() {
    if (this.isRunning) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      this.ctx = new AudioContextClass();
      
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 2.5); // Fade in over 2.5s

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = "lowpass";
      this.filterNode.frequency.setValueAtTime(280, this.ctx.currentTime); // Low sleepy frequency
      this.filterNode.Q.setValueAtTime(1.5, this.ctx.currentTime);

      // Slow LFO to sweep filter frequency for dreamy wind sounds
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = "sine";
      this.lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime); // 12.5s cycle

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(70, this.ctx.currentTime); // +/- 70Hz sweep

      this.lfo.connect(lfoGain);
      lfoGain.connect(this.filterNode.frequency);
      this.lfo.start();

      // Create rich major-9th chord frequencies (rooted in Low C and F)
      const frequencies = [
        65.41,   // C2 (Foundation drone)
        130.81,  // C3 (Warm octave)
        196.00,  // G3 (Fifth)
        261.63,  // C4 (Heart octave)
        293.66,  // D4 (Add 9)
        329.63,  // E4 (Major third)
        392.00,  // G4 (Perfect Fifth)
      ];

      frequencies.forEach((freq, idx) => {
        if (!this.ctx || !this.filterNode) return;

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        // Use triangle waves for a sweet, woodwind-like analog timbre
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        // Soft detuning for rich shimmering chorus effect
        osc.detune.setValueAtTime((Math.random() - 0.5) * 12, this.ctx.currentTime);

        // Individual oscillator volume
        oscGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

        // slow-beating out-of-phase LFOs for organic volume breathing
        const beatLfo = this.ctx.createOscillator();
        beatLfo.frequency.setValueAtTime(0.04 + idx * 0.015, this.ctx.currentTime);
        const beatLfoGain = this.ctx.createGain();
        beatLfoGain.gain.setValueAtTime(0.008, this.ctx.currentTime);

        beatLfo.connect(beatLfoGain);
        beatLfoGain.connect(oscGain.gain);

        beatLfo.start();
        osc.connect(oscGain);
        oscGain.connect(this.filterNode);

        osc.start();

        this.oscillators.push(osc);
        this.oscillators.push(beatLfo);
        this.gains.push(oscGain);
        this.gains.push(beatLfoGain);
      });

      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.isRunning = true;
    } catch (err) {
      console.warn("Bedtime Audio Synth failed:", err);
    }
  }

  public getEnergy(): number {
    if (!this.isRunning || !this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    let total = 0;
    for (let i = 0; i < dataArray.length; i++) {
      total += dataArray[i];
    }
    return total / dataArray.length / 255;
  }

  public stop() {
    this.isRunning = false;
    if (this.ctx && this.masterGain) {
      try {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
      } catch (e) {}

      setTimeout(() => {
        try {
          this.oscillators.forEach(osc => osc.stop());
          if (this.lfo) this.lfo.stop();
          if (this.ctx) this.ctx.close();
        } catch (e) {}
        this.oscillators = [];
        this.gains = [];
        this.lfo = null;
        this.ctx = null;
        this.analyser = null;
      }, 1300);
    }
  }
}

export default function StoryPlayer({ prompt, onBack, activeTheme = 'silverwood' }: StoryPlayerProps) {
  const story = generateBedtimeStory(prompt);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);
  const [audioEnergy, setAudioEnergy] = useState(0.2); // Default mock fallback if synth is off
  const [isSynthEnabled, setIsSynthEnabled] = useState(true);

  const [playerStars] = useState(() => 
    Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      top: Math.random() * 90 + 5,
      left: Math.random() * 90 + 5,
      delay: Math.random() * 5,
      scale: 0.6 + Math.random() * 1.4,
    }))
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const synthRef = useRef<BedtimeSynth | null>(null);
  const scriptContainerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  // Initialize Audio Synth
  useEffect(() => {
    synthRef.current = new BedtimeSynth();
    return () => {
      synthRef.current?.stop();
    };
  }, []);

  // Sync animation frames for energy metric visualizer
  useEffect(() => {
    const updateLoop = () => {
      if (synthRef.current && isPlaying) {
        const energyValue = synthRef.current.getEnergy();
        // Fallback to organic breathing fluctuations if energy value is too low or blocked
        if (energyValue > 0.01) {
          setAudioEnergy(energyValue * 1.8 + 0.15);
        } else {
          // Soft slow breathing simulation when synth is muted or loaded but empty
          const t = Date.now() / 1500;
          setAudioEnergy(0.2 + Math.sin(t) * 0.08);
        }
      } else {
        // Flat gentle background resting vibe
        const t = Date.now() / 3000;
        setAudioEnergy(0.12 + Math.sin(t) * 0.02);
      }
      frameRef.current = requestAnimationFrame(updateLoop);
    };

    frameRef.current = requestAnimationFrame(updateLoop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isPlaying]);

  // Audio Duration progress handler
  useEffect(() => {
    if (isPlaying) {
      // Start real sound synth
      if (isSynthEnabled) {
        synthRef.current?.start();
      }

      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + 1;
          if (next >= story.duration) {
            // Reached end as loop or auto pause
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
            synthRef.current?.stop();
            return story.duration;
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      synthRef.current?.stop();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isSynthEnabled]);

  // Compute active paragraph based on progression
  useEffect(() => {
    const totalParas = story.paragraphs.length;
    const timePerPara = story.duration / totalParas;
    const currentPara = Math.min(
      Math.floor(progress / timePerPara),
      totalParas - 1
    );
    setActiveParagraphIndex(currentPara);

    // Auto-scroll inside paragraph container
    const scriptEl = scriptContainerRef.current;
    if (scriptEl) {
      const activeParagraphEl = scriptEl.children[currentPara] as HTMLElement;
      if (activeParagraphEl) {
        scriptEl.scrollTo({
          top: activeParagraphEl.offsetTop - (scriptEl.clientHeight / 2) + (activeParagraphEl.clientHeight / 2),
          behavior: "smooth"
        });
      }
    }
  }, [progress, story.paragraphs.length, story.duration]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setProgress(0);
    setActiveParagraphIndex(0);
    setIsPlaying(false);
    synthRef.current?.stop();
  };

  // Convert time to elegant MM:SS string
  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Sound Wave and particle mock arrays
  const waveBarsCount = 18;
  const particleCount = 20;

  return (
    <div className="fixed inset-0 w-full min-h-screen z-50 bg-black overflow-hidden flex flex-col justify-between font-sans select-none text-white">
      
      {/* Immersive Galaxy Sky dynamic background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <BackgroundGradientAnimation theme={activeTheme} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#02020a]/80 via-[#04041b]/40 to-[#010105]/70" />
        
        {/* Generous animated solar nebula flares syncing with sound level */}
        <div 
          className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/[0.04] blur-[140px] transition-all duration-[600ms] ease-out pointer-events-none" 
          style={{
            width: `${400 + audioEnergy * 400}px`,
            height: `${400 + audioEnergy * 400}px`,
            opacity: 0.3 + audioEnergy * 0.4
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 rounded-full bg-amber-400/[0.03] blur-[150px] transition-all duration-[800ms] ease-out pointer-events-none" 
          style={{
            width: `${450 + audioEnergy * 300}px`,
            height: `${450 + audioEnergy * 300}px`,
            opacity: 0.2 + audioEnergy * 0.5
          }}
        />

        {/* Shimmering Golden Bling Stars */}
        {playerStars.map((star) => (
          <div
            key={`player-star-${star.id}`}
            className="absolute rounded-full bg-amber-400 animate-star-bling shadow-[0_0_6px_rgba(251,191,36,0.4)] pointer-events-none"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.scale * 1.6}px`,
              height: `${star.scale * 1.6}px`,
              opacity: 0.2 + (star.scale / 4),
              animationDuration: `${3.5 + star.delay}s`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}

        {/* Twinkling galaxy dust reacting to sound pitch */}
        {Array.from({ length: particleCount }).map((_, idx) => {
          const delay = (idx * 0.25) % 4;
          const left = (idx * 17) % 100;
          const top = (idx * 23) % 100;
          const speedFactor = 3 + (idx % 6);
          return (
            <motion.div
              key={`dust-${idx}`}
              className="absolute w-1 h-1 rounded-full bg-amber-300 pointer-events-none"
              style={{
                left: `${left}%`,
                top: `${top}%`,
              }}
              animate={{
                opacity: [0.15, 0.75, 0.15],
                y: [0, -30 - audioEnergy * 90, 0],
                scale: [1, 1 + audioEnergy * 1.5, 1]
              }}
              transition={{
                duration: speedFactor,
                repeat: Infinity,
                delay: delay,
                ease: "easeInOut"
              }}
            />
          );
        })}
      </div>

      {/* Header Bar */}
      <header className="relative z-10 w-full px-6 sm:px-12 py-5 sm:py-6 flex items-center justify-between border-b border-white/[0.04] bg-black/30 backdrop-blur-md">
        <button
          onClick={onBack}
          className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-xs font-light text-zinc-300 hover:text-white border border-white/5 transition-all duration-300 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Leave Dreamspace</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-amber-300/90 tracking-widest font-mono uppercase">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>Bedtime Storybook</span>
        </div>

        {/* Sound synthesizer enable toggle block */}
        <button
          onClick={() => {
            const next = !isSynthEnabled;
            setIsSynthEnabled(next);
            if (!next) {
              synthRef.current?.stop();
            } else if (isPlaying) {
              synthRef.current?.start();
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] tracking-wider uppercase font-mono transition-all cursor-pointer
            ${isSynthEnabled 
              ? "bg-amber-400/10 border-amber-400/30 text-amber-300" 
              : "bg-white/[0.02] border-white/5 text-zinc-500"
            }`}
          title={isSynthEnabled ? "Mute synthesized chord drone" : "Enable synthesized chord drone"}
        >
          {isSynthEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isSynthEnabled ? "Ambient Synth On" : "Ambient Synth Muted"}</span>
        </button>
      </header>

      {/* Main Players Arena */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-6 py-6 md:py-10 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 lg:gap-16 overflow-y-auto scrollbar-none">
        
        {/* Left Arena Panel: Large Story Picture Card */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center space-y-5 relative">
          
          {/* Static heavenly Glow Effect with motion that matches the golden light of the lamp */}
          <GlowEffect 
            colors={['#FBBF24', '#F59E0B', '#F97316', '#EF4444']} 
            mode="breathe" 
            blur="heavenly" 
            energy={audioEnergy}
            className="absolute inset-0 w-full h-full max-w-sm sm:max-w-md aspect-[4/3] -z-10"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="w-full max-w-sm sm:max-w-md aspect-[4/3] rounded-3xl relative overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10"
            style={{
              boxShadow: `0 0 ${25 + audioEnergy * 50}px rgba(245, 158, 11, ${0.12 + audioEnergy * 0.18})`,
            }}
          >
            {/* Story Picture itself */}
            <motion.img
              src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop"
              alt="Dream Bedtime Illustration Scene"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter brightness-[0.75] contrast-[1.05]"
              animate={{
                scale: isPlaying ? [1.02, 1.07 + audioEnergy * 0.05, 1.02] : 1.02,
                rotate: isPlaying ? [-0.2, 0.4, -0.2] : 0,
              }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Glowing Golden Ring Light Pulse overlay */}
            <div 
              className="absolute inset-0 border-[3px] border-amber-400/20 rounded-3xl m-3 pointer-events-none transition-all duration-[400ms] ease-out"
              style={{
                borderColor: `rgba(251, 191, 36, ${0.1 + audioEnergy * 0.4})`,
                boxShadow: `inset 0 0 ${10 + audioEnergy * 30}px rgba(251, 191, 36, ${0.1 + audioEnergy * 0.3})`
              }}
            />

            {/* Cinematic Gradient Fog overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent opacity-80" />
            <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col gap-1 text-left">
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-amber-400 font-light flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                Scene Map
              </span>
              <h3 className="text-base sm:text-lg font-normal font-display text-white tracking-wide truncate">
                {story.title}
              </h3>
            </div>
          </motion.div>

          {/* Interactive procedural visualizer waves beneath the story card */}
          <div className="w-full max-w-xs sm:max-w-md h-12 flex items-center justify-between px-4">
            {Array.from({ length: waveBarsCount }).map((_, i) => {
              // Create organic symmetrical wave heights
              const centerDist = Math.abs(i - waveBarsCount / 2);
              const maxSymmetricHeight = Math.max(3, 40 - centerDist * 4);
              const randomPhase = i * 0.4;
              
              const currentHeight = isPlaying 
                ? (maxSymmetricHeight * (0.3 + audioEnergy * 0.7) * (0.85 + Math.sin(Date.now() / 250 + randomPhase) * 0.15))
                : 4 + Math.sin(Date.now() / 1000 + i) * 1.5;

              return (
                <motion.div
                  key={`wave-${i}`}
                  className="w-[3px] sm:w-[4px] rounded-full bg-gradient-to-t from-indigo-500/30 to-amber-400"
                  style={{
                    height: `${currentHeight}px`,
                    opacity: isPlaying ? 0.3 + audioEnergy * 0.7 : 0.25
                  }}
                  transition={{ duration: 0.15 }}
                />
              );
            })}
          </div>
        </div>

        {/* Right Arena Panel: Floating Glassmorphic Transcript */}
        <div className="w-full md:w-1/2 flex flex-col justify-between space-y-6">
          <div className="text-left space-y-1">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-mono">Dreamscape Prompt</span>
            <div className="text-sm font-light text-amber-200/80 italic border-l-2 border-amber-400/30 pl-4 py-1 tracking-wide">
              &ldquo;{prompt}&rdquo;
            </div>
          </div>

          {/* Script Glassmorphic Card */}
          <div className="w-full h-[280px] sm:h-[350px] relative rounded-2xl border border-white/5 bg-white/[0.01] shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none z-10" />
            
            {/* Real Scrollable Chapter Paragraphs */}
            <div
              ref={scriptContainerRef}
              className="w-full h-full overflow-y-auto px-6 py-10 space-y-12 scrollbar-none z-0"
            >
              {story.paragraphs.map((para, index) => {
                const isActive = index === activeParagraphIndex;
                return (
                  <motion.div
                    key={`para-${index}`}
                    initial={{ opacity: 0.1 }}
                    animate={{
                      opacity: isActive ? 1 : 0.15,
                      scale: isActive ? 1.01 : 0.99
                    }}
                    transition={{ duration: 0.6 }}
                    className={`transition-all duration-500 text-left cursor-default ${
                      isActive ? "text-amber-100" : "text-zinc-500"
                    }`}
                  >
                    <p className="text-sm sm:text-base md:text-[17px] leading-relaxed tracking-wide font-light select-none font-sans">
                      {para}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {/* Progress Audio Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono tracking-wider">
                <span>{formatTime(progress)}</span>
                <span className="flex items-center gap-1">
                  <Headphones className="w-3 h-3 text-amber-500/40" />
                  <span>Ambient Audio Session</span>
                </span>
                <span>{formatTime(story.duration)}</span>
              </div>
              
              {/* Clickable progress seek channel bar */}
              <div 
                onClick={(e) => {
                  const el = e.currentTarget;
                  const rect = el.getBoundingClientRect();
                  const fraction = (e.clientX - rect.left) / rect.width;
                  setProgress(Math.floor(fraction * story.duration));
                }}
                className="w-full h-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors relative cursor-pointer group"
              >
                <div 
                  className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-indigo-500 to-amber-400 relative"
                  style={{ width: `${(progress / story.duration) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border border-amber-500 rounded-full scale-0 group-hover:scale-100 transition-transform shadow-md" />
                </div>
              </div>
            </div>

            {/* Poetic Controls Console Shelf */}
            <div className="flex items-center justify-center gap-5 pt-2">
              <button
                onClick={handleReset}
                className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 hover:border-amber-400/30 text-zinc-400 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer"
                title="Rewind / Reset bedtime story"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handlePlayPause}
                style={{
                  boxShadow: isPlaying ? "0 0 15px rgba(251, 191, 36, 0.25)" : "none"
                }}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-950 to-amber-950 hover:from-indigo-900 hover:to-amber-900 border border-amber-400/20 text-amber-300 hover:text-amber-100 flex items-center justify-center transition-all transform hover:scale-105 cursor-pointer"
                title={isPlaying ? "Pause bedtime player" : "Play bedtime player"}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-amber-300" />
                ) : (
                  <Play className="w-6 h-6 fill-amber-300 translate-x-0.5" />
                )}
              </button>

              <button
                onClick={onBack}
                className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 hover:border-zinc-300 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Return to dream Chatbot"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* Footer copyright section at base */}
      <footer className="relative z-10 w-full text-center py-4 sm:py-5 border-t border-white/[0.03] bg-black/40 text-[9px] tracking-widest text-zinc-600 uppercase font-light">
        <span>© {new Date().getFullYear()} lullow. Celestial Bedtime Player. Sleep securely on stardust.</span>
      </footer>

    </div>
  );
}
