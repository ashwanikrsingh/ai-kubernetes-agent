"use client";

import { useEffect, useState } from "react";

type Props = {
  selected: string | null;
  onSelect: (cluster: string) => void;
  disabled?: boolean;
};

export function ClusterSelector({ selected, onSelect, disabled }: Props) {
  const [clusters, setClusters] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    fetch(`${apiUrl}/clusters`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load clusters (${r.status})`);
        return r.json();
      })
      .then((data) => {
        const list: string[] = data.clusters ?? [];
        const cur: string = data.current ?? "";
        setClusters(list);
        setCurrent(cur);
        if (!selected && cur) onSelect(cur);
        else if (!selected && list.length > 0) onSelect(list[0]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span className="w-3.5 h-3.5 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
        Loading clusters...
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-500">Could not load clusters: {error}</p>
    );
  }

  if (clusters.length === 0) {
    return (
      <p className="text-sm text-slate-400">No Kubernetes contexts found in kubeconfig.</p>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
        Select Cluster
      </p>
      <div className="flex flex-wrap gap-2">
        {clusters.map((name) => {
          const isSelected = selected === name;
          const isCurrent = name === current;
          return (
            <button
              key={name}
              onClick={() => onSelect(name)}
              disabled={disabled}
              className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                  : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isSelected ? "bg-white/70" : isCurrent ? "bg-emerald-400" : "bg-slate-300"
              }`} />
              {name}
              {isCurrent && !isSelected && (
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 leading-none">
                  active
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
