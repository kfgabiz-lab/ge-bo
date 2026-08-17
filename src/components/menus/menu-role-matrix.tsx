"use client";

import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useMenuStore } from "@/store/use-menu-store";
import { toast } from "sonner";
import { useI18n } from "@/hooks/use-i18n";

interface MenuRoleMatrixProps {
  /** true면 SUPER_ADMIN 체크박스만 고정 노출 — 다른 역할 체크박스는 렌더링하지 않음 */
  isProtected?: boolean;
}

/* ── 역할별 메뉴 접근 권한 체크박스 ── */
export function MenuRoleMatrix({ isProtected = false }: MenuRoleMatrixProps) {
  /* roles 대신 roleMenuMappings 직접 사용 — /roles API는 시스템관리자 전용이므로 접근 불가 */
  const { selectedMenu, roleMenuMappings, updateRoleMenuMapping } = useMenuStore();
  const [pendingRoles, setPendingRoles] = useState<Set<number>>(new Set()); // API 호출 중인 역할
  const { t } = useI18n();

  if (!selectedMenu) return null;

  const displayMappings = isProtected ? roleMenuMappings.filter((m) => m.roleName === "SUPER_ADMIN") : roleMenuMappings;

  const handleToggle = async (roleId: number, currentAccess: boolean) => {
    if (pendingRoles.has(roleId)) return; // 이미 호출 중이면 무시

    const newAccess = !currentAccess;
    setPendingRoles((prev) => new Set(prev).add(roleId));

    try {
      await updateRoleMenuMapping(selectedMenu.id, roleId, newAccess);
    } catch {
      // 실패 시 롤백 (store에서 낙관적 업데이트 했으므로 다시 원복)
      await updateRoleMenuMapping(selectedMenu.id, roleId, currentAccess);
      toast.error(t("menu.role.error"));
    } finally {
      setPendingRoles((prev) => {
        const next = new Set(prev);
        next.delete(roleId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-slate-400" />
        {t("menu.role.title")}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {displayMappings.map((mapping) => {
          const hasAccess = isProtected ? true : mapping.hasAccess;
          const isPending = pendingRoles.has(mapping.roleId);
          return (
            <label
              key={mapping.roleId}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all ${
                isProtected
                  ? "border-slate-900 bg-slate-50 cursor-not-allowed"
                  : isPending
                    ? "opacity-60 cursor-wait"
                    : hasAccess
                      ? "border-slate-900 bg-slate-50 cursor-pointer"
                      : "border-slate-200 hover:border-slate-300 cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                checked={hasAccess}
                onChange={isProtected ? undefined : () => handleToggle(mapping.roleId, hasAccess)}
                disabled={isProtected || isPending}
                className="w-4 h-4 flex-shrink-0 rounded border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer disabled:cursor-wait disabled:cursor-not-allowed"
              />
              <div className="flex-1 min-w-0 truncate">
                <span className="text-sm font-medium text-slate-700">{mapping.roleDisplayName}</span>
                <span className="text-sm text-slate-400 ml-1.5 font-mono">{mapping.roleName}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
