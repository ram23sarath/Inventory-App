import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ItemRow } from "@/components/ItemRow";
import { ThemeProvider } from "@/hooks/useTheme";
import type { ItemWithStatus } from "@/types";

const mockItem: ItemWithStatus = {
  id: "1",
  user_id: "user-1",
  name: "Test Item",
  price_cents: 1999,
  section: "income",
  item_date: "2024-01-15",
  sub_section: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  syncStatus: "synced",
};

const mockOnUpdate = () => {};
const mockOnDelete = () => {};

describe("ItemRow", () => {
  it("renders item name and formatted price", () => {
    render(
      <ThemeProvider>
        <ItemRow
          item={mockItem}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText("Test Item")).toBeInTheDocument();
    // Price formatting depends on locale, check for presence of value
    expect(screen.getByText(/19\.99/)).toBeInTheDocument();
  });

  it("shows edit and delete buttons", () => {
    render(
      <ThemeProvider>
        <ItemRow
          item={mockItem}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("shows pending indicator when syncing", () => {
    const pendingItem: ItemWithStatus = {
      ...mockItem,
      syncStatus: "pending",
    };

    render(
      <ThemeProvider>
        <ItemRow
          item={pendingItem}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
