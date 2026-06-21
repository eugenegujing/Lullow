import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, Mic, Sparkles, Moon, Star, RefreshCw, Volume2, User, Compass, 
  Globe, LayoutGrid, MoreHorizontal, ThumbsUp, ThumbsDown, Copy, 
  ChevronDown, Search, ArrowLeft, ArrowRight, Lock, HelpCircle, 
  ExternalLink, Download, FileText, Check, Music, Wind, Sliders
} from "lucide-react";
import BackgroundGradientAnimation from "./BackgroundGradientAnimation";
import LullowLogo from "./LullowLogo";
import GlowingEffect from "./GlowingEffect";
import LullowBorderBeam from "./LullowBorderBeam";

interface Message {
  id: string;
  sender: "companion" | "user";
  text: string;
  timestamp: string;
  isAction?: boolean;
  hasMedia?: boolean;
  mediaUrls?: string[];
}

const PRESET_DREAM_PROMPTS = [
  "I feel a bit anxious tonight",
  "Tell me a peaceful fable",
  "What lies beyond the stars?",
  "Whisper a quiet sleep blessing"
];

const COMPANION_RESPONSES: Record<string, { text: string; media?: string[] }[]> = {
  anxious: [
    {
      text: "Breathe in the quiet dark, gentle soul. In this moment, there is nothing you need to solve, nowhere you need to go. Let the heavy thoughts drift gently past, like autumn leaves on a slow-moving river.",
    },
    {
      text: "Your anxiety is only a temporary cloud passing across the vast, eternal sky of your mind. Let it float away. The night is soft, and you are fully safe here.",
    },
    {
      text: "Take a deep, slow breath with me. Breathe in the cool, starry air; let out the weight of the day. You have survived all of today's gravity. Tomorrow can wait."
    }
  ],
  fable: [
    {
      text: "Deep in the Celestial Woods, there resides a quiet silver owl named Lora. Every evening, Lora watches the moon rise and gathers loose beams of starlight in her feathers. When travelers are lost or restless, she flies overhead, scattering a fine prism of sparkling lunar dust that floats down to settle on your eyelids, fading every worldly anxiety...",
      media: [
        "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=400&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=400&auto=format&fit=crop"
      ]
    },
    {
      text: "There was once a star that learned how to sing in the silence. It didn't sing with sound, but with light that pulsed in perfect harmony with the heartbeats of the dreamers below. Tonight, hear its gentle lullaby humming...",
      media: [
        "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=400&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop"
      ]
    },
    {
      text: "High above the horizon, there is a field of lunar cotton. It is harvested by stardust creatures who weave blankets of weightless peace. Tonight, imagine one of those blankets resting gently over your shoulders...",
      media: [
        "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?q=80&w=400&auto=format&fit=crop"
      ]
    }
  ],
  stars: [
    {
      text: "Beyond the stars lie infinite gardens of stardust and deep, quiet waters. It is a place of absolute tranquility where time itself slows into a gentle tide. We are made of that same stardust, returning to its quiet embrace every evening.",
      media: [
        "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=400&auto=format&fit=crop"
      ]
    },
    {
      text: "Each star is a lighthouse guiding our thoughts across the dark ocean of sleep. They whisper tales of ancient times, reminding us that we are part of something magnificent and beautifully peaceful.",
    }
  ],
  blessing: [
    {
      text: "May your thoughts become light as dream-dust. May your heartbeat slow into the rhythm of the cosmos. May the stillness of the night wrap you in soft velvet, and may you wake tomorrow with a quiet heart. Sleep well, celestial traveler.",
    },
    {
      text: "Let go. Allow the weight of your eyelids to align with the gravity of the earth. Let the darkness be a soft cocoon of warmth. Rest deeply, and wake renewed.",
    },
    {
      text: "The constellations are watching over your bed. They have drawn a map of peace for your dreams tonight. Trust the night. Close your eyes and wander."
    }
  ],
  default: [
    {
      text: "Your words are safe with me. Let them settle in the deep, warm silence. Breathe out, relax your shoulders, and feel the stardust holding you up.",
    },
    {
      text: "That is a beautiful thought to offer to the night sky. Watch it drift up into the stars, turning into a tiny beacon of calm.",
    },
    {
      text: "Let that thought rest now. The day is fully done, and your only task left is to surrender to the sweet peace of the night.",
    }
  ]
};

interface CompanionChatProps {
  onNavigateToStory?: (prompt: string) => void;
}

export default function CompanionChat({ onNavigateToStory }: CompanionChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "companion",
      text: "Welcome back to the dreamspace, gentle traveler. Speak what floats in your spirit tonight, or explore our celestial realms below.",
      timestamp: "11:00 PM"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listeningTimer, setListeningTimer] = useState<NodeJS.Timeout | null>(null);
  const [workWithOpen, setWorkWithOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, "up" | "down" | null>>({});
  const [isInputFocused, setIsInputFocused] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workWithRef = useRef<HTMLDivElement>(null);

  // Close integration popup on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (workWithRef.current && !workWithRef.current.contains(event.target as Node)) {
        setWorkWithOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsgId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    const textLower = textToSend.toLowerCase();
    let responseCategory = "default";
    if (textLower.includes("anxious") || textLower.includes("worry") || textLower.includes("fear") || textLower.includes("stres") || textLower.includes("scared")) {
      responseCategory = "anxious";
    } else if (textLower.includes("story") || textLower.includes("fable") || textLower.includes("tale") || textLower.includes("owl") || textLower.includes("forest") || textLower.includes("building")) {
      responseCategory = "fable";
    } else if (textLower.includes("star") || textLower.includes("space") || textLower.includes("universe") || textLower.includes("sky")) {
      responseCategory = "stars";
    } else if (textLower.includes("bless") || textLower.includes("sleep") || textLower.includes("tired") || textLower.includes("night")) {
      responseCategory = "blessing";
    }

    const pool = COMPANION_RESPONSES[responseCategory] || COMPANION_RESPONSES.default;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `companion-${Date.now()}`,
          sender: "companion",
          text: chosen.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hasMedia: !!chosen.media,
          mediaUrls: chosen.media
        }
      ]);
    }, 1600);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend(inputText);
    }
  };

  const handlePresetSelect = (text: string) => {
    setInputText(text);
    setWorkWithOpen(false);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVote = (id: string, dir: "up" | "down") => {
    setFeedbackState(prev => ({
      ...prev,
      [id]: prev[id] === dir ? null : dir
    }));
  };

  const startListeningSim = () => {
    if (isListening) {
      if (listeningTimer) clearTimeout(listeningTimer);
      setIsListening(false);
      return;
    }

    setIsListening(true);
    const simulatedSpokenDreams = [
      "Tell me a story about a quiet sleeping mountain.",
      "How can I quiet my racing thoughts before drifting off?",
      "I feel restless tonight thinking of tomorrow.",
      "Whisper a sleepy stardust blessing."
    ];
    const pickedDream = simulatedSpokenDreams[Math.floor(Math.random() * simulatedSpokenDreams.length)];

    const timer = setTimeout(() => {
      setInputText(pickedDream);
      setIsListening(false);
    }, 3000);

    setListeningTimer(timer);
  };

  const isInitialState = messages.length <= 1 && !isTyping;

  // Modern integrations in MacBook style (corresponds to "Work with" in mockup 2)
  const integrationTools = [
    {
      id: "silverwood",
      name: "Silverwood Sanctuary",
      desc: "Warm forest folklore writeup",
      icon: Moon,
      color: "text-amber-300 bg-amber-400/10 border-amber-400/20",
      prompt: "Tell me a fable about Silverwood Sanctuary with glowing branches"
    },
    {
      id: "deep_indigo",
      name: "Indigo Deep Water",
      desc: "Oceanic twilight sea narrative",
      icon: Globe,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      prompt: "Tell me a beautiful fable about the Indigo Deep sea city"
    },
    {
      id: "andromeda",
      name: "Andromeda Nebula",
      desc: "Floating cosmic space cradle",
      icon: Sparkles,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      prompt: "Tell me the story about the Andromeda stardust cradle"
    },
    {
      id: "immersive_story",
      name: "lullow Story Engine",
      desc: "Generate your custom dream landscape",
      icon: Sliders,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      prompt: "I want an immersive custom fantasy story of a golden mountain campfire"
    }
  ];

  return (
    <section 
      id="companion-section"
      className="relative w-full min-h-screen py-10 sm:py-16 md:py-24 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Decorative star background effects */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#0a0a0f]/60">
        <BackgroundGradientAnimation pointerColor="251, 191, 36" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030308]/90 via-[#070712]/30 to-[#020206]/95" />
        
        {/* Soft atmospheric gradient filters */}
        <div className="absolute top-1/4 left-1/4 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-amber-400/[0.03] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-indigo-500/[0.03] blur-[150px] pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-5xl px-3 sm:px-6 md:px-10 flex flex-col items-center">
        
        {/* MacBook Safari Browser Mockup Frame */}
        <div className="w-full rounded-2xl border border-white/10 bg-[#16161c]/90 shadow-[0_25px_60px_rgba(0,0,0,0.85)] max-w-4xl overflow-hidden backdrop-blur-2xl flex flex-col h-[650px] sm:h-[720px] transition-all duration-500 relative">
          
          {/* Subtle cosmic border beam on the main frame */}
          <LullowBorderBeam duration={14} glowOpacity={0.4} borderWidth={1} enableOuterGlow={true} />
          
          {/* Top Window Bar (Safari style with traffic lights & URL bar) */}
          <div className="h-12 border-b border-white/5 bg-black/40 flex items-center justify-between px-4 shrink-0 select-none">
            {/* Left: Traffic Lights */}
            <div className="flex items-center gap-1.5 w-24">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] cursor-pointer block" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] cursor-pointer block" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] cursor-pointer block" />
            </div>

            {/* Center: URL search bar */}
            <div className="flex-1 max-w-md mx-auto flex items-center justify-center gap-2 bg-[#2d2d37]/80 rounded-lg px-3 py-1 cursor-default select-all text-zinc-400 hover:text-white/80 transition-all border border-white/[0.03]">
              <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[11px] tracking-wide font-light select-all truncate font-sans">lullow.com</span>
              <RefreshCw className="w-2.5 h-2.5 text-zinc-500 hover:text-zinc-300 ml-auto transition-colors cursor-pointer" />
            </div>

            {/* Right: Windows Action utility menu */}
            <div className="flex items-center gap-3 w-24 justify-end text-zinc-400">
              <Download className="w-3.5 h-3.5 hover:text-zinc-200 cursor-pointer transition-colors" />
              <ExternalLink className="w-3.5 h-3.5 hover:text-zinc-200 cursor-pointer transition-colors" />
              <LayoutGrid className="w-3.5 h-3.5 hover:text-zinc-200 cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Browser inner layout */}
          <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0c0c11]/95 text-white/90">
            
            {/* Top Sub-navigation toolbar bar */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/10 shrink-0 text-zinc-400 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shrink-0 shadow-inner p-0.5">
                  <LullowLogo size={18} />
                </div>
                <span className="font-semibold text-white/95 font-sans tracking-wide text-xs">lullow</span>
              </div>

              <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2 py-1 shrink-0 border border-white/10 scale-90 sm:scale-100">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.8)] animate-pulse" />
                <span className="text-[10px] text-teal-300/90 font-medium font-sans px-0.5">Celeste Stable Core</span>
              </div>
            </div>

            {/* Main window core viewport */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/5 flex flex-col justify-between">
              
              <AnimatePresence mode="wait">
                {isInitialState ? (
                  /* IMAGE 2: Elegant Minimalist Empty State view block */
                  <motion.div 
                    key="empty-welcome-canvas"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-auto space-y-6 sm:space-y-8 select-none"
                  >
                    {/* Pulsing beautiful custom brand Lullow logo orb */}
                    <div className="relative">
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.04, 1],
                          rotate: [0, 2, -2, 0]
                        }}
                        transition={{ 
                          duration: 6, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="w-32 h-32 rounded-3xl bg-[#14141d]/85 p-4 flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.18)] border border-white/10 active:scale-95 transition-transform relative overflow-hidden"
                      >
                        <LullowLogo size={100} />
                        <LullowBorderBeam duration={5} enableOuterGlow={true} glowOpacity={0.95} borderWidth={2} />
                      </motion.div>
                      <div className="absolute inset-0 bg-amber-400/10 blur-2xl -z-10 rounded-full scale-125 pointer-events-none" />
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl sm:text-3xl font-normal tracking-wide text-zinc-100 font-sans leading-tight">
                        Hi, <span className="text-white font-medium bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">Celestial Traveler</span>
                      </h2>
                      <h1 className="text-xl sm:text-2xl font-light tracking-wide text-zinc-400">
                        Can I help you with anything?
                      </h1>
                    </div>

                    <p className="text-zinc-500 text-xs sm:text-[13px] font-light max-w-sm leading-relaxed tracking-wide">
                      Ready to assist you with anything you need? Feel free to write a worry, a dream, or select a celestial guiding theme below to start.
                    </p>

                    {/* Quick Start Launcher Buttons */}
                    <div className="grid grid-cols-2 gap-2 w-full pt-1.5">
                      {PRESET_DREAM_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleSend(prompt)}
                          className="relative flex items-center gap-2 p-3 text-left rounded-xl border border-white/[0.04] bg-[#1a1a24]/40 hover:bg-white/[0.03] text-zinc-400 hover:text-amber-200 hover:border-amber-400/20 active:scale-[0.98] transition-all text-[11px] cursor-pointer overflow-hidden group"
                        >
                          <GlowingEffect spread={30} glow={true} proximity={50} inactiveZone={0.01} glowColor="rgba(251, 191, 36, 0.25)" />
                          <Sparkles className="relative z-10 w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                          <span className="relative z-10 truncate">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  /* IMAGE 1: Active Conversation thread block with modern Macbook styling */
                  <div className="flex-1 w-full max-w-2xl mx-auto space-y-6 sm:space-y-8 scrollbar-none pb-4">
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => {
                        const isUser = msg.sender === "user";

                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, type: "spring", stiffness: 350, damping: 26 }}
                            className="group relative flex flex-col text-left space-y-2.5"
                          >
                            
                            {/* Message Header (Avatar, Name, Timestamp) */}
                            <div className={`flex items-center gap-2.5 ${isUser ? "pl-2" : ""}`}>
                              {isUser ? (
                                <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                                  <User className="w-3.5 h-3.5 text-amber-300" />
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-amber-500/5 border border-amber-400/15 flex items-center justify-center shrink-0 shadow-inner p-0.5 animate-pulse-slow">
                                  <LullowLogo size={18} />
                                </div>
                              )}

                              <div className="flex items-baseline gap-2">
                                <span className={`text-[11px] font-medium tracking-wide ${isUser ? "text-amber-200" : "text-white"}`}>
                                  {isUser ? "Celestial Traveler" : "lullow"}
                                </span>
                                <span className="text-[9px] text-zinc-600 font-mono tracking-wider">
                                  {msg.timestamp}
                                </span>
                              </div>
                            </div>

                            {/* Rounded Glass card Message Body */}
                            <div className="flex items-start gap-4">
                              <div className="flex-1 min-w-0 pr-6 pl-9">
                                <div className={`px-4.5 py-3 rounded-2xl text-[13px] leading-relaxed tracking-wide border
                                  ${isUser
                                    ? "bg-amber-950/15 border-amber-500/10 text-amber-100"
                                    : "bg-white/[0.03] border-white/5 text-zinc-200"
                                  }`}
                                >
                                  {msg.text}
                                </div>

                                {/* Stacked Media generated card stack style (Matches IMAGE 1) */}
                                {msg.hasMedia && msg.mediaUrls && (
                                  <div className="mt-4 flex flex-col items-center justify-center">
                                    <div className="relative w-44 sm:w-56 h-36 border border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-black">
                                      {/* Stack Layer 3 (Lowest rotated) */}
                                      {msg.mediaUrls[1] && (
                                        <div 
                                          className="absolute inset-0 bg-cover bg-center rounded-2xl rotate-[-6deg] translate-y-[-4px] scale-[0.9] border border-white/5 shadow-md brightness-50 z-0" 
                                          style={{ backgroundImage: `url(${msg.mediaUrls[1]})` }}
                                        />
                                      )}
                                      
                                      {/* Stack Layer 2 (Middle semi-rotated) */}
                                      {msg.mediaUrls[0] && (
                                        <div 
                                          className="absolute inset-0 bg-cover bg-center rounded-2xl rotate-[5deg] translate-y-[-2px] scale-[0.95] border border-white/5 shadow-lg brightness-75 z-10" 
                                          style={{ backgroundImage: `url(${msg.mediaUrls[0]})` }}
                                        />
                                      )}

                                      {/* Active top cover illustration */}
                                      <div 
                                        className="absolute inset-0 bg-cover bg-center rounded-2xl border border-white/20 shadow-2xl z-20 flex flex-col justify-end p-2.5 overflow-hidden group/image"
                                        style={{ backgroundImage: `url(${msg.mediaUrls[0] || "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?q=80&w=400"})` }}
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
                                        <div className="relative z-10">
                                          <p className="text-[10px] text-white/50 tracking-wider font-mono">DREAM LANDSCAPE</p>
                                          <p className="text-[11px] text-white font-medium tracking-wide truncate">Celestial Haven Project</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action button beneath image stack */}
                                    <button
                                      onClick={() => onNavigateToStory && onNavigateToStory(msg.text)}
                                      className="mt-3.5 inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 text-teal-300 text-[10px] tracking-widest uppercase font-medium shadow-md transition-all active:scale-95 cursor-pointer hover:border-teal-400/30 font-sans"
                                    >
                                      <Wind className="w-3 h-3 text-teal-400 animate-pulse animate-spin-slow" />
                                      <span>Create Dreamscape</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Floating macOS-style vertical pill action card (visible on hover) */}
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 bg-[#171720]/80 border border-white/10 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-xl backdrop-blur-md z-10">
                                <button
                                  onClick={() => handleVote(msg.id, "up")}
                                  className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer overflow-hidden group
                                    ${feedbackState[msg.id] === "up" 
                                      ? "bg-amber-400/20 text-amber-300 scale-110" 
                                      : "hover:bg-white/5 text-zinc-500 hover:text-zinc-300"
                                    }`}
                                  title="Thumb Up helpful"
                                >
                                  <GlowingEffect spread={12} glow={true} proximity={24} inactiveZone={0.01} glowColor="rgba(251, 191, 36, 0.35)" />
                                  <ThumbsUp className="relative z-10 w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleVote(msg.id, "down")}
                                  className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer overflow-hidden group
                                    ${feedbackState[msg.id] === "down" 
                                      ? "bg-red-400/20 text-red-300 scale-110" 
                                      : "hover:bg-white/5 text-zinc-500 hover:text-zinc-300"
                                    }`}
                                  title="Thumb Down unhelpful"
                                >
                                  <GlowingEffect spread={12} glow={true} proximity={24} inactiveZone={0.01} glowColor="rgba(239, 68, 68, 0.35)" />
                                  <ThumbsDown className="relative z-10 w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleCopyText(msg.id, msg.text)}
                                  className="relative w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer overflow-hidden group"
                                  title="Copy text snippet"
                                >
                                  <GlowingEffect spread={12} glow={true} proximity={24} inactiveZone={0.01} glowColor="rgba(251, 191, 36, 0.25)" />
                                  {copiedId === msg.id ? (
                                    <Check className="relative z-10 w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="relative z-10 w-3 h-3" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleVote(msg.id, "up")}
                                  className="relative w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/5 text-zinc-500 hover:text-amber-200 transition-all cursor-pointer overflow-hidden group"
                                  title="Add to bedtime collection"
                                >
                                  <GlowingEffect spread={12} glow={true} proximity={24} inactiveZone={0.01} glowColor="rgba(251, 191, 36, 0.35)" />
                                  <Star className="relative z-10 w-3 h-3" />
                                </button>
                              </div>
                            </div>

                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {/* Typing state bubble */}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col text-left space-y-2 pl-9"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                          <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase ml-1.5 animate-pulse">Companion writing response...</span>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Simulated Microphone interface box */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="absolute left-6 right-6 bottom-24 z-30 mx-auto max-w-sm px-5 py-4 rounded-2xl bg-[#14141c]/95 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center gap-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                >
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-3 rounded bg-amber-400 animate-pulse duration-500" />
                    <div className="w-1 h-5 rounded bg-amber-400 animate-pulse duration-700" style={{ animationDelay: "100ms" }} />
                    <div className="w-1 h-7 rounded bg-amber-400 animate-pulse duration-1000" style={{ animationDelay: "200ms" }} />
                    <div className="w-1.5 h-8 rounded bg-amber-300 animate-bounce duration-500 mx-0.5" />
                    <div className="w-1 h-7 rounded bg-amber-400 animate-pulse duration-1000" style={{ animationDelay: "150ms" }} />
                    <div className="w-1 h-5 rounded bg-amber-400 animate-pulse duration-700" style={{ animationDelay: "50ms" }} />
                    <div className="w-1 h-3 rounded bg-amber-400 animate-pulse duration-500" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-zinc-100 font-medium">Whispering into stardust field...</div>
                    <div className="text-[10px] text-zinc-500 font-mono tracking-widest mt-0.5 uppercase">Listening / translating voice vibrations</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsListening(false)}
                    className="px-4 py-1 rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300 transition-all font-sans cursor-pointer"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input area Container */}
            <div className="px-4 sm:px-8 pb-3 pt-2 shrink-0 border-t border-white/5 bg-black/20 relative z-20">
              
              {/* Floating Integrations / Work with Popup Menu (Matches IMAGE 2) */}
              <AnimatePresence>
                {workWithOpen && (
                  <motion.div
                    ref={workWithRef}
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: -10, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="absolute left-6 bottom-full w-72 rounded-2xl liquid-glass border border-white/10 bg-[#121217]/95 p-2 shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden text-left"
                  >
                    <div className="px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-[#a1a1aa] font-mono border-b border-white/5 mb-1.5 flex items-center gap-1.5">
                      <LayoutGrid className="w-3 h-3 text-zinc-400" />
                      Work with Celeste Dream API
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {integrationTools.map((tool) => {
                        const ToolIcon = tool.icon;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => handlePresetSelect(tool.prompt)}
                            className="relative w-full text-left px-2.5 py-2 rounded-xl transition-all hover:bg-white/[0.04] flex items-center gap-3 hover:scale-[1.02] cursor-pointer group overflow-hidden"
                          >
                            <GlowingEffect spread={25} glow={true} proximity={45} inactiveZone={0.01} glowColor="rgba(251, 191, 36, 0.2)" />
                            <div className="relative z-10 flex items-center gap-3 w-full">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${tool.color}`}>
                                <ToolIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-white tracking-wide font-medium font-sans flex items-center gap-1">
                                  {tool.name}
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-[#a1a1aa] font-mono ml-auto">Load ↵</span>
                                </div>
                                <div className="text-[10px] text-zinc-500 truncate mt-0.5 leading-snug">
                                  {tool.desc}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Input Inner form row */}
              <div className="relative max-w-2xl mx-auto">
                {/* The beautifully styling Glass Pill (Matches layout in IMAGE 1 & 2) */}
                <div className="w-full bg-[#181822]/80 hover:bg-[#1e1e2c]/90 focus-within:bg-[#1e1e2c]/95 border border-white/10 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.5)] transition-all relative overflow-hidden">
                  
                  <LullowBorderBeam 
                    duration={isInputFocused ? 3.5 : 7} 
                    glowOpacity={isInputFocused ? 0.95 : 0.35} 
                    colorFrom={isInputFocused ? "#fbbf24" : "rgba(255,255,255,0.12)"}
                    colorTo={isInputFocused ? "#d97706" : "rgba(255,255,255,0.05)"}
                    colorMid={isInputFocused ? "#818cf8" : "transparent"}
                    borderWidth={1.5}
                    enableOuterGlow={isInputFocused}
                  />

                  {/* Left: Input Text node */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-transparent border-none text-white text-xs sm:text-[13px] placeholder-zinc-500 focus:outline-none focus:ring-0 font-light pr-2 select-text relative z-10"
                  />

                  {/* Right Actions Block (Contains accessory icons on left + mic & send on right) */}
                  <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                    
                    {/* Left side toolbar inside the action block */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setWorkWithOpen(!workWithOpen)}
                        className={`relative w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer overflow-hidden group
                          ${workWithOpen 
                            ? "bg-amber-400/20 border-amber-400/30 text-amber-300"
                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                          }`}
                        title="Work with integration modules"
                      >
                        <GlowingEffect spread={15} glow={true} proximity={25} inactiveZone={0.01} glowColor="rgba(251, 191, 36, 0.3)" />
                        <Compass className="relative z-10 w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetSelect("What lies beyond the stars?")}
                        className="relative w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer overflow-hidden group"
                        title="Browse celestial realms"
                      >
                        <GlowingEffect spread={15} glow={true} proximity={25} inactiveZone={0.01} glowColor="rgba(251, 191, 36, 0.25)" />
                        <Globe className="relative z-10 w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetSelect("Tell me a peaceful fable")}
                        className="relative w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer overflow-hidden group"
                        title="Fable logs"
                      >
                        <GlowingEffect spread={15} glow={true} proximity={25} inactiveZone={0.01} glowColor="rgba(251, 191, 36, 0.25)" />
                        <Sparkles className="relative z-10 w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="h-5 w-[1px] bg-white/10 hidden sm:block" />

                    {/* Right side controls inside the action block */}
                    <div className="flex items-center gap-2">
                      {/* Interactive Simulated Eye Animation */}
                      <div className="flex items-center gap-1 px-1 opacity-60 hover:opacity-90 transition-opacity">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" style={{ animationDelay: "200ms" }} />
                      </div>

                      {/* Microphone toggle */}
                      <button
                        type="button"
                        onClick={startListeningSim}
                        className={`relative w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer overflow-hidden group
                          ${isListening 
                            ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-300 shadow-[0_0_8px_rgba(129,140,248,0.5)]" 
                            : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-400 hover:text-white"
                          }`}
                        title="Simulate speech voice input"
                      >
                        <GlowingEffect spread={15} glow={true} proximity={25} inactiveZone={0.01} glowColor="rgba(129, 140, 248, 0.35)" />
                        <Mic className="relative z-10 w-3.5 h-3.5" />
                      </button>

                      {/* Send Pill button */}
                      <button
                        type="button"
                        onClick={() => handleSend(inputText)}
                        disabled={!inputText.trim()}
                        className="relative w-7 h-7 flex items-center justify-center rounded-lg bg-white text-black disabled:bg-white/10 disabled:text-zinc-600 disabled:border-transparent hover:bg-zinc-200 transition-all cursor-pointer shadow-md overflow-hidden group"
                        title="Send to Companion"
                      >
                        {!inputText.trim() ? null : (
                          <GlowingEffect spread={15} glow={true} proximity={25} inactiveZone={0} glowColor="rgba(0, 0, 0, 0.15)" />
                        )}
                        <Send className="relative z-10 w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                </div>
              </div>

              {/* Real-time copyright status bar (Matches IMAGE 2) */}
              <div className="text-center text-[10px] sm:text-xxs text-zinc-600 mt-2.5 flex items-center justify-center gap-1 tracking-wide">
                <span>lullow may contain errors. We recommend checking important information.</span>
                <HelpCircle className="w-3 h-3 text-zinc-600 hover:text-zinc-400 cursor-pointer" />
              </div>

            </div>

          </div>

        </div>

        {/* Ambient tips banner under MacBook Safari Frame */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 tracking-wide mt-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-400/80" />
          <span>Tip: Ask for a peaceful fable, express a worry, or click the mic button inside Safari to whisper.</span>
        </div>

      </div>
    </section>
  );
}
