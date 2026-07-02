"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useAppStore } from "@/store/useAppStore";
import type { FitnessGoal } from "@/types";

const GOALS: { id: FitnessGoal; label: string }[] = [
  { id: "lose_weight", label: "Похудение" },
  { id: "gain_muscle", label: "Набор мышц" },
  { id: "maintain", label: "Поддержание формы" },
  { id: "performance", label: "Спортивный результат" },
];

export default function RegistrationScreen() {
  const existing = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const setPhase = useAppStore((s) => s.setPhase);
  const [height, setHeight] = useState(String(existing?.height ?? 175));
  const [weight, setWeight] = useState(String(existing?.weight ?? 75));
  const [age, setAge] = useState(String(existing?.age ?? 28));
  const [goal, setGoal] = useState<FitnessGoal>(existing?.goal ?? "maintain");
  const [injuries, setInjuries] = useState(existing?.injuries ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile({
      height: Number(height),
      weight: Number(weight),
      age: Number(age),
      goal,
      injuries: injuries.trim(),
    });
    setPhase("dashboard");
  };

  return (
    <motion.div
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <h2 className="mb-2 text-2xl font-bold">
        {existing ? "Редактирование профиля" : "Добро пожаловать"}
      </h2>
      <p className="mb-8 text-sm text-muted">
        Введите данные для персонализации биомеханики
      </p>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Рост (см)
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="mt-1"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Вес (кг)
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Возраст
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="mt-1"
              required
            />
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Цель</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoal(g.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                    goal === g.id
                      ? "border-primary bg-sky-50 text-primary"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm font-medium text-slate-700">
            Травмы / ограничения (необязательно)
            <textarea
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              className="mt-1 min-h-[72px] w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-sky-100"
              placeholder="Например: больное колено, проблемы со спиной"
            />
          </label>

          <Button type="submit" size="lg" className="mt-4">
            Продолжить
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}
