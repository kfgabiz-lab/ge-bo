"use client";

interface CircleCountCardProps {
  label: string;
  count: number;
  emphasis?: boolean;
}

export function CircleCountCard({ label, count, emphasis = false }: CircleCountCardProps) {
  const circleCls = emphasis ? "bg-slate-900 text-white" : "bg-white text-slate-900 border-2 border-slate-200";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-xl font-bold ${circleCls}`}>
        {count}
      </div>
      <span className="text-xs font-medium text-slate-500 text-center">{label}</span>
    </div>
  );
}
