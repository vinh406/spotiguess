import { ReactNode } from "react";
import LoadingSpinner from "./LoadingSpinner";
import { Button } from "../ui";

interface ActionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
  variant?: "primary" | "blue";
  isLoading?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}

export default function ActionCard({
  icon,
  title,
  description,
  buttonText,
  onClick,
  variant = "primary",
  isLoading = false,
  disabled = false,
  children,
}: ActionCardProps) {
  return (
    <div
      className={`bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-700/50 transition-all duration-300 ${variant === "blue" ? "hover:border-blue-500/50" : "hover:border-green-500/50"}`}
    >
      <div
        className={`w-16 h-16 ${
          variant === "blue"
            ? "bg-gradient-to-br from-blue-400 to-blue-600"
            : "bg-gradient-to-br from-green-400 to-green-600"
        } rounded-2xl flex items-center justify-center mb-6`}
      >
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
      <p className="text-gray-400 mb-6">{description}</p>
      {children}
      <Button
        variant={variant}
        onClick={onClick}
        disabled={isLoading || disabled}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" />
            Loading...
          </span>
        ) : (
          buttonText
        )}
      </Button>
    </div>
  );
}
