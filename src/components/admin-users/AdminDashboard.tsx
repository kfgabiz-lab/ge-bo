'use client';

import { Users, UserCheck, UserX } from 'lucide-react';
import { useAdminStore } from '@/store/useAdminStore';

export const AdminDashboard = () => {
    const { admins } = useAdminStore();
    const totalCount = admins.length;
    const activeCount = admins.filter(a => a.isActive).length;
    const lockedCount = admins.filter(a => !a.isActive).length;

    const stats = [
        { label: '전체 계정', value: totalCount, icon: Users, color: '#0f172a', bg: '#f1f5f9' },
        { label: '활성', value: activeCount, icon: UserCheck, color: '#10b981', bg: '#ecfdf5' },
        { label: '잠금', value: lockedCount, icon: UserX, color: '#ef4444', bg: '#fef2f2' },
    ];

    return (
        <div className="grid grid-cols-3 gap-4 mb-5">
            {stats.map((stat) => (
                <div key={stat.label} className="bg-white border border-slate-200 rounded-md p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stat.bg }}>
                        <stat.icon className="w-4.5 h-4.5" style={{ color: stat.color }} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                        <p className="text-xl font-bold text-slate-900 leading-tight">{stat.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};
