"use client";

import { useState, useEffect, useRef } from "react";
import { insforge } from "@/lib/insforge";
import { LoginForm } from "@/components/LoginForm";
import { DiagnosisCard } from "@/components/DiagnosisCard";
import { HistoryList } from "@/components/HistoryList";
import { SystemStatus } from "@/components/SystemStatus";
import { ClusterSelector } from "@/components/ClusterSelector";

const STEPS = [
  "Checking Pods",
  "Reading Logs",
  "Analyzing Events",
  "Inspecting Deployments",
  "Checking Networking",
  "AI Reasoning",
  "Root Cause Found",
];

// Each step lights up at these ms marks while the API runs
const STEP_DELAYS = [0, 2000, 4000, 6500, 9000, 11500];

function friendlyApiError(err: string): string {
  if (err.includes("503") || err.toLowerCase().includes("unreachable"))
    return "Cannot connect to Kubernetes cluster. Verify your kubeconfig and cluster status.";
  if (err.toLowerCase().includes("kubectl not found"))
    return "kubectl is not installed. Please install kubectl and restart the backend.";
  if (err.toLowerCase().includes("kubeconfig"))
    return "No kubeconfig found. Set KUBECONFIG_PATH in your backend .env file.";
  if (err.includes("500"))
    return "Backend error. Check the server logs for details.";
  if (err.toLowerCase().includes("failed to fetch") || err.toLowerCase().includes("networkerror"))
    return "Cannot reach the backend. Is the FastAPI server running on port 8000?";
  return err;
}

export default function Home() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  const [isInvestigating, setIsInvestigating] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const realtimeReady = useRef(false);

  // Restore session on mount
  useEffect(() => {
    insforge.auth.getCurrentUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setAuthLoading(false);
    });
  }, []);

  // Load history + wire up realtime when user is known
  useEffect(() => {
    if (!user) return;
    fetchHistory();
    connectRealtime();
    return () => {
      if (realtimeReady.current) {
        insforge.realtime.unsubscribe(`investigations-${user.id}`);
        insforge.realtime.disconnect();
        realtimeReady.current = false;
      }
    };
  }, [user]);

  const fetchHistory = async () => {
    const { data } = await insforge.database
      .from("investigations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setHistory(data);
  };

  const connectRealtime = async () => {
    try {
      await insforge.realtime.connect();
      const channel = `investigations-${user.id}`;
      const res = await insforge.realtime.subscribe(channel);
      if (res.ok) {
        realtimeReady.current = true;
        insforge.realtime.on("new_investigation", () => fetchHistory());
      }
    } catch {
      // Realtime unavailable — history still refreshes manually after each run
    }
  };

  const handleInvestigate = async () => {
    if (!selectedCluster) return;

    setIsInvestigating(true);
    setCompletedSteps([]);
    setDiagnosis(null);
    setApiError(null);

    // Simulate progress while the API call runs
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEP_DELAYS.forEach((delay, index) => {
      timers.push(
        setTimeout(() => {
          setCompletedSteps((prev) => (prev.includes(index) ? prev : [...prev, index]));
        }, delay)
      );
    });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cluster: selectedCluster }),
      });

      if (!res.ok) {
        const detail = await res.json().then((d) => d.detail ?? res.statusText).catch(() => res.statusText);
        throw new Error(`${res.status}: ${detail}`);
      }

      const result = await res.json();
      timers.forEach(clearTimeout);
      setCompletedSteps(STEPS.map((_, i) => i));
      setDiagnosis(result.diagnosis);

      // Persist to InsForge
      if (user) {
        await insforge.database.from("investigations").insert([{
          user_id: user.id,
          root_cause: result.diagnosis?.root_cause ?? "Unknown",
          confidence: result.diagnosis?.confidence ?? 0,
          status: result.diagnosis?.is_healthy ? "healthy" : "completed",
          namespace: "all",
        }]);

        if (realtimeReady.current) {
          try {
            await insforge.realtime.publish(
              `investigations-${user.id}`,
              "new_investigation",
              {}
            );
          } catch {}
        }

        await fetchHistory();
      }
    } catch (err: any) {
      timers.forEach(clearTimeout);
      setApiError(friendlyApiError(err.message || "Investigation failed"));
      setCompletedSteps([]);
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleLogout = async () => {
    await insforge.auth.signOut();
    if (realtimeReady.current) {
      insforge.realtime.disconnect();
      realtimeReady.current = false;
    }
    setUser(null);
    setDiagnosis(null);
    setHistory([]);
    setCompletedSteps([]);
    setSelectedCluster(null);
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <span className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
          Loading...
        </div>
      </main>
    );
  }

  if (!user) return <LoginForm onLogin={setUser} />;

  const showProgress = isInvestigating || completedSteps.length > 0;
  const isHealthy = diagnosis?.is_healthy === true;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">

        {/* Header */}
        <header className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl shadow-sm shadow-blue-200 select-none">
              ⎈
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">AI Kubernetes Agent</h1>
              <p className="text-slate-400 text-xs">Intelligent cluster troubleshooting</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-400 hidden sm:block max-w-[180px] truncate">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 transition"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Status + Cluster card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Backend</span>
            <SystemStatus />
          </div>
          <div className="px-5 py-5">
            <ClusterSelector
              selected={selectedCluster}
              onSelect={setSelectedCluster}
              disabled={isInvestigating}
            />
          </div>
        </div>

        {/* Investigate button */}
        <button
          onClick={handleInvestigate}
          disabled={isInvestigating || !selectedCluster}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {isInvestigating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Investigating...
            </span>
          ) : "Investigate Cluster"}
        </button>

        {/* Error */}
        {apiError && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <span className="text-red-400 mt-0.5 text-xs">⚠</span>
            <p className="text-sm text-red-600 leading-relaxed">{apiError}</p>
          </div>
        )}

        {/* Progress timeline */}
        {showProgress && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Investigation Progress
            </p>
            <div>
              {STEPS.map((step, i) => {
                const done = completedSteps.includes(i);
                const next = !done && completedSteps.includes(i - 1) && isInvestigating;
                const isLast = i === STEPS.length - 1;
                return (
                  <div key={i} className="relative flex items-start gap-3 pb-4 last:pb-0">
                    {!isLast && (
                      <div className={`absolute left-[7px] top-5 bottom-0 w-px ${done ? "bg-blue-200" : "bg-slate-100"}`} />
                    )}
                    <div className={`relative z-10 w-[15px] h-[15px] mt-0.5 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                      done ? "bg-blue-600"
                      : next ? "bg-white ring-2 ring-blue-400"
                      : "bg-white ring-2 ring-slate-200"
                    }`}>
                      {done && (
                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8">
                          <path d="M1.5 4l2 2 3-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {next && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse block" />}
                    </div>
                    <span className={`text-sm transition-colors duration-300 ${
                      done ? "text-slate-800 font-medium"
                      : next ? "text-blue-500"
                      : "text-slate-400"
                    }`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Healthy state */}
        {diagnosis && isHealthy && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm flex-shrink-0 shadow-sm shadow-emerald-200 mt-0.5">
                ✓
              </div>
              <div>
                <h2 className="font-semibold text-emerald-800">Cluster is Healthy</h2>
                <p className="text-emerald-700 text-sm mt-1 leading-relaxed">{diagnosis.explanation}</p>
                <p className="text-emerald-600/80 text-xs mt-2">{diagnosis.prevention}</p>
              </div>
            </div>
          </div>
        )}

        {/* Diagnosis */}
        {diagnosis && !isHealthy && <DiagnosisCard diagnosis={diagnosis} />}

        {/* History */}
        <HistoryList history={history} />
      </div>
    </main>
  );
}
