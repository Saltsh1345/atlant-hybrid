import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium transition-all rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary text-white shadow-lg shadow-sky-200 hover:bg-sky-600",
    secondary:
      "bg-white text-foreground border border-slate-200 hover:bg-slate-50",
    ghost: "bg-transparent text-primary hover:bg-sky-50",
  };
  const sizes = {
    md: "px-5 py-3 text-sm",
    lg: "px-8 py-4 text-base w-full",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
