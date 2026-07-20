"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  useUserHealthStore,
  type UserHealthProfile,
} from "@/store/userHealthStore";
import type { HealthMetricsSnapshot } from "@/types";

const BOOT_LINES = [
  "[CORE] ATLANT KERNEL 0.1.0",
  "[CV] MEDIAPIPE POSE MODULE ... STANDBY",
  "[SENSORS] WEB BLUETOOTH ... CHECKING",
  "[HEALTH] SECURE DATA BRIDGE ... READY",
  "[AUTH] IDENTITY GATE ... READY",
];

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  resting_heart_rate_bpm: number | null;
  body_fat_percentage: number | null;
}

function rowToProfile(row: ProfileRow): Partial<UserHealthProfile> {
  return {
    userId: row.id,
    email: row.email,
    displayName: row.display_name,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    age: row.age,
    restingHeartRateBpm: row.resting_heart_rate_bpm,
    bodyFatPercentage: row.body_fat_percentage,
  };
}

function errorMessage(code: string | null) {
  switch (code) {
    case "supabase_not_configured":
      return "Supabase не настроен. Добавьте URL и publishable key.";
    case "missing_code":
      return "OAuth не вернул код авторизации.";
    case "code_exchange_failed":
      return "Не удалось подтвердить OAuth-сессию.";
    case "bad_state":
      return "Huawei отклонил OAuth state. Запустите синхронизацию снова.";
    case "exchange_failed":
      return "Huawei не подтвердил код авторизации.";
    default:
      return code ? `Ошибка подключения: ${code}` : null;
  }
}

export default function LoadingAuthScreen() {
  const [visibleLines, setVisibleLines] = useState(1);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const autoFlowStarted = useRef(false);

  const profile = useUserHealthStore((state) => state.profile);
  const status = useUserHealthStore((state) => state.status);
  const syncedAt = useUserHealthStore((state) => state.syncedAt);
  const setProfile = useUserHealthStore((state) => state.setProfile);
  const applyHuaweiMetrics = useUserHealthStore(
    (state) => state.applyHuaweiMetrics,
  );
  const setStatus = useUserHealthStore((state) => state.setStatus);

  useEffect(() => {
    const lineTimer = window.setInterval(() => {
      setVisibleLines((current) => {
        if (current >= BOOT_LINES.length) {
          window.clearInterval(lineTimer);
          return current;
        }
        return current + 1;
      });
    }, 330);

    const readyTimer = window.setTimeout(() => setReady(true), 2000);

    return () => {
      window.clearInterval(lineTimer);
      window.clearTimeout(readyTimer);
    };
  }, []);

  const hydrateSupabaseProfile = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    setProfile({
      userId: user.id,
      email: user.email ?? null,
      displayName:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : null,
    });

    const { data } = await supabase
      .from("profiles")
      .select(
        "id,email,display_name,weight_kg,height_cm,age,resting_heart_rate_bpm,body_fat_percentage",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (data) setProfile(rowToProfile(data as ProfileRow));
    return user;
  }, [setProfile]);

  const finalizeSupabaseProfile = useCallback(async () => {
    setBusy(true);
    setMessage("Сохраняем защищённый профиль...");

    try {
      const supabase = createBrowserSupabaseClient();
      const user = await hydrateSupabaseProfile();
      if (!supabase || !user) throw new Error("supabase_session_missing");

      const current = useUserHealthStore.getState().profile;
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? null,
        display_name:
          current.displayName ??
          (typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setStatus("authenticated");
      setMessage(
        "Google-профиль подключён. Huawei Health подключим на будущем этапе.",
      );
    } catch {
      const text = "Не удалось сохранить профиль Supabase. Повторите вход.";
      setStatus("error", text);
      setMessage(text);
    } finally {
      setBusy(false);
    }
  }, [hydrateSupabaseProfile, setStatus]);

  const persistProfile = useCallback(
    async (metrics: HealthMetricsSnapshot) => {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("supabase_session_missing");

      const current = useUserHealthStore.getState().profile;
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? null,
        display_name:
          current.displayName ??
          (typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null),
        weight_kg: current.weightKg,
        height_cm: current.heightCm,
        age: current.age,
        resting_heart_rate_bpm: metrics.heartRate?.restingBpm ?? null,
        body_fat_percentage: current.bodyFatPercentage,
        health_provider: "huawei",
        health_synced_at: metrics.fetchedAt,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    [],
  );

  const syncHuaweiMetrics = useCallback(async () => {
    setBusy(true);
    setStatus("syncing");
    setMessage("Получаем показатели Huawei Health...");

    try {
      const response = await fetch("/api/health/metrics", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        metrics?: HealthMetricsSnapshot;
        error?: string;
      };

      if (!response.ok || !payload.metrics) {
        throw new Error(payload.error ?? "health_metrics_unavailable");
      }

      applyHuaweiMetrics(payload.metrics);
      await persistProfile(payload.metrics);
      setMessage("Данные здоровья синхронизированы.");
    } catch (error) {
      const text =
        error instanceof Error && error.message === "supabase_session_missing"
          ? "Сессия Supabase потеряна. Повторите вход."
          : "Не удалось синхронизировать Health API. Проверьте настройки Huawei.";
      setStatus("error", text);
      setMessage(text);
    } finally {
      setBusy(false);
    }
  }, [applyHuaweiMetrics, persistProfile, setStatus]);

  useEffect(() => {
    void hydrateSupabaseProfile();

    const params = new URLSearchParams(window.location.search);
    const authError = errorMessage(params.get("authError"));
    const healthError = errorMessage(params.get("healthError"));

    if (authError || healthError) {
      const text = authError ?? healthError;
      window.setTimeout(() => {
        setStatus("error", text);
        setMessage(text);
      }, 0);
      return;
    }

    if (autoFlowStarted.current) return;

    if (params.get("healthConnected") === "1") {
      autoFlowStarted.current = true;
      window.setTimeout(() => void syncHuaweiMetrics(), 0);
      return;
    }

    if (params.get("authConnected") === "1") {
      autoFlowStarted.current = true;
      window.setTimeout(() => void finalizeSupabaseProfile(), 0);
    }
  }, [
    finalizeSupabaseProfile,
    hydrateSupabaseProfile,
    setStatus,
    syncHuaweiMetrics,
  ]);

  const startSynchronization = async () => {
    setBusy(true);
    setStatus("syncing");
    setMessage("Проверяем защищённую сессию...");

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      const text =
        "Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и publishable key.";
      setBusy(false);
      setStatus("error", text);
      setMessage(text);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await finalizeSupabaseProfile();
      return;
    }

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", "/?authConnected=1");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
      },
    });

    if (error) {
      setBusy(false);
      setStatus("error", error.message);
      setMessage("Google OAuth не запустился. Проверьте настройки Supabase.");
    }
  };

  const metricSummary = [
    ["ВЕС", profile.weightKg, "кг"],
    ["РОСТ", profile.heightCm, "см"],
    ["ВОЗРАСТ", profile.age, ""],
    ["ПУЛЬС ПОКОЯ", profile.restingHeartRateBpm, "уд/мин"],
    ["ЖИР", profile.bodyFatPercentage, "%"],
  ] as const;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.12),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(0,212,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.06)_1px,transparent_1px)] [background-size:38px_38px]" />

      <motion.div
        className="pointer-events-none absolute inset-x-0 h-px bg-cyan-300/50 shadow-[0_0_18px_rgba(34,211,238,0.8)]"
        animate={{ top: ["8%", "92%", "8%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center px-6 py-10">
        <motion.div
          className="relative mb-10 grid h-36 w-36 place-items-center rounded-full border border-cyan-300/35 bg-cyan-300/[0.03] shadow-[0_0_70px_rgba(0,212,255,0.22)]"
          animate={{
            scale: [1, 1.045, 1],
            boxShadow: [
              "0 0 45px rgba(0,212,255,0.16)",
              "0 0 85px rgba(0,212,255,0.35)",
              "0 0 45px rgba(0,212,255,0.16)",
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-3 rounded-full border border-dashed border-cyan-100/20" />
          <div className="text-center">
            <p className="text-4xl font-black tracking-[0.18em] text-cyan-200">
              A
            </p>
            <p className="mt-1 font-mono text-[9px] tracking-[0.32em] text-cyan-300/70">
              ATLANT
            </p>
          </div>
        </motion.div>

        <div className="w-full max-w-2xl text-center">
          <p className="font-mono text-[10px] tracking-[0.38em] text-cyan-300/60">
            BIOMECHANICS OPERATING SYSTEM
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            Инициализация ядра
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-zinc-400">
            Защищённое подключение профиля и персональных показателей здоровья.
          </p>
        </div>

        <div className="mt-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-cyan-300/15 bg-zinc-950/80 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-rose-400/70" />
            <span className="h-2 w-2 rounded-full bg-amber-300/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-300/70" />
            <span className="ml-2 font-mono text-[9px] tracking-[0.2em] text-zinc-600">
              ATLANT://BOOT
            </span>
          </div>
          <div
            className="min-h-36 space-y-2 px-4 py-4 font-mono text-[10px] leading-5 text-cyan-200/75 sm:text-xs"
            aria-live="polite"
          >
            {BOOT_LINES.slice(0, visibleLines).map((line, index) => (
              <motion.p
                key={line}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <span className="mr-2 text-cyan-400/40">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {line}
              </motion.p>
            ))}
            <span className="inline-block h-4 w-1.5 animate-pulse bg-cyan-300/80 align-middle" />
          </div>
        </div>

        {status === "synced" ? (
          <div className="mt-5 grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-5">
            {metricSummary.map(([label, value, unit]) => (
              <div
                key={label}
                className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] px-3 py-3 text-center"
              >
                <p className="font-mono text-[8px] tracking-wider text-zinc-500">
                  {label}
                </p>
                <p className="mt-1 text-sm text-emerald-200">
                  {value ?? "—"} {value != null ? unit : ""}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-7 flex min-h-20 w-full max-w-lg flex-col items-center">
          {ready ? (
            status === "authenticated" || status === "synced" ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <Link
                  href="/scan"
                  className="block w-full rounded-2xl border border-cyan-200/50 bg-cyan-300 px-6 py-4 text-center text-sm font-bold tracking-[0.08em] text-black shadow-[0_0_35px_rgba(34,211,238,0.28)] transition hover:bg-cyan-200"
                >
                  НАЧАТЬ БИО-СКАНИРОВАНИЕ
                </Link>
              </motion.div>
            ) : (
              <motion.button
                type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => void startSynchronization()}
              disabled={busy}
              className="w-full rounded-2xl border border-cyan-200/50 bg-cyan-300 px-6 py-4 text-sm font-bold tracking-[0.08em] text-black shadow-[0_0_35px_rgba(34,211,238,0.28)] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? "СИНХРОНИЗАЦИЯ..."
                : "СИНХРОНИЗИРОВАТЬ ДАННЫЕ ЗДОРОВЬЯ"}
              </motion.button>
            )
          ) : (
            <p className="font-mono text-xs tracking-[0.2em] text-zinc-600">
              WAITING FOR CORE...
            </p>
          )}

          {message ? (
            <p
              className={`mt-3 text-center text-xs ${
                status === "error" ? "text-rose-300" : "text-zinc-400"
              }`}
              role={status === "error" ? "alert" : "status"}
            >
              {message}
            </p>
          ) : null}
          {syncedAt ? (
            <p className="mt-2 font-mono text-[9px] text-zinc-600">
              LAST SYNC: {new Date(syncedAt).toLocaleString("ru-RU")}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
