"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { Copy, Check } from "lucide-react";
import api, { getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useI18n } from "@/hooks/use-i18n";
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
  const { t } = useI18n();

  // 마운트 시 QR 코드 발급
  useEffect(() => {
    const fetchQr = async () => {
      try {
        const res = await api.post("/auth/totp/qr", { tempToken });
        setQrCodeUrl(res.data.qrCodeUrl);
        setSecret(res.data.secret);
      } catch {
        toast.error(t("login.totp.setup.qr_error"));
      }
    };
    fetchQr();
  }, [tempToken, t]);

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const handleConfirm = async () => {
    if (totpCode.length < 6) {
      toast.error(t("login.totp.code.incomplete"));
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post("/auth/totp/registrations", { tempToken, totpCode });
      login(res.data.accessToken, res.data.adminInfo);
      toast.success(t("login.totp.setup.confirm_success", { name: res.data.adminInfo.name }));
      router.push("/admin/dashboard");
    } catch (error: unknown) {
      setTotpCode("");
      toast.error(getApiErrorMessage(error, t("login.totp.setup.confirm_error")));
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 1: QR 코드 화면
  if (setupStep === "qr") {
    return (
      <div className="w-full max-w-[380px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#111827] mb-1">{t("login.totp.setup.title")}</h1>
          <p className="text-sm text-[#6b7280]">{t("login.totp.setup.subtitle")}</p>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e4e9] shadow-sm p-6 space-y-5">
          {/* QR 코드 */}
          {qrCodeUrl && (
            <div className="flex justify-center p-4 bg-white rounded-lg border border-[#e2e4e9]">
              <QRCode value={qrCodeUrl} size={180} />
            </div>
          )}

          <div className="text-center text-xs text-[#6b7280]">{t("login.totp.setup.manual_hint")}</div>

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
            {t("login.totp.setup.registered_btn")}
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: 코드 확인 화면
  return (
    <div className="w-full max-w-[380px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827] mb-1">{t("login.totp.setup.confirm_title")}</h1>
        <p className="text-sm text-[#6b7280]">{t("login.totp.verify.subtitle")}</p>
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
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            t("login.totp.setup.confirm_btn")
          )}
        </button>

        <button
          type="button"
          onClick={() => setSetupStep("qr")}
          className="w-full text-sm text-[#6b7280] hover:text-[#374151]"
        >
          {t("login.totp.setup.back_btn")}
        </button>
      </div>
    </div>
  );
}
