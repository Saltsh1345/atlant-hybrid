let speaking = false;
let voiceMuted = false;
let lastGuidanceKey = "";
let lastGuidanceAt = 0;

export function setVoiceMuted(muted: boolean): void {
  voiceMuted = muted;
}

export function isVoiceMuted(): boolean {
  return voiceMuted;
}

export function speakLongText(
  text: string,
  opts?: { rate?: number; onEnd?: () => void }
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    opts?.onEnd?.();
    return;
  }
  if (voiceMuted) {
    opts?.onEnd?.();
    return;
  }

  const chunks = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .filter((s) => s.length > 8)
    .slice(0, 12);

  if (chunks.length === 0) {
    speak(text.slice(0, 500), opts);
    return;
  }

  window.speechSynthesis.cancel();
  let i = 0;
  const next = () => {
    if (i >= chunks.length) {
      speaking = false;
      opts?.onEnd?.();
      return;
    }
    const utter = new SpeechSynthesisUtterance(chunks[i]);
    utter.lang = "ru-RU";
    utter.rate = opts?.rate ?? 0.92;
    utter.onend = () => {
      i += 1;
      next();
    };
    utter.onerror = () => {
      i += 1;
      next();
    };
    speaking = true;
    window.speechSynthesis.speak(utter);
  };
  next();
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

/**
 * Guided voice — one cue per key within cooldown; skips if already speaking.
 * Returns true if speech was started.
 */
export function speakGuidance(
  key: string,
  text: string,
  opts?: {
    cooldownMs?: number;
    force?: boolean;
    onEnd?: () => void;
    rate?: number;
  }
): boolean {
  if (voiceMuted) {
    opts?.onEnd?.();
    return false;
  }
  const cooldown = opts?.cooldownMs ?? 12000;
  const now = Date.now();

  if (!opts?.force) {
    if (isSpeaking()) return false;
    if (key === lastGuidanceKey && now - lastGuidanceAt < cooldown) {
      return false;
    }
  }

  lastGuidanceKey = key;
  lastGuidanceAt = now;
  speak(text, { rate: opts?.rate ?? 0.94, onEnd: opts?.onEnd });
  return true;
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined") {
    window.speechSynthesis.cancel();
    speaking = false;
  }
}

export function isSpeaking(): boolean {
  if (typeof window !== "undefined" && window.speechSynthesis.speaking) {
    return true;
  }
  return speaking;
}

/** Script lines (calibration, drill) — clear speech, no random filler. */
export function speakScript(
  key: string,
  text: string,
  opts?: { emphasis?: boolean; onEnd?: () => void }
): void {
  speakGuidance(key, text, {
    force: true,
    rate: opts?.emphasis ? 0.9 : 0.94,
    onEnd: opts?.onEnd,
  });
}

export function coachSpeak(
  text: string,
  opts?: { emphasis?: boolean; onEnd?: () => void }
): void {
  speakScript(`coach:${text.slice(0, 32)}`, text, opts);
}
