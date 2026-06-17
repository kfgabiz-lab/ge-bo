'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertCircle, Lock } from 'lucide-react';
import { useMessageResourceStore } from '@/store/use-message-resource-store';

/* ── Zod 스키마 ── */

/* 등록 스키마 */
const createSchema = z.object({
    key: z
        .string()
        .min(1, '번역 키를 입력해주세요.')
        .max(255, '번역 키는 255자 이하여야 합니다.')
        .regex(/^[a-zA-Z0-9.]+$/, '번역 키는 영문, 숫자, 점(.)만 입력 가능합니다.'),
    ko: z
        .string()
        .min(1, '한국어를 입력해주세요.')
        .max(500, '한국어는 500자 이하여야 합니다.'),
    en: z
        .string()
        .max(500, '영어는 500자 이하여야 합니다.')
        .optional(),
    resourceType: z.enum(['WORD', 'SENTENCE']),
});

/* 수정 스키마 — key 제외 */
const updateSchema = z.object({
    ko: z
        .string()
        .min(1, '한국어를 입력해주세요.')
        .max(500, '한국어는 500자 이하여야 합니다.'),
    en: z
        .string()
        .max(500, '영어는 500자 이하여야 합니다.')
        .optional(),
    active: z.boolean(),
    resourceType: z.enum(['WORD', 'SENTENCE']),
});

type CreateFormData = z.infer<typeof createSchema>;
type UpdateFormData = z.infer<typeof updateSchema>;

/* ── 컴포넌트 ── */

export const MessageResourceDrawer = () => {
    const {
        isDrawerOpen, closeDrawer,
        selectedItem,
        createItem, updateItem,
        isLoading,
        fetchItems,
    } = useMessageResourceStore();

    /* 수정 모드 여부 */
    const isEdit = !!selectedItem;

    /* 등록 폼 */
    const createForm = useForm<CreateFormData>({
        resolver: zodResolver(createSchema),
        defaultValues: { key: '', ko: '', en: '', resourceType: 'WORD' },
    });

    /* 수정 폼 */
    const updateForm = useForm<UpdateFormData>({
        resolver: zodResolver(updateSchema),
        defaultValues: { ko: '', en: '', active: true, resourceType: 'WORD' },
    });

    /* Drawer 열릴 때 폼 초기화 */
    useEffect(() => {
        if (isEdit && selectedItem) {
            updateForm.reset({
                ko:           selectedItem.ko,
                en:           selectedItem.en ?? '',
                active:       selectedItem.active,
                resourceType: selectedItem.resourceType ?? 'WORD',
            });
        } else {
            createForm.reset({ key: '', ko: '', en: '', resourceType: 'WORD' });
        }
    }, [selectedItem, isDrawerOpen]);

    /* 기본 검색 파라미터 (목록 새로고침용) */
    const defaultSearch = { key: '', ko: '', en: '', active: '전체', page: 0, size: 10, resourceType: '전체' };

    /* 등록 제출 */
    const onCreateSubmit = async (data: CreateFormData) => {
        try {
            await createItem({ key: data.key, ko: data.ko, en: data.en, resourceType: data.resourceType });
            fetchItems(defaultSearch);
        } catch {
            /* 오류는 store에서 toast 처리 */
        }
    };

    /* 수정 제출 */
    const onUpdateSubmit = async (data: UpdateFormData) => {
        if (!selectedItem) return;
        try {
            await updateItem(selectedItem.id, { ko: data.ko, en: data.en, active: data.active, resourceType: data.resourceType });
            fetchItems(defaultSearch);
        } catch {
            /* 오류는 store에서 toast 처리 */
        }
    };

    if (!isDrawerOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* 배경 오버레이 */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200"
                onClick={closeDrawer}
            />

            {/* Drawer 본체 */}
            <div className="relative w-[420px] bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-250 border-l border-[#e8eaed]">

                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8eaed]">
                    <div>
                        <h2 className="text-sm font-bold text-[#111827]">
                            {isEdit ? '항목 수정' : '항목 추가'}
                        </h2>
                        <p className="text-xs text-[#9ca3af] mt-0.5">
                            {isEdit ? '다국어 항목 정보를 수정합니다.' : '새로운 다국어 항목을 등록합니다.'}
                        </p>
                    </div>
                    <button
                        onClick={closeDrawer}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f4f5f7] transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 바디 — 등록/수정 폼 */}
                {isEdit ? (
                    /* 수정 폼 */
                    <form
                        onSubmit={updateForm.handleSubmit(onUpdateSubmit)}
                        className="flex-1 overflow-y-auto px-5 py-5 space-y-5"
                    >
                        <section className="space-y-4">
                            <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-widest">항목 정보</p>

                            {/* 유형 선택 — 단어 / 문장 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#374151]">유형 <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    {(['WORD', 'SENTENCE'] as const).map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => updateForm.setValue('resourceType', type)}
                                            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                                                updateForm.watch('resourceType') === type
                                                    ? 'border-[#4361ee] bg-[#4361ee]/5 text-[#4361ee]'
                                                    : 'border-[#e2e4e9] text-[#374151] hover:border-[#c4c9d4]'
                                            }`}
                                        >
                                            {type === 'WORD' ? '단어' : '문장'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Key — 수정 불가 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#374151]">Key</label>
                                <div className="relative">
                                    <input
                                        value={selectedItem?.key ?? ''}
                                        readOnly
                                        className="w-full text-sm border border-[#e2e4e9] rounded-lg px-3 py-2 bg-[#f9fafb] text-[#9ca3af] font-mono cursor-not-allowed pr-9"
                                    />
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#d1d5db]" />
                                    <p className="text-[11px] text-[#9ca3af] mt-1">번역 키는 변경할 수 없습니다.</p>
                                </div>
                            </div>

                            {/* 한국어 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#374151]">
                                    한국어 <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    {...updateForm.register('ko')}
                                    rows={3}
                                    className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all resize-none ${updateForm.formState.errors.ko ? 'border-red-400 bg-red-50' : 'border-[#e2e4e9]'}`}
                                />
                                {updateForm.formState.errors.ko && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />{updateForm.formState.errors.ko.message}
                                    </p>
                                )}
                            </div>

                            {/* 영어 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#374151]">영어</label>
                                <textarea
                                    {...updateForm.register('en')}
                                    rows={3}
                                    className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all resize-none ${updateForm.formState.errors.en ? 'border-red-400 bg-red-50' : 'border-[#e2e4e9]'}`}
                                />
                                {updateForm.formState.errors.en && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />{updateForm.formState.errors.en.message}
                                    </p>
                                )}
                            </div>

                            {/* 사용여부 토글 — 수정 모드에서만 노출 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#374151]">사용여부</label>
                                <button
                                    type="button"
                                    onClick={() => updateForm.setValue('active', !updateForm.watch('active'))}
                                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg border transition-all ${updateForm.watch('active') ? 'border-[#4361ee] bg-[#4361ee]/5' : 'border-[#e2e4e9] hover:border-[#c4c9d4]'}`}
                                >
                                    <span className={`text-xs font-semibold ${updateForm.watch('active') ? 'text-[#4361ee]' : 'text-[#374151]'}`}>
                                        {updateForm.watch('active') ? '사용' : '미사용'}
                                    </span>
                                    <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${updateForm.watch('active') ? 'bg-[#4361ee]' : 'bg-[#e2e4e9]'}`}>
                                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${updateForm.watch('active') ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </div>
                                </button>
                            </div>
                        </section>
                    </form>
                ) : (
                    /* 등록 폼 */
                    <form
                        onSubmit={createForm.handleSubmit(onCreateSubmit)}
                        className="flex-1 overflow-y-auto px-5 py-5 space-y-5"
                    >
                        <section className="space-y-4">
                            <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-widest">항목 정보</p>

                            {/* 유형 선택 — 단어 / 문장 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#374151]">유형 <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    {(['WORD', 'SENTENCE'] as const).map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => createForm.setValue('resourceType', type)}
                                            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                                                createForm.watch('resourceType') === type
                                                    ? 'border-[#4361ee] bg-[#4361ee]/5 text-[#4361ee]'
                                                    : 'border-[#e2e4e9] text-[#374151] hover:border-[#c4c9d4]'
                                            }`}
                                        >
                                            {type === 'WORD' ? '단어' : '문장'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Key */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#374151]">
                                    Key <span className="text-red-500">*</span>
                                </label>
                                <input
                                    {...createForm.register('key')}
                                    placeholder="예: BTN.SAVE"
                                    className={`w-full text-sm border rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all ${createForm.formState.errors.key ? 'border-red-400 bg-red-50' : 'border-[#e2e4e9]'}`}
                                />
                                {createForm.formState.errors.key && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />{createForm.formState.errors.key.message}
                                    </p>
                                )}
                            </div>

                            {/* 한국어 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#374151]">
                                    한국어 <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    {...createForm.register('ko')}
                                    rows={3}
                                    placeholder="한국어 텍스트를 입력하세요."
                                    className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all resize-none ${createForm.formState.errors.ko ? 'border-red-400 bg-red-50' : 'border-[#e2e4e9]'}`}
                                />
                                {createForm.formState.errors.ko && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />{createForm.formState.errors.ko.message}
                                    </p>
                                )}
                            </div>

                            {/* 영어 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[#374151]">영어</label>
                                <textarea
                                    {...createForm.register('en')}
                                    rows={3}
                                    placeholder="영어 텍스트를 입력하세요. (선택)"
                                    className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4361ee]/15 focus:border-[#4361ee] transition-all resize-none ${createForm.formState.errors.en ? 'border-red-400 bg-red-50' : 'border-[#e2e4e9]'}`}
                                />
                                {createForm.formState.errors.en && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />{createForm.formState.errors.en.message}
                                    </p>
                                )}
                            </div>
                        </section>
                    </form>
                )}

                {/* 푸터 */}
                <div className="px-5 py-4 border-t border-[#e8eaed] flex gap-2.5">
                    <button
                        type="button"
                        onClick={closeDrawer}
                        className="flex-1 py-2.5 text-sm font-semibold text-[#374151] border border-[#e2e4e9] rounded-lg hover:bg-[#f4f5f7] transition-all"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={isEdit
                            ? updateForm.handleSubmit(onUpdateSubmit)
                            : createForm.handleSubmit(onCreateSubmit)
                        }
                        disabled={isLoading}
                        className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#4361ee] hover:bg-[#3451d1] rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-[#4361ee]/20"
                    >
                        {isLoading
                            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : (isEdit ? '저장' : '등록')
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};
