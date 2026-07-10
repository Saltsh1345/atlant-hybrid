"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { speakScript } from "@/lib/ai/speech";

interface CountdownOverlayProps {
  onComplete: () => void;
}

export default function CountdownOverlay({ onComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState(3);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (completedRef.current) return;

    if (count === 0) {
      completedRef.current = true;
      speakScript("countdown:start", "Старт!");
      onCompleteRef.current();
      return;
    }

    speakScript(`countdown:${count}`, String(count));
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.p
            key={count}
            className="text-8xl font-bold text-white"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
          >
            {count}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
