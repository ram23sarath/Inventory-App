import { useState, useEffect } from "react";
import { AuthProvider, useAuth, purgeLocalData } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthForm, InventoryList, Spinner } from "@/components";

function AppContent() {
  const { isLoading, isAuthenticated, error } = useAuth();
  const [showPurge, setShowPurge] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  // Reveal the purge button only after 3 s so it doesn't flash on normal loads.
  // Reset it when loading stops so it doesn't persist across load cycles.
  useEffect(() => {
    if (!isLoading) {
      setShowPurge(false);
      return;
    }
    const timer = setTimeout(() => setShowPurge(true), 3000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handlePurge = async () => {
    setPurging(true);
    setPurgeError(null);
    try {
      await purgeLocalData(); // page reloads on success, so this line never returns normally
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to clear local data';
      console.error('[App] Purge failed:', err);
      setPurgeError(errMsg);
    } finally {
      setPurging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Spinner size="lg" />
          {showPurge && (
            <div className="mt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Taking longer than expected…
              </p>
              {purgeError && (
                <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-600 dark:text-red-400">{purgeError}</p>
                </div>
              )}
              <button
                onClick={handlePurge}
                disabled={purging}
                className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {purging ? (
                  <>
                    <Spinner size="sm" />
                    <span>Clearing…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Clear local data &amp; reload</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-sm" role="alert">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 mb-4 text-sm">{error}</p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-6 py-2"
            >
              Retry
            </button>
            {purgeError && (
              <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400">{purgeError}</p>
              </div>
            )}
            <button
              onClick={handlePurge}
              disabled={purging}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {purging ? (
                <>
                  <Spinner size="sm" />
                  <span>Clearing…</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Clear local data &amp; reload</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <InventoryList /> : <AuthForm />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
