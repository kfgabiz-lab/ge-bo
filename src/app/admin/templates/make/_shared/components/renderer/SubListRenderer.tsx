'use client';

/**
 * SubListRenderer — 서브 목록 위젯 렌더러
 *
 * Form 위젯 내부에서 다건 행 배열을 입력·수정·삭제하는 컨텐츠 컴포넌트.
 * 상위 Form의 dataJson[contentKey]에 배열로 함께 저장된다.
 *
 * [행 상태]
 * - normal  : 저장된 행 — 값 텍스트 표시 + ✏️🗑️ 버튼
 * - editing : 편집 중인 행 — FieldRenderer 입력 컴포넌트 + ✓✕ 버튼
 * - adding  : 신규 추가 행 — FieldRenderer 빈 입력 컴포넌트 + ✓✕ 버튼
 *
 * [모드]
 * - preview: 빈 테이블(헤더 + "등록된 항목이 없습니다.") 표시 — 빌더 미리보기
 * - live   : 실제 CRUD 동작 — 상위 Form에 배열 데이터 전달
 *
 * [재사용]
 * 셀 편집 입력은 FieldRenderer(공통 필드 렌더러)를 재사용한다.
 * SubListColumn → SearchFieldConfig 변환 후 전달.
 *
 * 사용법:
 *   <SubListRenderer mode="preview" widget={subListWidget} />
 *   <SubListRenderer mode="live" widget={subListWidget} rows={rows} onChange={setRows} />
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, Check, X, Paperclip, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';
import { RendererContainer } from './RendererContainer';
import { FieldRenderer } from './FieldRenderer';
import type { RendererMode, SubListWidget, SubListColumn } from './types';
import type { SearchFieldConfig, CodeGroupDef } from '../../types';

/* ── 타입 정의 ── */

/** 렌더러 내부에서 관리하는 행 데이터 */
export interface SubListRow {
    _rowId: string;
    [key: string]: unknown;
}

interface SubListRendererProps {
    mode: RendererMode;
    widget: SubListWidget;
    contentColSpan?: number;
    /** live 모드 — 현재 행 데이터 배열 */
    rows?: SubListRow[];
    /** live 모드 — 행 변경 콜백 (상위 Form에 전달) */
    onChange?: (rows: SubListRow[]) => void;
}

/* ── SubListColumn → SearchFieldConfig 변환 유틸 ── */

/**
 * SubListColumn을 FieldRenderer가 받는 SearchFieldConfig 형태로 변환한다.
 * 셀 안에서 라벨 없이 입력 컴포넌트만 표시하므로 label은 비워둔다.
 */
function toFieldConfig(col: SubListColumn): SearchFieldConfig {
    return {
        id: col.id,
        type: col.type as SearchFieldConfig['type'],
        label: '',                      // 셀 내부 — 라벨 미표시
        colSpan: 1,
        placeholder: col.placeholder,
        options: col.options,
        codeGroupCode: col.codeGroup,
        required: col.required,
        maxFileCount: col.maxFileCount ?? 1,
        maxFileSizeMB: col.maxFileSizeMB,
        fileTypeMode: col.fileTypeMode ?? (col.type === 'image' ? 'image' : 'doc'),
    } as SearchFieldConfig;
}


/* ── 일반 행 셀 값 표시 컴포넌트 ── */

interface NormalCellProps {
    col: SubListColumn;
    value: unknown;
}

/**
 * normal 상태 행의 셀 값을 타입에 맞게 표시한다.
 * file/image는 아이콘 + 개수 표시로 컴팩트하게 처리한다.
 */
function NormalCell({ col, value }: NormalCellProps) {
    /* file / image — 아이콘 + 개수 표시 */
    if (col.type === 'file') {
        const count = Array.isArray(value) ? value.length : 0;
        return (
            <span className="flex items-center gap-1 text-slate-500 text-xs">
                <Paperclip className="w-3 h-3 flex-shrink-0" />
                {count > 0 ? `${count}개` : <span className="text-slate-300">-</span>}
            </span>
        );
    }
    if (col.type === 'image') {
        const count = Array.isArray(value) ? value.length : 0;
        return (
            <span className="flex items-center gap-1 text-slate-500 text-xs">
                <ImageIcon className="w-3 h-3 flex-shrink-0" />
                {count > 0 ? `${count}개` : <span className="text-slate-300">-</span>}
            </span>
        );
    }
    /* dateRange — from~to 포맷 */
    if (col.type === 'dateRange') {
        const str = value != null ? String(value) : '';
        const [from, to] = str.split('~');
        return (
            <span className="text-slate-700 text-xs whitespace-nowrap">
                {from || '-'} ~ {to || '-'}
            </span>
        );
    }
    /* textarea — 줄바꿈 없이 한 줄 truncate */
    if (col.type === 'textarea') {
        const text = value != null && value !== '' ? String(value) : '';
        return (
            <span className="text-slate-700 text-xs truncate block max-w-[160px]" title={text}>
                {text || <span className="text-slate-300">-</span>}
            </span>
        );
    }
    /* 그 외 (input, select, date) */
    const text = value != null && value !== '' ? String(value) : '';
    return <span className="text-slate-700 text-xs">{text || <span className="text-slate-300">-</span>}</span>;
}

/* ── 편집/추가 행 셀 입력 컴포넌트 ── */

interface EditCellProps {
    col: SubListColumn;
    value: string;
    mode: RendererMode;
    codeGroups: CodeGroupDef[];
    onChange: (v: string) => void;
}

/**
 * editing / adding 상태 행의 셀 입력을 FieldRenderer를 재사용하여 표시한다.
 * file/image는 셀 높이가 늘어나므로 행 확장이 자연스럽게 처리된다.
 */
function EditCell({ col, value, mode, codeGroups, onChange }: EditCellProps) {
    const fieldConfig = toFieldConfig(col);
    return (
        <FieldRenderer
            mode={mode}
            field={fieldConfig}
            value={value}
            codeGroups={codeGroups}
            onChange={onChange}
        />
    );
}

/* ── 메인 컴포넌트 ── */

export function SubListRenderer({
    mode,
    widget,
    rows: externalRows,
    onChange,
}: SubListRendererProps) {
    const visibleColumns = widget.columns;

    /* 공통코드 목록 — FormRenderer/SearchRenderer와 동일한 패턴 */
    const [codeGroups, setCodeGroups] = useState<CodeGroupDef[]>([]);
    useEffect(() => {
        api.get('/codes')
            .then(res => setCodeGroups(res.data || []))
            .catch(() => {});
    }, []);

    /* live 모드 행 목록 */
    const [liveRows, setLiveRows] = useState<SubListRow[]>(externalRows ?? []);


    /* 신규 추가 행 표시 여부 */
    const [isAdding, setIsAdding] = useState(false);
    /* 신규 추가 행 입력값 */
    const [addingValues, setAddingValues] = useState<Record<string, string>>({});

    /* 현재 표시할 행 목록 */
    const displayRows = liveRows;

    /* 추가 버튼 활성 여부 */
    const maxRows = widget.maxRows ?? 0;
    const isAddDisabled = mode === 'preview' || isAdding || (maxRows > 0 && displayRows.length >= maxRows);

    /* ── 이벤트 핸들러 (live 모드 전용) ── */

    /** 삭제 */
    const handleDelete = useCallback((rowId: string) => {
        if (!confirm('삭제하시겠습니까?')) return;
        const updated = liveRows.filter(r => r._rowId !== rowId);
        setLiveRows(updated);
        onChange?.(updated);
    }, [liveRows, onChange]);

    /** 추가 행 열기 */
    const handleAddOpen = useCallback(() => {
        setAddingValues({});
        setIsAdding(true);
    }, []);

    /** 추가 확인 */
    const handleAddConfirm = useCallback(() => {
        const newRow: SubListRow = {
            _rowId: `row-${Date.now()}`,
            ...addingValues,
        };
        const updated = [...liveRows, newRow];
        setLiveRows(updated);
        onChange?.(updated);
        setIsAdding(false);
        setAddingValues({});
    }, [liveRows, addingValues, onChange]);

    /** 추가 취소 */
    const handleAddCancel = useCallback(() => {
        setIsAdding(false);
        setAddingValues({});
    }, []);

    /* addButtonLabel 기본값 — 버튼 앞에 <Plus> 아이콘이 있으므로 텍스트에 + 미포함 */
    const addLabel = widget.addButtonLabel ?? '추가';

    return (
        <RendererContainer showBorder={widget.showBorder ?? true}>
            <div className="flex flex-col h-full">

                {/* ── 헤더 영역 ── */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/60 gap-2 flex-shrink-0">

                    {/* 왼쪽: 타이틀 + 행 수 */}
                    <div className="flex items-center gap-2 min-w-0">
                        {widget.title && (
                            <span className="text-sm font-semibold text-slate-800 truncate">
                                {widget.title}
                            </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                            {displayRows.length}개
                        </span>
                    </div>

                    {/* 오른쪽: 추가 버튼 */}
                    <button
                        type="button"
                        disabled={isAddDisabled}
                        onClick={handleAddOpen}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                    >
                        <Plus className="w-3 h-3" />
                        {addLabel}
                    </button>
                </div>

                {/* ── 테이블 ── */}
                <div className="flex-1 overflow-auto min-h-0">
                    <table className="w-full text-xs border-collapse table-auto">

                        {/* 컬럼 헤더 */}
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b border-slate-200">
                                {visibleColumns.map(col => (
                                    <th
                                        key={col.id}
                                        className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap"
                                        style={{ minWidth: 80 }}
                                    >
                                        {col.label}
                                        {col.required && (
                                            <span className="ml-0.5 text-red-500">*</span>
                                        )}
                                    </th>
                                ))}
                                {/* 삭제 컬럼 */}
                                <th className="px-3 py-2 text-center font-semibold text-slate-600 w-16 whitespace-nowrap">
                                    삭제
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {/* ── 데이터 행 ── */}
                            {displayRows.length === 0 && !isAdding && mode === 'live' ? (
                                <tr>
                                    <td
                                        colSpan={visibleColumns.length + 1}
                                        className="px-3 py-8 text-center text-xs text-slate-400"
                                    >
                                        등록된 항목이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                displayRows.map(row => {
                                    return (
                                        <tr
                                            key={row._rowId}
                                            className="border-b border-slate-100 transition-colors hover:bg-slate-50/60"
                                        >
                                            {visibleColumns.map(col => (
                                                <td key={col.id} className="px-2 py-1.5 align-middle">
                                                    <NormalCell col={col} value={row[col.key]} />
                                                </td>
                                            ))}

                                            {/* 삭제 버튼 */}
                                            <td className="px-2 py-1.5 text-center align-middle w-16">
                                                <button type="button" disabled={mode === 'preview'} title="삭제"
                                                    onClick={() => handleDelete(row._rowId)}
                                                    className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}

                            {/* ── 신규 추가 행 (preview: disabled 상태로 폼 모양 표시) ── */}
                            {(isAdding || mode === 'preview') && (
                                <tr className="border-b border-blue-100 bg-blue-50/30">
                                    {visibleColumns.map(col => (
                                        <td
                                            key={col.id}
                                            className="px-2 py-1.5 align-middle"
                                        >
                                            <EditCell
                                                col={col}
                                                value={addingValues[col.key] ?? ''}
                                                mode={mode === 'preview' ? 'preview' : 'live'}
                                                codeGroups={codeGroups}
                                                onChange={v => setAddingValues(prev => ({ ...prev, [col.key]: v }))}
                                            />
                                        </td>
                                    ))}
                                    {/* 추가 행 확인 / 취소 */}
                                    <td className="px-2 py-1.5 text-center align-middle w-16">
                                        <div className={`flex items-center justify-center gap-1 ${mode === 'preview' ? 'opacity-40' : ''}`}>
                                            <button
                                                type="button"
                                                title="저장"
                                                disabled={mode === 'preview'}
                                                onClick={handleAddConfirm}
                                                className="p-1 rounded hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 transition-all disabled:cursor-not-allowed"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                title="취소"
                                                disabled={mode === 'preview'}
                                                onClick={handleAddCancel}
                                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all disabled:cursor-not-allowed"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </RendererContainer>
    );
}
