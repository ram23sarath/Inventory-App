import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2
          id={titleId}
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          {title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
        <div className="flex justify-end gap-3 mt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="btn-ghost text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary text-sm bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
