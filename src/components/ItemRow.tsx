import {
  useState,
  useRef,
  useEffect,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { formatCurrency, formatDecimal } from "@/lib/currency";
import type { ItemWithStatus } from "@/types";
import { Spinner } from "./Spinner";

interface ItemRowProps {
  item: ItemWithStatus;
  onUpdate: (id: string, name: string, priceCents: number) => void;
  onDelete: (id: string) => void;
}

export function ItemRow({ item, onUpdate, onDelete }: ItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editPrice, setEditPrice] = useState(formatDecimal(item.price_cents));
  const [isDeleting, setIsDeleting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditName(item.name);
    setEditPrice(formatDecimal(item.price_cents));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(item.name);
    setEditPrice(formatDecimal(item.price_cents));
  };

  const handleSaveEdit = (e?: FormEvent) => {
    e?.preventDefault();

    const trimmedName = editName.trim();
    if (!trimmedName) {
      handleCancelEdit();
      return;
    }

    const priceCents = Math.round(parseFloat(editPrice) * 100);
    if (isNaN(priceCents) || priceCents < 0) {
      handleCancelEdit();
      return;
    }

    if (trimmedName !== item.name || priceCents !== item.price_cents) {
      onUpdate(item.id, trimmedName, priceCents);
    }

    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleDelete = () => {
    setIsDeleting(true);
    onDelete(item.id);
  };

  const isPending = item.syncStatus === "pending";
  const hasError = item.syncStatus === "error";

  if (isEditing) {
    return (
      <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <td colSpan={3} className="px-4 py-3">
          <form onSubmit={handleSaveEdit} onKeyDown={handleKeyDown}>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={nameInputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input flex-1"
                placeholder="Item name"
                aria-label="Edit item name"
                required
              />
              <div className="relative sm:w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]{0,2}"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="input pl-7"
                  placeholder="0.00"
                  aria-label="Edit item price"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-ghost text-sm"
                  aria-label="Cancel editing"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm"
                  aria-label="Save changes"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
        isPending ? "opacity-70 bg-gray-50 dark:bg-gray-800" : ""
      } ${hasError ? "bg-red-50 dark:bg-red-900/20" : ""}`}
      role="row"
    >
      {/* Name Cell */}
      <td className="px-4 py-4 max-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {isPending && (
            <div className="flex-shrink-0" aria-label="Syncing">
              <Spinner size="sm" />
            </div>
          )}
          {hasError && (
            <div
              className="flex-shrink-0 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"
              aria-label="Sync error"
            >
              <span className="text-white text-xs font-bold">!</span>
            </div>
          )}
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {item.name}
          </span>
        </div>
      </td>

      {/* Price Cell */}
      <td className="px-4 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {formatCurrency(item.price_cents)}
      </td>

      {/* Actions Cell */}
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={handleStartEdit}
            disabled={isPending || isDeleting}
            className="btn-icon"
            aria-label={`Edit ${item.name}`}
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending || isDeleting}
            className="btn-icon text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            aria-label={`Delete ${item.name}`}
          >
            {isDeleting ? (
              <Spinner size="sm" />
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
