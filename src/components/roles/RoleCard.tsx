'use client';

import { Edit2, Trash2, Lock } from 'lucide-react';
import { Role } from '@/store/useRoleStore';

interface RoleCardProps {
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export const RoleCard = ({ role, onEdit, onDelete }: RoleCardProps) => {
  return (
    <div className="bg-white border border-[#e8eaed] rounded-xl p-5 flex flex-col gap-3 hover:border-[#d1d5db] transition-colors">
      {/* 상단: 코드 + 시스템 뱃지 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />
          <span className="text-[11px] font-mono text-[#6b7280]">{role.code}</span>
        </div>
        {role.isSystem && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f5f7] text-[#6b7280]">
            <Lock className="w-2.5 h-2.5" />
            시스템
          </span>
        )}
      </div>

      {/* 표시명 + 설명 */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#111827]">{role.displayName}</p>
        {role.description && (
          <p className="text-xs text-[#9ca3af] mt-1 line-clamp-2">{role.description}</p>
        )}
      </div>

      {/* 하단: 인원 수 + 액션 */}
      <div className="flex items-center justify-between pt-2 border-t border-[#f3f4f6]">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
          style={{ backgroundColor: `${role.color}18`, color: role.color }}
        >
          {role.memberCount}명
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(role)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6b7280] hover:text-[#4361ee] hover:bg-[#eef0fd] transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => !role.isSystem && onDelete(role)}
            disabled={role.isSystem}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
              role.isSystem
                ? 'text-[#d1d5db] cursor-not-allowed'
                : 'text-[#6b7280] hover:text-[#ef4444] hover:bg-[#fef2f2]'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
