import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Lock, Heart as HeartIcon, Sparkles } from 'lucide-react';
import TextHeart from './components/TextHeart';

const heartbeatTrack = new URL('../Massive Attack - Angel.mp3', import.meta.url).href;
const heartbeatStartTime = 139;

const Typewriter = ({ text, delay = 50, onComplete }: { text: string, delay?: number, onComplete?: () => void }) => {
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
      }, delay);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, delay, onComplete]);

  return <span className="font-mono">{currentText}</span>;
};

export default function App() {
  const [stage, setStage] = useState<'console' | 'reveal'>('console');
  const [consoleFinished, setConsoleFinished] = useState(false);
  const [revealUnlocked, setRevealUnlocked] = useState(false);
  const [showRevealText, setShowRevealText] = useState(false);
  const [revealHeadingReady, setRevealHeadingReady] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleReveal = useCallback(() => {
    if (stage === 'console' && consoleFinished) {
      setStage('reveal');
    }
  }, [stage, consoleFinished]);

  const unlockReveal = useCallback(() => {
    setRevealUnlocked(true);
  }, []);

  const stopHeartbeatAudio = useCallback(() => {
    const source = audioSourceRef.current;
    if (!source) return;

    source.stop();
    source.disconnect();
    audioSourceRef.current = null;
  }, []);

  const prepareHeartbeatAudio = useCallback(async () => {
    let context = audioContextRef.current;

    if (!context) {
      const AudioContextConstructor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextConstructor) {
        return null;
      }

      context = new AudioContextConstructor();
      audioContextRef.current = context;
    }

    if (context.state === 'suspended') {
      await context.resume();
    }

    if (!audioGainRef.current) {
      const gainNode = context.createGain();
      gainNode.gain.value = 0.35;
      gainNode.connect(context.destination);
      audioGainRef.current = gainNode;
    }

    if (!audioBufferRef.current) {
      const response = await fetch(heartbeatTrack);
      const arrayBuffer = await response.arrayBuffer();
      audioBufferRef.current = await context.decodeAudioData(arrayBuffer);
    }

    return context;
  }, []);

  const startHeartbeatAudio = useCallback(async () => {
    const context = await prepareHeartbeatAudio();
    if (!context || !audioBufferRef.current || !audioGainRef.current) {
      return;
    }

    stopHeartbeatAudio();

    const source = context.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.loop = true;
    source.loopStart = heartbeatStartTime;
    source.loopEnd = audioBufferRef.current.duration;
    source.connect(audioGainRef.current);
    source.start(0, heartbeatStartTime);
    audioSourceRef.current = source;
  }, [prepareHeartbeatAudio, stopHeartbeatAudio]);

  useEffect(() => {
    if (stage === 'reveal') {
      setRevealUnlocked(false);
      setShowRevealText(false);
      setRevealHeadingReady(false);
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
    return () => {
      stopHeartbeatAudio();
      void audioContextRef.current?.close();
    };
  }, [stopHeartbeatAudio]);

  return (
    <div 
      onClick={() => {
        handleReveal();
        void prepareHeartbeatAudio();
        if (stage === 'console' && consoleFinished) {
          void startHeartbeatAudio();
        }
      }}
      className={`relative min-h-screen w-full flex items-center justify-center bg-[#050505] selection:bg-pink-deep/30 ${stage === 'console' && consoleFinished ? 'cursor-pointer' : ''}`}
    >
      <div className="scanline" />
      
      <AnimatePresence mode="wait">
        {stage === 'console' ? (
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
                  onComplete={() => setConsoleFinished(true)}
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
                    onComplete={() => setRevealHeadingReady(true)}
                  />
                  <span className="terminal-cursor ml-1 inline-block align-middle" />
                </h2>
                <div className="w-12 h-px bg-pink-deep/30 mx-auto mb-8" />
                
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    stopHeartbeatAudio();
                    setStage('console');
                  }}
                  className="border border-white/20 px-4 py-2 text-white/40 hover:border-white/45 hover:text-white/80 transition-colors uppercase text-xs tracking-[0.35em] font-mono [text-shadow:0_0_1px_rgba(255,255,255,0.9),0_0_8px_rgba(255,77,109,0.25)]"
                >
                  {revealHeadingReady && <Typewriter text="Re-encrypt" delay={70} />}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
