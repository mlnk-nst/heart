import React, { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  alpha: number;
  targetAlpha: number;
  delay: number;
  fadeOutDelay: number;
}

export default function TextHeart({ loop }: { loop: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef(loop);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let points: Point[] = [];
    const text = "i love you";
    const fontSize = 14;
    const cycleDuration = 4200;
    const fadeInDuration = 900;
    const holdDuration = 500;
    const fadeOutDuration = 900;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initPoints();
    };

    const initPoints = () => {
      points = [];
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 45;

      // Heart equation: 
      // x = 16 sin^3(t)
      // y = -(13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t))
      
      for (let t = 0; t < Math.PI * 2; t += 0.05) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
        
        points.push({
          x: centerX + x * scale,
          y: centerY + y * scale,
          alpha: 0,
          targetAlpha: 0.8 + Math.random() * 0.2,
          delay: Math.random() * 2000,
          fadeOutDelay: Math.random() * 900
        });
      }

      // Add inner layers
      for (let s = 0.2; s < 1; s += 0.2) {
          for (let t = 0; t < Math.PI * 2; t += 0.1) {
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
            
            points.push({
              x: centerX + x * scale * s,
              y: centerY + y * scale * s,
              alpha: 0,
              targetAlpha: 0.4 + Math.random() * 0.4,
              delay: Math.random() * 3000,
              fadeOutDelay: Math.random() * 1200
            });
          }
      }
    };

    const getLoopAlpha = (point: Point, elapsed: number) => {
      const phase = elapsed % cycleDuration;
      const fadeInEnd = point.delay + fadeInDuration;
      const holdEnd = fadeInEnd + holdDuration;
      const fadeOutStart = holdEnd + point.fadeOutDelay;
      const fadeOutEnd = fadeOutStart + fadeOutDuration;

      if (phase <= point.delay) return 0;
      if (phase <= fadeInEnd) {
        return point.targetAlpha * ((phase - point.delay) / fadeInDuration);
      }
      if (phase <= fadeOutStart) return point.targetAlpha;
      if (phase <= fadeOutEnd) {
        return point.targetAlpha * (1 - (phase - fadeOutStart) / fadeOutDuration);
      }
      return 0;
    };

    let start: number | null = null;
    const draw = (time: number) => {
      if (!start) start = time;
      const elapsed = time - start;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px "Fira Code", monospace`;
      
      points.forEach(p => {
        if (loopRef.current) {
          const loopAlpha = getLoopAlpha(p, elapsed);
          p.alpha += (loopAlpha - p.alpha) * 0.14;
        } else {
          p.alpha += (0 - p.alpha) * 0.04;
        }

        ctx.fillStyle = `rgba(255, 77, 109, ${p.alpha})`;
        ctx.fillText(text, p.x - ctx.measureText(text).width / 2, p.y);
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none"
    />
  );
}
