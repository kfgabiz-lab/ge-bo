"use client";

import { useAuthStore } from "@/store/authStore";

export default function DashboardPage() {
    const adminInfo = useAuthStore((state) => state.adminInfo);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
                <div className="text-sm text-slate-500">
                    반갑습니다, <span className="font-semibold text-blue-600">{adminInfo?.name || '관리자'}</span>님!
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: '오늘 방문자', value: '1,284', trend: '+12.5%', color: 'blue' },
                    { label: '신규 게시물', value: '42', trend: '+5.2%', color: 'green' },
                    { label: '활성 사용자', value: '856', trend: '-2.1%', color: 'purple' },
                    { label: '시스템 상태', value: '정상', trend: '100%', color: 'emerald' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                            <span className={`text-xs font-medium ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                                {stat.trend}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96 flex items-center justify-center">
                <p className="text-slate-400 italic">차트 및 상세 KPI 데이터 로딩 중...</p>
            </div>
        </div>
    );
}
