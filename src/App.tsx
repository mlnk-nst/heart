import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Volume2, VolumeX } from 'lucide-react';
import TextHeart from './components/TextHeart';

const heartbeatTrack = new URL('../Massive Attack - Angel_[cut_241sec].mp3', import.meta.url).href;

const Typewriter = ({
  text,
  delay = 50,
  onType,
  onComplete,
}: {
  text: string,
  delay?: number,
  onType?: () => void,
  onComplete?: () => void
}) => {
  const [currentText, setCurrentText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setCurrentText("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
        onType?.();
      }, delay);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, delay, onComplete, onType]);

  return <span className="font-mono">{currentText}</span>;
};

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [stage, setStage] = useState<'console' | 'reveal'>('console');
  const [consoleFinished, setConsoleFinished] = useState(false);
  const [revealUnlocked, setRevealUnlocked] = useState(false);
  const [showRevealText, setShowRevealText] = useState(false);
  const [revealHeadingReady, setRevealHeadingReady] = useState(false);
  const [reEncryptReady, setReEncryptReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showUnlockBurst, setShowUnlockBurst] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const typingAudioContextRef = useRef<AudioContext | null>(null);

  const handleReveal = useCallback(() => {
    if (stage === 'console' && consoleFinished) {
      setStage('reveal');
    }
  }, [stage, consoleFinished]);

  const unlockReveal = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }

    setShowUnlockBurst(true);
    setRevealUnlocked(true);
  }, []);

  const prepareTypingAudio = useCallback(async () => {
    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) return null;

    let context = typingAudioContextRef.current;
    if (!context) {
      context = new AudioContextConstructor();
      typingAudioContextRef.current = context;
    }

    if (context.state === 'suspended') {
      await context.resume();
    }

    return context;
  }, []);

  const playTypingSound = useCallback(() => {
    if (isMuted) return;
    const context = typingAudioContextRef.current;
    if (!context || context.state !== 'running') return;

    const now = context.currentTime;
    const clickDuration = 0.045;
    const noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * clickDuration), context.sampleRate);
    const channelData = noiseBuffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i += 1) {
      channelData[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const noiseSource = context.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2400;
    noiseFilter.Q.value = 0.8;

    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.18, now + 0.003);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    const bodyOscillator = context.createOscillator();
    bodyOscillator.type = 'triangle';
    bodyOscillator.frequency.setValueAtTime(145, now);
    bodyOscillator.frequency.exponentialRampToValueAtTime(90, now + 0.06);

    const bodyGain = context.createGain();
    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.11, now + 0.003);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(context.destination);

    bodyOscillator.connect(bodyGain);
    bodyGain.connect(context.destination);

    noiseSource.start(now);
    noiseSource.stop(now + clickDuration);
    bodyOscillator.start(now);
    bodyOscillator.stop(now + 0.065);
  }, [isMuted]);

  const playTerminalBlip = useCallback(() => {
    if (isMuted) return;

    const context = typingAudioContextRef.current;
    if (!context || context.state !== 'running') return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const harmonic = context.createOscillator();
    const gainNode = context.createGain();
    const filter = context.createBiquadFilter();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(1180, now + 0.05);

    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(1320, now);
    harmonic.frequency.exponentialRampToValueAtTime(1760, now + 0.05);

    filter.type = 'lowpass';
    filter.frequency.value = 2600;

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    oscillator.connect(filter);
    harmonic.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(now);
    harmonic.start(now);
    oscillator.stop(now + 0.15);
    harmonic.stop(now + 0.15);
  }, [isMuted]);

  const stopHeartbeatAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsMuted((current) => {
      const next = !current;
      audio.muted = next;
      return next;
    });
  }, []);

  const startHeartbeatAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.35;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (stage === 'reveal') {
      setRevealUnlocked(false);
      setShowRevealText(false);
      setRevealHeadingReady(false);
      setReEncryptReady(false);
      setShowUnlockBurst(false);
    }
  }, [stage]);

  useEffect(() => {
    if (!revealUnlocked) {
      setShowRevealText(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowRevealText(true);
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [revealUnlocked]);

  useEffect(() => {
    if (stage !== 'reveal' || revealUnlocked) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        unlockReveal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, revealUnlocked, unlockReveal]);

  useEffect(() => {
    if (stage === 'reveal' && !revealUnlocked) {
      void startHeartbeatAudio();
      return;
    }

    stopHeartbeatAudio();
  }, [stage, revealUnlocked, startHeartbeatAudio, stopHeartbeatAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (!showUnlockBurst) return;

    const timeout = window.setTimeout(() => {
      setShowUnlockBurst(false);
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [showUnlockBurst]);

  return (
    <div 
      onPointerDown={() => {
        void prepareTypingAudio();
      }}
      onClick={() => {
        handleReveal();
        if (stage === 'console' && consoleFinished) {
          void startHeartbeatAudio();
        }
      }}
      className={`relative min-h-screen w-full flex items-center justify-center bg-[#050505] selection:bg-pink-deep/30 ${stage === 'console' && consoleFinished ? 'cursor-pointer' : ''}`}
    >
      <audio
        ref={audioRef}
        src={heartbeatTrack}
        loop
        playsInline
        preload="auto"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      <div className="scanline" />
      
      <AnimatePresence mode="wait">
        {!hasStarted ? (
          <motion.div
            key="boot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-screen w-full items-center justify-center p-8"
          >
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                await prepareTypingAudio();
                setHasStarted(true);
              }}
              className="border border-pink-deep/30 bg-pink-deep/5 px-6 py-3 font-mono text-xs uppercase tracking-[0.35em] text-pink-soft transition-colors hover:border-pink-deep/55 hover:bg-pink-deep/10 hover:text-white"
            >
              Tap to initialize
            </button>
          </motion.div>
        ) : stage === 'console' ? (
          <motion.div
            key="console"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-2xl p-8 font-mono text-sm md:text-base text-white/80"
          >
            <div className="space-y-2">
              <div className="flex gap-2 text-pink-soft/60">
                <span>[system]</span>
                <Typewriter 
                  text="Initializing heart.PROTOCOL_v2.0..." 
                  delay={30} 
                  onComplete={() => {
                    playTerminalBlip();
                    setConsoleFinished(true);
                  }}
                />
              </div>
              
              <div className="flex gap-2 h-6">
                <span>[status]</span>
                {consoleFinished && (
                    <motion.span 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="text-green-400"
                    >
                        READY
                    </motion.span>
                )}
              </div>

              {consoleFinished && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-8 flex flex-col items-start gap-6"
                >
                  <p className="text-white/40 italic">
                    {">"} One encrypted package found for you.
                  </p>
                  
                  <button
                    id="decrypt-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void prepareTypingAudio();
                      void startHeartbeatAudio();
                      setStage('reveal');
                    }}
                    className="group flex items-center gap-3 px-6 py-3 border border-pink-deep/30 bg-pink-deep/5 hover:bg-pink-deep/10 text-pink-soft transition-all duration-300 pointer-events-auto"
                  >
                    <Lock size={16} className="group-hover:rotate-12 transition-transform" />
                    <span className="font-mono tracking-widest uppercase text-xs">Decrypt Message</span>
                    <span className="terminal-cursor" />
                  </button>
                  
                  <p className="text-[10px] text-white/20 animate-pulse">
                    (or just click anywhere)
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full h-screen flex items-center justify-center overflow-hidden"
            onClick={() => {
              if (!revealUnlocked) {
                stopHeartbeatAudio();
                unlockReveal();
              }
            }}
          >
            {!revealUnlocked && <div className="heartbeat-pulse-flash" />}

            <AnimatePresence>
              {revealUnlocked && (
                <motion.div
                  initial={{ opacity: 0.75, scale: 0.7 }}
                  animate={{ opacity: 0, scale: 1.45 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.95, ease: 'easeOut' }}
                  className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,77,109,0.34)_0%,rgba(255,77,109,0.12)_35%,rgba(255,77,109,0)_72%)]"
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showUnlockBurst && (
                <>
                  <motion.div
                    initial={{ opacity: 0.92, scale: 0.18 }}
                    animate={{ opacity: 0, scale: 2.1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.85, ease: 'easeOut' }}
                    className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.98)_0%,rgba(255,214,224,0.95)_12%,rgba(255,143,177,0.72)_28%,rgba(255,77,109,0.34)_46%,rgba(255,77,109,0.12)_60%,rgba(255,77,109,0)_76%)] blur-[2px]"
                  />
                  <motion.div
                    initial={{ opacity: 0.7, scale: 0.14 }}
                    animate={{ opacity: 0, scale: 2.7 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.15, ease: 'easeOut', delay: 0.03 }}
                    className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,196,214,0.58)_0%,rgba(255,143,177,0.28)_26%,rgba(255,77,109,0.12)_44%,rgba(255,77,109,0)_68%)]"
                  />
                  <motion.div
                    initial={{ opacity: 0.48, scale: 0.2 }}
                    animate={{ opacity: 0, scale: 1.45 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white blur-xl"
                  />
                </>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="absolute right-5 top-5 z-30 flex items-center gap-2 border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-white/55 backdrop-blur-sm transition-colors hover:border-white/35 hover:text-white/90 md:right-8 md:top-8"
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span>{isMuted ? 'Muted' : 'Sound'}</span>
            </button>

            <div className="absolute inset-0">
              <TextHeart loop={!revealUnlocked} />
            </div>

            {!revealUnlocked && (
              <div className="absolute bottom-32 left-1/2 z-20 w-full max-w-xs -translate-x-1/2 px-6 text-center text-xs uppercase tracking-[0.3em] text-white/45 font-mono md:bottom-12 md:text-[10px] md:text-white/20">
                Press Space / Tap Screen
              </div>
            )}

            {showRevealText && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2 }}
                className="z-20 text-center"
              >
                <h2 className="text-pink-deep font-mono text-xl tracking-[0.3em] uppercase glow-text mb-2">
                  <Typewriter
                    key={showRevealText ? 'decrypted-live' : 'decrypted-idle'}
                    text="Decrypted"
                    delay={80}
                    onType={playTypingSound}
                    onComplete={() => setRevealHeadingReady(true)}
                  />
                  <span className="terminal-cursor ml-1 inline-block align-middle" />
                </h2>
                <div className="w-12 h-px bg-pink-deep/30 mx-auto mb-8" />
                
                <motion.button
                  initial={false}
                  animate={{
                    borderColor: reEncryptReady ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0)',
                    boxShadow: reEncryptReady ? '0 0 12px rgba(255, 77, 109, 0.12)' : '0 0 0 rgba(255, 77, 109, 0)',
                  }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    stopHeartbeatAudio();
                    setStage('console');
                  }}
                  className="border border-white/20 px-4 py-2 text-white/40 hover:border-white/45 hover:text-white/80 transition-colors uppercase text-xs tracking-[0.35em] font-mono [text-shadow:0_0_1px_rgba(255,255,255,0.9),0_0_8px_rgba(255,77,109,0.25)]"
                >
                  {revealHeadingReady && (
                    <Typewriter
                      text="Re-encrypt"
                      delay={70}
                      onType={playTypingSound}
                      onComplete={() => setReEncryptReady(true)}
                    />
                  )}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
