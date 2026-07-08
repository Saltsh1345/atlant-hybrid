import type { SVGProps } from "react";

export type AppIconName =
  | "home"
  | "dashboard"
  | "train"
  | "body"
  | "settings"
  | "boxing"
  | "tennis"
  | "strength"
  | "rings"
  | "activity"
  | "steps"
  | "load"
  | "pulse"
  | "water"
  | "sleep"
  | "macros"
  | "run"
  | "twin"
  | "readiness"
  | "plan"
  | "monitoring"
  | "body-metrics"
  | "progress"
  | "last-session"
  | "history"
  | "actions"
  | "overview"
  | "workouts"
  | "nutrition"
  | "plus"
  | "user"
  | "bolt"
  | "diamond"
  | "triangle"
  | "square";

function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export default function AppIcon({
  name,
  className = "h-4 w-4",
}: {
  name: AppIconName;
  className?: string;
}) {
  switch (name) {
    case "home":
      return <IconBase className={className}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></IconBase>;
    case "dashboard":
      return <IconBase className={className}><rect x="3" y="3" width="8" height="8" /><rect x="13" y="3" width="8" height="5" /><rect x="13" y="10" width="8" height="11" /><rect x="3" y="13" width="8" height="8" /></IconBase>;
    case "train":
    case "strength":
      return <IconBase className={className}><path d="M3 10h3v4H3zM18 10h3v4h-3zM6 12h12" /><path d="M8 9v6M16 9v6" /></IconBase>;
    case "body":
      return <IconBase className={className}><circle cx="12" cy="5" r="2" /><path d="M12 7v6M9 13l-2 7M15 13l2 7M8 9l-3 3M16 9l3 3" /></IconBase>;
    case "settings":
      return <IconBase className={className}><circle cx="12" cy="12" r="3.2" /><path d="M19 12a7 7 0 0 0-.08-1l2.03-1.58-2-3.46-2.5 1a7 7 0 0 0-1.73-1L14.3 3h-4.6l-.42 2.96a7 7 0 0 0-1.73 1l-2.5-1-2 3.46L5.08 11A7 7 0 0 0 5 12c0 .34.03.67.08 1L3.05 14.58l2 3.46 2.5-1a7 7 0 0 0 1.73 1L9.7 21h4.6l.42-2.96a7 7 0 0 0 1.73-1l2.5 1 2-3.46L18.92 13c.05-.33.08-.66.08-1Z" /></IconBase>;
    case "boxing":
      return <IconBase className={className}><path d="M8 11V7h8v4" /><path d="M6 11h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" /></IconBase>;
    case "tennis":
      return <IconBase className={className}><circle cx="12" cy="12" r="8" /><path d="M6.8 5.8a9 9 0 0 0 10.4 12.4M17.2 5.8A9 9 0 0 1 6.8 18.2" /></IconBase>;
    case "rings":
      return <IconBase className={className}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="5.2" /><circle cx="12" cy="12" r="2.4" /></IconBase>;
    case "activity":
      return <IconBase className={className}><path d="M3 16h4l2-6 4 10 2-5h6" /></IconBase>;
    case "steps":
      return <IconBase className={className}><path d="M8 8a2 2 0 1 0 0 .01M15 15a2 2 0 1 0 0 .01" /><path d="M10 10 14 14M7 15h3M14 8h3" /></IconBase>;
    case "load":
      return <IconBase className={className}><path d="M12 3 5 13h5l-1 8 7-10h-5z" /></IconBase>;
    case "pulse":
      return <IconBase className={className}><path d="M3 12h4l2-4 4 8 2-4h6" /></IconBase>;
    case "water":
      return <IconBase className={className}><path d="M12 3s5 5.2 5 9a5 5 0 1 1-10 0c0-3.8 5-9 5-9Z" /></IconBase>;
    case "sleep":
      return <IconBase className={className}><path d="M15.5 4.5a7 7 0 1 0 4 12.9A8 8 0 0 1 15.5 4.5Z" /></IconBase>;
    case "macros":
      return <IconBase className={className}><path d="M7 5h10M5 10h14M8 15h8M10 20h4" /></IconBase>;
    case "run":
      return <IconBase className={className}><circle cx="16" cy="5" r="2" /><path d="m9 20 3-6 2 2 4-3M8 12l4-3 2 2" /></IconBase>;
    case "twin":
      return <IconBase className={className}><path d="M9 4h6v16H9z" /><path d="M4 8h5M15 8h5M4 16h5M15 16h5" /></IconBase>;
    case "readiness":
      return <IconBase className={className}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.2A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></IconBase>;
    case "plan":
      return <IconBase className={className}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 9h6M9 13h6M9 17h4" /></IconBase>;
    case "monitoring":
      return <IconBase className={className}><path d="M4 18V6M10 18v-8M16 18v-4M22 18V9" /></IconBase>;
    case "body-metrics":
      return <IconBase className={className}><path d="M5 5h14v14H5zM5 12h14M12 5v14" /></IconBase>;
    case "progress":
      return <IconBase className={className}><path d="M4 18h16M6 14l4-4 3 3 5-6" /></IconBase>;
    case "last-session":
      return <IconBase className={className}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></IconBase>;
    case "history":
      return <IconBase className={className}><path d="M4 12a8 8 0 1 0 2.3-5.6" /><path d="M4 4v4h4M12 8v4l2 1" /></IconBase>;
    case "actions":
    case "bolt":
    case "workouts":
      return <IconBase className={className}><path d="m13 3-8 9h6l-1 9 8-10h-6z" /></IconBase>;
    case "overview":
    case "square":
      return <IconBase className={className} fill="currentColor" stroke="none"><rect x="5" y="5" width="14" height="14" rx="2" /></IconBase>;
    case "nutrition":
    case "diamond":
      return <IconBase className={className}><path d="M12 3 19 12l-7 9-7-9z" /></IconBase>;
    case "triangle":
      return <IconBase className={className} fill="currentColor" stroke="none"><path d="M12 4 20 19H4z" /></IconBase>;
    case "plus":
      return <IconBase className={className}><path d="M12 5v14M5 12h14" /></IconBase>;
    case "user":
      return <IconBase className={className}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></IconBase>;
    default:
      return <IconBase className={className}><circle cx="12" cy="12" r="8" /></IconBase>;
  }
}
