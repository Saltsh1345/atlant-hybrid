"use client";

import Link from "next/link";

export interface StartWorkoutButtonProps {
  hasPlan: boolean;
}

const BASE_CLASS =
  "block w-full rounded-2xl border px-6 py-4 text-center text-sm font-bold tracking-[0.12em] transition";

/**
 * Ведёт в live-режим `/workout`. Пока на выбранный день нет плана,
 * кнопка остаётся неактивной.
 */
export default function StartWorkoutButton({ hasPlan }: StartWorkoutButtonProps) {
  if (!hasPlan) {
    return (
      <button
        type="button"
        disabled
        title="Сначала сгенерируйте план на этот день"
        className={`${BASE_CLASS} cursor-not-allowed border-white/10 text-zinc-600`}
      >
        [ START WORKOUT ]
      </button>
    );
  }

  return (
    <Link
      href="/workout"
      className={`${BASE_CLASS} border-cyan-200/50 bg-cyan-300 text-black shadow-[0_0_35px_rgba(34,211,238,0.28)] hover:bg-cyan-200`}
    >
      [ START WORKOUT ]
    </Link>
  );
}
