import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/Header";

// Mock useTheme
vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  }),
}));

// Mock useAuth
const mockSignOut = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "1", email: "test@example.com" },
    signOut: mockSignOut,
    isLoading: false,
    isAuthenticated: true,
  }),
}));

describe("Header Sign Out Dialog - Focus Trap & A11y", () => {
  beforeEach(() => {
    mockSignOut.mockResolvedValue({ error: null });
    vi.clearAllMocks();
  });

  it("renders sign out button with proper aria-label", () => {
    render(<Header />);
    const signOutBtn = screen.getByLabelText("Sign out");
    expect(signOutBtn).toBeInTheDocument();
  });

  it("opens dialog when sign out button is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    const signOutBtn = screen.getByLabelText("Sign out");
    await user.click(signOutBtn);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "signout-dialog-title");
  });

  it("closes dialog on Escape key", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByLabelText("Sign out"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes dialog on backdrop click", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByLabelText("Sign out"));
    const backdrop = screen.getByTestId("dialog-backdrop");
    expect(backdrop).toBeInTheDocument();

    // Click the backdrop
    fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("does not close dialog when clicking modal content", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByLabelText("Sign out"));
    const modalContent = screen.getByText(/Are you sure you want to sign out/);

    fireEvent.click(modalContent);

    // Dialog should still be visible
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("traps focus within dialog and focuses first button", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByLabelText("Sign out"));

    await waitFor(() => {
      const cancelBtn = screen.getByText("Cancel");
      expect(cancelBtn).toHaveFocus();
    });

    // Get all focusable buttons within the dialog
    const dialog = screen.getByRole("dialog");
    const dialogButtons = screen
      .getAllByRole("button")
      .filter((btn) => dialog.contains(btn));
    expect(dialogButtons.length).toBeGreaterThanOrEqual(2);

    const cancelBtn = screen.getByText("Cancel");
    const signOutBtn = screen.getByRole("button", { name: "Sign Out" });

    // Verify initial focus is on Cancel button
    expect(cancelBtn).toHaveFocus();

    // Test Tab forward navigation: Cancel -> Sign Out
    await user.tab();
    expect(signOutBtn).toHaveFocus();

    // Tab again should cycle back to Cancel (focus trap)
    await user.tab();
    expect(cancelBtn).toHaveFocus();

    // Test Shift+Tab backward navigation: Cancel -> Sign Out (wrap around)
    await user.tab({ shift: true });
    expect(signOutBtn).toHaveFocus();

    // Shift+Tab again should go back to Cancel
    await user.tab({ shift: true });
    expect(cancelBtn).toHaveFocus();

    // Verify focus never escapes the dialog by tabbing multiple times
    for (let i = 0; i < 5; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }

    // Same verification for Shift+Tab
    for (let i = 0; i < 5; i++) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("closes dialog when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByLabelText("Sign out"));
    const cancelBtn = screen.getByText("Cancel");

    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("signs out when Sign Out button is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByLabelText("Sign out"));
    const signOutConfirmBtn = screen.getByRole("button", { name: "Sign Out" });

    await user.click(signOutConfirmBtn);

    expect(mockSignOut).toHaveBeenCalled();

    // Assert the dialog closes after sign out
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("displays title with proper id for aria-labelledby", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByLabelText("Sign out"));

    const title = screen.getByRole("heading", { name: /Sign Out/i });
    expect(title).toHaveAttribute("id", "signout-dialog-title");
  });
});
