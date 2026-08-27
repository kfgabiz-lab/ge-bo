"use client";
import { Globe } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

interface I18nModeToggleProps {
  i18nMode: boolean;
  onToggle: () => void;
  className?: string;
}

export function I18nModeToggle({ i18nMode, onToggle, className = "" }: I18nModeToggleProps) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      title={i18nMode ? t("menu.title.switchToManualInput") : t("menu.title.switchToI18nMode")}
      onClick={onToggle}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
        i18nMode
          ? "text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100"
          : "text-slate-400 bg-slate-50 border border-slate-200 hover:bg-slate-100"
      } ${className}`}
    >
      <Globe className="w-3 h-3" />
      {i18nMode ? t("menu.btn.i18nMode") : t("search.btn.manualInput")}
    </button>
  );
}
