'use client';

import { useEffect, useState } from 'react';
import { Edit2, Trash2, ShieldCheck } from 'lucide-react';
import { useAdminStore, Admin } from '@/store/useAdminStore';
import { useRoleStore } from '@/store/useRoleStore';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export const AdminTable = () => {
    const { admins, searchTerm, filterRole, isLoading, fetchAdmins, openDrawer, toggleAdminStatus, deleteAdmin } = useAdminStore();
    const { roles, fetchRoles } = useRoleStore();
    const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);

    const getRoleInfo = (code: string) => roles.find((r) => r.code === code);

    useEffect(() => { fetchAdmins(); }, [fetchAdmins]);
    useEffect(() => { if (roles.length === 0) fetchRoles(); }, [roles.length, fetchRoles]);

    const handleToggleStatus = async (admin: Admin) => {
        await toggleAdminStatus(admin.id);
        toast.info(`${admin.name} 계정이 ${!admin.isActive ? '활성화' : '잠금 처리'} 되었습니다.`);
    };

    const filtered = admins.filter((admin) => {
        const matchesSearch =
            (admin.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (admin.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (admin.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'ALL' || admin.role === filterRole;
        return matchesSearch && matchesRole;
    });

    if (isLoading && filtered.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center gap-3 text-slate-500">
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading...</span>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto">
            <table className="w-full text-left min-w-[700px]">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">관리자</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">사번</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">권한</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">상태</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">등록일</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">관리</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.length > 0 ? filtered.map((admin) => (
                        <tr key={admin.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            {/* Name + Email */}
                            <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 text-white" style={{ backgroundColor: getRoleInfo(admin.role)?.color ?? '#6b7280' }}>
                                        {admin.name?.substring(0, 2) || '??'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{admin.name || '—'}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{admin.email || '—'}</p>
                                    </div>
                                </div>
                            </td>

                            {/* Employee ID */}
                            <td className="px-5 py-3.5">
                                <span className="text-sm text-slate-700 font-mono">{admin.employeeId || '—'}</span>
                            </td>

                            {/* Role badge */}
                            <td className="px-5 py-3.5">
                                <span
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-white"
                                    style={{ backgroundColor: getRoleInfo(admin.role)?.color ?? '#6b7280' }}
                                >
                                    {getRoleInfo(admin.role)?.displayName ?? admin.role}
                                </span>
                            </td>

                            {/* Status badge */}
                            <td className="px-5 py-3.5">
                                <button
                                    onClick={() => handleToggleStatus(admin)}
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${admin.isActive
                                        ? 'bg-[#ecfdf5] text-[#059669] hover:bg-emerald-100'
                                        : 'bg-[#fef2f2] text-[#dc2626] hover:bg-red-100'
                                        }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${admin.isActive ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
                                    {admin.isActive ? '활성' : '잠금'}
                                </button>
                            </td>

                            {/* Created */}
                            <td className="px-5 py-3.5">
                                <span className="text-xs text-slate-400">
                                    {new Intl.DateTimeFormat('ko-KR').format(new Date(admin.createdAt))}
                                </span>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <button
                                        onClick={() => openDrawer(admin)}
                                        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setAdminToDelete(admin)}
                                        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-[#ef4444] hover:bg-[#fef2f2] transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} className="py-16 text-center">
                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                    <ShieldCheck className="w-8 h-8" />
                                    <p className="text-sm">조건에 맞는 관리자가 없습니다.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <ConfirmModal
                isOpen={!!adminToDelete}
                onClose={() => setAdminToDelete(null)}
                onConfirm={() => {
                    if (adminToDelete) {
                        deleteAdmin(adminToDelete.id);
                        toast.success(`${adminToDelete.name} 관리자가 삭제되었습니다.`);
                    }
                }}
                title="관리자 계정 삭제"
                description={`${adminToDelete?.name} 계정을 영구 삭제하시겠습니까?`}
                confirmText="삭제하기"
                variant="danger"
            />
        </div>
    );
};
