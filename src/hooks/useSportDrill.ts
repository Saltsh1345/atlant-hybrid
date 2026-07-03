"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DrillCommand, DrillPhase } from "@/lib/training/drillProtocol";
import { speakScript } from "@/lib/ai/speech";
import {
  addDrillFixation,
  resetDrillFixations,
} from "@/lib/training/drillResults";

export interface DrillHitPayload {
  speedMs: number;
  accuracy: number;
  elbowAngle: number;
}

interface SportDrillController {
  phase: DrillPhase;
  command: DrillCommand | null;
  commandIndex: number;
  totalCommands: number;
  countdown: number;
  activeSecLeft: number;
  fixationText: string;
  isTracking: boolean;
  started: boolean;
  fixedCount: number;
  reportHit: (payload: DrillHitPayload) => void;
  start: () => void;
}

export function useSportDrill(commands: DrillCommand[]): SportDrillController {
  const [phase, setPhase] = useState<DrillPhase>("idle");
  const [started, setStarted] = useState(false);
  const [commandIndex, setCommandIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [activeSecLeft, setActiveSecLeft] = useState(0);
  const [fixationText, setFixationText] = useState("");
  const [fixedCount, setFixedCount] = useState(0);

  const phaseRef = useRef<DrillPhase>("idle");
  const hitRoundRef = useRef(false);
  const spokenRef = useRef("");
  const command = commands[commandIndex] ?? null;

  const sayOnce = (key: string, text: string, emphasis = false) => {
    if (spokenRef.current === key) return;
    spokenRef.current = key;
    speakScript(key, text, { emphasis });
  };

  const setPhaseSafe = useCallback((p: DrillPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    resetDrillFixations();
    setStarted(true);
    setCommandIndex(0);
    setFixedCount(0);
    setFixationText("");
    setCountdown(3);
    setPhaseSafe("instruction");
  }, [setPhaseSafe]);

  const reportHit = useCallback(
    (payload: DrillHitPayload) => {
      if (phaseRef.current !== "active" || hitRoundRef.current || !command)
        return;
      hitRoundRef.current = true;

      const accuracy = payload.accuracy;
      const speed = payload.speedMs;
      const ok = speed >= 1.5 && accuracy >= 45;

      addDrillFixation({
        commandId: command.id,
        commandText: command.text,
        type: command.type,
        speedMs: speed,
        accuracy,
        elbowAngle: payload.elbowAngle,
        fixed: ok,
      });

      setFixedCount((c) => c + (ok ? 1 : 0));
      const msg = ok
        ? `Скорость ${speed} м/с · точность ${accuracy}%`
        : `Слабый удар ${speed} м/с — точность ${accuracy}%`;
      setFixationText(msg);
      setPhaseSafe("fixation");
      sayOnce(
        `drill:${command.id}:hit`,
        ok
          ? `Удар зафиксирован. ${speed} метров в секунду. Точность ${accuracy} процентов.`
          : `Удар слабый. Скорость ${speed}. Разверните корпус и выпрямите локоть.`
      );
    },
    [command, setPhaseSafe]
  );

  useEffect(() => {
    if (!started || !command) return;

    if (phase === "instruction") {
      sayOnce(`drill:${commandIndex}:instruction`, command.voice, true);
      const t = window.setTimeout(() => {
        setCountdown(3);
        setPhaseSafe("countdown");
      }, 1800);
      return () => window.clearTimeout(t);
    }

    if (phase === "countdown") {
      if (countdown <= 0) {
        hitRoundRef.current = false;
        setActiveSecLeft(command.activeSec);
        setPhaseSafe("active");
        sayOnce(`drill:${commandIndex}:go`, "Бейте!");
        return;
      }
      sayOnce(`drill:${commandIndex}:count:${countdown}`, String(countdown));
      const t = window.setTimeout(() => setCountdown((c) => c - 1), 900);
      return () => window.clearTimeout(t);
    }

    if (phase === "active") {
      const tick = window.setInterval(() => {
        setActiveSecLeft((s) => {
          if (s <= 1) {
            window.clearInterval(tick);
            if (!hitRoundRef.current) {
              addDrillFixation({
                commandId: command.id,
                commandText: command.text,
                type: command.type,
                speedMs: 0,
                accuracy: 0,
                elbowAngle: 0,
                fixed: false,
              });
              setFixationText("Удар не зафиксирован — повторите в следующей серии");
              setPhaseSafe("rest");
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      return () => window.clearInterval(tick);
    }

    if (phase === "fixation") {
      const t = window.setTimeout(() => setPhaseSafe("rest"), 2200);
      return () => window.clearTimeout(t);
    }

    if (phase === "rest") {
      const t = window.setTimeout(() => {
        if (commandIndex + 1 >= commands.length) {
          setPhaseSafe("complete");
          sayOnce(
            "drill:complete",
            "Серия завершена. Нажмите «Анализ» для отчёта и плана тренировки."
          );
          return;
        }
        setCommandIndex((i) => i + 1);
        setCountdown(3);
        setFixationText("");
        setPhaseSafe("instruction");
      }, command.restSec * 1000);
      return () => window.clearTimeout(t);
    }
  }, [
    started,
    phase,
    countdown,
    command,
    commandIndex,
    commands.length,
    setPhaseSafe,
  ]);

  return {
    phase,
    command,
    commandIndex,
    totalCommands: commands.length,
    countdown,
    activeSecLeft,
    fixationText,
    isTracking: phase === "active",
    started,
    fixedCount,
    reportHit,
    start,
  };
}
