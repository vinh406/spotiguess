import { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
  scrollable?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Modal({
  title,
  onClose,
  children,
  footer,
  maxWidth = "md",
  scrollable = false,
}: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`bg-gray-800 rounded-2xl w-full ${maxWidthClasses[maxWidth]} border border-gray-700/50 shadow-xl ${
          scrollable ? "max-h-[90vh] flex flex-col" : ""
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className={scrollable ? "flex-1 overflow-y-auto p-6" : "p-6"}>
          {children}
        </div>

        {footer && (
          <div className="p-6 border-t border-gray-700/50">{footer}</div>
        )}
      </div>
    </div>
  );
}
