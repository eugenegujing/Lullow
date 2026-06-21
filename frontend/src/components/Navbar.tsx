import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, ChevronDown, Sparkles, Compass, Moon, Palette } from "lucide-react";
import { ThemeType } from "./BackgroundGradientAnimation";
import LullowLogo from "./LullowLogo";

interface NavbarProps {
  activeTheme?: ThemeType;
  setActiveTheme?: (theme: ThemeType) => void;
  onToggleAmbientControls?: () => void;
  ambientOpacity?: number;
}

export default function Navbar({ 
  activeTheme = 'silverwood', 
  setActiveTheme, 
  onToggleAmbientControls, 
  ambientOpacity = 0 
}: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if user clicks elsewhere
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const themeDisplayNamesRef: Record<ThemeType, { name: string; desc: string; icon: any }> = {
    silverwood: { 
      name: "Silverwood Sanctuary", 
      desc: "Cozy Golden Ambers & Deep Indigos", 
      icon: Moon 
    },
    deep_indigo: { 
      name: "Indigo Deep Ocean", 
      desc: "Oceanic Aquas & Deep Sea Royals", 
      icon: Globe 
    },
    andromeda: { 
      name: "Andromeda Nebula", 
      desc: "Cosmic Violets & Warm Red Nebulas", 
      icon: Sparkles 
    },
    lotus_garden: { 
      name: "Lotus Zen Garden", 
      desc: "Emerald Greens & Soft Blossom Pinks", 
      icon: Compass 
    },
  };

  const handleThemeChange = (theme: ThemeType) => {
    if (setActiveTheme) {
      setActiveTheme(theme);
    }
    setDropdownOpen(false);
  };

  const currentThemeInfo = themeDisplayNamesRef[activeTheme] || themeDisplayNamesRef.silverwood;
  const CurrentIcon = currentThemeInfo.icon;

  return (
    <motion.nav 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="relative z-30 w-full px-2 sm:px-4 py-4"
    >
      <div className="rounded-full px-5 py-3 flex items-center justify-between max-w-5xl mx-auto liquid-glass border border-white/5 shadow-lg relative">
        {/* Left: logo + links */}
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-2 select-none">
            <div className="w-7 h-7 rounded-full bg-amber-400/5 border border-amber-400/15 flex items-center justify-center p-0.5 shadow-inner">
              <LullowLogo size={20} />
            </div>
            <span className="text-white font-medium text-base tracking-wide font-sans">lullow</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-white/60 hover:text-white transition-colors text-xs tracking-widest uppercase font-light"
            >
              Features
            </a>
            <a
              href="#companion-section"
              className="text-white/60 hover:text-white transition-colors text-xs tracking-widest uppercase font-light"
            >
              AI Partner
            </a>
          </div>
        </div>

        {/* Center/Right Theme Select dropdown of Liquid Glass with Drop-down spring motion */}
        <div className="flex items-center gap-3 sm:gap-4 relative" ref={dropdownRef}>
          {onToggleAmbientControls && (
            <button 
              onClick={onToggleAmbientControls}
              className="hidden lg:inline-flex text-[10px] tracking-widest text-[#a1a1aa] hover:text-white transition-colors mr-1 uppercase font-mono"
            >
              Depth {Math.round(ambientOpacity * 100)}%
            </button>
          )}

          {/* Core Theme Picker Toggle Button using liquid glass styling */}
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="liquid-glass rounded-full px-3.5 py-1.5 text-white/90 hover:text-white text-[11px] tracking-wide font-light flex items-center gap-2 border border-white/10 hover:bg-white/5 active:scale-95 transition-all duration-300 cursor-pointer"
            title="Switch Celestial Dream Realm"
          >
            <div className="w-4 h-4 rounded-full bg-amber-400/10 flex items-center justify-center shrink-0">
              <CurrentIcon className="w-2.5 h-2.5 text-amber-300" />
            </div>
            <span className="max-w-[120px] sm:max-w-none truncate font-sans">
              {currentThemeInfo.name}
            </span>
            <motion.div
              animate={{ rotate: dropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </motion.div>
          </button>

          {/* The Liquid Glass Drop-down with elegant acceleration physics slide down */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 12, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="absolute right-0 top-full w-72 rounded-2xl liquid-glass border border-white/10 bg-black/85 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-50 p-2 overflow-hidden"
              >
                {/* Thin top gloss accent */}
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-amber-400/30 to-transparent mb-1" />
                
                <div className="px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-[#a1a1aa] font-mono border-b border-white/5 mb-2 flex items-center gap-1.5">
                  <Palette className="w-3 h-3 text-amber-400 animate-pulse" />
                  Select Dream Realm Theme
                </div>

                <div className="flex flex-col gap-1">
                  {(Object.keys(themeDisplayNamesRef) as ThemeType[]).map((tKey) => {
                    const item = themeDisplayNamesRef[tKey];
                    const ItemIcon = item.icon;
                    const isSelected = activeTheme === tKey;

                    return (
                      <button
                        key={tKey}
                        onClick={() => handleThemeChange(tKey)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center gap-3 cursor-pointer
                          ${isSelected 
                            ? "bg-amber-400/15 border border-amber-400/20 text-white" 
                            : "bg-transparent border border-transparent hover:bg-white/[0.04] text-zinc-300 hover:text-white"
                          }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border
                          ${isSelected 
                            ? "bg-amber-400/20 border-amber-400/30 text-amber-300" 
                            : "bg-white/5 border-white/10 text-zinc-400"
                          }`}
                        >
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-normal truncate leading-snug ${isSelected ? "text-amber-300" : "text-zinc-100"}`}>
                            {item.name}
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate leading-tight mt-0.5">
                            {item.desc}
                          </div>
                        </div>
                        {isSelected && (
                          <motion.div
                            layoutId="active-theme-dot"
                            className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)]"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.nav>
  );
}
