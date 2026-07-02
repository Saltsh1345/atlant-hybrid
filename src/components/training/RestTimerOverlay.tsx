"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { speak } from "@/lib/ai/speech";

interface RestTimerOverlayProps {
  seconds?: number;
  onDone: () => void;
  onSkip: () => void;
}

export default function RestTimerOverlay({
  seconds = 60,
  onDone,
  onSkip,
}: RestTimerOverlayProps) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    speak(`Отдых ${seconds} секунд`);
  }, [seconds]);

  useEffect(() => {
    if (left <= 0) {
      speak("Продолжаем!");
      onDone();
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="health-card max-w-xs bg-white p-8 text-center">
          <p className="text-xs uppercase tracking-widest text-muted">Отдых</p>
          <p className="mt-2 font-mono text-6xl font-bold text-sky-600">{left}</p>
          <button
            type="button"
            onClick={onSkip}
            className="mt-6 text-sm text-primary hover:underline"
          >
            Пропустить
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
