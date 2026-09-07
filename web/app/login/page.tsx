"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "https://personal-ai-assistant-2nno.onrender.com";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function submit() {
    setError("");

    if (!email || !password || (isRegister && !name)) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    const endpoint = isRegister
      ? "/api/auth/register"
      : "/api/auth/login";

    const body = isRegister
      ? { name, email, password }
      : { email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error || "Something went wrong. Please try again."
        );
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name);

      router.push("/");
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      submit();
    }
  }

  function toggleMode() {
    setIsRegister(!isRegister);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-8">
      <div className="w-full max-w-md">

        {/* Logo + Heading */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-500 text-white text-2xl sm:text-3xl font-bold mb-4 shadow-lg shadow-indigo-500/30">
            A
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Personal AI Assistant
          </h1>

          <p className="text-slate-400 mt-2 text-sm sm:text-base">
            {isRegister
              ? "Create your account"
              : "Welcome back"}
          </p>
        </div>

        {/* Login / Register Card */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-2xl">

          {isRegister && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="name"
              className="w-full box-border bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 mb-3 text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
            className="w-full box-border bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 mb-3 text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete={
              isRegister ? "new-password" : "current-password"
            }
            className="w-full box-border bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 mb-4 text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={submit}
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl px-4 py-3 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {loading
              ? "Please wait..."
              : isRegister
              ? "Register"
              : "Login"}
          </button>

          {/* Toggle */}
          <button
            onClick={toggleMode}
            className="w-full text-slate-400 hover:text-indigo-400 mt-4 text-sm transition py-1"
          >
            {isRegister
              ? "Already have an account? Login"
              : "Need an account? Register"}
          </button>
        </div>
      </div>
    </main>
  );
}

