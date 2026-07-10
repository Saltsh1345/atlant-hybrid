"use client";

import Button from "@/components/ui/Button";
import { speakLongText } from "@/lib/ai/speech";

export type PhoneScanMode = "selfie" | "tripod";

interface PhoneScanPreflightProps {
  onSelect: (mode: PhoneScanMode) => void;
  onCancel: () => void;
}

export default function PhoneScanPreflight({
  onSelect,
  onCancel,
}: PhoneScanPreflightProps) {
  const explain = (mode: PhoneScanMode) => {
    const text =
      mode === "selfie"
        ? "Режим селфи. Передняя камера, вы видите экран. Держите телефон на уровне груди, отойдите на полтора метра."
        : "Режим подставки. Сначала поставьте телефон, потом отойдите на 2 метра. Экран не виден — все шаги озвучиваются голосом. Громкость включите.";
    speakLongText(text);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-slate-950/95 px-5 pb-8 pt-16">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
        Биоскан · телефон
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">
        Как будете сканировать?
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Задняя камера даёт лучший силуэт, но экран не видно. Выберите режим —
        дальше будут чёткие инструкции.
      </p>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => {
            explain("selfie");
            onSelect("selfie");
          }}
          className="w-full rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-4 text-left active:scale-[0.99]"
        >
          <p className="font-semibold text-cyan-100">Селфи · вижу экран</p>
          <p className="mt-1 text-xs text-cyan-200/80">
            Передняя камера, 1–1.5 м. Подсказки на экране + голос. Проще
            первый раз.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            explain("tripod");
            onSelect("tripod");
          }}
          className="w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left active:scale-[0.99]"
        >
          <p className="font-semibold text-amber-100">Подставка · задняя камера</p>
          <p className="mt-1 text-xs text-amber-200/80">
            Телефон на уровне груди, отход 2 м. Только голос и звуковые сигналы.
            Нужна подставка или стопка книг.
          </p>
        </button>
      </div>

      <Button size="lg" variant="ghost" className="mt-4" onClick={onCancel}>
        Назад
      </Button>
    </div>
  );
}
