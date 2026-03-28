import { ReactNode } from "react";
import LoadingSpinner from "./LoadingSpinner";

interface ActionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  hoverFrom: string;
  hoverTo: string;
  borderColor: string;
  children?: ReactNode;
  buttonText: string;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function ActionCard({
  icon,
  title,
  description,
  gradientFrom,
  gradientTo,
  hoverFrom,
  hoverTo,
  borderColor,
  children,
  buttonText,
  onClick,
  isLoading = false,
  disabled = false,
}: ActionCardProps) {
  return (
    <div
      className={`bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-700/50 hover:${borderColor} transition-all duration-300`}
    >
      <div
        className={`w-16 h-16 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-2xl flex items-center justify-center mb-6`}
      >
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
      <p className="text-gray-400 mb-6">{description}</p>
      {children}
      <button
        onClick={onClick}
        disabled={isLoading || disabled}
        className={`w-full bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white py-4 px-6 rounded-xl font-semibold text-lg hover:${hoverFrom} hover:${hoverTo} transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" />
            Loading...
          </span>
        ) : (
          buttonText
        )}
      </button>
    </div>
  );
}
