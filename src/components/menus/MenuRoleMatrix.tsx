'use client';

import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useMenuStore } from '@/store/useMenuStore';
import { toast } from 'sonner';

/* ── 역할별 메뉴 접근 권한 체크박스 ── */
export function MenuRoleMatrix() {
    const { selectedMenu, roles, roleMenuMappings, updateRoleMenuMapping } = useMenuStore();
    const [pendingRoles, setPendingRoles] = useState<Set<number>>(new Set()); // API 호출 중인 역할

    if (!selectedMenu) return null;

    const handleToggle = async (roleId: number, currentAccess: boolean) => {
        if (pendingRoles.has(roleId)) return; // 이미 호출 중이면 무시

        const newAccess = !currentAccess;
        setPendingRoles(prev => new Set(prev).add(roleId));

        try {
            await updateRoleMenuMapping(selectedMenu.id, roleId, newAccess);
        } catch {
            // 실패 시 롤백 (store에서 낙관적 업데이트 했으므로 다시 원복)
            await updateRoleMenuMapping(selectedMenu.id, roleId, currentAccess);
            toast.error('권한 변경에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setPendingRoles(prev => {
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
                역할별 접근 권한
            </h3>
            <div className="grid grid-cols-2 gap-2">
                {roles.map(role => {
                    const mapping = roleMenuMappings.find(m => m.roleId === role.id);
                    const hasAccess = mapping?.hasAccess ?? false;
                    const isPending = pendingRoles.has(role.id);
                    return (
                        <label
                            key={role.id}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                                isPending ? 'opacity-60 cursor-wait' :
                                hasAccess
                                    ? 'border-slate-900 bg-slate-50'
                                    : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={hasAccess}
                                onChange={() => handleToggle(role.id, hasAccess)}
                                disabled={isPending}
                                className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer disabled:cursor-wait"
                            />
                            <div>
                                <span className="text-sm font-medium text-slate-700">{role.displayName}</span>
                                <span className="text-[10px] text-slate-400 ml-1.5 font-mono">{role.name}</span>
                            </div>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
