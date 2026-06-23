"use client";

import { useEffect, useState } from "react";

export function SystemStatus() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    fetch(`${apiUrl}/health`)
      .then((r) => setStatus(r.ok ? "ready" : "error"))
      .catch(() => setStatus("error"));
  }, []);

  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
        Checking...
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
      status === "ready"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-red-50 text-red-600 border-red-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === "ready" ? "bg-emerald-500 animate-pulse" : "bg-red-500"
      }`} />
      {status === "ready" ? "Backend Online" : "Backend Offline"}
    </span>
  );
}
