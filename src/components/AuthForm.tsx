import { useState, type FormEvent } from "react";
import { useAuth, purgeLocalData } from "@/hooks/useAuth";
import { Spinner } from "./Spinner";

export function AuthForm() {
  const { signIn, signUp, isLoading, error } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const handlePurge = async () => {
    setPurging(true);
    setPurgeError(null);
    try {
      await purgeLocalData(); // reloads the page, so the finally below never runs on success
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to clear local data';
      console.error('[AuthForm] Purge failed:', err);
      setPurgeError(errMsg);
    } finally {
      setPurging(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(null);

    // Validation
    if (!email || !password) {
      setLocalError("Please fill in all fields");
      return;
    }

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setLocalError("Password must be at least 6 characters");
        return;
      }
    }

    if (mode === "signin") {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setLocalError(signInError.message);
      }
    } else {
      const { error: signUpError } = await signUp(email, password);
      if (signUpError) {
        setLocalError(signUpError.message);
      } else {
        setSuccess("Account created! Check your email for verification.");
        setMode("signin");
      }
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setLocalError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Inventory App
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {mode === "signin"
              ? "Sign in to your account"
              : "Create a new account"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {/* Error Message */}
          {(localError || error) && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
            >
              {localError || error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div
              role="status"
              className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
            >
              {success}
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {/* Confirm Password (signup only) */}
          {mode === "signup" && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? (
              <>
                <Spinner size="sm" />
                <span>
                  {mode === "signin" ? "Signing in..." : "Creating account..."}
                </span>
              </>
            ) : (
              <span>{mode === "signin" ? "Sign In" : "Sign Up"}</span>
            )}
          </button>

          {/* Toggle Mode */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            {mode === "signin"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={toggleMode}
              className="text-primary-600 hover:text-primary-700 font-medium dark:text-primary-400"
              disabled={isLoading}
            >
              {mode === "signin" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </form>

        {/* PWA / SPA recovery — clears all local state so the user can start fresh */}
        <div className="mt-5 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            Stuck on a loading screen or seeing stale data?
          </p>
          {purgeError && (
            <div className="mb-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400">{purgeError}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handlePurge}
            disabled={purging || isLoading}
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
