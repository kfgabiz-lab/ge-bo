"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useSiteStore } from "@/store/use-site-store";
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Users, RefreshCw } from "lucide-react";
import { LanguageSelector } from "@/components/layout/language-selector";
import { useI18n } from "@/hooks/use-i18n";
import TotpSetupForm from "./totp-setup-form";
import TotpVerifyForm from "./totp-verify-form";

/* 폼 타입 — 스키마를 컴포넌트 내부에서 생성하므로 타입은 별도 정의 */
type LoginFormValues = {
  email: string;
  password: string;
  captchaCode: string;
};

type LoginStep = "credentials" | "totp-setup" | "totp-verify";

/* GET /api/v1/public/captcha-image 응답 — 서버 상태 없이 정답+발급시각을 암호화 토큰에 담아 왕복시킨다 */
type Captcha = { captchaImage: string; captchaToken: string };

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [captchaLoadFailed, setCaptchaLoadFailed] = useState(false);
  const [step, setStep] = useState<LoginStep>("credentials");
  const [tempToken, setTempToken] = useState("");
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const loadActiveSiteFromStorage = useSiteStore((state) => state.loadActiveSiteFromStorage);
  const { t } = useI18n();

  /* t()는 언어 변경 시 참조가 바뀌므로 deps에 넣지 않는다(넣으면 언어 전환마다 캡차가 재발급됨) —
     실패 메시지는 captchaLoadFailed 플래그로 렌더 시점에 t()를 읽어 항상 최신 언어로 표시한다 */
  const refreshCaptcha = useCallback(async () => {
    try {
      const response = await api.get<Captcha>("/public/captcha-image");
      setCaptcha(response.data);
      setCaptchaLoadFailed(false);
    } catch {
      setCaptcha(null);
      setCaptchaLoadFailed(true);
    }
  }, []);

  /* 최초 진입 시 캡차 1회 발급 */
  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  useEffect(() => {
    loadActiveSiteFromStorage();
  }, [loadActiveSiteFromStorage]);

  /* 언어 변경 시 유효성 메시지도 함께 갱신되도록 useMemo로 스키마 생성 */
  const loginSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, t("validation.id.required"))
          .max(30, t("validation.id.max"))
          .regex(/^[a-zA-Z0-9.]+$/, t("validation.id.pattern")),
        password: z.string().min(4, t("validation.password.min")),
        captchaCode: z.string().regex(/^\d{4}$/, t("validation.captcha.required")),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", captchaCode: "" },
  });

  const { onChange: onCaptchaChange, ...captchaField } = register("captchaCode");

  const onSubmit = async (data: LoginFormValues) => {
    if (!captcha) {
      toast.error(t("login.captcha.loading"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", { ...data, captchaToken: captcha.captchaToken });
      const { tempToken: token, requireTotpSetup, requireTotpVerify, accessToken, adminInfo } = response.data;

      /* 2FA 비활성화 — 바로 로그인 처리 */
      if (accessToken && adminInfo) {
        login(accessToken, adminInfo);
        router.push("/admin/dashboard");
        return;
      }

      /* 2FA 단계로 전환 */
      setTempToken(token);
      if (requireTotpSetup) {
        setStep("totp-setup");
      } else if (requireTotpVerify) {
        setStep("totp-verify");
      }
    } catch (error) {
      /* 로그인 실패 시 캡차는 항상 새로 발급받고 입력값은 비운다 */
      refreshCaptcha();
      setValue("captchaCode", "");

      const err = error as { response?: { status: number; data?: { message?: string; error?: string } } };

      if (!err.response) {
        toast.error(t("login.error.no_server"));
        return;
      }
      const status = err.response.status;
      /* GlobalExceptionHandler가 에러코드를 "error" 필드로 내려준다("code" 아님) */
      const code = err.response.data?.error;
      if (status === 401) {
        toast.error(err.response.data?.message || t("login.error.invalid"));
      } else if (status === 400 && code === "CAPTCHA_FAILED") {
        /* 서버 메시지는 항상 한국어라 여기서는 쓰지 않고 FE 번역 키를 우선한다 */
        toast.error(t("login.error.captcha"));
      } else if (status === 400 && code === "CAPTCHA_EXPIRED") {
        toast.error(t("login.error.captcha_expired"));
      } else if (status === 403) {
        toast.error(err.response.data?.message || t("login.error.forbidden"));
      } else if (status >= 500) {
        toast.error(t("login.error.server"));
      } else {
        toast.error(err.response.data?.message || t("login.error.unknown"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* 브랜드 패널 feature chip 목록 */
  const features = useMemo(
    () => [
      { icon: ShieldCheck, key: "login.brand.feature.rbac" },
      { icon: Users, key: "login.brand.feature.admin" },
    ],
    []
  );

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
            <h2 className="text-white text-[2.2rem] font-bold leading-tight mb-5">{t("login.brand.title")}</h2>
            <p className="text-slate-400 text-sm leading-relaxed">{t("login.brand.description")}</p>
          </div>
          <p className="text-slate-600 text-xs relative">{t("login.brand.footer")}</p>
        </div>

        {/* Right Panel — TOTP 컴포넌트 */}
        <div className="flex-1 bg-[#f4f5f7] flex items-center justify-center p-8">
          {step === "totp-setup" ? <TotpSetupForm tempToken={tempToken} /> : <TotpVerifyForm tempToken={tempToken} />}
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
          <h2 className="text-white text-[2.2rem] font-bold leading-tight mb-5">{t("login.brand.title")}</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">{t("login.brand.description")}</p>

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
        <p className="text-slate-600 text-xs relative">{t("login.brand.footer")}</p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 bg-[#f4f5f7] flex items-center justify-center p-8">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/bo/ls-electric-logo.png" alt="LS ELECTRIC" className="h-5 w-auto" />
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-[#111827] mb-1">{t("login.title")}</h1>
            <p className="text-sm text-[#6b7280]">{t("login.subtitle")}</p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white rounded-xl border border-[#e2e4e9] shadow-sm p-6 space-y-4"
          >
            {/* 다국어 선택 — 카드 내부 상단 우측 */}
            <div className="flex justify-end">
              <LanguageSelector />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">{t("login.id.label")}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <input
                  {...register("email")}
                  type="text"
                  autoFocus
                  placeholder={t("login.id.placeholder")}
                  maxLength={30}
                  className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all ${errors.email ? "border-red-400 bg-red-50" : "border-[#e2e4e9]"}`}
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">{t("login.password.label")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder={t("login.password.placeholder")}
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

            {/* 자체 캡차 — 이미지 + 새로고침 + 4자리 숫자 입력 */}
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">CAPTCHA</label>
              <div className="flex items-center gap-2">
                {captcha ? (
                  <img
                    src={captcha.captchaImage}
                    alt="CAPTCHA"
                    className="h-10 w-[150px] rounded-md border border-[#e2e4e9]"
                  />
                ) : (
                  <div className="h-10 w-[150px] rounded-md border border-[#e2e4e9] bg-[#f4f5f7] animate-pulse" />
                )}
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="p-2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                  aria-label="Refresh CAPTCHA"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <input
                  {...captchaField}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="CAPTCHA"
                  onChange={(e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, "");
                    onCaptchaChange(e);
                  }}
                  className={`flex-1 min-w-0 px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all ${errors.captchaCode ? "border-red-400 bg-red-50" : "border-[#e2e4e9]"}`}
                />
              </div>
              {errors.captchaCode && <p className="mt-1.5 text-xs text-red-500">{errors.captchaCode.message}</p>}
              {!errors.captchaCode && captchaLoadFailed && (
                <p className="mt-1.5 text-xs text-red-500">{t("login.captcha.load_failed")}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#4361ee] hover:bg-[#3451d1] text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1 shadow-md shadow-[#4361ee]/20"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {t("login.submit")} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
