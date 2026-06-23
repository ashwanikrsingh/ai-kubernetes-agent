type Diagnosis = {
  root_cause: string;
  explanation: string;
  fix: string;
  kubectl_command: string;
  prevention: string;
  confidence: number;
};

const SECTIONS = [
  { key: "root_cause",      label: "Root Cause",     icon: "⬤", color: "text-red-500" },
  { key: "explanation",     label: "Explanation",    icon: "◈", color: "text-blue-500" },
  { key: "fix",             label: "Suggested Fix",  icon: "◆", color: "text-emerald-500" },
  { key: "prevention",      label: "Prevention",     icon: "◇", color: "text-slate-400" },
] as const;

export function DiagnosisCard({ diagnosis }: { diagnosis: Diagnosis }) {
  const c = diagnosis.confidence;
  const confidenceColor = c >= 80 ? "bg-emerald-500" : c >= 50 ? "bg-amber-400" : "bg-red-400";
  const confidenceText  = c >= 80 ? "text-emerald-700" : c >= 50 ? "text-amber-700" : "text-red-600";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <h2 className="font-semibold text-slate-900 text-sm">Diagnosis</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${confidenceColor}`}
                style={{ width: `${c}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${confidenceText}`}>{c}%</span>
          </div>
          <span className="text-xs text-slate-400">confidence</span>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-slate-100">
        {SECTIONS.map(({ key, label, icon, color }) => (
          <div key={key} className="px-6 py-4">
            <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${color}`}>
              <span className="text-[10px]">{icon}</span>
              <span className="text-slate-500 tracking-widest uppercase">{label}</span>
            </p>
            <p className={`text-sm leading-relaxed ${
              key === "root_cause" ? "text-slate-900 font-medium" : "text-slate-600"
            }`}>
              {diagnosis[key]}
            </p>
          </div>
        ))}

        {/* kubectl command — special block */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-slate-400">
            <span className="text-[10px] text-violet-500">▶</span>
            <span className="text-slate-500 tracking-widest uppercase">kubectl Command</span>
          </p>
          <div className="rounded-xl overflow-hidden border border-slate-800">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 opacity-70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 opacity-70" />
              <span className="ml-2 text-[10px] text-slate-500 font-mono">kubectl</span>
            </div>
            <code className="block bg-slate-900 text-emerald-400 text-sm px-4 py-3 font-mono whitespace-pre-wrap break-all leading-relaxed">
              {diagnosis.kubectl_command}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
