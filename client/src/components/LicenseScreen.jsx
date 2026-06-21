import { useState } from "react";
import { FiLock, FiAlertCircle } from "react-icons/fi";
import { activateLicense } from "../utils/electron";

export default function LicenseScreen({ status, expiresLabel, onActivated }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isExpired = status === "expired";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await activateLicense(password);
      if (!result?.success) {
        setError(result?.error || "Activation failed.");
        return;
      }
      onActivated(result);
    } catch (err) {
      setError(err.message || "Activation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-lg p-8">
        <div className="flex items-center gap-3 mb-2">
          <FiLock className="text-blue-600 text-2xl shrink-0" />
          <h1 className="text-2xl font-bold text-gray-900">Interview Prep</h1>
        </div>

        {isExpired ? (
          <div className="mt-4 mb-6 flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900 text-sm">
            <FiAlertCircle className="shrink-0 mt-0.5" />
            <p>
              Your access expired{expiresLabel ? ` on ${expiresLabel}` : ""}. Enter a new
              password from the developer to continue.
            </p>
          </div>
        ) : (
          <p className="mt-2 mb-6 text-gray-600 text-sm">
            Enter the password you received to unlock the app.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="license-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="license-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
