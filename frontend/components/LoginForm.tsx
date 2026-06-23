"use client";

import { useState } from "react";
import { insforge } from "@/lib/insforge";

type Mode = "signin" | "signup" | "verify";

export function LoginForm({ onLogin }: { onLogin: (user: any) => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: Mode) => { setMode(next); setError(null); };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    if (data?.user) onLogin(data.user);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { data, error } = await insforge.auth.signUp({ email, password, name });
    setLoading(false);
    if (error) return setError(error.message);
    if (data?.requireEmailVerification) setMode("verify");
    else if (data?.user) onLogin(data.user);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { data, error } = await insforge.auth.verifyEmail({ email, otp });
    setLoading(false);
    if (error) return setError(error.message);
    if (data?.user) onLogin(data.user);
  };

  const inputClass =
    "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-slate-50 focus:bg-white";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg shadow-blue-900/40 select-none">
            ⎈
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Kubernetes Agent</h1>
          <p className="text-slate-400 text-sm mt-1.5">Intelligent cluster troubleshooting</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl shadow-black/30">
          {mode === "verify" ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 text-lg mx-auto mb-3">
                  ✉
                </div>
                <h2 className="font-semibold text-slate-900">Check your email</h2>
                <p className="text-xs text-slate-500 mt-1">
                  We sent a 6-digit code to <span className="font-medium text-slate-700">{email}</span>
                </p>
              </div>
              <input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className={`${inputClass} text-center text-xl tracking-[0.5em] font-mono`}
                required
              />
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition flex items-center justify-center gap-2"
              >
                {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Verifying..." : "Verify Email"}
              </button>
              <button type="button" onClick={() => switchMode("signup")} className="w-full text-xs text-slate-400 hover:text-slate-600 transition py-1">
                ← Back
              </button>
            </form>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1">
                {(["signin", "signup"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                      mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {m === "signin" ? "Sign In" : "Create Account"}
                  </button>
                ))}
              </div>

              <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-3">
                {mode === "signup" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition mt-1 flex items-center justify-center gap-2"
                >
                  {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Create Account"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
