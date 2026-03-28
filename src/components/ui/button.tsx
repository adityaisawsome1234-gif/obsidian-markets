import { cn } from "@/lib/cn";
import { forwardRef } from "react";

type ButtonVariant = "ghost" | "primary" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  ghost:
    "bg-transparent border-[var(--brd2)] text-w3 hover:border-[var(--brd3)] hover:text-w2 hover:bg-s2",
  primary:
    "bg-a2 border-a2 text-white hover:brightness-110",
  outline:
    "bg-transparent border-[var(--brd2)] text-w3 hover:border-[var(--brd3)] hover:text-w2",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "text-[10px] px-2 py-1",
  md: "text-[11px] px-2.5 py-1.5",
  lg: "text-[12px] px-4 py-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ghost", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[var(--rad-sm)] border cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
