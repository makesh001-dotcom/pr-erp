import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LogoutPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear ALL stored data
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.clear(); // Complete cleanup

    // Redirect after delay
    const timer = setTimeout(() => {
      navigate("/login", { replace: true });
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200 p-10 text-center animate-in fade-in zoom-in duration-500">
        
        {/* Icon */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-indigo-100 rounded-2xl animate-ping opacity-30"></div>
          <div className="relative bg-indigo-50 w-full h-full rounded-2xl flex items-center justify-center text-3xl">
            👋
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Logged Out Successfully
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          You have been safely signed out. Redirecting to login...
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
          <div 
            className="bg-indigo-600 h-full rounded-full animate-shrink"
            style={{
              animation: "shrink 2.5s linear forwards",
            }}
          />
        </div>

        {/* Fallback Button */}
        <button 
          onClick={() => navigate("/login", { replace: true })}
          className="mt-8 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Go to Login Now →
        </button>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-400">
        © {new Date().getFullYear()} PR Automations
      </p>

      {/* CSS Animation */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-shrink {
          animation: shrink 2.5s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default LogoutPage;