"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import { User, Lock, Eye, EyeOff, ArrowRight, LayoutGrid, ShieldCheck, Users } from "lucide-react";

const loginSchema = z.object({
    /* 영문·숫자만, 최대 30자 */
    email: z.string()
        .min(1, "아이디를 입력해주세요.")
        .max(30, "아이디는 최대 30자까지 입력 가능합니다.")
        .regex(/^[a-zA-Z0-9]+$/, "영문/숫자만 입력 가능합니다."),
    password: z.string().min(4, "비밀번호는 최소 4자 이상이어야 합니다."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const login = useAuthStore((state) => state.login);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "P@ssw0rd123",
        },
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        try {
            const response = await api.post("/auth/login", data);
            const { accessToken, adminInfo } = response.data;
            login(accessToken, adminInfo);
            toast.success(`${adminInfo.name}님, 반갑습니다!`);
            router.push("/admin/dashboard");
        } catch (error: any) {
            if (!error.response) {
                toast.error("서버에 연결할 수 없습니다. 관리자에게 문의하세요.");
                return;
            }
            const status = error.response.status;
            if (status === 401) {
                toast.error("이메일 또는 비밀번호가 일치하지 않습니다.");
            } else if (status === 403) {
                toast.error(error.response.data?.message || "로그인 권한이 거부되었습니다.");
            } else if (status >= 500) {
                toast.error("서버 내부 오류가 발생했습니다. 잠시 후 시도해주세요.");
            } else {
                toast.error(error.response.data?.message || "로그인에 실패했습니다.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Left Panel — Brand */}
            <div className="hidden lg:flex lg:w-[44%] bg-[#161929] flex-col justify-between p-12 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#4361ee]/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 -left-20 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
                </div>

                {/* Logo */}
                <div className="flex items-center gap-2.5 relative">
                    {/* 기존 로고 — 원복 시 주석 해제
                    <div className="w-8 h-8 bg-[#4361ee] rounded-lg flex items-center justify-center shadow-lg shadow-[#4361ee]/30">
                        <LayoutGrid className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-bold text-[17px] tracking-tight">BackOffice</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/10 text-white/50 rounded font-medium uppercase tracking-wider">Admin</span>
                    */}
                    <img src="/bo/ls-electric-logo.png" alt="LS ELECTRIC" className="h-6 w-auto" />
                </div>

                {/* Main copy */}
                <div className="relative">
                    <h2 className="text-white text-[2.2rem] font-bold leading-tight mb-5">
                        통합 관리<br />플랫폼
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-10">
                        시스템 운영을 위한 관리자 전용 포털입니다.<br />
                        권한이 부여된 계정으로만 접근 가능합니다.
                    </p>

                    {/* Feature chips */}
                    <div className="flex flex-col gap-3">
                        {[
                            { icon: ShieldCheck, text: "역할 기반 접근 제어 (RBAC)" },
                            { icon: Users, text: "관리자 계정 통합 관리" },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                                <span className="text-slate-400 text-sm">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-slate-600 text-xs relative">© 2026 All rights reserved.</p>
            </div>

            {/* Right Panel — Form */}
            <div className="flex-1 bg-[#f4f5f7] flex items-center justify-center p-8">
                <div className="w-full max-w-[380px]">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        {/* 기존 로고 — 원복 시 주석 해제
                        <div className="w-7 h-7 bg-[#4361ee] rounded-lg flex items-center justify-center">
                            <LayoutGrid className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg">BackOffice</span>
                        */}
                        <img src="/bo/ls-electric-logo.png" alt="LS ELECTRIC" className="h-5 w-auto" />
                    </div>

                    <div className="mb-7">
                        <h1 className="text-2xl font-bold text-[#111827] mb-1">Sign in</h1>
                        <p className="text-sm text-[#6b7280]">관리자 계정으로 로그인하세요</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-[#e2e4e9] shadow-sm p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#374151] mb-1.5">ID</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                                <input
                                    {...register("email")}
                                    type="text"
                                    autoFocus
                                    placeholder="아이디 입력"
                                    maxLength={30}
                                    className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all ${errors.email ? "border-red-400 bg-red-50" : "border-[#e2e4e9]"}`}
                                />
                            </div>
                            {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#374151] mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                                <input
                                    {...register("password")}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="비밀번호 입력"
                                    className={`w-full pl-9 pr-10 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all ${errors.password ? "border-red-400 bg-red-50" : "border-[#e2e4e9]"}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 bg-[#4361ee] hover:bg-[#3451d1] text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1 shadow-md shadow-[#4361ee]/20"
                        >
                            {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                </div>
            </div>
        </div>
    );
}
