"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useAppStore } from "@/store/useAppStore";

const FEATURES = [
  { icon: "📷", title: "VBT через камеру", desc: "Скорость суставов без датчиков" },
  { icon: "🔒", title: "Data Latch", desc: "Состав тела — один раз при скане" },
  { icon: "🎙", title: "ИИ-тренер", desc: "Голос + анализ после тренировки" },
  { icon: "📊", title: "Биомеханика", desc: "Силовые · Бокс · Теннис" },
];

export default function WelcomeScreen() {
  const setPhase = useAppStore((s) => s.setPhase);

  return (
    <motion.div
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-8 w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-100">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 4 L36 34 H4 Z"
              stroke="#0ea5e9"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="20" cy="24" r="4" fill="#10b981" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Atlant-Hybrid
        </h1>
        <p className="mt-2 text-muted">
          Premium HealthTech · MediaPipe VBT + ИИ
        </p>
      </div>

      <div className="mb-8 grid w-full max-w-md gap-2">
        {FEATURES.map((f) => (
          <Card key={f.title} className="flex items-center gap-3 !py-3">
            <span className="text-2xl">{f.icon}</span>
            <div className="text-left">
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="text-xs text-muted">{f.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      <Button size="lg" className="max-w-md" onClick={() => setPhase("registration")}>
        Начать
      </Button>
    </motion.div>
  );
}
