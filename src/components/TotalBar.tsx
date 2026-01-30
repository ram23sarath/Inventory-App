import { formatCurrency, calculateTotalCents } from "@/lib/currency";
import type { ItemWithStatus } from "@/types";

interface TotalBarProps {
  items: ItemWithStatus[];
  pendingCount: number;
  isOnline: boolean;
  onRetrySync?: () => void;
}

export function TotalBar({
  items,
  pendingCount,
  isOnline,
  onRetrySync,
}: TotalBarProps) {
  const totalCents = calculateTotalCents(items);

  return (
    <div className="sticky-bottom px-4 py-3">
      <div className="max-w-2xl mx-auto">
        {/* Offline/Sync Status */}
        {(!isOnline || pendingCount > 0) && (
          <div className="flex items-center justify-between mb-2 text-sm">
            {!isOnline ? (
              <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                  />
                </svg>
                Offline mode
              </span>
            ) : pendingCount > 0 ? (
              <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {pendingCount} change{pendingCount > 1 ? "s" : ""} pending
              </span>
            ) : null}

            {pendingCount > 0 && isOnline && onRetrySync && (
              <button
                onClick={onRetrySync}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                Retry sync
              </button>
            )}
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400 font-medium">
            Total ({items.length} item{items.length !== 1 ? "s" : ""})
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalCents)}
          </span>
        </div>
      </div>
    </div>
  );
}
