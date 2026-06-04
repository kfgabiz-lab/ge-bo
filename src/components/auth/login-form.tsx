"use client";

import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReCAPTCHA from "react-google-recaptcha";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Users } from "lucide-react";
import { LanguageSelector } from "@/components/layout/language-selector";
import { useI18n } from "@/hooks/use-i18n";
import TotpSetupForm from "./totp-setup-form";
import TotpVerifyForm from "./totp-verify-form";

/* 폼 타입 — 스키마를 컴포넌트 내부에서 생성하므로 타입은 별도 정의 */
type LoginFormValues = {
    email: string;
    password: string;
};

type LoginStep = "credentials" | "totp-setup" | "totp-verify";

export default function LoginForm() {
    const [isLoading, setIsLoading]           = useState(false);
    const [showPassword, setShowPassword]     = useState(false);
    const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
    const [step, setStep]                     = useState<LoginStep>("credentials");
    const [tempToken, setTempToken]           = useState("");
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const router = useRouter();
    const login  = useAuthStore((state) => state.login);
    const { t }  = useI18n();

    /* 언어 변경 시 유효성 메시지도 함께 갱신되도록 useMemo로 스키마 생성 */
    const loginSchema = useMemo(() => z.object({
        email: z.string()
            .min(1,  t('validation.id.required'))
            .max(30, t('validation.id.max'))
            .regex(/^[a-zA-Z0-9]+$/, t('validation.id.pattern')),
        password: z.string().min(4, t('validation.password.min')),
    }), [t]);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "P@ssw0rd123" },
    });

    const onSubmit = async (data: LoginFormValues) => {
        /* reCAPTCHA 미완료 시 차단 */
        if (!recaptchaToken) {
            toast.error("reCAPTCHA 인증을 완료해주세요.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post("/auth/login", { ...data, recaptchaToken });
            const { tempToken: token, requireTotpSetup, requireTotpVerify } = response.data;

            /* 2FA 단계로 전환 */
            setTempToken(token);
            if (requireTotpSetup) {
                setStep("totp-setup");
            } else if (requireTotpVerify) {
                setStep("totp-verify");
            }
        } catch (error: any) {
            /* reCAPTCHA 재사용 불가 — 실패 후 초기화 */
            recaptchaRef.current?.reset();
            setRecaptchaToken(null);

            if (!error.response) {
                toast.error(t('login.error.no_server'));
                return;
            }
            const status = error.response.status;
            if (status === 401) {
                toast.error(t('login.error.invalid'));
            } else if (status === 400 && error.response.data?.code?.startsWith('RECAPTCHA')) {
                toast.error(error.response.data.message || "reCAPTCHA 인증에 실패했습니다.");
            } else if (status === 403) {
                toast.error(error.response.data?.message || t('login.error.forbidden'));
            } else if (status >= 500) {
                toast.error(t('login.error.server'));
            } else {
                toast.error(error.response.data?.message || t('login.error.unknown'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    /* 브랜드 패널 feature chip 목록 */
    const features = useMemo(() => [
        { icon: ShieldCheck, key: 'login.brand.feature.rbac'  },
        { icon: Users,       key: 'login.brand.feature.admin' },
    ], []);

    /* 2FA 단계 — 전체 레이아웃 재사용, 우측 폼 영역에 TOTP 컴포넌트 삽입 */
    if (step === "totp-setup" || step === "totp-verify") {
        return (
            <div className="flex min-h-screen">
                {/* Left Panel — Brand (동일 유지) */}
                <div className="hidden lg:flex lg:w-[44%] bg-[#161929] flex-col justify-between p-12 relative overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#4361ee]/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 -left-20 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
                    </div>
                    <div className="flex items-center gap-2.5 relative">
                        <img src="/bo/ls-electric-logo.png" alt="LS ELECTRIC" className="h-6 w-auto" />
                    </div>
                    <div className="relative">
                        <h2 className="text-white text-[2.2rem] font-bold leading-tight mb-5">
                            {t('login.brand.title')}
                        </h2>
                        <p className="text-slate-400 text-sm leading-relaxed">{t('login.brand.description')}</p>
                    </div>
                    <p className="text-slate-600 text-xs relative">{t('login.brand.footer')}</p>
                </div>

                {/* Right Panel — TOTP 컴포넌트 */}
                <div className="flex-1 bg-[#f4f5f7] flex items-center justify-center p-8">
                    {step === "totp-setup"
                        ? <TotpSetupForm tempToken={tempToken} />
                        : <TotpVerifyForm tempToken={tempToken} />
                    }
                </div>
            </div>
        );
    }

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
                    <img src="/bo/ls-electric-logo.png" alt="LS ELECTRIC" className="h-6 w-auto" />
                </div>

                {/* Main copy */}
                <div className="relative">
                    <h2 className="text-white text-[2.2rem] font-bold leading-tight mb-5">
                        {t('login.brand.title')}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-10">
                        {t('login.brand.description')}
                    </p>

                    {/* Feature chips */}
                    <div className="flex flex-col gap-3">
                        {features.map(({ icon: Icon, key }) => (
                            <div key={key} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                                <span className="text-slate-400 text-sm">{t(key)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-slate-600 text-xs relative">{t('login.brand.footer')}</p>
            </div>

            {/* Right Panel — Form */}
            <div className="flex-1 bg-[#f4f5f7] flex items-center justify-center p-8">
                <div className="w-full max-w-[380px]">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <img src="/bo/ls-electric-logo.png" alt="LS ELECTRIC" className="h-5 w-auto" />
                    </div>

                    <div className="mb-7">
                        <h1 className="text-2xl font-bold text-[#111827] mb-1">{t('login.title')}</h1>
                        <p className="text-sm text-[#6b7280]">{t('login.subtitle')}</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-[#e2e4e9] shadow-sm p-6 space-y-4">
                        {/* 다국어 선택 — 카드 내부 상단 우측 */}
                        <div className="flex justify-end">
                            <LanguageSelector />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#374151] mb-1.5">{t('login.id.label')}</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                                <input
                                    {...register("email")}
                                    type="text"
                                    autoFocus
                                    placeholder={t('login.id.placeholder')}
                                    maxLength={30}
                                    className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all ${errors.email ? "border-red-400 bg-red-50" : "border-[#e2e4e9]"}`}
                                />
                            </div>
                            {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#374151] mb-1.5">{t('login.password.label')}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                                <input
                                    {...register("password")}
                                    type={showPassword ? "text" : "password"}
                                    placeholder={t('login.password.placeholder')}
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

                        {/* reCAPTCHA v2 체크박스 */}
                        <div className="flex justify-center">
                            <ReCAPTCHA
                                ref={recaptchaRef}
                                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                                onChange={(token) => setRecaptchaToken(token)}
                                onExpired={() => setRecaptchaToken(null)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !recaptchaToken}
                            className="w-full py-2.5 bg-[#4361ee] hover:bg-[#3451d1] text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1 shadow-md shadow-[#4361ee]/20"
                        >
                            {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>{t('login.submit')} <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                </div>
            </div>
        </div>
    );
}
