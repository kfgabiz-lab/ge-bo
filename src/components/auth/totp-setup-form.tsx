"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { Copy, Check } from "lucide-react";
import api, { getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import OtpInput from "./otp-input";

interface TotpSetupFormProps {
    tempToken: string;
}

type SetupStep = "qr" | "confirm";

/** TOTP 최초 등록 2단계 화면 (QR 스캔 → 코드 확인) */
export default function TotpSetupForm({ tempToken }: TotpSetupFormProps) {
    const [setupStep, setSetupStep] = useState<SetupStep>("qr");
    const [qrCodeUrl, setQrCodeUrl] = useState("");
    const [secret, setSecret] = useState("");
    const [totpCode, setTotpCode] = useState("");
    const [secretCopied, setSecretCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const login = useAuthStore((state) => state.login);

    // 마운트 시 QR 코드 발급
    useEffect(() => {
        const fetchQr = async () => {
            try {
                const res = await api.post("/auth/totp/qr", { tempToken });
                setQrCodeUrl(res.data.qrCodeUrl);
                setSecret(res.data.secret);
            } catch {
                toast.error("QR 코드 발급에 실패했습니다. 다시 로그인해주세요.");
            }
        };
        fetchQr();
    }, [tempToken]);

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        setSecretCopied(true);
        setTimeout(() => setSecretCopied(false), 2000);
    };

    const handleConfirm = async () => {
        if (totpCode.length < 6) {
            toast.error("6자리 코드를 모두 입력해주세요.");
            return;
        }
        setIsLoading(true);
        try {
            const res = await api.post("/auth/totp/registrations", { tempToken, totpCode });
            login(res.data.accessToken, res.data.adminInfo);
            toast.success(`${res.data.adminInfo.name}님, 2단계 인증 설정이 완료되었습니다.`);
            router.push("/admin/dashboard");
        } catch (error: any) {
            setTotpCode("");
            toast.error(getApiErrorMessage(error, "코드 인증에 실패했습니다. 앱의 최신 코드를 입력해주세요."));
        } finally {
            setIsLoading(false);
        }
    };

    // STEP 1: QR 코드 화면
    if (setupStep === "qr") {
        return (
            <div className="w-full max-w-[380px] mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[#111827] mb-1">2단계 인증 설정</h1>
                    <p className="text-sm text-[#6b7280]">Google 또는 Microsoft Authenticator 앱으로 QR 코드를 스캔하세요.</p>
                </div>

                <div className="bg-white rounded-xl border border-[#e2e4e9] shadow-sm p-6 space-y-5">
                    {/* QR 코드 */}
                    {qrCodeUrl && (
                        <div className="flex justify-center p-4 bg-white rounded-lg border border-[#e2e4e9]">
                            <QRCode value={qrCodeUrl} size={180} />
                        </div>
                    )}

                    <div className="text-center text-xs text-[#6b7280]">QR 코드를 스캔할 수 없다면 아래 키를 수동 입력하세요.</div>

                    {/* 수동 입력 키 */}
                    <div className="flex items-center gap-2 bg-[#f4f5f7] rounded-lg p-3">
                        <code className="flex-1 text-xs font-mono text-[#374151] break-all">{secret}</code>
                        <button type="button" onClick={copySecret} className="flex-shrink-0 text-[#6b7280] hover:text-[#374151]">
                            {secretCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setSetupStep("confirm")}
                        disabled={!qrCodeUrl}
                        className="w-full py-2.5 bg-[#4361ee] hover:bg-[#3451d1] text-white text-sm font-semibold rounded-lg
                                   transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#4361ee]/20"
                    >
                        앱에 등록했습니다 →
                    </button>
                </div>
            </div>
        );
    }

    // STEP 2: 코드 확인 화면
    return (
        <div className="w-full max-w-[380px] mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#111827] mb-1">코드 확인</h1>
                <p className="text-sm text-[#6b7280]">Authenticator 앱에 표시된 6자리 코드를 입력하세요.</p>
            </div>

            <div className="bg-white rounded-xl border border-[#e2e4e9] shadow-sm p-6 space-y-5">
                <OtpInput length={6} value={totpCode} onChange={setTotpCode} onEnter={handleConfirm} />

                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isLoading || totpCode.length < 6}
                    className="w-full py-2.5 bg-[#4361ee] hover:bg-[#3451d1] text-white text-sm font-semibold rounded-lg
                               transition-all flex items-center justify-center gap-2
                               disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#4361ee]/20"
                >
                    {isLoading
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : "인증 완료"
                    }
                </button>

                <button type="button" onClick={() => setSetupStep("qr")}
                    className="w-full text-sm text-[#6b7280] hover:text-[#374151]">
                    ← QR 코드로 돌아가기
                </button>
            </div>
        </div>
    );
}
