let speaking = false;
let voiceMuted = false;

export function setVoiceMuted(muted: boolean): void {
  voiceMuted = muted;
}

export function isVoiceMuted(): boolean {
  return voiceMuted;
}

export function speak(
  text: string,
  opts?: { rate?: number; pitch?: number; volume?: number; onEnd?: () => void }
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    opts?.onEnd?.();
    return;
  }
  if (voiceMuted) {
    opts?.onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ru-RU";
  utter.rate = opts?.rate ?? 0.95;
  utter.pitch = opts?.pitch ?? 1;
  utter.volume = opts?.volume ?? 1;
  utter.onend = () => {
    speaking = false;
    opts?.onEnd?.();
  };
  utter.onerror = () => {
    speaking = false;
    opts?.onEnd?.();
  };
  speaking = true;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined") {
    window.speechSynthesis.cancel();
    speaking = false;
  }
}

export function isSpeaking(): boolean {
  return speaking;
}

const COACH_OPENERS = [
  "Слушайте внимательно.",
  "Отлично, продолжаем.",
  "Хорошо, идём дальше.",
  "Супер, вы на правильном пути.",
  "Класс, держим темп.",
];

export function coachSpeak(
  text: string,
  opts?: { emphasis?: boolean; onEnd?: () => void }
): void {
  const opener =
    Math.random() > 0.55
      ? COACH_OPENERS[Math.floor(Math.random() * COACH_OPENERS.length)] + " "
      : "";
  const rate = opts?.emphasis ? 0.88 : 0.9 + Math.random() * 0.1;
  const pitch = opts?.emphasis ? 1.08 : 1.02 + Math.random() * 0.14;
  speak(`${opener}${text}`, { rate, pitch, volume: 0.95, onEnd: opts?.onEnd });
}
