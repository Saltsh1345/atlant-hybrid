"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useAppStore } from "@/store/useAppStore";

export default function SettingsScreen() {
  const voiceMuted = useAppStore((s) => s.voiceMuted);
  const setVoiceMuted = useAppStore((s) => s.setVoiceMuted);
  const setPhase = useAppStore((s) => s.setPhase);
  const resetAllData = useAppStore((s) => s.resetAllData);

  const handleReset = () => {
    if (
      window.confirm(
        "Удалить профиль, историю тренировок и данные сканирования?"
      )
    ) {
      resetAllData();
      setPhase("welcome");
    }
  };

  return (
    <motion.div
      className="mx-auto min-h-dvh max-w-lg px-5 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <button
        type="button"
        onClick={() => setPhase("dashboard")}
        className="mb-4 text-sm text-primary"
      >
        ← Назад
      </button>
      <h1 className="mb-6 text-2xl font-bold">Настройки</h1>

      <Card className="mb-4">
        <label className="flex cursor-pointer items-center justify-between">
          <div>
            <p className="font-medium text-slate-800">Голосовой тренер</p>
            <p className="text-xs text-muted">speechSynthesis подсказки</p>
          </div>
          <input
            type="checkbox"
            checked={!voiceMuted}
            onChange={(e) => setVoiceMuted(!e.target.checked)}
            className="h-5 w-5 rounded accent-sky-500"
          />
        </label>
      </Card>

      <Card className="mb-4">
        <p className="font-medium text-slate-800">Профиль</p>
        <p className="mt-1 text-xs text-muted">
          Изменить рост, вес, цель и травмы
        </p>
        <Button
          size="md"
          variant="secondary"
          className="mt-3 !w-auto"
          onClick={() => setPhase("registration")}
        >
          Редактировать
        </Button>
      </Card>

      <Card className="mb-4 border-red-100">
        <p className="font-medium text-red-700">Сброс данных</p>
        <p className="mt-1 text-xs text-muted">
          Удалит профиль и всю историю с устройства
        </p>
        <Button
          size="md"
          variant="ghost"
          className="mt-3 !w-auto !text-red-600 hover:!bg-red-50"
          onClick={handleReset}
        >
          Сбросить всё
        </Button>
      </Card>
    </motion.div>
  );
}
