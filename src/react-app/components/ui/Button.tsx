import { Button as BaseButton } from "@base-ui/react/button";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variantClasses = {
  primary:
    "bg-gradient-to-r from-green-400 to-green-600 text-white hover:from-green-500 hover:to-green-700",
  secondary:
    "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600",
  ghost: "bg-transparent text-gray-300 hover:text-white hover:bg-gray-700/30",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-base",
  lg: "px-6 py-3 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <BaseButton
        ref={ref}
        className={`rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </BaseButton>
    );
  }
);

Button.displayName = "Button";