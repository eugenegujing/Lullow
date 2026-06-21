import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "./components/Navbar";
import CompanionChat from "./components/CompanionChat";
import StoryPlayer from "./components/StoryPlayer";
import AmbientSoundscapeControl from "./components/AmbientSoundscapeControl";
import { ThemeType, THEME_COLOR_MAP } from "./components/BackgroundGradientAnimation";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";

export default function App() {
  const [view, setView] = useState<'home' | 'story'>('home');
  const [storyPrompt, setStoryPrompt] = useState('');
  const [activeTheme, setActiveTheme] = useState<ThemeType>('silverwood');

  const [heroStars] = React.useState(() => 
    Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      top: Math.random() * 85 + 5,
      left: Math.random() * 90 + 5,
      delay: Math.random() * 5,
      scale: 0.6 + Math.random() * 1.4,
    }))
  );

  const line1 = ["Where", "dreams", "rise"];
  const line2 = ["through", "the", "silence."];

  return (
    <main className="relative min-h-screen w-full bg-black text-white flex flex-col justify-start overflow-x-hidden font-sans select-none">
      {/* Background image wrap & bg-front */}
      <div className="bg-wrap overflow-hidden">
        <BackgroundGradientAnimation
          gradientBackgroundStart="rgb(10, 10, 15)"
          gradientBackgroundEnd="rgb(0, 0, 0)"
          firstColor={THEME_COLOR_MAP[activeTheme].firstColor}
          secondColor={THEME_COLOR_MAP[activeTheme].secondColor}
          thirdColor={THEME_COLOR_MAP[activeTheme].thirdColor}
          fourthColor={THEME_COLOR_MAP[activeTheme].fourthColor}
          fifthColor={THEME_COLOR_MAP[activeTheme].fifthColor}
          pointerColor={THEME_COLOR_MAP[activeTheme].pointerColor}
          containerClassName="absolute inset-0"
        />
        <div
          className="bg-front"
          style={{
            backgroundImage: `url('/design/lullow-backdrop.webp')`,
          }}
        />
        {/* Dynamic theme-synced liquid light flowing directly INSIDE the lamp dome */}
        <div 
          className="absolute inset-0 pointer-events-none mix-blend-screen opacity-85 z-[1]"
          style={{
            maskImage: "radial-gradient(ellipse min(24vw, 160px) min(32vh, 210px) at calc(50% + 113px) calc(51% + 113px), black 15%, rgba(0,0,0,0.5) 45%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse min(24vw, 160px) min(32vh, 210px) at calc(50% + 113px) calc(51% + 113px), black 15%, rgba(0,0,0,0.5) 45%, transparent 100%)",
          }}
        >
          <BackgroundGradientAnimation
            gradientBackgroundStart="transparent"
            gradientBackgroundEnd="transparent"
            firstColor={THEME_COLOR_MAP[activeTheme].firstColor}
            secondColor={THEME_COLOR_MAP[activeTheme].secondColor}
            thirdColor={THEME_COLOR_MAP[activeTheme].thirdColor}
            fourthColor={THEME_COLOR_MAP[activeTheme].fourthColor}
            fifthColor={THEME_COLOR_MAP[activeTheme].fifthColor}
            pointerColor={THEME_COLOR_MAP[activeTheme].pointerColor}
            containerClassName="absolute inset-0"
            size="70%"
          />
        </div>
        {/* Twinkling Golden Bling Stars */}
        <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
          {heroStars.map((star) => (
            <div
              key={`hero-star-${star.id}`}
              className="absolute rounded-full bg-amber-400 animate-star-bling shadow-[0_0_8px_rgba(251,191,36,0.6)]"
              style={{
                top: `${star.top}%`,
                left: `${star.left}%`,
                width: `${star.scale * 1.8}px`,
                height: `${star.scale * 1.8}px`,
                opacity: 0.25 + (star.scale / 3),
                animationDelay: `${star.delay}s`,
                animationDuration: `${3.5 + star.delay}s`,
              }}
            />
          ))}
        </div>
        {/* Blur Edge Overlays */}
        <div className="blur-overlay blur-overlay-top" />
        <div className="blur-overlay blur-overlay-bottom" />
      </div>

      {/* Soft dark overlay for text readability */}
      <div className="fixed inset-0 z-[1] bg-black/10 pointer-events-none" />

      {/* Hero viewport container */}
      <div id="hero-viewport" className="relative min-h-screen w-full flex flex-col justify-between p-6 sm:p-12 z-10">
        {/* Navbar */}
        <div className="relative z-20">
          <Navbar activeTheme={activeTheme} setActiveTheme={setActiveTheme} />
        </div>

        {/* Main text centered vertically within hero viewport */}
        <section className="relative z-10 flex flex-col items-start text-left px-6 sm:px-12 md:px-16 lg:px-20 pt-4 sm:pt-6 pb-6 w-full max-w-sm sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl mr-auto my-auto">
          <h1
            className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-normal leading-[0.95] tracking-tight text-white select-none"
            style={{
              fontFamily: "'Instrument Serif', serif",
              letterSpacing: "-0.03em",
            }}
          >
            <div className="flex flex-wrap justify-start gap-[0.25em] mb-3 md:mb-6">
              {line1.map((word, index) => {
                const isSpecial = word === "dreams";

                return (
                  <motion.span
                    key={`line1-${word}`}
                    initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      duration: 1.8,
                      delay: index * 0.3,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`inline-block drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)] ${
                      isSpecial
                        ? "text-zinc-300 font-light italic tracking-tight"
                        : "text-white"
                    }`}
                  >
                    {word}
                  </motion.span>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-start gap-[0.25em]">
              {line2.map((word, index) => {
                const isSpecial = word === "silence.";

                return (
                  <motion.span
                    key={`line2-${word}`}
                    initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      duration: 1.8,
                      delay: (line1.length + index) * 0.3,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`inline-block drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)] ${
                      isSpecial
                        ? "text-zinc-300 font-light italic tracking-tight"
                        : "text-white"
                    }`}
                  >
                    {word}
                  </motion.span>
                );
              })}
            </div>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            transition={{ delay: 2.2, duration: 1.5 }}
            className="mt-8 text-xs sm:text-sm tracking-[0.25em] text-zinc-300 uppercase font-light max-w-md drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
          >
            A celestial bedtime dreamspace
          </motion.p>
        </section>

        {/* Elegant pulsing scroll scroll indicator */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: [0.35, 0.85, 0.35], y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="relative z-10 flex flex-col items-center justify-center gap-1.5 cursor-pointer pb-2"
          onClick={() => {
            const el = document.getElementById("companion-section");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          title="Scroll to Dream Companion"
        >
          <span className="text-[10px] tracking-[0.3em] uppercase text-zinc-400 font-light drop-shadow-md">Scroll Celestial Deep</span>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        </motion.div>
      </div>

      {/* Companion Chatbot Section */}
      <div className="relative z-10">
        <CompanionChat onNavigateToStory={(prompt) => {
          setStoryPrompt(prompt);
          setView('story');
        }} />
      </div>

      {/* Footer at extreme bottom of page */}
      <div className="relative z-10 px-6 sm:px-12 pb-12 w-full mt-auto">
        <footer className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-zinc-500/20 pt-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.6 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="text-[10px] tracking-widest text-zinc-300 uppercase font-light drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
          >
            Â© {new Date().getFullYear()} lullow. Light & Lore.
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.9 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="text-[10px] tracking-[0.15em] uppercase font-light text-zinc-200 px-3 py-1 flex items-center gap-2 select-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <span>Dreamspace Active</span>
          </motion.div>
        </footer>
      </div>

      {/* Full-screen Dream Story Player overlay with smooth motion exit/entry */}
      <AnimatePresence>
        {view === 'story' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-50 overflow-hidden"
          >
            <StoryPlayer 
              prompt={storyPrompt} 
              onBack={() => setView('home')} 
              activeTheme={activeTheme}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating persistent Ambient Soundscape Control */}
      <AmbientSoundscapeControl />
    </main>
  );
}

