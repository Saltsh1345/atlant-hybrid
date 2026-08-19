"use client";

import { useMemo, useState } from "react";
import {
  EXPERIENCE_LABELS,
  GOAL_LABELS,
  HEALTH_CONCERN_LABELS,
  LOCATION_LABELS,
  WEEKS_LABELS,
  type HealthConcernId,
  type ProgramWeeksChoice,
  type TrainingExperienceLevel,
  type TrainingIntakeAnswers,
  type TrainingIntakeRecord,
  type TrainingLocation,
  type TrainingPrimaryGoal,
} from "@/lib/training/intake/types";
import type { BioScanProfile } from "@/lib/training/bioScan/buildBioScanProfile";
import {
  saveTrainingIntake,
  suggestProgramWeeks,
} from "@/lib/training/intake/persistTrainingIntake";

const GOALS = Object.keys(GOAL_LABELS) as TrainingPrimaryGoal[];
const EXPERIENCE = Object.keys(EXPERIENCE_LABELS) as TrainingExperienceLevel[];
const LOCATIONS = Object.keys(LOCATION_LABELS) as TrainingLocation[];
const WEEK_OPTIONS: ProgramWeeksChoice[] = [4, 6, 8, 12, "ai"];
const HEALTH_OPTIONS = Object.keys(HEALTH_CONCERN_LABELS) as HealthConcernId[];

export interface TrainingIntakeWizardProps {
  bioScan?: BioScanProfile | null;
  onComplete: (record: TrainingIntakeRecord) => void;
}

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
        active
          ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-50"
          : "border-white/10 bg-black/20 text-zinc-400 hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

export default function TrainingIntakeWizard({
  bioScan,
  onComplete,
}: TrainingIntakeWizardProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<TrainingIntakeAnswers>({
    primaryGoal: "health",
    experienceLevel: "beginner",
    trainingLocation: "gym",
    daysPerWeek: 3,
    programWeeksChoice: "ai",
    healthConcerns: [],
  });

  const preview = useMemo(
    () => suggestProgramWeeks(answers, bioScan ?? null),
    [answers, bioScan],
  );

  const steps = [
    "Цель",
    "Опыт",
    "Где занимаетесь",
    "Частота",
    "Здоровье",
    "Длина программы",
  ];

  function toggleHealth(id: HealthConcernId) {
    setAnswers((a) => {
      const current = a.healthConcerns ?? [];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      return { ...a, healthConcerns: next };
    });
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const { record, error: saveError } = await saveTrainingIntake(
      answers,
      bioScan ?? null,
    );
    setSaving(false);
    if (saveError || !record) {
      setError(saveError ?? "Не удалось сохранить опросник");
      return;
    }
    onComplete(record);
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-cyan-300/20 bg-[#060b13] p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
      <p className="text-[0.65rem] font-bold tracking-[0.2em] text-cyan-400/80">
        НАСТРОЙКА ПРОГРАММЫ
      </p>
      <h2 className="mt-2 text-lg font-bold text-cyan-50">
        Расскажите о ваших целях
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
        Ответы сохраняются вместе с{" "}
        {bioScan?.scanUsable
          ? "полным анализом биоскана"
          : "биосканом (рекомендуем пройти /scan)"}{" "}
        — пропорции, осанка, состав тела, изгибы.
      </p>

      {bioScan && (
        <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-[0.65rem] leading-relaxed text-cyan-100/90">
          <span className="font-semibold text-cyan-300">Биоверификация: </span>
          {bioScan.summaryRu}
          {bioScan.findings.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-zinc-400">
              {bioScan.findings.slice(0, 4).map((f) => (
                <li key={f.id}>{f.title}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-1">
        {steps.map((label, i) => (
          <div
            key={label}
            className={`h-1 flex-1 rounded-full ${
              i <= step ? "bg-cyan-400" : "bg-white/10"
            }`}
            title={label}
          />
        ))}
      </div>

      <div className="mt-6 min-h-[220px]">
        {step === 0 && (
          <div className="grid gap-2">
            <p className="mb-1 text-xs text-zinc-500">Главная цель</p>
            {GOALS.map((g) => (
              <OptionButton
                key={g}
                active={answers.primaryGoal === g}
                onClick={() => setAnswers((a) => ({ ...a, primaryGoal: g }))}
              >
                {GOAL_LABELS[g]}
              </OptionButton>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-2">
            <p className="mb-1 text-xs text-zinc-500">Опыт силовых тренировок</p>
            {EXPERIENCE.map((e) => (
              <OptionButton
                key={e}
                active={answers.experienceLevel === e}
                onClick={() =>
                  setAnswers((a) => ({ ...a, experienceLevel: e }))
                }
              >
                {EXPERIENCE_LABELS[e]}
              </OptionButton>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-2">
            <p className="mb-1 text-xs text-zinc-500">Где будете заниматься</p>
            {LOCATIONS.map((loc) => (
              <OptionButton
                key={loc}
                active={answers.trainingLocation === loc}
                onClick={() =>
                  setAnswers((a) => ({ ...a, trainingLocation: loc }))
                }
              >
                {LOCATION_LABELS[loc]}
              </OptionButton>
            ))}
            <p className="mt-2 text-[0.65rem] text-zinc-500">
              Дом — упражнения с гантелями и собственным весом. Зал — штанга и
              тренажёры.
            </p>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="mb-3 text-xs text-zinc-500">
              Сколько дней в неделю готовы тренироваться
            </p>
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, daysPerWeek: d }))}
                  className={`h-11 w-11 rounded-xl border text-sm font-bold ${
                    answers.daysPerWeek === d
                      ? "border-cyan-300 bg-cyan-300 text-black"
                      : "border-white/15 text-zinc-400"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-2">
            <p className="mb-1 text-xs text-zinc-500">
              Дискомфорт, травмы или ограничения (можно несколько)
            </p>
            <p className="mb-2 text-[0.65rem] leading-relaxed text-zinc-500">
              Не диагноз — ваши ощущения и зоны, которые нужно учесть в плане.
              Система добавит коррекционные упражнения и безопасные замены.
            </p>
            {HEALTH_OPTIONS.map((id) => (
              <OptionButton
                key={id}
                active={(answers.healthConcerns ?? []).includes(id)}
                onClick={() => toggleHealth(id)}
              >
                {HEALTH_CONCERN_LABELS[id]}
              </OptionButton>
            ))}
            {bioScan?.findings.some((f) => f.severity === "priority") && (
              <p className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-2 text-[0.65rem] text-amber-100">
                По скану уже есть приоритетные находки — они тоже попадут в
                коррекцию, даже если ничего не отметите.
              </p>
            )}
            <label className="mt-2 block text-xs text-zinc-500">
              Подробнее (необязательно)
              <textarea
                value={answers.notes ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, notes: e.target.value }))
                }
                rows={2}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-200"
                placeholder="Например: боль в правом колене при глубоком приседе…"
              />
            </label>
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-2">
            <p className="mb-1 text-xs text-zinc-500">
              Длина программы (мезоцикл)
            </p>
            {WEEK_OPTIONS.map((w) => (
              <OptionButton
                key={String(w)}
                active={answers.programWeeksChoice === w}
                onClick={() =>
                  setAnswers((a) => ({ ...a, programWeeksChoice: w }))
                }
              >
                {w === "ai"
                  ? `Пусть система предложит (сейчас: ${preview.weeks} нед.)`
                  : WEEKS_LABELS[w]}
              </OptionButton>
            ))}
            <p className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3 text-[0.65rem] leading-relaxed text-zinc-400">
              {preview.rationale}
              {bioScan?.scanUsable && " Учтены данные видео-скана."}
              {(answers.healthConcerns?.length ?? 0) > 0 &&
                ` Ограничения клиента: ${answers.healthConcerns!.length}.`}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-xs text-rose-300">
          {error}
          {error.includes("relation") && (
            <>
              {" "}
              Примените миграцию{" "}
              <code className="text-rose-200">
                202607270001_stage_06_training_intelligence.sql
              </code>{" "}
              в Supabase.
            </>
          )}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 rounded-xl border border-white/15 py-3 text-xs font-semibold text-zinc-300"
          >
            НАЗАД
          </button>
        )}
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 rounded-xl border border-cyan-200/50 bg-cyan-300 py-3 text-xs font-bold text-black"
          >
            ДАЛЕЕ
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="flex-1 rounded-xl border border-cyan-200/50 bg-cyan-300 py-3 text-xs font-bold text-black disabled:opacity-50"
          >
            {saving ? "СОХРАНЕНИЕ…" : "СОХРАНИТЬ И ПРОДОЛЖИТЬ"}
          </button>
        )}
      </div>

      <p className="mt-4 text-[0.6rem] leading-relaxed text-zinc-600">
        Вес тела берётся из профиля и биоскана. На тренировке вы будете вводить
        рабочий вес снаряда (штанга, гантели) для каждого подхода — это
        появится на следующем шаге разработки.
      </p>
    </div>
  );
}
