'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Save, Trash2, Settings2, Database, Plus, X } from 'lucide-react';
import { useCodeStore } from '@/store/use-code-store';
import { CodeDetailTable } from './code-detail-table';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';

/* 에러 스타일 */
const inputCls = (error: string) =>
    `w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all ${
        error ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-900'
    }`;

/* ══════════════════════════════════════ */
/*  생성 폼                               */
/* ══════════════════════════════════════ */
function CreateGroupForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => Promise<void> }) {
    const { createGroup } = useCodeStore();
    const { t } = useI18n();
    const [groupCode, setGroupCode] = useState('');
    const [groupNameMsgKey, setGroupNameMsgKey] = useState('');
    const [description, setDescription] = useState('');
    const [codeError, setCodeError] = useState('');
    const [nameError, setNameError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const codeRef = useRef<HTMLInputElement>(null);

    /* t()를 클로저로 활용하는 validation 함수 */
    const GROUP_CODE_REGEX = /^[A-Z0-9_]{1,30}$/;
    const XSS_CHARS = /[<>"']/;

    const validateGroupCode = (v: string): string => {
        if (!v.trim()) return t('validation.code.groupCode.required');
        if (!GROUP_CODE_REGEX.test(v.trim())) return t('validation.code.groupCode.format');
        return '';
    };

    /* 자동 포커싱 */
    useEffect(() => { setTimeout(() => codeRef.current?.focus(), 100); }, []);

    const handleSubmit = async () => {
        if (isSubmitting) return;
        const ce = validateGroupCode(groupCode);
        setCodeError(ce);
        if (!groupNameMsgKey) { setNameError(t('validation.code.groupName.required')); return; }
        if (ce) { codeRef.current?.focus(); return; }
        setNameError('');

        setIsSubmitting(true);
        try {
            await createGroup({ groupCode: groupCode.trim().toUpperCase(), groupNameMsgKey, description: description.trim() || undefined });
            toast.success(t('code.group.created'));
            await onCreated();
        } catch { /* store에서 토스트 처리 */ }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-bold text-slate-800">{t('code.title.groupNew')}</h2>
                </div>
                <button onClick={onCancel} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">{t('common.label.groupCode')} <span className="text-red-500">*</span></label>
                    <input ref={codeRef} type="text" value={groupCode}
                        onChange={e => { setGroupCode(e.target.value.toUpperCase()); if (codeError) setCodeError(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                        className={inputCls(codeError)} placeholder={t('code.placeholder.groupCode')} maxLength={30} />
                    {codeError && <p className="text-[11px] text-red-500 mt-1">{codeError}</p>}
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">{t('common.label.groupName')} <span className="text-red-500">*</span></label>
                    <MessageKeySelector
                        value={groupNameMsgKey}
                        onChange={v => { setGroupNameMsgKey(v); if (nameError) setNameError(''); }}
                        resourceType="WORD"
                    />
                    {nameError && <p className="text-[11px] text-red-500 mt-1">{nameError}</p>}
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">{t('common.label.description')}</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 resize-none"
                        rows={3} placeholder={t('code.placeholder.description')} maxLength={200} />
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-white transition-all">{t('common.btn.cancel')}</button>
                <button onClick={handleSubmit} disabled={isSubmitting || !groupCode.trim() || !groupName.trim()}
                    className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    {isSubmitting ? t('common.loading') : t('code.title.groupNew')}
                </button>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════ */
/*  메인 컴포넌트                          */
/* ══════════════════════════════════════ */
export function CodeDetail() {
    const { selectedGroup, updateGroup, deleteGroup, isCreating, cancelCreate, fetchGroups, setIsDirty: setStoreDirty } = useCodeStore();
    const { t } = useI18n();

    const [groupNameMsgKey, setGroupNameMsgKey] = useState('');
    const [description, setDescription] = useState('');
    const [active, setActive] = useState(true);
    const [nameError, setNameError] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /* 선택 그룹 동기화 */
    useEffect(() => {
        if (selectedGroup) {
            setGroupNameMsgKey(selectedGroup.groupNameMsgKey || '');
            setDescription(selectedGroup.description || '');
            setActive(selectedGroup.active);
            setNameError('');
            setIsDirty(false);
        }
    }, [selectedGroup]);

    /* isDirty 추적 */
    useEffect(() => {
        if (selectedGroup) {
            const dirty = groupNameMsgKey !== (selectedGroup.groupNameMsgKey || '') ||
                description !== (selectedGroup.description || '') ||
                active !== selectedGroup.active;
            setIsDirty(dirty);
            setStoreDirty(dirty);
        }
    }, [groupNameMsgKey, description, active, selectedGroup, setStoreDirty]);

    /* beforeunload — 미저장 보호 */
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => { if (isDirty) e.preventDefault(); };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    /* 생성 모드 */
    if (!selectedGroup && isCreating) {
        return <CreateGroupForm onCancel={cancelCreate} onCreated={async () => { cancelCreate(); await fetchGroups(); }} />;
    }

    if (!selectedGroup) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl h-full flex flex-col items-center justify-center text-slate-400 gap-3 p-8">
                <Database className="w-12 h-12 text-slate-200" />
                <p className="text-sm font-medium">{t('code.group.selectHint1')}</p>
                <p className="text-xs text-slate-300">{t('code.group.selectHint2')}</p>
            </div>
        );
    }

    /* 저장 */
    const handleSave = async () => {
        if (isSubmitting) return;
        if (!groupNameMsgKey) { toast.error(t('validation.code.groupName.required')); return; }
        if (!isDirty) { toast.info(t('common.noChange')); return; }

        setIsSubmitting(true);
        try {
            /* 비활성 전환 시 경고 */
            if (!active && selectedGroup.active && (selectedGroup.details?.length || 0) > 0) {
                if (!confirm(t('code.group.deactivateConfirm'))) {
                    setIsSubmitting(false);
                    return;
                }
            }
            await updateGroup(selectedGroup.id, { groupCode: selectedGroup.groupCode, groupNameMsgKey, description: description.trim() || undefined, active });
            toast.success(t('code.group.saved'));
            setIsDirty(false);
        } catch { /* store에서 토스트 처리 */ }
        finally { setIsSubmitting(false); }
    };

    /* 삭제 */
    const handleDelete = async () => {
        if (isSubmitting) return;
        if (!confirm(`'${selectedGroup.groupName}' 그룹을 삭제하시겠습니까?\n하위 코드 ${selectedGroup.details?.length || 0}개도 함께 삭제됩니다.`)) return;
        setIsSubmitting(true);
        try {
            await deleteGroup(selectedGroup.id);
            toast.success(t('code.group.deleted'));
        } catch { /* store에서 토스트 처리 */ }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full flex flex-col">
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-bold text-slate-800">{t('code.title.groupDetail')}</h2>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-mono">{selectedGroup.groupCode}</span>
                    {isDirty && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">{t('common.status.dirty')}</span>}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleDelete} disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-40 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />{t('common.btn.delete')}
                    </button>
                    <button onClick={handleSave} disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-40 transition-all">
                        <Save className="w-3.5 h-3.5" />{isSubmitting ? t('common.loading') : t('common.btn.save')}
                    </button>
                </div>
            </div>

            {/* 편집 폼 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* 그룹 정보 — 한 줄 compact */}
                <div className="grid grid-cols-[1fr_1.2fr_1fr_90px] gap-2 items-end">
                    <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">{t('common.label.groupCode')}</label>
                        <input type="text" value={selectedGroup.groupCode} disabled
                            className="w-full border border-slate-100 rounded px-2.5 py-1.5 text-xs bg-slate-50 text-slate-500 font-mono" />
                    </div>
                    <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">{t('common.label.groupName')} <span className="text-red-500">*</span></label>
                        <MessageKeySelector
                            value={groupNameMsgKey}
                            onChange={v => { setGroupNameMsgKey(v); if (nameError) setNameError(''); }}
                            resourceType="WORD"
                        />
                        {nameError && <p className="text-[10px] text-red-500 mt-0.5">{nameError}</p>}
                    </div>
                    <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">{t('common.label.description')}</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                            className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                            placeholder={t('code.placeholder.description')} maxLength={200} />
                    </div>
                    <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">{t('common.label.isActive')}</label>
                        <select
                            value={active ? 'Y' : 'N'}
                            onChange={e => setActive(e.target.value === 'Y')}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                        >
                            <option value="Y">{t('common.status.active')}</option>
                            <option value="N">{t('common.status.inactive')}</option>
                        </select>
                    </div>
                </div>

                <div className="border-t border-slate-100" />

                <CodeDetailTable groupId={selectedGroup.id} />
            </div>
        </div>
    );
}
