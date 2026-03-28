import { cn } from "@/lib/cn";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => (
    <div className="relative">
      {icon && (
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-w5">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] px-2.5 py-1.5 text-[12px] text-w2 placeholder:text-w5 outline-none transition-colors duration-150",
          "focus:border-[var(--brd3)] focus:bg-s3",
          icon && "pl-8",
          className
        )}
        {...props}
      />
    </div>
  )
);
Input.displayName = "Input";
