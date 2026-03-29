"use client";

import React, { useState, useEffect } from 'react';
import { X, Mail, User, Briefcase, Shield, Key, Eye, EyeOff, CheckCircle2, Copy } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const adminSchema = z.object({
    email: z.string().email('올바른 이메일 형식이 아닙니다.'),
    name: z.string().min(2, '이름은 2자 이상이어야 합니다.'),
    employeeId: z.string().optional(),
    role: z.enum(['SUPER_ADMIN', 'EDITOR']),
    password: z.string().optional(),
    autoPassword: z.boolean(),
    isEditMode: z.boolean(),
}).superRefine((data, ctx) => {
    // 신규 등록 시: 자동 발급이 아니면 반드시 8자리 이상 비밀번호 필요
    if (!data.isEditMode && !data.autoPassword && (!data.password || data.password.length < 8)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '수동 설정 시 8자 이상의 비밀번호를 입력해야 합니다.',
            path: ['password']
        });
    }
    // 정보 수정 시: 비밀번호 칸에 무언가 적었다면 8자리 이상이어야 함 (안 적으면 기존 유지)
    if (data.isEditMode && data.password && data.password.length > 0 && data.password.length < 8) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '비밀번호 변경 시 8자 이상 입력해주세요. (변경하지 않으려면 비워두세요)',
            path: ['password']
        });
    }
});

type AdminFormValues = z.infer<typeof adminSchema>;

interface AdminDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: any) => Promise<void>;
    initialData?: any;
}

export function AdminDrawer({ isOpen, onClose, onSubmit, initialData }: AdminDrawerProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tempPassword, setTempPassword] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors }
    } = useForm<AdminFormValues>({
        resolver: zodResolver(adminSchema),
        defaultValues: {
            role: 'EDITOR',
            autoPassword: false,
            isEditMode: false
        }
    });

    const isAutoPassword = watch('autoPassword');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({
                    email: initialData.email,
                    name: initialData.name,
                    employeeId: initialData.employeeId,
                    role: initialData.role,
                    autoPassword: false,
                    isEditMode: true
                });
            } else {
                reset({
                    email: '',
                    name: '',
                    employeeId: 'BO-2026-00000',
                    role: 'EDITOR',
                    autoPassword: true,
                    isEditMode: false
                });
            }
            setTempPassword(null);
            setIsSubmitting(false);
        }
    }, [initialData, reset, isOpen]);

    const onFormSubmit = async (data: AdminFormValues) => {
        setIsSubmitting(true);
        try {
            await onSubmit(data);
            // On success, Parent should handle tempPassword if returned from API
            // For now, assume parent marks success
        } catch (error: any) {
            // 에러 처리는 부모 컴포넌트(page.tsx)에서 구체적인 메시지로 이미 toast 알림을 띄우므로 생략합니다.
            console.error("Form submit error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-right border-l border-slate-200">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                                <User className="w-5 h-5" />
                            </div>
                            {initialData ? '계정 정보 수정' : '새 관리자 등록'}
                        </h2>
                        <p className="text-slate-400 text-[11px] font-bold tracking-wider mt-1.5 uppercase">Account Configuration</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/30">
                    {/* Basic Info Section */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">기본 정보 (Identity)</h3>

                        <div className="grid grid-cols-1 gap-5">
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-slate-600 ml-1">이메일 계정</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        {...register('email')}
                                        disabled={!!initialData}
                                        className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium disabled:bg-slate-50 disabled:text-slate-400 outline-none"
                                        placeholder="admin@bo.com"
                                    />
                                </div>
                                {errors.email && <p className="text-red-500 text-[11px] font-medium mt-1 ml-1">{errors.email.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-slate-600 ml-1">성함</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        {...register('name')}
                                        className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium outline-none"
                                        placeholder="이름을 입력하세요"
                                    />
                                </div>
                                {errors.name && <p className="text-red-500 text-[11px] font-medium mt-1 ml-1">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-slate-600 ml-1">사번 (Employee ID)</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        {...register('employeeId')}
                                        disabled={true}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-slate-400 focus:outline-none transition-all font-medium outline-none cursor-not-allowed"
                                        placeholder="BO-2026-00000"
                                    />
                                </div>
                                {errors.employeeId && <p className="text-red-500 text-[11px] font-medium mt-1 ml-1">{errors.employeeId.message}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Role Section */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">권한 설정 (Privileges)</h3>
                        <div className="space-y-2">
                            <label className="text-[12px] font-bold text-slate-600 ml-1">권한 선택</label>
                            <div className="relative group/field">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select
                                    {...register('role')}
                                    className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-10 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium appearance-none outline-none cursor-pointer"
                                >
                                    <option value="EDITOR">EDITOR (편집자) - 콘텐츠 및 일반 게시판 관리</option>
                                    <option value="SUPER_ADMIN">SUPER ADMIN (최고 관리자) - 시스템 설정 및 전체 관리</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                            {errors.role && <p className="text-red-500 text-[11px] font-medium mt-1 ml-1">{errors.role.message}</p>}
                        </div>
                    </div>

                    {/* Security Section */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">보안 설정 (Security)</h3>

                        {!initialData && (
                            <div className="space-y-4">
                                <div className="flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
                                    <button
                                        type="button"
                                        onClick={() => setValue('autoPassword', true)}
                                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isAutoPassword ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        자동 발급
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setValue('autoPassword', false); setValue('password', ''); }}
                                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isAutoPassword ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        수동 입력
                                    </button>
                                </div>

                                {isAutoPassword ? (
                                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                                        <div className="p-1.5 rounded-md bg-blue-100 text-blue-600 shrink-0">
                                            <Key className="w-4 h-4" />
                                        </div>
                                        <div className="text-sm text-blue-800 leading-relaxed font-medium">
                                            계정 등록 시 임시 비밀번호가 안전하게 자동 생성되며, <br />완료 알림창을 통해 임시 비밀번호를 확인하실 수 있습니다.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-[12px] font-bold text-slate-600 ml-1">수동 비밀번호 설정</label>
                                        <div className="relative group/field">
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                {...register('password')}
                                                className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-12 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium outline-none"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {initialData && (
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-slate-600 ml-1">비밀번호 변경 (선택사항)</label>
                                <div className="relative group/field">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        {...register('password')}
                                        className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-12 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium outline-none"
                                        placeholder="변경할 비밀번호 입력 (공란 시 기존 유지)"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </form>

                <div className="p-8 border-t border-slate-100 bg-white grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-4 rounded-xl bg-slate-100 text-slate-600 text-[14px] font-bold hover:bg-slate-200 transition-all active:scale-[0.98]"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={handleSubmit(onFormSubmit)}
                        disabled={isSubmitting}
                        className="py-4 rounded-xl bg-blue-600 text-white text-[14px] font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        {isSubmitting ? 'PROCESSING...' : (initialData ? '저장하기' : '등록하기')}
                    </button>
                </div>
            </div>
        </div>
    );
}
