"use client";

import { useEffect, useRef } from "react";

export default function LiveScanGrid({ active = true }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      phaseRef.current += 0.018;
      const phase = phaseRef.current;

      ctx.clearRect(0, 0, w, h);

      const step = 28;
      const pulse = 0.45 + Math.sin(phase) * 0.25;

      for (let x = 0; x <= w; x += step) {
        const dist = Math.abs(x - w / 2) / (w / 2);
        const alpha = (0.06 + pulse * 0.08) * (1 - dist * 0.35);
        ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      for (let y = 0; y <= h; y += step) {
        const wave = Math.sin(phase * 1.4 + y * 0.02) * 0.5 + 0.5;
        const alpha = 0.05 + wave * 0.1;
        ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      for (let x = 0; x <= w; x += step) {
        for (let y = 0; y <= h; y += step) {
          const flicker = Math.sin(phase * 2 + x * 0.04 + y * 0.03);
          if (flicker > 0.82) {
            ctx.fillStyle = `rgba(34, 211, 238, ${0.15 + flicker * 0.2})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      const scanY = ((phase * 0.35) % 1) * h;
      const grad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
      grad.addColorStop(0, "rgba(34, 211, 238, 0)");
      grad.addColorStop(0.5, "rgba(34, 211, 238, 0.12)");
      grad.addColorStop(1, "rgba(34, 211, 238, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 40, w, 80);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
    />
  );
}
