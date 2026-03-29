export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, Super Admin. Here is what is happening today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-4 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Year</option>
          </select>
          <button className="px-4 py-2 bg-[var(--primary)] text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Visitors', value: '84,230', change: '+12.5%', isUp: true },
          { label: 'Active Sessions', value: '1,432', change: '+5.2%', isUp: true },
          { label: 'Content Published', value: '38', change: '-2.4%', isUp: false },
          { label: 'Global Regions Active', value: '4', change: '0%', isUp: null },
        ].map((kpi, i) => (
          <div key={i} className="p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-sm flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-500">{kpi.label}</span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold tracking-tight">{kpi.value}</span>
              {kpi.isUp !== null && (
                <span className={`text-sm font-medium ${kpi.isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                  {kpi.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Chart Placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2 p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-sm min-h-[400px]">
          <h3 className="text-lg font-semibold mb-6">Traffic Analytics</h3>
          <div className="w-full h-[300px] border-2 border-dashed border-[var(--border-color)] rounded-lg flex items-center justify-center text-slate-400">
            [ Line Chart Area ]
          </div>
        </div>
        <div className="p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-sm min-h-[400px]">
          <h3 className="text-lg font-semibold mb-6">Device Breakdown</h3>
          <div className="w-full h-[300px] border-2 border-dashed border-[var(--border-color)] rounded-lg flex items-center justify-center text-slate-400">
            [ Donut Chart Area ]
          </div>
        </div>
      </div>
    </div>
  );
}
