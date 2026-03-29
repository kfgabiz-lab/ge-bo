'use client';

import { Plus } from 'lucide-react';
import { useAdminStore } from '@/store/useAdminStore';
import { AdminDashboard } from '@/components/admin-users/AdminDashboard';
import { AdminListToolbar } from '@/components/admin-users/AdminListToolbar';
import { AdminTable } from '@/components/admin-users/AdminTable';
import { AdminDrawer } from '@/components/admin-users/AdminDrawer';

export default function AdminAccountsPage() {
    const { openDrawer } = useAdminStore();

    return (
        <div className="h-full flex flex-col">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">사용자 관리</h1>
                    <p className="text-sm text-slate-500 mt-0.5">시스템 관리자 계정을 통합 제어합니다.</p>
                </div>
                <button
                    onClick={() => openDrawer()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-semibold transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    관리자 등록
                </button>
            </div>

            {/* Stats */}
            <AdminDashboard />

            {/* Table Card */}
            <div className="flex-1 bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col min-h-0">
                <AdminListToolbar />
                <AdminTable />
            </div>

            <AdminDrawer />
        </div>
    );
}
