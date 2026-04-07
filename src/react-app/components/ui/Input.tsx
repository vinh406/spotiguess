import { Input as BaseInput } from "@base-ui/react/input";
import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  error?: boolean;
  variant?: "primary" | "blue";
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2",
  lg: "px-4 py-3",
};

const variantClasses = {
  primary: {
    base: "border-gray-600",
    focus: "focus:border-green-500 focus:ring-green-500/20",
  },
  blue: {
    base: "border-gray-600",
    focus: "focus:border-blue-500 focus:ring-blue-500/20",
  },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, variant = "primary", size = "md", className = "", ...props }, ref) => {
    return (
      <BaseInput
        ref={ref}
        className={`w-full bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 focus:outline-none transition-all ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            : `${variantClasses[variant].base} ${variantClasses[variant].focus}`
        } ${sizeClasses[size]} ${className}`}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
