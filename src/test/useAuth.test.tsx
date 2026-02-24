import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

// We need to control supabase mock per test, so import it after setup.ts mocks it
const { supabase } = await import("@/lib/supabase");

// Helper component to read auth state
function AuthStateDisplay() {
    const { isLoading, isAuthenticated, error, user } = useAuth();
    return (
        <div>
            <span data-testid="loading">{String(isLoading)}</span>
            <span data-testid="authenticated">{String(isAuthenticated)}</span>
            <span data-testid="error">{error ?? "none"}</span>
            <span data-testid="user">{user?.email ?? "none"}</span>
        </div>
    );
}

function renderWithAuth() {
    return render(
        <AuthProvider>
            <AuthStateDisplay />
        </AuthProvider>
    );
}

describe("useAuth", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Re-set default mock for onAuthStateChange (setup.ts default)
        vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
        } as any);
    });

    it("resolves isLoading to false when getUser succeeds with no user", async () => {
        vi.mocked(supabase.auth.getUser).mockResolvedValue({
            data: { user: null },
            error: null,
        } as any);

        renderWithAuth();

        // Initially loading
        expect(screen.getByTestId("loading").textContent).toBe("true");

        // After getUser resolves
        await waitFor(() => {
            expect(screen.getByTestId("loading").textContent).toBe("false");
        });
        expect(screen.getByTestId("authenticated").textContent).toBe("false");
        expect(screen.getByTestId("error").textContent).toBe("none");
    });

    it("resolves isLoading to false when getUser succeeds with a user", async () => {
        const mockUser = {
            id: "user-123",
            email: "test@example.com",
            created_at: "2025-01-01T00:00:00Z",
        };

        vi.mocked(supabase.auth.getUser).mockResolvedValue({
            data: { user: mockUser },
            error: null,
        } as any);

        renderWithAuth();

        await waitFor(() => {
            expect(screen.getByTestId("loading").textContent).toBe("false");
        });
        expect(screen.getByTestId("authenticated").textContent).toBe("true");
        expect(screen.getByTestId("user").textContent).toBe("test@example.com");
    });

    it("shows error and stops loading when getUser rejects (prevents infinite spinner)", async () => {
        vi.mocked(supabase.auth.getUser).mockRejectedValue(
            new Error("Network error")
        );

        renderWithAuth();

        // Initially loading
        expect(screen.getByTestId("loading").textContent).toBe("true");

        // After rejection: loading is false, error is shown
        await waitFor(() => {
            expect(screen.getByTestId("loading").textContent).toBe("false");
        });
        expect(screen.getByTestId("authenticated").textContent).toBe("false");
        expect(screen.getByTestId("error").textContent).toBe(
            "Failed to check authentication. Please refresh."
        );
    });

    it("still authenticates user when admin check fails (admin defaults to false)", async () => {
        const mockUser = {
            id: "user-456",
            email: "admin@example.com",
            created_at: "2025-01-01T00:00:00Z",
        };

        vi.mocked(supabase.auth.getUser).mockResolvedValue({
            data: { user: mockUser },
            error: null,
        } as any);

        // Make admin check throw (supabase.from('admins').select().eq().single())
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn().mockRejectedValue(new Error("Admin table not found")),
        } as any);

        renderWithAuth();

        // User is still authenticated, just not admin
        await waitFor(() => {
            expect(screen.getByTestId("loading").textContent).toBe("false");
        });
        expect(screen.getByTestId("authenticated").textContent).toBe("true");
        expect(screen.getByTestId("user").textContent).toBe("admin@example.com");
        expect(screen.getByTestId("error").textContent).toBe("none");
    });
});
