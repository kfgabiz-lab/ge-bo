'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertCircle, Lock, Shield } from 'lucide-react';
import { useRoleStore } from '@/store/useRoleStore';
import { toast } from 'sonner';

const PRESET_COLORS = [
  '#4361ee', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280',
];

const roleSchema = z.object({
  code: z
    .string()
    .min(2, '역할 코드는 2자 이상이어야 합니다.')
    .max(30, '역할 코드는 30자 이하여야 합니다.')
    .regex(/^[A-Z0-9_]+$/, '영문 대문자, 숫자, _만 입력 가능합니다.'),
  displayName: z.string().min(1, '표시명을 입력해주세요.').max(20, '표시명은 20자 이하여야 합니다.'),
  description: z.string().max(100, '설명은 100자 이하여야 합니다.').optional(),
  color: z.string().min(1, '색상을 선택해주세요.'),
  isSystem: z.boolean().optional(),
});

type RoleFormData = z.infer<typeof roleSchema>;

export const RoleDrawer = () => {
  const { isDrawerOpen, closeDrawer, selectedRole, addRole, updateRole, isLoading } = useRoleStore();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: { code: '', displayName: '', description: '', color: '#4361ee', isSystem: false },
  });

  const selectedColor = watch('color');
  const isSystem = watch('isSystem');

  useEffect(() => {
    if (selectedRole) {
      reset({
        code: selectedRole.code,
        displayName: selectedRole.displayName,
        description: selectedRole.description || '',
        color: selectedRole.color,
        isSystem: selectedRole.isSystem,
      });
    } else {
      reset({ code: '', displayName: '', description: '', color: '#4361ee', isSystem: false });
    }
  }, [selectedRole, reset, isDrawerOpen]);

  const onSubmit = async (data: RoleFormData) => {
    try {
      if (selectedRole) {
        await updateRole(selectedRole.id, {
          displayName: data.displayName,
          description: data.description,
          color: data.color,
        });
        toast.success('역할 정보가 수정되었습니다.');
      } else {
        await addRole({
          code: data.code,
          displayName: data.displayName,
          description: data.description || '',
          color: data.color,
          isSystem: data.isSystem ?? false,
        });
        toast.success('역할이 등록되었습니다.');
      }
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '작업 중 오류가 발생했습니다.');
    }
  };

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={closeDrawer} />

      <div className="relative w-[420px] bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-250 border-l border-[#e8eaed]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8eaed]">
          <div>
            <h2 className="text-sm font-bold text-[#111827]">
              {selectedRole ? '역할 수정' : '역할 추가'}
            </h2>
            <p className="text-xs text-[#9ca3af] mt-0.5">
              {selectedRole ? '역할 정보를 수정합니다' : '새로운 역할을 등록합니다'}
            </p>
          </div>
          <button onClick={closeDrawer} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f4f5f7] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <section className="space-y-4">
            <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-widest">역할 정보</p>

            {/* 역할 코드 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#374151]">
                역할 코드 <span className="text-red-500">*</span>
              </label>
              {selectedRole ? (
                <div className="relative">
                  <input
                    value={selectedRole.code}
                    readOnly
                    className="w-full text-sm border border-[#e2e4e9] rounded-lg px-3 py-2 bg-[#f9fafb] text-[#9ca3af] font-mono cursor-not-allowed pr-9"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#d1d5db]" />
                  <p className="text-[11px] text-[#9ca3af] mt-1">역할 코드는 변경할 수 없습니다.</p>
                </div>
              ) : (
                <>
                  <input
                    {...register('code')}
                    placeholder="예: CONTENT_MANAGER"
                    className={`w-full text-sm border rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all uppercase ${errors.code ? 'border-red-400 bg-red-50' : 'border-[#e2e4e9]'}`}
                    onChange={(e) => setValue('code', e.target.value.toUpperCase().replace(/\s/g, '_'))}
                  />
                  {errors.code && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errors.code.message}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* 표시명 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#374151]">
                표시명 <span className="text-red-500">*</span>
              </label>
              <input
                {...register('displayName')}
                placeholder="예: 콘텐츠 매니저"
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all ${errors.displayName ? 'border-red-400 bg-red-50' : 'border-[#e2e4e9]'}`}
              />
              {errors.displayName && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.displayName.message}
                </p>
              )}
            </div>

            {/* 설명 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#374151]">설명</label>
              <textarea
                {...register('description')}
                placeholder="역할에 대한 설명을 입력하세요"
                rows={2}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all resize-none ${errors.description ? 'border-red-400 bg-red-50' : 'border-[#e2e4e9]'}`}
              />
              {errors.description && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.description.message}
                </p>
              )}
            </div>
          </section>

          {/* 색상 */}
          <section className="space-y-3">
            <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-widest">색상</p>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`w-7 h-7 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2' : 'hover:scale-110'}`}
                  style={{
                    backgroundColor: color,
                    outlineColor: selectedColor === color ? color : 'transparent',
                    outline: selectedColor === color ? `2px solid ${color}` : 'none',
                    outlineOffset: selectedColor === color ? '2px' : '0',
                  }}
                />
              ))}
            </div>
          </section>

          {/* 관리자 역할 */}
          <section className="space-y-3">
            <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-widest">고급 설정</p>
            <button
              type="button"
              onClick={() => !selectedRole && setValue('isSystem', !isSystem)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg border transition-all ${
                selectedRole ? 'cursor-not-allowed opacity-60' : isSystem ? 'border-[#4361ee] bg-[#4361ee]/5' : 'border-[#e2e4e9] hover:border-[#c4c9d4]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className={`w-4 h-4 ${isSystem ? 'text-[#4361ee]' : 'text-[#9ca3af]'}`} />
                <div className="text-left">
                  <p className={`text-xs font-semibold ${isSystem ? 'text-[#4361ee]' : 'text-[#374151]'}`}>관리자 역할</p>
                  <p className="text-[11px] text-[#9ca3af] mt-0.5">
                    {selectedRole ? '등록 후 변경할 수 없습니다.' : '활성화 시 삭제 불가능한 관리자 역할로 등록됩니다'}
                  </p>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${isSystem ? 'bg-[#4361ee]' : 'bg-[#e2e4e9]'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isSystem ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </section>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#e8eaed] flex gap-2.5">
          <button type="button" onClick={closeDrawer} className="flex-1 py-2.5 text-sm font-semibold text-[#374151] border border-[#e2e4e9] rounded-lg hover:bg-[#f4f5f7] transition-all">
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#4361ee] hover:bg-[#3451d1] rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-[#4361ee]/20"
          >
            {isLoading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : (selectedRole ? '저장' : '등록')
            }
          </button>
        </div>
      </div>
    </div>
  );
};
