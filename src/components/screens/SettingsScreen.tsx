"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useAppStore } from "@/store/useAppStore";
import { useThemeStore, type ThemeMode } from "@/store/useThemeStore";

const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: "dark", label: "Тёмная" },
  { id: "light", label: "Светлая" },
  { id: "system", label: "Системная" },
];

export default function SettingsScreen() {
  const voiceMuted = useAppStore((s) => s.voiceMuted);
  const setVoiceMuted = useAppStore((s) => s.setVoiceMuted);
  const setPhase = useAppStore((s) => s.setPhase);
  const resetAllData = useAppStore((s) => s.resetAllData);
  const healthConnected = useAppStore((s) => s.healthConnected);
  const refreshHealthReadiness = useAppStore((s) => s.refreshHealthReadiness);
  const clearHealthConnection = useAppStore((s) => s.clearHealthConnection);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthMsg, setHealthMsg] = useState("");

  useEffect(() => {
    void refreshHealthReadiness();
  }, [refreshHealthReadiness]);

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

  const connectHuawei = async () => {
    setHealthBusy(true);
    setHealthMsg("");
    try {
      const res = await fetch("/api/health/huawei/auth-url", { cache: "no-store" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setHealthMsg(data.error ?? "Не удалось начать OAuth");
        return;
      }
      window.location.href = data.url;
    } catch {
      setHealthMsg("Ошибка сети при подключении Huawei");
    } finally {
      setHealthBusy(false);
    }
  };

  const disconnectHuawei = async () => {
    setHealthBusy(true);
    setHealthMsg("");
    try {
      await fetch("/api/health/huawei/disconnect", { method: "POST" });
      clearHealthConnection();
      setHealthMsg("Huawei Health отключен");
    } catch {
      setHealthMsg("Не удалось отключить Huawei Health");
    } finally {
      setHealthBusy(false);
    }
  };

  return (
    <motion.div
      className="mx-auto min-h-dvh max-w-lg px-5 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <button
        type="button"
        onClick={() => setPhase("dashboard")}
        className="mb-4 text-sm text-[var(--primary)]"
      >
        ← Назад
      </button>
      <h1 className="mb-6 text-2xl font-bold text-[var(--foreground)]">
        Настройки
      </h1>

      <Card className="mb-4">
        <p className="font-medium text-[var(--foreground)]">Тема оформления</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Тёмная тема оптимальна для зала и тренировки с камерой
        </p>
        <div className="mt-3 flex gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setThemeMode(opt.id)}
              className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                themeMode === opt.id
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-secondary)] hover:border-[var(--primary)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <p className="font-medium text-[var(--foreground)]">Huawei Health Kit</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Источник сна, пульса, SpO2 и стресса для коэффициента готовности
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {healthConnected ? (
            <>
              <Button
                size="md"
                variant="secondary"
                className="!w-auto"
                onClick={() => void refreshHealthReadiness()}
                disabled={healthBusy}
              >
                Обновить данные
              </Button>
              <Button
                size="md"
                variant="ghost"
                className="!w-auto"
                onClick={() => void disconnectHuawei()}
                disabled={healthBusy}
              >
                Отключить
              </Button>
            </>
          ) : (
            <Button
              size="md"
              variant="secondary"
              className="!w-auto"
              onClick={() => void connectHuawei()}
              disabled={healthBusy}
            >
              Подключить Huawei
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Статус: {healthConnected ? "Подключено" : "Не подключено"}
        </p>
        {healthMsg ? <p className="mt-1 text-xs text-[var(--muted)]">{healthMsg}</p> : null}
      </Card>

      <Card className="mb-4">
        <label className="flex cursor-pointer items-center justify-between">
          <div>
            <p className="font-medium text-[var(--foreground)]">Голосовой тренер</p>
            <p className="text-xs text-[var(--muted)]">speechSynthesis подсказки</p>
          </div>
          <input
            type="checkbox"
            checked={!voiceMuted}
            onChange={(e) => setVoiceMuted(!e.target.checked)}
            className="h-5 w-5 rounded accent-[var(--primary)]"
          />
        </label>
      </Card>

      <Card className="mb-4">
        <p className="font-medium text-[var(--foreground)]">Профиль</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
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

      <Card className="mb-4 border-[var(--danger)]/20">
        <p className="font-medium text-[var(--danger)]">Сброс данных</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Удалит профиль и всю историю с устройства
        </p>
        <Button
          size="md"
          variant="danger"
          className="mt-3 !w-auto"
          onClick={handleReset}
        >
          Сбросить всё
        </Button>
      </Card>
    </motion.div>
  );
}
