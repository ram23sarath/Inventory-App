import { useState, useRef, useEffect, type FormEvent } from "react";
import { parsePriceToCents, validateName, validatePrice } from "@/lib/currency";
import { Spinner } from "./Spinner";

interface AddItemFormProps {
  onAdd: (
    name: string,
    priceCents: number,
    section: "income" | "expenses",
    itemDate: string,
    subSection?: string | null,
  ) => Promise<void>;
  autoFocus?: boolean;
  section: "income" | "expenses";
  selectedDate: string;
  subSection?: string | null;
}

const PREDEFINED_ITEMS = [
  "Chips",
  "Pallilu",
  "ButterMilk",
  "Lassi",
  "Finger Chips",
  "Maize",
  "Popcorn",
  "Groundnuts",
  "A1 Snacks",
  "Ginger",
  "Pesulu",
  "Chilli",
  "Curd",
  "Milk",
  "Others",
];

// Items only available in expenses section
const EXPENSES_ONLY_ITEMS = ["Fuel", "Packing Covers"];

export function AddItemForm({
  onAdd,
  autoFocus = false,
  section,
  selectedDate,
  subSection,
}: AddItemFormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState("");
  const nameSelectRef = useRef<HTMLSelectElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Filter out the section name itself from items list when in a sub-section
  const availableItems = PREDEFINED_ITEMS.filter((item) => {
    if (subSection === "buttermilk" && item === "ButterMilk") return false;
    if (subSection === "chips" && item === "Chips") return false;
    return true;
  });

  useEffect(() => {
    if (autoFocus) {
      if (showCustomInput && customInputRef.current) {
        customInputRef.current.focus();
      } else if (nameSelectRef.current) {
        nameSelectRef.current.focus();
      }
    }
  }, [autoFocus, showCustomInput]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Determine which name to use
    const finalName = showCustomInput ? customName : name;

    // Validate
    const nameValidation = validateName(finalName);
    const priceValidation = validatePrice(price);

    setNameError(nameValidation.valid ? null : nameValidation.error || null);
    setPriceError(priceValidation.valid ? null : priceValidation.error || null);

    if (!nameValidation.valid || !priceValidation.valid) {
      return;
    }

    const priceCents = parsePriceToCents(price);
    if (priceCents === null) {
      setPriceError("Invalid price");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(
        finalName.trim(),
        priceCents,
        section,
        selectedDate,
        subSection,
      );
      // Reset form on success
      setName("");
      setPrice("");
      setCustomName("");
      setShowCustomInput(false);
      nameSelectRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePriceChange = (value: string) => {
    // Allow only valid decimal input
    const cleaned = value.replace(/[^0-9.,]/g, "");
    // Ensure only one decimal point
    const parts = cleaned.split(/[.,]/);
    if (parts.length > 2) return;
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) return;

    setPrice(cleaned);
    if (priceError) {
      const validation = validatePrice(cleaned);
      if (validation.valid) setPriceError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Name Select Dropdown */}
        {!showCustomInput ? (
          <div className="flex-1">
            <label htmlFor="item-name" className="sr-only">
              Item name
            </label>
            <select
              ref={nameSelectRef}
              id="item-name"
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "__custom__") {
                  setShowCustomInput(true);
                  setName("");
                } else {
                  setName(value);
                  setNameError(null);
                }
              }}
              className={nameError ? "input-error" : "input"}
              disabled={isSubmitting}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "name-error" : undefined}
            >
              <option value="">Select item name</option>
              {availableItems.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              {section === "expenses" &&
                EXPENSES_ONLY_ITEMS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              <option value="__custom__">+ Add Custom Name</option>
            </select>
            {nameError && (
              <p
                id="name-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {nameError}
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 flex gap-2">
            <div className="flex-1">
              <label htmlFor="custom-item-name" className="sr-only">
                Custom item name
              </label>
              <input
                ref={customInputRef}
                id="custom-item-name"
                type="text"
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  if (nameError) {
                    const validation = validateName(e.target.value);
                    if (validation.valid) setNameError(null);
                  }
                }}
                className={nameError ? "input-error" : "input"}
                placeholder="Enter custom item name"
                disabled={isSubmitting}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "name-error" : undefined}
              />
              {nameError && (
                <p
                  id="name-error"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {nameError}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(false);
                setCustomName("");
                setName("");
                setNameError(null);
              }}
              disabled={isSubmitting}
              className="min-h-touch min-w-touch px-3 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
              aria-label="Cancel custom name"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Price Input */}
        <div className="sm:w-36">
          <label htmlFor="item-price" className="sr-only">
            Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              ₹
            </span>
            <input
              id="item-price"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]{0,2}"
              value={price}
              onChange={(e) => handlePriceChange(e.target.value)}
              className={`${priceError ? "input-error" : "input"} pl-7`}
              placeholder="0.00"
              disabled={isSubmitting}
              aria-invalid={!!priceError}
              aria-describedby={priceError ? "price-error" : undefined}
            />
          </div>
          {priceError && (
            <p
              id="price-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
            >
              {priceError}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary sm:w-auto"
          aria-label="Add item"
        >
          {isSubmitting ? (
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          )}
          <span className="sm:hidden">Add Item</span>
        </button>
      </div>
    </form>
  );
}
