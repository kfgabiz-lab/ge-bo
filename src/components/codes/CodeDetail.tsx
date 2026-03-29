'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Save, Trash2, Settings2, Database, Plus, X } from 'lucide-react';
import { useCodeStore } from '@/store/useCodeStore';
import { CodeDetailTable } from './CodeDetailTable';
import { toast } from 'sonner';

/* ── Validation 헬퍼 ── */
const GROUP_CODE_REGEX = /^[A-Z0-9_]{1,30}$/;
const XSS_CHARS = /[<>"']/;

const validateGroupCode = (v: string): string => {
    if (!v.trim()) return '그룹코드를 입력해주세요.';
    if (!GROUP_CODE_REGEX.test(v.trim())) return '영문 대문자, 숫자, _만 사용 가능합니다. (최대 30자)';
    return '';
};

const validateGroupName = (v: string): string => {
    if (!v.trim()) return '그룹명을 입력해주세요.';
    if (XSS_CHARS.test(v)) return '허용되지 않는 문자가 포함되어 있습니다.';
    return '';
};

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
    const [groupCode, setGroupCode] = useState('');
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [codeError, setCodeError] = useState('');
    const [nameError, setNameError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const codeRef = useRef<HTMLInputElement>(null);

    /* 자동 포커싱 */
    useEffect(() => { setTimeout(() => codeRef.current?.focus(), 100); }, []);

    const handleSubmit = async () => {
        if (isSubmitting) return;
        const ce = validateGroupCode(groupCode);
        const ne = validateGroupName(groupName);
        setCodeError(ce);
        setNameError(ne);
        if (ce || ne) { if (ce) codeRef.current?.focus(); return; }

        setIsSubmitting(true);
        try {
            await createGroup({ groupCode: groupCode.trim().toUpperCase(), groupName: groupName.trim(), description: description.trim() || undefined });
            toast.success(`'${groupName.trim()}' 그룹이 추가되었습니다.`);
            await onCreated();
        } catch { /* store에서 토스트 처리 */ }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-bold text-slate-800">그룹 추가</h2>
                </div>
                <button onClick={onCancel} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">그룹코드 <span className="text-red-500">*</span></label>
                    <input ref={codeRef} type="text" value={groupCode}
                        onChange={e => { setGroupCode(e.target.value.toUpperCase()); if (codeError) setCodeError(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                        className={inputCls(codeError)} placeholder="예: STATUS, CATEGORY" maxLength={30} />
                    {codeError && <p className="text-[11px] text-red-500 mt-1">{codeError}</p>}
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">그룹명 <span className="text-red-500">*</span></label>
                    <input type="text" value={groupName}
                        onChange={e => { setGroupName(e.target.value); if (nameError) setNameError(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                        className={inputCls(nameError)} placeholder="예: 상태코드, 분류코드" maxLength={50} />
                    {nameError && <p className="text-[11px] text-red-500 mt-1">{nameError}</p>}
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">설명</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 resize-none"
                        rows={3} placeholder="선택사항" maxLength={200} />
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-white transition-all">취소</button>
                <button onClick={handleSubmit} disabled={isSubmitting || !groupCode.trim() || !groupName.trim()}
                    className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    {isSubmitting ? '추가 중...' : '그룹 추가'}
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

    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [active, setActive] = useState(true);
    const [nameError, setNameError] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    /* 선택 그룹 동기화 */
    useEffect(() => {
        if (selectedGroup) {
            setGroupName(selectedGroup.groupName);
            setDescription(selectedGroup.description || '');
            setActive(selectedGroup.active);
            setNameError('');
            setIsDirty(false);
        }
    }, [selectedGroup]);

    /* isDirty 추적 */
    useEffect(() => {
        if (selectedGroup) {
            const dirty = groupName !== selectedGroup.groupName ||
                description !== (selectedGroup.description || '') ||
                active !== selectedGroup.active;
            setIsDirty(dirty);
            setStoreDirty(dirty);
        }
    }, [groupName, description, active, selectedGroup, setStoreDirty]);

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
                <p className="text-sm font-medium">왼쪽에서 코드 그룹을 선택하거나</p>
                <p className="text-xs text-slate-300">상단 "그룹 추가" 버튼을 눌러 새 그룹을 생성하세요</p>
            </div>
        );
    }

    /* 저장 */
    const handleSave = async () => {
        if (isSubmitting) return;
        const ne = validateGroupName(groupName);
        setNameError(ne);
        if (ne) { toast.error(ne); nameRef.current?.focus(); return; }
        if (!isDirty) { toast.info('변경사항이 없습니다.'); return; }

        setIsSubmitting(true);
        try {
            /* 비활성 전환 시 경고 */
            if (!active && selectedGroup.active && (selectedGroup.details?.length || 0) > 0) {
                if (!confirm('그룹을 비활성화하면 하위 코드도 조회되지 않습니다. 계속하시겠습니까?')) {
                    setIsSubmitting(false);
                    return;
                }
            }
            await updateGroup(selectedGroup.id, { groupCode: selectedGroup.groupCode, groupName: groupName.trim(), description: description.trim() || undefined, active });
            toast.success('그룹이 저장되었습니다.');
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
            toast.success('그룹이 삭제되었습니다.');
        } catch { /* store에서 토스트 처리 */ }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full flex flex-col">
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-bold text-slate-800">그룹 상세</h2>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-mono">{selectedGroup.groupCode}</span>
                    {isDirty && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">수정됨</span>}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleDelete} disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-40 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />삭제
                    </button>
                    <button onClick={handleSave} disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-40 transition-all">
                        <Save className="w-3.5 h-3.5" />{isSubmitting ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>

            {/* 편집 폼 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* 그룹 정보 — 한 줄 compact */}
                <div className="grid grid-cols-[1fr_1.2fr_1fr_90px] gap-2 items-end">
                    <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">그룹코드</label>
                        <input type="text" value={selectedGroup.groupCode} disabled
                            className="w-full border border-slate-100 rounded px-2.5 py-1.5 text-xs bg-slate-50 text-slate-500 font-mono" />
                    </div>
                    <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">그룹명 <span className="text-red-500">*</span></label>
                        <input ref={nameRef} type="text" value={groupName}
                            onChange={e => { setGroupName(e.target.value); if (nameError) setNameError(''); }}
                            onBlur={() => setNameError(validateGroupName(groupName))}
                            className={`w-full border rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 transition-all ${nameError ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-slate-400 focus:border-slate-400'}`}
                            maxLength={50} />
                        {nameError && <p className="text-[10px] text-red-500 mt-0.5">{nameError}</p>}
                    </div>
                    <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">설명</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                            className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                            placeholder="선택사항" maxLength={200} />
                    </div>
                    <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">사용여부</label>
                        <button type="button" onClick={() => setActive(!active)}
                            className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border text-xs font-medium transition-all ${
                                active ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-400'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            {active ? '사용' : '미사용'}
                        </button>
                    </div>
                </div>

                <div className="border-t border-slate-100" />

                <CodeDetailTable groupId={selectedGroup.id} />
            </div>
        </div>
    );
}
