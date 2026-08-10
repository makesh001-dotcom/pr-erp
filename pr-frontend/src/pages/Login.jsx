import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/client";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e?.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await login({
        username: username.trim(),
        password,
      });

      navigate("/dashboard");
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || "Invalid username or password.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-sans relative transition-colors duration-200">
      
      {/* Top Right Theme Switcher */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-in">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/10">
            <span className="text-primary-foreground font-black text-2xl">PR</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">PR Automations</h1>
          <p className="text-sm text-muted-foreground mt-1">Inventory & ERP Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-card text-card-foreground rounded-2xl shadow-card border border-border p-8">
          <h2 className="text-lg font-bold text-foreground mb-6">Sign In</h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-danger-soft border border-danger/30 text-danger text-sm rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="ml-auto text-danger/70 hover:text-danger font-bold text-base leading-none"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5 tracking-wider">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-3 bg-surface-subtle text-foreground border border-border rounded-xl text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60 transition"
                  placeholder="Enter username"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5 tracking-wider">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-12 py-3 bg-surface-subtle text-foreground border border-border rounded-xl text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60 transition"
                  placeholder="Enter password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm transition"
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full"></span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} PR Automations. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}