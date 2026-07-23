"use client";

import { useId } from "react";

/**
 * Голографический bio-scan HUD для `/scan`.
 * Wireframe + targeting brackets + sweep beam (Tron / Ghost in the Shell / Prometheus).
 */
export default function ScanSilhouetteGuide({
  view,
  progress,
  fit,
  visible,
}: {
  view: "front" | "side";
  progress: number;
  fit: boolean;
  visible: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  if (!visible) return null;

  const primary = fit ? "#34d399" : "#22d3ee";
  const accent = fit ? "#6ee7b7" : "#a855f7";
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const lockLabel = fit ? "BIO-LOCK" : "ACQUIRING";
  const isSide = view === "side";
  const spineX = isSide ? 106 : 100;

  return (
    <div className="pointer-events-none absolute inset-0 z-[20] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 62% 88% at 50% 46%, transparent 0%, rgba(0,0,0,0.45) 68%, rgba(0,0,0,0.92) 100%)",
        }}
      />
      <div className="scan-grid-soft absolute inset-0 opacity-[0.28]" />

      <svg
        className="absolute inset-x-0 bottom-0 h-[42%] w-full opacity-50"
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primary} stopOpacity="0.55" />
            <stop offset="100%" stopColor={primary} stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 11 }).map((_, i) => {
          const x = 24 + i * 36;
          return (
            <line
              key={`v-${i}`}
              x1={x}
              y1={120}
              x2={200}
              y2={0}
              stroke={`url(#${uid}-floor)`}
              strokeWidth="0.7"
            />
          );
        })}
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={10}
            y1={104 - i * 12}
            x2={390}
            y2={104 - i * 12}
            stroke={primary}
            strokeOpacity={0.12 + i * 0.035}
            strokeWidth="0.55"
          />
        ))}
      </svg>

      <HudCorners primary={primary} accent={accent} fit={fit} />

      <aside className="absolute left-2 top-1/2 z-10 hidden w-[5rem] -translate-y-1/2 font-mono text-[0.58rem] leading-relaxed tracking-wider text-cyan-200/75 sm:left-4 sm:block">
        <p className="text-[0.52rem] text-purple-300/90">ATLANT-SCAN</p>
        <p className="mt-2 text-cyan-300">{isSide ? "AX-02 LATERAL" : "AX-01 FRONTAL"}</p>
        <p className="mt-1 text-white/45">POSE {pct}%</p>
        <div className="mt-3 h-20 w-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="w-full rounded-full transition-[height] duration-200"
            style={{
              height: `${pct}%`,
              background: `linear-gradient(to top, ${primary}, ${accent})`,
              boxShadow: `0 0 10px ${primary}`,
            }}
          />
        </div>
        <p className="mt-3 animate-pulse text-[0.5rem] text-emerald-300/85">
          {fit ? "▮ SYNC OK" : "◌ CALIBRATING"}
        </p>
        {isSide && (
          <p className="mt-2 text-[0.48rem] text-purple-300/70">SAGITTAL PLANE</p>
        )}
      </aside>

      <aside className="absolute right-2 top-1/2 z-10 hidden w-[5rem] -translate-y-1/2 text-right font-mono text-[0.58rem] leading-relaxed tracking-wider text-cyan-200/75 sm:right-4 sm:block">
        <p className="text-purple-300/90">MEDIAPIPE</p>
        <p className="mt-2 text-white/55">33 NODE</p>
        <p className="mt-1 text-white/55">MESH ACTIVE</p>
        <p className="mt-4 text-[0.5rem] text-cyan-400/70">
          {isSide ? "YAW ≈ 90°" : "YAW ≈ 0°"}
        </p>
        <p className="mt-1 text-[0.5rem] text-cyan-400/70">
          {isSide ? "DEPTH L→R" : "DEPTH MAP"}
        </p>
      </aside>

      <div className="absolute inset-0 flex items-center justify-center px-1">
        <div
          className={`relative h-[94%] max-h-[940px] w-[min(92vw,480px)] rounded-[2.75rem] ${
            fit ? "scan-holo-frame scan-holo-frame--locked" : "scan-holo-frame"
          }`}
        >
          <div className="scan-holo-shimmer" />

          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 200 400"
            aria-hidden
          >
            <defs>
              <linearGradient id={`${uid}-wire`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={primary} />
                <stop offset="45%" stopColor={accent} stopOpacity="0.95" />
                <stop offset="100%" stopColor={primary} stopOpacity="0.65" />
              </linearGradient>
              <radialGradient id={`${uid}-core`} cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor={primary} stopOpacity="0.14" />
                <stop offset="100%" stopColor={primary} stopOpacity="0" />
              </radialGradient>
              <filter id={`${uid}-glow`}>
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Inner holo fill */}
            <rect
              x="8"
              y="8"
              width="184"
              height="384"
              rx="22"
              fill={`url(#${uid}-core)`}
            />

            {/* Main capture frame — enlarged */}
            <rect
              x="10"
              y="14"
              width="180"
              height="372"
              rx="20"
              fill="none"
              stroke={primary}
              strokeOpacity="0.35"
              strokeWidth="1.2"
            />
            <rect
              x="14"
              y="18"
              width="172"
              height="364"
              rx="18"
              fill="none"
              stroke={accent}
              strokeOpacity="0.22"
              strokeWidth="0.8"
              strokeDasharray="6 8"
            />

            {/* Frame notches */}
            {[0, 1, 2, 3].map((i) => {
              const positions = [
                { x1: 96, y1: 10, x2: 104, y2: 10 },
                { x1: 96, y1: 390, x2: 104, y2: 390 },
                { x1: 10, y1: 196, x2: 10, y2: 204 },
                { x1: 190, y1: 196, x2: 190, y2: 204 },
              ][i];
              return (
                <line
                  key={i}
                  {...positions}
                  stroke={primary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              );
            })}

            {/* Target ellipse — wider for front, narrower for profile */}
            <ellipse
              cx="100"
              cy="200"
              rx={isSide ? 72 : 92}
              ry={182}
              fill="none"
              stroke={primary}
              strokeOpacity="0.28"
              strokeWidth="1.1"
              strokeDasharray="5 7"
            />

            {/* Counter-rotating rings */}
            <g
              className={fit ? "animate-[spin_7s_linear_infinite]" : "animate-[spin_12s_linear_infinite]"}
              style={{ transformOrigin: "100px 200px" }}
            >
              <path
                d={`M 100 18 A ${isSide ? 62 : 82} 178 0 0 1 178 200`}
                fill="none"
                stroke={accent}
                strokeOpacity="0.5"
                strokeWidth="1.4"
              />
              <path
                d={`M 100 382 A ${isSide ? 62 : 82} 178 0 0 1 22 200`}
                fill="none"
                stroke={primary}
                strokeOpacity="0.4"
                strokeWidth="1.4"
              />
            </g>
            <g
              className={fit ? "animate-[spin_10s_linear_infinite_reverse]" : "animate-[spin_18s_linear_infinite_reverse]"}
              style={{ transformOrigin: "100px 200px" }}
            >
              <ellipse
                cx="100"
                cy="200"
                rx={isSide ? 58 : 76}
                ry="156"
                fill="none"
                stroke={accent}
                strokeOpacity="0.25"
                strokeWidth="0.9"
                strokeDasharray="3 9"
              />
            </g>

            <CrossSectionTicks primary={primary} isSide={isSide} />

            <g
              filter={`url(#${uid}-glow)`}
              fill="none"
              stroke={`url(#${uid}-wire)`}
              strokeWidth={fit ? 2 : 1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={fit ? 1 : 0.9}
            >
              {isSide ? <SideWireframe fit={fit} /> : <FrontWireframe fit={fit} />}
            </g>

            <g fill={primary} opacity={fit ? 0.98 : 0.7}>
              {(isSide ? SIDE_NODES : FRONT_NODES).map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={fit ? 2.6 : 1.9}>
                  <animate
                    attributeName="r"
                    values={fit ? "2.2;3;2.2" : "1.6;2.2;1.6"}
                    dur="2.2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.45;1;0.45"
                    dur="2.2s"
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </g>

            <line
              x1={spineX}
              y1="68"
              x2={spineX}
              y2="348"
              stroke={primary}
              strokeOpacity="0.28"
              strokeWidth="1"
              strokeDasharray="3 5"
            />

            <clipPath id={`${uid}-clip`}>
              <rect x="0" y={400 - progress * 368 - 16} width="200" height="400" />
            </clipPath>
            <g clipPath={`url(#${uid}-clip)`} opacity="0.42">
              <rect x="10" y="14" width="180" height="372" fill={primary} fillOpacity="0.07" />
              {Array.from({ length: 14 }).map((_, i) => (
                <line
                  key={i}
                  x1="14"
                  y1={28 + i * 26}
                  x2="186"
                  y2={28 + i * 26}
                  stroke={primary}
                  strokeWidth="0.55"
                  strokeOpacity="0.45"
                />
              ))}
            </g>

            <HoloParticles primary={primary} accent={accent} seed={isSide ? 2 : 1} />

            <g transform="translate(100 22)">
              <rect
                x="-44"
                y="-11"
                width="88"
                height="20"
                rx="2"
                fill="rgba(0,0,0,0.62)"
                stroke={primary}
                strokeWidth="0.9"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fill={primary}
                fontSize="7.5"
                fontFamily="ui-monospace, monospace"
                letterSpacing="0.14em"
              >
                {lockLabel} {pct}%
              </text>
            </g>

            {isSide && (
              <g transform="translate(100 378)">
                <rect
                  x="-52"
                  y="-9"
                  width="104"
                  height="16"
                  rx="2"
                  fill="rgba(0,0,0,0.55)"
                  stroke={accent}
                  strokeWidth="0.7"
                  strokeOpacity="0.8"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill={accent}
                  fontSize="6.5"
                  fontFamily="ui-monospace, monospace"
                  letterSpacing="0.1em"
                >
                  LATERAL MESH · SAGITTAL
                </text>
              </g>
            )}
          </svg>

          <div className="scan-sweep-wrap absolute inset-0 rounded-[2.75rem] opacity-95">
            <div
              className="scan-sweep"
              style={{
                animationDuration: fit ? "1.9s" : "2.8s",
                opacity: fit ? 0.92 : 0.72,
              }}
            />
          </div>
          <div
            className="scan-sweep-wrap absolute inset-0 rounded-[2.75rem] opacity-35"
            style={{ transform: "scaleY(-1)" }}
          >
            <div
              className="scan-sweep"
              style={{
                animationDuration: fit ? "3.6s" : "5.2s",
                opacity: 0.45,
              }}
            />
          </div>
        </div>
      </div>

      <p className="absolute inset-x-0 bottom-[6%] text-center font-mono text-[0.68rem] tracking-[0.22em] text-cyan-100/95">
        {fit ? (
          <span className="text-emerald-300">◆ HOLO-LOCK · НЕ ДВИГАЙТЕСЬ</span>
        ) : isSide ? (
          "▷ ПРОФИЛЬ · ПОЛНЫЙ РОСТ · БОКОМ К КАМЕРЕ"
        ) : (
          "▷ ФРОНТ · A-POSE · ВСТАНЬТЕ В ГОЛОГРАММУ"
        )}
      </p>
    </div>
  );
}

function HudCorners({
  primary,
  accent,
  fit,
}: {
  primary: string;
  accent: string;
  fit: boolean;
}) {
  const len = 36;
  const inset = "2.5%";
  const corners = [
    { top: inset, left: inset, rotate: 0 },
    { top: inset, right: inset, rotate: 90 },
    { bottom: inset, right: inset, rotate: 180 },
    { bottom: inset, left: inset, rotate: 270 },
  ] as const;

  return (
    <>
      {corners.map((c, i) => (
        <svg
          key={i}
          className="absolute h-16 w-16 transition-opacity duration-300 sm:h-[4.5rem] sm:w-[4.5rem]"
          style={{
            top: "top" in c ? c.top : undefined,
            left: "left" in c ? c.left : undefined,
            right: "right" in c ? c.right : undefined,
            bottom: "bottom" in c ? c.bottom : undefined,
            transform: `rotate(${c.rotate}deg)`,
            opacity: fit ? 1 : 0.82,
            filter: fit
              ? `drop-shadow(0 0 6px ${primary})`
              : `drop-shadow(0 0 4px ${accent})`,
          }}
          viewBox="0 0 48 48"
          aria-hidden
        >
          <path
            d={`M4 4 H${len} M4 4 V${len}`}
            fill="none"
            stroke={primary}
            strokeWidth="2.5"
            strokeLinecap="square"
          />
          <path
            d={`M8 8 H${len - 4} M8 8 V${len - 4}`}
            fill="none"
            stroke={accent}
            strokeOpacity="0.45"
            strokeWidth="1"
          />
          <circle cx="4" cy="4" r="2.5" fill={primary} />
        </svg>
      ))}
    </>
  );
}

function CrossSectionTicks({
  primary,
  isSide,
}: {
  primary: string;
  isSide: boolean;
}) {
  const ys = [96, 118, 140, 162, 184, 206, 228, 250, 272, 294];
  return (
    <>
      {ys.map((y) => (
        <g key={y} opacity="0.38">
          <line
            x1={isSide ? 72 : 18}
            y1={y}
            x2={isSide ? 132 : 182}
            y2={y}
            stroke={primary}
            strokeWidth="0.45"
            strokeDasharray="2 5"
          />
          <text
            x={isSide ? 134 : 184}
            y={y + 2}
            fill={primary}
            fontSize="4"
            fontFamily="ui-monospace, monospace"
            opacity="0.55"
          >
            {Math.round((y - 96) / 2.2)}
          </text>
        </g>
      ))}
    </>
  );
}

function HoloParticles({
  primary,
  accent,
  seed,
}: {
  primary: string;
  accent: string;
  seed: number;
}) {
  const pts = Array.from({ length: 24 }).map((_, i) => ({
    cx: 20 + ((i * 17 * seed) % 160),
    cy: 30 + ((i * 23 * seed) % 340),
    r: 0.6 + (i % 3) * 0.35,
    fill: i % 2 === 0 ? primary : accent,
    op: 0.25 + (i % 5) * 0.08,
  }));
  return (
    <g opacity="0.75">
      {pts.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.fill} opacity={p.op}>
          <animate
            attributeName="opacity"
            values={`${p.op * 0.4};${p.op};${p.op * 0.4}`}
            dur={`${2 + (i % 4)}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </g>
  );
}

function FrontWireframe({ fit }: { fit: boolean }) {
  const dash = fit ? undefined : "4 6";
  return (
    <>
      <ellipse cx="100" cy="52" rx="15" ry="17" strokeDasharray={dash} />
      <line x1="100" y1="69" x2="100" y2="84" strokeDasharray={dash} />
      <line x1="54" y1="90" x2="146" y2="90" strokeDasharray={dash} />
      <path d="M 64 90 L 58 172 L 142 172 L 136 90" strokeDasharray={dash} />
      <line x1="58" y1="172" x2="142" y2="172" strokeDasharray={dash} />
      <path d="M 54 90 L 32 122 L 26 154" strokeDasharray={dash} />
      <path d="M 146 90 L 168 122 L 174 154" strokeDasharray={dash} />
      <path d="M 70 172 L 66 252 L 62 336" strokeDasharray={dash} />
      <path d="M 130 172 L 134 252 L 138 336" strokeDasharray={dash} />
      <line x1="62" y1="336" x2="82" y2="342" strokeDasharray={dash} />
      <line x1="138" y1="336" x2="118" y2="342" strokeDasharray={dash} />
      {[112, 124, 136, 148, 160].map((y) => (
        <line key={y} x1="68" y1={y} x2="132" y2={y} strokeOpacity="0.4" strokeDasharray="2 4" />
      ))}
    </>
  );
}

/** Side profile — та же высота/детализация, что и фронт. */
function SideWireframe({ fit }: { fit: boolean }) {
  const dash = fit ? undefined : "4 6";
  return (
    <>
      {/* Head profile */}
      <path
        d="M 112 46 C 128 44 134 56 132 70 C 130 82 118 88 106 84 C 98 78 96 62 104 52 C 106 48 109 46 112 46 Z"
        strokeDasharray={dash}
      />
      {/* Face plane */}
      <path d="M 112 56 L 118 68 L 116 78" strokeOpacity="0.55" strokeDasharray={dash} />
      {/* Neck */}
      <path d="M 106 84 L 104 96" strokeDasharray={dash} />
      {/* Shoulder + upper back */}
      <path d="M 104 96 L 118 102 L 128 108" strokeDasharray={dash} />
      <path d="M 104 96 L 96 104 L 88 118" strokeDasharray={dash} />
      {/* Chest forward / ribcage */}
      <path d="M 104 96 L 122 112 L 124 140 L 118 168" strokeDasharray={dash} />
      <path d="M 104 96 L 98 120 L 96 148 L 98 172" strokeDasharray={dash} />
      {[112, 124, 136, 148, 160].map((y) => (
        <line key={y} x1="94" y1={y} x2="124" y2={y} strokeOpacity="0.42" strokeDasharray="2 4" />
      ))}
      {/* Abdomen + pelvis */}
      <path d="M 118 168 L 114 198 L 110 228" strokeDasharray={dash} />
      <path d="M 98 172 L 94 202 L 92 232" strokeDasharray={dash} />
      <path d="M 92 232 L 108 238 L 118 232" strokeDasharray={dash} />
      {/* Arm along body */}
      <path d="M 118 108 L 124 138 L 122 178 L 118 208" strokeDasharray={dash} />
      <path d="M 122 178 L 128 188" strokeOpacity="0.5" strokeDasharray={dash} />
      {/* Legs profile */}
      <path d="M 110 228 L 104 268 L 98 308 L 94 342" strokeDasharray={dash} />
      <path d="M 110 228 L 118 268 L 124 308 L 128 342" strokeDasharray={dash} />
      {/* Knee markers */}
      <path d="M 98 268 L 124 268" strokeOpacity="0.45" strokeDasharray="2 3" />
      {/* Foot */}
      <path d="M 94 342 L 132 348" strokeDasharray={dash} />
      <path d="M 128 342 L 138 346" strokeOpacity="0.55" strokeDasharray={dash} />
    </>
  );
}

const FRONT_NODES: [number, number][] = [
  [100, 52],
  [100, 84],
  [54, 90],
  [146, 90],
  [26, 154],
  [174, 154],
  [100, 172],
  [62, 336],
  [138, 336],
];

const SIDE_NODES: [number, number][] = [
  [118, 58],
  [106, 84],
  [128, 108],
  [122, 140],
  [118, 168],
  [122, 178],
  [110, 228],
  [104, 268],
  [124, 268],
  [94, 342],
  [128, 342],
];
