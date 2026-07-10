/** Short beeps for scan steps (works when screen not visible). */
export function scanBeep(kind: "tick" | "ok" | "start" = "tick"): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    if (kind === "ok") {
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.25);
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.frequency.value = 1175;
      o2.connect(g2);
      g2.connect(ctx.destination);
      g2.gain.setValueAtTime(0.12, t + 0.12);
      g2.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      o2.start(t + 0.12);
      o2.stop(t + 0.35);
    } else if (kind === "start") {
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    } else {
      osc.frequency.value = 520;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.12);
    }
    osc.onended = () => void ctx.close();
  } catch {
    /* ignore */
  }
}

export async function countdownBeeps(seconds: number): Promise<void> {
  for (let i = seconds; i > 0; i--) {
    scanBeep(i === 1 ? "start" : "tick");
    await new Promise((r) => setTimeout(r, 1000));
  }
}
