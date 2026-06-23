type Investigation = {
  id: string;
  root_cause: string;
  confidence: number;
  status: string;
  namespace: string;
  created_at: string;
};

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : value >= 50 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${color}`}>
      {value}%
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "healthy" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : status === "completed" ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${color}`}>
      {status}
    </span>
  );
}

export function HistoryList({ history }: { history: Investigation[] }) {
  if (history.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Recent Investigations
        </h2>
      </div>
      <div className="divide-y divide-slate-50">
        {history.map((item) => (
          <div key={item.id} className="flex items-start justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors">
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-sm font-medium text-slate-800 truncate leading-snug">
                {item.root_cause}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                <span className="mx-1.5 text-slate-200">·</span>
                {item.namespace}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <ConfidenceBadge value={item.confidence} />
              <StatusBadge status={item.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
