import { ReactNode } from "react";

export default function Card({
  children,
  className = "",
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <div
      className={`atlant-card p-5 ${elevated ? "shadow-[var(--shadow-lg)]" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
