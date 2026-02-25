import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function SLogin({ setIsLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    const adminUser = import.meta.env.VITE_ADMIN_USERNAME;
    const adminPass = import.meta.env.VITE_ADMIN_PASSWORD;

    // Safety fallback in case .env is missing during local dev
    if (!adminUser || !adminPass) {
      setError(
        "Configuration error: Admin credentials missing from environment.",
      );
      return;
    }

    // 🔐 HARDCODED CREDENTIALS (Change these!)
    // In a real app, you'd send this to a backend server.
    if (username === adminUser && password === adminPass) {
      // 1. Update App state
      setIsLoggedIn(true);

      // 2. Save to Local Storage (so refreshing doesn't log you out)
      localStorage.setItem("isAdminLoggedIn", "true");

      // 3. Go to Admin Page
      navigate("/admin");
    } else {
      setError("Invalid Username or Password");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-200">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Admin Login
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default SLogin;
