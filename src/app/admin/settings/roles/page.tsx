'use client';

import { useEffect, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { useRoleStore, Role } from '@/store/useRoleStore';
import { RoleCard } from '@/components/roles/RoleCard';
import { RoleDrawer } from '@/components/roles/RoleDrawer';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';

export default function RolesPage() {
  const { roles, isLoading, fetchRoles, openDrawer, deleteRole } = useRoleStore();
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    try {
      await deleteRole(roleToDelete.id);
      toast.success(`'${roleToDelete.displayName}' 역할이 삭제되었습니다.`);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '삭제 중 오류가 발생했습니다.');
    } finally {
      setRoleToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">권한 관리</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">시스템에서 사용하는 역할을 관리합니다.</p>
        </div>
        <button
          onClick={() => openDrawer()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#4361ee] hover:bg-[#3451d1] text-white rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4361ee]/20"
        >
          <Plus className="w-4 h-4" />
          역할 추가
        </button>
      </div>

      {/* 역할 카드 그리드 */}
      {isLoading && roles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center gap-3 text-[#6b7280]">
          <div className="w-5 h-5 border-2 border-[#4361ee] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      ) : roles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[#9ca3af]">
          <ShieldCheck className="w-10 h-10" />
          <p className="text-sm">등록된 역할이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={(r) => openDrawer(r)}
              onDelete={(r) => setRoleToDelete(r)}
            />
          ))}
        </div>
      )}

      <RoleDrawer />

      <ConfirmModal
        isOpen={!!roleToDelete}
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="역할 삭제"
        description={`'${roleToDelete?.displayName}' 역할을 삭제하시겠습니까?`}
        confirmText="삭제하기"
        variant="danger"
      />
    </div>
  );
}
