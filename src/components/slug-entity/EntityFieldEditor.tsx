'use client';

/**
 * Slug Entity 필드 편집 패널 (우측)
 * - 선택된 entity의 필드 목록 인라인 편집
 * - 행 추가 / 삭제 / 순서 이동 (▲▼)
 * - 저장 버튼 → PUT /api/v1/slug-entity/{id}/fields
 * - table_name 저장 버튼 → PUT /api/v1/slug-entity/{id} (Entity 자체 정보 수정)
 * - Entity 삭제 버튼 → DELETE /api/v1/slug-entity/{id}
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, FileCode2 } from 'lucide-react';
import { toast } from 'sonner';
import api, { getApiErrorMessage } from '@/lib/api';
import type { SlugEntityItem, SlugEntityFieldItem } from './EntityList';
import { CodeGenerateModal } from './CodeGenerateModal';
import type { SlugEntityCodePreviewResponse, SlugEntityCodeSaveResponse } from './CodeGenerateModal';
import { CodeSaveResultModal } from './CodeSaveResultModal';

/* ── 공통코드 그룹 타입 ── */
interface CodeGroupDef {
    groupCode: string;
    groupName: string;
}

/* ── DB 타입 선택 옵션 ── */
const DB_TYPES = ['VARCHAR', 'TEXT', 'BIGINT', 'INT', 'BOOLEAN', 'TIMESTAMPTZ', 'DATE', 'JSONB'];

/* ── 빌더 필드 타입 선택 옵션 ── */
const BUILDER_FIELD_TYPES = [
    'input', 'textarea', 'select', 'radio', 'checkbox',
    'date', 'dateRange', 'yearMonth', 'yearMonthRange', 'time',
    'editor', 'file', 'image', 'video', 'media',
    'color', 'hidden', 'action-button', 'message-key-select', 'category',
];

/** DB 타입 → 빌더 필드 타입 자동 매핑 */
const mapDbTypeToFieldType = (dbType: string): string => {
    switch (dbType) {
        case 'VARCHAR':                  return 'input';
        case 'BIGINT': case 'INT':       return 'input';
        case 'BOOLEAN':                  return 'checkbox';
        case 'DATE': case 'TIMESTAMPTZ': return 'date';
        default:                         return 'textarea';
    }
};

/* ── 빈 필드 행 생성 ── */
const emptyField = (): SlugEntityFieldItem => ({
    key: null, label: '', columnType: 'VARCHAR',
    columnLength: null, fieldType: 'input', codeGroupCode: null,
    defaultValue: null,
    isNullable: true, description: null, sortOrder: 0,
});

/* ── 스타일 상수 ── */
const INPUT_SM = 'w-full border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-mono';
const SELECT_SM = 'w-full border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white cursor-pointer';
const READONLY_CLS = 'text-xs font-mono text-slate-500 bg-slate-50 border border-slate-100 rounded px-2 py-1';

/* ── Props ── */
interface Props {
    entity: SlugEntityItem | null;
    onDeleted: () => void;
    onUpdated: (entity: SlugEntityItem) => void;
}

export function EntityFieldEditor({ entity, onDeleted, onUpdated }: Props) {
    const [fields, setFields]         = useState<SlugEntityFieldItem[]>([]);
    const [saving, setSaving]         = useState(false);
    const [deleting, setDeleting]     = useState(false);
    const [codeGroups, setCodeGroups] = useState<CodeGroupDef[]>([]);

    /* table_name 헤더 편집 상태 (Entity 자체 정보 수정 — 필드 저장과 별개 API) */
    const [tableName, setTableName]   = useState('');
    const [savingInfo, setSavingInfo] = useState(false);

    /* Java 코드 자동생성 — 미리보기 로딩 / 미리보기 데이터 / 저장 결과 */
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData]       = useState<SlugEntityCodePreviewResponse | null>(null);
    const [saveResult, setSaveResult]         = useState<SlugEntityCodeSaveResponse | null>(null);

    /* 마운트 시 공통코드 목록 로드 */
    useEffect(() => {
        api.get<CodeGroupDef[]>('/codes').then(res => setCodeGroups(res.data || [])).catch(() => {});
    }, []);

    /* entity 선택 시 fields 로컬 복사 */
    useEffect(() => {
        if (entity) {
            setFields(entity.fields.map(f => ({ ...f })));
            setTableName(entity.tableName ?? '');
        } else {
            setFields([]);
            setTableName('');
        }
    }, [entity]);

    /* 행 필드값 변경 */
    const updateField = (idx: number, key: keyof SlugEntityFieldItem, value: unknown) => {
        setFields(prev => prev.map((f, i) => i === idx ? { ...f, [key]: value } : f));
    };

    /* 행 추가 */
    const addRow = () => setFields(prev => [...prev, emptyField()]);

    /* 행 삭제 */
    const removeRow = (idx: number) => setFields(prev => prev.filter((_, i) => i !== idx));


    /* FE 검증 */
    const validate = (): boolean => {
        for (let i = 0; i < fields.length; i++) {
            const f = fields[i];
            if (!f.label.trim()) { toast.warning(`${i + 1}번 행: label을 입력해주세요.`); return false; }
            if (!f.columnType)   { toast.warning(`${i + 1}번 행: DB 타입을 선택해주세요.`); return false; }
        }
        return true;
    };

    /* 필드 일괄 저장 */
    const handleSave = async () => {
        if (!entity || !validate()) return;

        setSaving(true);
        try {
            const body = fields.map((f, i) => ({
                key:           f.key?.trim() || null,
                label:         f.label.trim(),
                columnType:    f.columnType,
                columnLength:  f.columnLength || null,
                fieldType:     f.fieldType || null,
                codeGroupCode: f.codeGroupCode || null,
                defaultValue:  f.defaultValue?.trim() || null,
                isNullable:    f.isNullable,
                description:   f.description || null,
                sortOrder:     i,
            }));
            const res = await api.put<SlugEntityItem>(`/slug-entity/${entity.id}/fields`, body);
            toast.success('저장되었습니다.');
            onUpdated(res.data);
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, '저장 중 오류가 발생했습니다.'));
        } finally {
            setSaving(false);
        }
    };

    /* table_name 저장 — Entity 자체 정보 수정 API (PUT /slug-entity/{id}) 신규 연결 */
    const handleSaveTableName = async () => {
        if (!entity) return;

        setSavingInfo(true);
        try {
            const res = await api.put<SlugEntityItem>(`/slug-entity/${entity.id}`, {
                slug:        entity.slug,
                name:        entity.name,
                tableName:   tableName.trim() || null,
                description: entity.description,
                active:      entity.active,
            });
            toast.success('테이블명이 저장되었습니다.');
            onUpdated(res.data);
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, '저장 중 오류가 발생했습니다.'));
        } finally {
            setSavingInfo(false);
        }
    };

    /* Java 코드 자동생성 — 미리보기 요청 (파일시스템에는 아무것도 쓰지 않음) */
    const handleGenerateClick = async () => {
        if (!entity) return;

        setPreviewLoading(true);
        try {
            const res = await api.post<SlugEntityCodePreviewResponse>(`/slug-entity/${entity.id}/generate-preview`);
            setPreviewData(res.data);
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, '코드 생성 미리보기 중 오류가 발생했습니다.'));
        } finally {
            setPreviewLoading(false);
        }
    };

    /* 미리보기 모달에서 저장 성공 시 — 미리보기 모달을 닫고 결과 모달을 연다 */
    const handleCodeSaved = (result: SlugEntityCodeSaveResponse) => {
        setPreviewData(null);
        setSaveResult(result);
        toast.success('파일이 생성되었습니다.');
    };

    /* Entity 삭제 */
    const handleDelete = async () => {
        if (!entity) return;
        if (!confirm(`"${entity.name}" entity를 삭제하시겠습니까?\n하위 필드도 함께 삭제됩니다.`)) return;

        setDeleting(true);
        try {
            await api.delete(`/slug-entity/${entity.id}`);
            toast.success('삭제되었습니다.');
            onDeleted();
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        } finally {
            setDeleting(false);
        }
    };

    /* 미선택 상태 */
    if (!entity) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl h-full min-h-0 flex items-center justify-center">
                <p className="text-sm text-slate-400">왼쪽 목록에서 entity를 선택하세요.</p>
            </div>
        );
    }

    /* 파일생성은 실제 저장된 table_name(entity.tableName)이 있어야 가능 — 헤더 입력값(tableName)은 아직 저장 전일 수 있음 */
    const tableNameMissing = !entity.tableName?.trim();

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full min-h-0 flex flex-col">

            {/* 헤더 — entity 기본 정보 */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">slug</span>
                    <span className={READONLY_CLS}>{entity.slug}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{entity.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${entity.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {entity.active ? '사용' : '미사용'}
                    </span>
                </div>
                {entity.description && (
                    <span className="text-xs text-slate-500 truncate max-w-[320px]" title={entity.description}>
                        {entity.description}
                    </span>
                )}

                {/* table_name — 표시 + 수정 (Entity 자체 정보 수정 API 별도 저장) */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">table_name</span>
                    <div className="w-36">
                        <input
                            type="text"
                            value={tableName}
                            onChange={e => setTableName(e.target.value)}
                            placeholder="예: tbl_member"
                            className={INPUT_SM}
                        />
                    </div>
                    <button
                        onClick={handleSaveTableName}
                        disabled={savingInfo}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded transition-all disabled:opacity-60"
                    >
                        {savingInfo && <Loader2 className="w-3 h-3 animate-spin" />}
                        저장
                    </button>
                </div>

                <span className="text-xs text-slate-400 ml-auto">필드 {fields.length}개</span>
            </div>

            {/* 필드 편집 테이블 */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 sticky top-0">
                            <th className="text-left px-2 py-2.5 font-semibold text-slate-600 w-8">#</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-slate-600 w-[90px]">key</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-slate-600 w-[100px]">label</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-slate-600 w-[110px]">DB 타입</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-slate-600 w-[130px]">빌더필드타입</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-slate-600 w-[140px]">공통코드</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-slate-600 w-[70px]">길이</th>
                            <th className="text-center px-2 py-2.5 font-semibold text-slate-600 w-14">NULL</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-slate-600 w-[100px]">기본값</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-slate-600 min-w-[100px]">설명</th>
                            <th className="text-center px-2 py-2.5 font-semibold text-slate-600 w-[55px]">순서</th>
                            <th className="text-center px-2 py-2.5 font-semibold text-slate-600 w-8">삭제</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="py-12 text-center text-slate-400 text-xs">
                                    필드가 없습니다. 아래 [+ 필드 추가]를 클릭하세요.
                                </td>
                            </tr>
                        ) : (
                            fields.map((f, idx) => (
                                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/40">
                                    <td className="px-2 py-1.5 text-slate-400 text-center">{idx + 1}</td>

                                    {/* key */}
                                    <td className="px-1 py-1">
                                        <input
                                            type="text"
                                            value={f.key ?? ''}
                                            onChange={e => updateField(idx, 'key', e.target.value || null)}
                                            placeholder="예: memberId"
                                            className={INPUT_SM}
                                        />
                                    </td>

                                    {/* label */}
                                    <td className="px-1 py-1">
                                        <input
                                            type="text"
                                            value={f.label}
                                            onChange={e => updateField(idx, 'label', e.target.value)}
                                            placeholder="예: 회원 ID"
                                            className={INPUT_SM}
                                        />
                                    </td>

                                    {/* DB 타입 — 변경 시 빌더필드타입 자동 매핑 (사용자가 이후 직접 변경 가능) */}
                                    <td className="px-1 py-1">
                                        <select
                                            value={f.columnType}
                                            onChange={e => {
                                                const newDbType = e.target.value;
                                                setFields(prev => prev.map((field, i) => i === idx ? {
                                                    ...field,
                                                    columnType: newDbType,
                                                    fieldType: mapDbTypeToFieldType(newDbType),
                                                } : field));
                                            }}
                                            className={SELECT_SM}
                                        >
                                            {DB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </td>

                                    {/* 빌더필드타입 — DB 타입 자동 매핑, 직접 변경 가능 */}
                                    <td className="px-1 py-1">
                                        <select
                                            value={f.fieldType ?? ''}
                                            onChange={e => updateField(idx, 'fieldType', e.target.value || null)}
                                            className={SELECT_SM}
                                        >
                                            <option value="">— 없음 —</option>
                                            {BUILDER_FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </td>

                                    {/* 공통코드 — 선택 시 빌더 select/radio/checkbox 옵션 자동 연결 */}
                                    <td className="px-1 py-1">
                                        <select
                                            value={f.codeGroupCode ?? ''}
                                            onChange={e => updateField(idx, 'codeGroupCode', e.target.value || null)}
                                            className={SELECT_SM}
                                        >
                                            <option value="">— 없음 —</option>
                                            {codeGroups.map(g => (
                                                <option key={g.groupCode} value={g.groupCode}>
                                                    {g.groupCode} - {g.groupName}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* 길이 */}
                                    <td className="px-1 py-1">
                                        <input
                                            type="number"
                                            value={f.columnLength ?? ''}
                                            onChange={e => updateField(idx, 'columnLength', e.target.value ? Number(e.target.value) : null)}
                                            placeholder="255"
                                            className={INPUT_SM}
                                        />
                                    </td>

                                    {/* NULL 허용 */}
                                    <td className="px-2 py-1 text-center">
                                        <input
                                            type="checkbox"
                                            checked={f.isNullable}
                                            onChange={e => updateField(idx, 'isNullable', e.target.checked)}
                                            className="w-3.5 h-3.5 cursor-pointer"
                                        />
                                    </td>

                                    {/* 기본값 */}
                                    <td className="px-1 py-1">
                                        <input
                                            type="text"
                                            value={f.defaultValue ?? ''}
                                            onChange={e => updateField(idx, 'defaultValue', e.target.value || null)}
                                            placeholder="기본값"
                                            className={INPUT_SM}
                                        />
                                    </td>

                                    {/* 설명 */}
                                    <td className="px-1 py-1">
                                        <input
                                            type="text"
                                            value={f.description ?? ''}
                                            onChange={e => updateField(idx, 'description', e.target.value || null)}
                                            placeholder=""
                                            className={INPUT_SM}
                                        />
                                    </td>

                                    {/* 순서 */}
                                    <td className="px-1 py-1">
                                        <input
                                            type="number"
                                            value={f.sortOrder}
                                            onChange={e => updateField(idx, 'sortOrder', Number(e.target.value))}
                                            className={INPUT_SM}
                                        />
                                    </td>

                                    {/* 삭제 */}
                                    <td className="px-2 py-1 text-center">
                                        <button
                                            onClick={() => removeRow(idx)}
                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 하단 버튼 */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30">
                <button
                    onClick={addRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                    필드 추가
                </button>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-60 transition-all"
                    >
                        {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                        Entity 삭제
                    </button>

                    {/* 파일생성 — table_name이 저장되어 있어야 활성화 (헤더의 table_name 입력 후 저장 필요) */}
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handleGenerateClick}
                            disabled={tableNameMissing || previewLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCode2 className="w-3.5 h-3.5" />}
                            파일생성
                        </button>
                        {tableNameMissing && (
                            <span className="text-[10px] text-amber-600 max-w-[170px] leading-tight">
                                위 헤더에서 table_name을 입력 후 저장해주세요.
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md disabled:opacity-60 transition-all"
                    >
                        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                        저장
                    </button>
                </div>
            </div>

            {/* Java 코드 자동생성 — 미리보기 모달 */}
            {previewData && (
                <CodeGenerateModal
                    entityId={entity.id}
                    preview={previewData}
                    onClose={() => setPreviewData(null)}
                    onSaved={handleCodeSaved}
                />
            )}

            {/* Java 코드 자동생성 — 저장 결과 알림 모달 */}
            {saveResult && (
                <CodeSaveResultModal
                    result={saveResult}
                    onClose={() => setSaveResult(null)}
                />
            )}
        </div>
    );
}
