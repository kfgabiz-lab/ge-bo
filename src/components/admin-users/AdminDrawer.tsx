'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, AlertCircle, KeyRound } from 'lucide-react';
import { adminSchema, AdminFormData } from '@/lib/validations/admin';
import { useAdminStore } from '@/store/useAdminStore';
import { useRoleStore } from '@/store/useRoleStore';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export const AdminDrawer = () => {
    const { isDrawerOpen, closeDrawer, selectedAdmin, addAdmin, updateAdmin, resetPassword, isLoading } = useAdminStore();
    const { roles, isLoading: isRolesLoading, isError: isRolesError, fetchRoles } = useRoleStore();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<AdminFormData>({
        resolver: zodResolver(adminSchema),
        defaultValues: { name: '', email: '', employeeId: '', role: '', isActive: true },
    });

    useEffect(() => {
        reset(selectedAdmin
            ? { name: selectedAdmin.name, email: selectedAdmin.email, employeeId: selectedAdmin.employeeId, role: selectedAdmin.role, isActive: selectedAdmin.isActive }
            : { name: '', email: '', employeeId: '', role: '', isActive: true }
        );
    }, [selectedAdmin, reset, isDrawerOpen]);

    useEffect(() => {
        if (isDrawerOpen && roles.length === 0) {
            fetchRoles();
        }
    }, [isDrawerOpen, roles.length, fetchRoles]);

    const onSubmit = async (data: AdminFormData) => {
        try {
            if (selectedAdmin) {
                await updateAdmin(selectedAdmin.id, data);
                toast.success('관리자 정보가 수정되었습니다.');
            } else {
                const { tempPassword } = await addAdmin(data);
                toast.success(`등록 완료. 임시 비밀번호: ${tempPassword}`, { duration: 5000 });
            }
        } catch {
            toast.error('작업 중 오류가 발생했습니다.');
        }
    };

    const handleConfirmReset = async () => {
        if (!selectedAdmin) return;
        try {
            const tempPassword = await resetPassword(selectedAdmin.id);
            toast.success(`초기화 완료. 임시 비밀번호: ${tempPassword}`, { duration: 5000 });
        } catch {
            toast.error('비밀번호 초기화 중 오류가 발생했습니다.');
        }
    };

    if (!isDrawerOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
                onClick={closeDrawer}
            />

            {/* Panel */}
            <div className="relative w-[420px] bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-250 border-l border-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            {selectedAdmin ? '관리자 수정' : '관리자 등록'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {selectedAdmin ? '관리자 정보를 수정합니다' : '신규 관리자를 등록합니다'}
                        </p>
                    </div>
                    <button
                        onClick={closeDrawer}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                    {/* Basic Info */}
                    <section className="space-y-4">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">기본 정보</p>

                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700">
                                이름 <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register('name')}
                                placeholder="실명 입력"
                                className={`w-full text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all ${errors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                            />
                            {errors.name && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />{errors.name.message}
                                </p>
                            )}
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700">
                                이메일 (아이디) <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register('email')}
                                placeholder="admin@example.com"
                                className={`w-full text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                            />
                            {errors.email && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />{errors.email.message}
                                </p>
                            )}
                        </div>

                        {/* Employee ID */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700">
                                사번 <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register('employeeId')}
                                placeholder="ST-0000"
                                className={`w-full text-sm border rounded-md px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all ${errors.employeeId ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                            />
                            {errors.employeeId && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />{errors.employeeId.message}
                                </p>
                            )}
                        </div>

                        {/* Active toggle */}
                        <div className="flex items-center justify-between py-3 px-3.5 bg-slate-50 border border-slate-300 rounded-md">
                            <div>
                                <p className="text-xs font-semibold text-slate-700">계정 상태</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">비활성화 시 로그인이 차단됩니다</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" {...register('isActive')} className="sr-only peer" />
                                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                            </label>
                        </div>
                    </section>

                    {/* Role */}
                    <section className="space-y-3">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">권한</p>
                        <div className="relative">
                            <select
                                {...register('role')}
                                disabled={isRolesLoading || isRolesError || roles.length === 0}
                                className="w-full appearance-none text-sm border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 bg-white text-slate-700 pr-8 cursor-pointer transition-all disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                            >
                                {isRolesLoading ? (
                                    <option value="">역할 불러오는 중...</option>
                                ) : isRolesError ? (
                                    <option value="">역할 목록을 불러올 수 없습니다.</option>
                                ) : roles.length === 0 ? (
                                    <option value="">등록된 역할이 없습니다.</option>
                                ) : (
                                    <>
                                        <option value="">권한을 선택하세요</option>
                                        {roles.map((role) => (
                                            <option key={role.code} value={role.code}>
                                                {role.displayName}
                                            </option>
                                        ))}
                                    </>
                                )}
                            </select>
                            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                        {errors.role && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />{errors.role.message}
                            </p>
                        )}
                        <p className="text-[11px] text-slate-400">각 역할별 접근 가능한 메뉴와 기능이 다릅니다.</p>
                    </section>

                    {/* Security — edit mode only */}
                    {selectedAdmin && (
                        <section className="space-y-3">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">보안</p>
                            <div className="flex items-center justify-between p-3.5 border border-slate-300 rounded-md">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center flex-shrink-0">
                                        <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-700">비밀번호 초기화</p>
                                        <p className="text-[11px] text-slate-400">임시 비밀번호를 발급합니다</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmOpen(true)}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-md hover:border-slate-300 hover:text-slate-900 transition-all"
                                >
                                    초기화
                                </button>
                            </div>
                        </section>
                    )}
                </form>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-200 flex gap-2.5">
                    <button
                        type="button"
                        onClick={closeDrawer}
                        className="flex-1 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 transition-all"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit(onSubmit)}
                        disabled={isLoading}
                        className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                        {isLoading
                            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : (selectedAdmin ? '저장' : '등록')
                        }
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmReset}
                title="비밀번호 초기화"
                description={`${selectedAdmin?.name} 관리자의 비밀번호를 초기화하시겠습니까?`}
                confirmText="초기화 실행"
                variant="danger"
            />
        </div>
    );
};
