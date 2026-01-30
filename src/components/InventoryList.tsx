import { useState, useRef } from "react";
import { useItems } from "@/hooks/useItems";
import { Header } from "./Header";
import { AddItemForm } from "./AddItemForm";
import { ItemRow } from "./ItemRow";
import { EmptyState } from "./EmptyState";
import { TotalBar } from "./TotalBar";
import { Spinner } from "./Spinner";

export function InventoryList() {
  const {
    items,
    isLoading,
    error,
    isOnline,
    pendingCount,
    addItem,
    updateItem,
    deleteItem,
    retrySync,
  } = useItems();

  const [showAddForm, setShowAddForm] = useState(false);
  const [section, setSection] = useState<"income" | "expenses">("income");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [viewMode, setViewMode] = useState<"entries" | "view">("entries");
  const addFormRef = useRef<HTMLDivElement>(null);

  const handleAddFirst = () => {
    setShowAddForm(true);
    // Scroll to form after state updates
    setTimeout(() => {
      addFormRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading inventory...
          </p>
        </div>
      </div>
    );
  }

  const hasItems = items.length > 0;
  // Filter items by current section and date
  const sectionItems = items.filter(
    (item) => item.section === section && item.item_date === selectedDate,
  );

  // Group all items by date for the View mode
  const groupedByDate = items
    .filter((item) => item.section === section)
    .reduce(
      (acc, item) => {
        if (!acc[item.item_date]) {
          acc[item.item_date] = [];
        }
        acc[item.item_date].push(item);
        return acc;
      },
      {} as Record<string, typeof items>,
    );

  const sortedDates = Object.keys(groupedByDate).sort().reverse();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 flex flex-col">
      <Header />

      {/* View Mode Toggle - at the very top */}
      <div className="max-w-2xl mx-auto mt-4 px-4">
        <div className="inline-flex gap-0 mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode("entries")}
            className={`py-2 px-4 rounded-md font-medium transition-colors ${
              viewMode === "entries"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Entries
          </button>
          <button
            onClick={() => setViewMode("view")}
            className={`py-2 px-4 rounded-md font-medium transition-colors ${
              viewMode === "view"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            View All
          </button>
        </div>

        {/* Section Toggle - below view mode */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSection("income")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              section === "income"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setSection("expenses")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              section === "expenses"
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Expenses
          </button>
        </div>

        {/* Date Picker - only show in Entries mode */}
        {viewMode === "entries" && (
          <div className="mb-4">
            <label
              htmlFor="date-picker"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Select Date
            </label>
            <input
              id="date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <main
        className={`max-w-2xl mx-auto ${viewMode === "view" ? "flex-1 flex flex-col w-full" : ""}`}
      >
        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {/* ENTRIES MODE */}
        {viewMode === "entries" && (
          <>
            {/* Section Title */}
            <div className="mx-4 mt-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {section === "income" ? "Income" : "Expenses"}
              </h2>
            </div>

            {/* Add Item Form (always visible if there are items) */}
            {(hasItems || showAddForm) && (
              <div ref={addFormRef} className="mx-4 mt-4">
                <AddItemForm
                  onAdd={addItem}
                  autoFocus={showAddForm && !hasItems}
                  section={section}
                  selectedDate={selectedDate}
                />
              </div>
            )}

            {/* Items List */}
            {sectionItems.length > 0 ? (
              <div className="card mx-4 mt-4 overflow-x-auto">
                <table
                  className="w-full"
                  role="table"
                  aria-label="Inventory items"
                >
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Price
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionItems.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onUpdate={updateItem}
                        onDelete={deleteItem}
                      />
                    ))}
                  </tbody>
                </table>
                {/* Total Bar inside card */}
                <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      Total ({sectionItems.length} item
                      {sectionItems.length !== 1 ? "s" : ""})
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      $
                      {(
                        sectionItems.reduce(
                          (sum, item) => sum + item.price_cents,
                          0,
                        ) / 100
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState onAddFirst={handleAddFirst} />
            )}
          </>
        )}

        {/* VIEW ALL MODE */}
        {viewMode === "view" && (
          <>
            {/* Section Title */}
            <div className="mx-4 mt-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                All {section === "income" ? "Income" : "Expenses"} Entries
              </h2>
            </div>

            {items.filter((item) => item.section === section).length > 0 ? (
              <div className="card mx-4 mt-4 flex-1 flex flex-col overflow-hidden">
                <div className="overflow-y-auto flex-1">
                  <table className="w-full" role="table">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap w-20">
                          Price
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(
                        items
                          .filter((item) => item.section === section)
                          .sort(
                            (a, b) =>
                              new Date(b.item_date).getTime() -
                              new Date(a.item_date).getTime(),
                          )
                          .reduce(
                            (acc, item) => {
                              if (!acc[item.item_date]) {
                                acc[item.item_date] = [];
                              }
                              acc[item.item_date].push(item);
                              return acc;
                            },
                            {} as Record<string, typeof items>,
                          ),
                      ).flatMap(([date, dateItems]) => {
                        const dateObj = new Date(date + "T00:00:00");
                        const formattedDate = dateObj.toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        );

                        const total = dateItems.reduce(
                          (sum, item) => sum + item.price_cents,
                          0,
                        );
                        const totalFormatted = (total / 100).toFixed(2);

                        return [
                          <tr
                            key={`date-${date}`}
                            className="bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-200 dark:border-blue-800"
                          >
                            <td
                              colSpan={3}
                              className="px-4 py-3 font-semibold text-blue-900 dark:text-blue-100"
                            >
                              <div className="flex justify-between items-center">
                                <span>{formattedDate}</span>
                                <span className="text-blue-600 dark:text-blue-300">
                                  ${totalFormatted}
                                </span>
                              </div>
                            </td>
                          </tr>,
                          ...dateItems.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white break-words">
                                {item.name}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                ${(item.price_cents / 100).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      updateItem(
                                        item.id,
                                        item.name,
                                        item.price_cents,
                                      )
                                    }
                                    className="btn-icon text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                    aria-label="Edit item"
                                    title="Edit"
                                  >
                                    <svg
                                      className="w-4 h-4"
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
                                    onClick={() => deleteItem(item.id)}
                                    className="btn-icon text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    aria-label="Delete item"
                                    title="Delete"
                                  >
                                    <svg
                                      className="w-4 h-4"
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
                          )),
                        ];
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mx-4 mt-4 text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  No entries found for {section}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
