import { useState, useRef } from "react";
import { useItems } from "@/hooks/useItems";
import { Header } from "./Header";
import { AddItemForm } from "./AddItemForm";
import { ItemRow } from "./ItemRow";
import { EmptyState } from "./EmptyState";
import { Spinner } from "./Spinner";
import { GroupedEntriesList } from "./GroupedEntriesList";

export function InventoryList() {
  const { items, isLoading, error, addItem, updateItem, deleteItem } =
    useItems();

  const [showAddForm, setShowAddForm] = useState(false);
  const [section, setSection] = useState<"income" | "expenses">("income");
  const [subSection, setSubSection] = useState<string | null>(null);
  const [viewFilters, setViewFilters] = useState({
    general: true,
    buttermilk: true,
    chips: true,
  });
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 flex flex-col overflow-x-hidden">
      <Header />

      {/* View Mode Toggle - at the very top */}
      <div className="max-w-2xl mx-auto w-full mt-4 px-4">
        <div className="inline-flex gap-0 mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode("entries")}
            className={`min-h-touch py-2.5 px-4 rounded-md font-medium transition-colors ${
              viewMode === "entries"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Entries
          </button>
          <button
            onClick={() => setViewMode("view")}
            className={`min-h-touch py-2.5 px-4 rounded-md font-medium transition-colors ${
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
            onClick={() => {
              setSection("income");
              setSubSection(null);
            }}
            className={`flex-1 min-h-touch py-2.5 px-4 rounded-lg font-medium transition-colors ${
              section === "income"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Income
          </button>
          <button
            onClick={() => {
              setSection("expenses");
              setSubSection(null);
            }}
            className={`flex-1 min-h-touch py-2.5 px-4 rounded-lg font-medium transition-colors ${
              section === "expenses"
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Expenses
          </button>
        </div>

        {/* Sub Section Toggle for Expenses */}
        {viewMode === "entries" && section === "expenses" && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSubSection(null)}
              className={`flex-1 min-h-touch py-2.5 px-3 rounded-md text-sm font-medium transition-colors ${
                subSection === null
                  ? "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setSubSection("buttermilk")}
              className={`flex-1 min-h-touch py-2.5 px-3 rounded-md text-sm font-medium transition-colors ${
                subSection === "buttermilk"
                  ? "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              Butter Milk
            </button>
            <button
              onClick={() => setSubSection("chips")}
              className={`flex-1 min-h-touch py-2.5 px-3 rounded-md text-sm font-medium transition-colors ${
                subSection === "chips"
                  ? "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              Chips
            </button>
          </div>
        )}

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
              className="w-full min-h-touch px-4 py-3 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
                  subSection={subSection}
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
            {/* Net Total Card */}
            {(() => {
              const totalIncome = items
                .filter((item) => item.section === "income")
                .reduce((sum, item) => sum + item.price_cents, 0);
              const totalExpenses = items
                .filter((item) => item.section === "expenses")
                .reduce((sum, item) => sum + item.price_cents, 0);
              const netTotal = totalIncome - totalExpenses;
              const isPositive = netTotal >= 0;

              return (
                <div className="mx-4 mt-4 p-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm opacity-80">
                        Net Total (Income - Expenses)
                      </p>
                      <p
                        className={`text-2xl font-bold ${isPositive ? "text-green-200" : "text-red-200"}`}
                      >
                        {isPositive ? "+" : "-"}₹
                        {Math.abs(netTotal / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right text-sm opacity-80">
                      <p>Income: ₹{(totalIncome / 100).toFixed(2)}</p>
                      <p>Expenses: ₹{(totalExpenses / 100).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Section Title */}
            {section === "income" ? (
              items.filter((item) => item.section === "income").length > 0 ? (
                <GroupedEntriesList
                  items={items.filter((item) => item.section === "income")}
                  title="All Income Entries"
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                />
              ) : (
                <div className="mx-4 mt-4 text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    No income entries found
                  </p>
                </div>
              )
            ) : items.filter((item) => item.section === "expenses").length >
              0 ? (
              <>
                {/* Filter Checkboxes */}
                <div className="mx-4 mt-6 flex flex-wrap gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-full mb-1">
                    Filter Categories:
                  </span>
                  <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none min-h-touch py-1">
                    <input
                      type="checkbox"
                      checked={viewFilters.general}
                      onChange={(e) =>
                        setViewFilters((prev) => ({
                          ...prev,
                          general: e.target.checked,
                        }))
                      }
                      className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-blue-500"
                    />
                    <span>General Expenses</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none min-h-touch py-1">
                    <input
                      type="checkbox"
                      checked={viewFilters.buttermilk}
                      onChange={(e) =>
                        setViewFilters((prev) => ({
                          ...prev,
                          buttermilk: e.target.checked,
                        }))
                      }
                      className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-blue-500"
                    />
                    <span>Butter Milk</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none min-h-touch py-1">
                    <input
                      type="checkbox"
                      checked={viewFilters.chips}
                      onChange={(e) =>
                        setViewFilters((prev) => ({
                          ...prev,
                          chips: e.target.checked,
                        }))
                      }
                      className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-blue-500"
                    />
                    <span>Chips</span>
                  </label>
                </div>

                {viewFilters.general && (
                  <GroupedEntriesList
                    items={items.filter(
                      (item) =>
                        item.section === "expenses" &&
                        (item.sub_section === null ||
                          item.sub_section === undefined),
                    )}
                    title="General Expenses"
                    onUpdate={updateItem}
                    onDelete={deleteItem}
                  />
                )}
                {viewFilters.buttermilk && (
                  <GroupedEntriesList
                    items={items.filter(
                      (item) =>
                        item.section === "expenses" &&
                        item.sub_section === "buttermilk",
                    )}
                    title="Butter Milk"
                    onUpdate={updateItem}
                    onDelete={deleteItem}
                  />
                )}
                {viewFilters.chips && (
                  <GroupedEntriesList
                    items={items.filter(
                      (item) =>
                        item.section === "expenses" &&
                        item.sub_section === "chips",
                    )}
                    title="Chips"
                    onUpdate={updateItem}
                    onDelete={deleteItem}
                  />
                )}
              </>
            ) : (
              <div className="mx-4 mt-4 text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  No expense entries found
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
