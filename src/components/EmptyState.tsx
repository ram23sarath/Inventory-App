interface EmptyStateProps {
  onAddFirst: () => void;
}

export function EmptyState({ onAddFirst }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Illustration */}
      <div className="w-32 h-32 mb-6">
        <svg
          viewBox="0 0 128 128"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-hidden="true"
        >
          {/* Box base */}
          <rect
            x="24"
            y="48"
            width="80"
            height="56"
            rx="4"
            className="fill-gray-200 dark:fill-gray-700"
          />
          {/* Box top flap left */}
          <path
            d="M24 48L44 32H64V48H24Z"
            className="fill-gray-300 dark:fill-gray-600"
          />
          {/* Box top flap right */}
          <path
            d="M104 48L84 32H64V48H104Z"
            className="fill-gray-300 dark:fill-gray-600"
          />
          {/* Question mark */}
          <path
            d="M56 72C56 67.5817 59.5817 64 64 64C68.4183 64 72 67.5817 72 72C72 74.5 71 76.5 69 78L66 80V84"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-primary-500"
          />
          <circle cx="66" cy="92" r="2" className="fill-primary-500" />
          {/* Sparkles */}
          <circle cx="96" cy="40" r="3" className="fill-primary-400" />
          <circle cx="32" cy="36" r="2" className="fill-primary-300" />
          <circle cx="100" cy="60" r="2" className="fill-primary-300" />
        </svg>
      </div>

      {/* Text */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No items yet
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xs">
        Start tracking your inventory by adding your first item.
      </p>

      {/* CTA Button */}
      <button
        onClick={onAddFirst}
        className="btn-primary"
        aria-label="Add your first inventory item"
      >
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
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span>Add First Item</span>
      </button>
    </div>
  );
}
