import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { ItemWithStatus } from "@/types";
import { formatDecimal } from "@/lib/currency";
import { ConfirmDialog } from "./ConfirmDialog";

interface GroupedEntriesListProps {
  items: ItemWithStatus[];
  title: string;
  onUpdate: (id: string, name: string, priceCents: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  nameSuggestions?: string[];
}

export function GroupedEntriesList({
  items,
  title,
  onUpdate,
  onDelete,
  nameSuggestions = [],
}: GroupedEntriesListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (item: ItemWithStatus) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(formatDecimal(item.price_cents));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
  };

  const handleSaveEdit = (e?: FormEvent) => {
    e?.preventDefault();

    const trimmedName = editName.trim();
    if (!trimmedName) {
      handleCancelEdit();
      return;
    }

    const priceStr = editPrice.trim();
    if (priceStr === "" || priceStr.startsWith("-")) {
      handleCancelEdit();
      return;
    }

    const match = priceStr.match(/^(\d*)(?:\.(\d*))?$/);
    if (!match) {
      handleCancelEdit();
      return;
    }

    const wholePart = match[1] || "0";
    const fracPart = match[2] || "";
    const whole = parseInt(wholePart, 10);
    if (isNaN(whole) || whole < 0) {
      handleCancelEdit();
      return;
    }

    const fracPadded = (fracPart + "00").slice(0, 2);
    if (!/^\d{2}$/.test(fracPadded)) {
      handleCancelEdit();
      return;
    }

    const priceCents = whole * 100 + parseInt(fracPadded, 10);
    const currentItem = items.find((i) => i.id === editingId);
    if (
      currentItem &&
      (trimmedName !== currentItem.name || priceCents !== currentItem.price_cents)
    ) {
      onUpdate(editingId!, trimmedName, priceCents);
    }

    setEditingId(null);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") handleCancelEdit();
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
    }
    setDeleteConfirmId(null);
  };

  const datalistId = `item-names-${title.replace(/\s+/g, "-").toLowerCase()}`;

  if (items.length === 0) {
    return null;
  }

  // Sort and group items by date
  const groupedItems = items
    .slice()
    .sort(
      (a, b) =>
        new Date(b.item_date).getTime() - new Date(a.item_date).getTime(),
    )
    .reduce(
      (acc, item) => {
        if (!acc[item.item_date]) {
          acc[item.item_date] = [];
        }
        acc[item.item_date].push(item);
        return acc;
      },
      {} as Record<string, ItemWithStatus[]>,
    );

  const grandTotal = items.reduce((sum, item) => sum + item.price_cents, 0);
  const grandTotalFormatted = (grandTotal / 100).toFixed(2);

  const deleteTarget = items.find((i) => i.id === deleteConfirmId);

  return (
    <>
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title="Delete Item"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`
            : "Are you sure you want to delete this item? This cannot be undone."
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <div className="mx-4 mt-8 first:mt-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h2>
      </div>

      <div className="card mx-4 flex flex-col overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow max-w-full">
        <div className="overflow-x-auto scroll-affordance -webkit-overflow-scrolling-touch">
          <table
            className="responsive-table w-full min-w-0 text-left table-fixed"
            role="table"
          >
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Item
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap w-24">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {Object.entries(groupedItems).flatMap(([date, dateItems]) => {
                const dateObj = new Date(date + "T00:00:00");
                const formattedDate = dateObj.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                const total = dateItems.reduce(
                  (sum, item) => sum + item.price_cents,
                  0,
                );
                const totalFormatted = (total / 100).toFixed(2);

                return [
                  <tr
                    key={`date-${date}`}
                    className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800"
                  >
                    <td
                      colSpan={3}
                      className="px-4 py-2 font-semibold text-blue-900 dark:text-blue-100"
                    >
                      <div className="flex justify-between items-center gap-2 flex-wrap">
                        <span className="truncate">{formattedDate}</span>
                        <span className="text-blue-600 dark:text-blue-300 flex-shrink-0">
                          ₹{totalFormatted}
                        </span>
                      </div>
                    </td>
                  </tr>,
                  ...dateItems.map((item) =>
                    editingId === item.id ? (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                      >
                        <td colSpan={3} className="px-4 py-3">
                          <form
                            onSubmit={handleSaveEdit}
                            onKeyDown={handleKeyDown}
                          >
                            <div className="flex flex-col sm:flex-row gap-3">
                              <datalist id={datalistId}>
                                {nameSuggestions.map((name) => (
                                  <option key={name} value={name} />
                                ))}
                              </datalist>
                              <input
                                ref={nameInputRef}
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="input flex-1"
                                placeholder="Item name"
                                aria-label="Edit item name"
                                list={datalistId}
                                required
                              />
                              <div className="relative sm:w-32">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                  ₹
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
                    ) : (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white break-words max-w-xs">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          ₹{(item.price_cents / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleStartEdit(item)}
                              disabled={item.syncStatus === "pending"}
                              className="min-h-touch min-w-touch p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Edit ${item.name}`}
                              title="Edit"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
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
                              onClick={() => setDeleteConfirmId(item.id)}
                              disabled={item.syncStatus === "pending"}
                              className="min-h-touch min-w-touch p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Delete ${item.name}`}
                              title="Delete"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  ),
                ];
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-600">
                <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                  Grand Total
                </td>
                <td className="px-4 py-3 font-bold text-gray-900 dark:text-white tabular-nums">
                  ₹{grandTotalFormatted}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
