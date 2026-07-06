"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import OtpInput from "./otp-input";

interface TotpVerifyFormProps {
    tempToken: string;
}

/** TOTP 로그인 검증 화면 (OTP 6자리 입력) */
export default function TotpVerifyForm({ tempToken }: TotpVerifyFormProps) {
    const [totpCode, setTotpCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const login = useAuthStore((state) => state.login);

    const handleVerify = async () => {
        if (totpCode.length < 6) {
            toast.error("6자리 코드를 모두 입력해주세요.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.post("/auth/totp/sessions", { tempToken, totpCode });
            login(res.data.accessToken, res.data.adminInfo);
            toast.success(`${res.data.adminInfo.name}님, 환영합니다.`);
            router.push("/admin/dashboard");
        } catch (error: any) {
            setTotpCode("");
            const msg = error.response?.data?.message || "인증에 실패했습니다. 다시 시도해주세요.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[380px] mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#111827] mb-1">2단계 인증</h1>
                <p className="text-sm text-[#6b7280]">Authenticator 앱에 표시된 6자리 코드를 입력하세요.</p>
            </div>

            <div className="bg-white rounded-xl border border-[#e2e4e9] shadow-sm p-6 space-y-5">
                <OtpInput length={6} value={totpCode} onChange={setTotpCode} onEnter={handleVerify} />

                <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isLoading || totpCode.length < 6}
                    className="w-full py-2.5 bg-[#4361ee] hover:bg-[#3451d1] text-white text-sm font-semibold rounded-lg
                               transition-all flex items-center justify-center gap-2
                               disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#4361ee]/20"
                >
                    {isLoading
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : "로그인"
                    }
                </button>
            </div>
        </div>
    );
}
