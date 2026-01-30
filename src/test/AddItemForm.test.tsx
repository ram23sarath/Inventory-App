import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddItemForm } from "@/components/AddItemForm";
import { ThemeProvider } from "@/hooks/useTheme";

describe("AddItemForm", () => {
  const today = new Date().toISOString().split("T")[0];

  it("renders name and price inputs", () => {
    const mockOnAdd = vi.fn();

    render(
      <ThemeProvider>
        <AddItemForm onAdd={mockOnAdd} section="income" selectedDate={today} />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("Item name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
  });

  it("calls onAdd with correct values when form is submitted", async () => {
    const user = userEvent.setup();
    const mockOnAdd = vi.fn().mockResolvedValue(undefined);

    render(
      <ThemeProvider>
        <AddItemForm onAdd={mockOnAdd} section="income" selectedDate={today} />
      </ThemeProvider>,
    );

    const nameInput = screen.getByRole("combobox");
    const priceInput = screen.getByPlaceholderText("0.00");
    const submitButton = screen.getByRole("button", { name: /add/i });

    await user.selectOptions(nameInput, "Chips");
    await user.type(priceInput, "25.50");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith("Chips", 2550, "income", today);
    });
  });

  it("shows validation error for empty name", async () => {
    const user = userEvent.setup();
    const mockOnAdd = vi.fn();

    render(
      <ThemeProvider>
        <AddItemForm onAdd={mockOnAdd} section="income" selectedDate={today} />
      </ThemeProvider>,
    );

    const priceInput = screen.getByPlaceholderText("0.00");
    const submitButton = screen.getByRole("button", { name: /add/i });

    await user.type(priceInput, "10.00");
    await user.click(submitButton);

    expect(await screen.findByText(/required/i)).toBeInTheDocument();
    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it("clears form after successful submission", async () => {
    const user = userEvent.setup();
    const mockOnAdd = vi.fn().mockResolvedValue(undefined);

    render(
      <ThemeProvider>
        <AddItemForm onAdd={mockOnAdd} section="income" selectedDate={today} />
      </ThemeProvider>,
    );

    const nameInput = screen.getByRole("combobox") as HTMLSelectElement;
    const priceInput = screen.getByPlaceholderText("0.00") as HTMLInputElement;
    const submitButton = screen.getByRole("button", { name: /add/i });

    await user.selectOptions(nameInput, "Chips");
    await user.type(priceInput, "25.50");
    await user.click(submitButton);

    await waitFor(() => {
      expect(nameInput.value).toBe("");
      expect(priceInput.value).toBe("");
    });
  });
});
