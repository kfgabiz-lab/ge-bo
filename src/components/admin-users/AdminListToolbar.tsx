'use client';

import { Search, ChevronDown, X } from 'lucide-react';
import { useAdminStore } from '@/store/useAdminStore';
import { useRoleStore } from '@/store/useRoleStore';

export const AdminListToolbar = () => {
    const { searchTerm, setSearchTerm, filterRole, setFilterRole } = useAdminStore();
    const { roles } = useRoleStore();
    const hasFilter = searchTerm || filterRole !== 'ALL';

    return (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                    type="text"
                    placeholder="이름, 이메일, 사번 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-56 pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-slate-900 focus:w-72 bg-slate-50 focus:bg-white transition-all"
                />
            </div>

            {/* Role filter */}
            <div className="relative">
                <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-100 bg-white focus:outline-none focus:border-slate-900 transition-all cursor-pointer"
                >
                    <option value="ALL">권한 · 전체</option>
                    {roles.map((role) => (
                        <option key={role.code} value={role.code}>
                            {role.displayName}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>

            {hasFilter && (
                <button
                    onClick={() => { setSearchTerm(''); setFilterRole('ALL'); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#ef4444] bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-all"
                >
                    <X className="w-3 h-3" />
                    초기화
                </button>
            )}
        </div>
    );
};
