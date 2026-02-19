import { ItemWithStatus } from "@/types";

interface GroupedEntriesListProps {
  items: ItemWithStatus[];
  title: string;
  onUpdate: (id: string, name: string, priceCents: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function GroupedEntriesList({
  items,
  title,
  onUpdate,
  onDelete,
}: GroupedEntriesListProps) {
  if (items.length === 0) {
    return null;
  }

  // Sort and group items by date
  const groupedItems = items
    .slice() // Create a copy before sorting
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

  return (
    <>
      <div className="mx-4 mt-8 first:mt-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h2>
      </div>

      <div className="card mx-4 flex flex-col overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow max-w-full">
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full min-w-0 text-left table-fixed" role="table">
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
                        <span className="text-blue-600 dark:text-blue-300 flex-shrink-0">
                          ₹{totalFormatted}
                        </span>
                      </div>
                    </td>
                  </tr>,
                  ...dateItems.map((item) => (
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
                            onClick={() =>
                              onUpdate(item.id, item.name, item.price_cents)
                            }
                            className="min-h-touch min-w-touch p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors inline-flex items-center justify-center"
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
                            onClick={() => onDelete(item.id)}
                            className="min-h-touch min-w-touch p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors inline-flex items-center justify-center"
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
    </>
  );
}
