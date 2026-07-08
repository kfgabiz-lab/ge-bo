'use client';

/**
 * SubListRenderer — 서브 목록 위젯 렌더러
 *
 * Form 위젯 내부에서 다건 행 배열을 입력·삭제하는 컨텐츠 컴포넌트.
 * 모든 행은 항상 입력 필드로 표시된다 (normal/adding 구분 없음).
 *
 * [동작]
 * - + 추가 클릭 → 빈 행을 rows에 즉시 추가
 * - 각 셀 입력 → 해당 행의 값 업데이트
 * - 🗑️ 클릭 → confirm 후 행 제거
 *
 * [모드]
 * - preview: 빈 샘플 행 1개(disabled) 표시 — 빌더 미리보기
 * - live   : 실제 입력 동작
 *
 * 사용법:
 *   <SubListRenderer mode="preview" widget={subListWidget} />
 *   <SubListRenderer mode="live" widget={subListWidget} rows={rows} onChange={setRows} />
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, CopyPlus } from 'lucide-react';
import api from '@/lib/api';
import { RendererContainer } from './RendererContainer';
import { FieldRenderer } from './FieldRenderer';
import type { RendererMode, SubListWidget, SubListColumn } from './types';
import type { SearchFieldConfig, CodeGroupDef } from '../../types';
import { useI18n } from '@/hooks/use-i18n';

/* 파일 업로드가 필요한 컬럼 타입 */
const FILE_COL_TYPES = ['file', 'image'] as const;

/* ── 타입 정의 ── */

/** 렌더러에서 관리하는 행 데이터 */
export interface SubListRow {
    _rowId: string;
    [key: string]: unknown;
}

interface SubListRendererProps {
    mode: RendererMode;
    widget: SubListWidget;
    /** live 모드 — 현재 행 데이터 배열 */
    rows?: SubListRow[];
    /** live 모드 — 행 변경 콜백 */
    onChange?: (rows: SubListRow[]) => void;
    /** 외부 파일 변경 콜백 — Form: (fieldId, files) / SubList: (fieldId, files, rowId) */
    onFileChange?: (fieldId: string, files: File[], rowId?: string) => void;
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
        label: '',
        colSpan: 1,
        /* 공통 */
        placeholder:       col.placeholder,
        placeholderMsgKey: col.placeholderMsgKey,
        description:       col.description,
        descriptionMsgKey: col.descriptionMsgKey,
        required:          col.required,
        readonly:          col.readonly,
        /* 옵션 */
        options:           col.options,
        codeGroupCode:     col.codeGroup,
        /* 파일 */
        maxFileCount:      col.maxFileCount ?? 1,
        maxFileSizeMB:     col.maxFileSizeMB,
        maxTotalSizeMB:    col.maxTotalSizeMB,
        fileTypeMode:      col.fileTypeMode ?? (col.type === 'image' ? 'image' : 'doc'),
        allowedExtensions: col.allowedExtensions,
        /* 유효성검사 */
        minLength:         col.minLength,
        maxLength:         col.maxLength,
        showCharCount:     col.showCharCount,
        pattern:           col.pattern,
        patternDesc:       col.patternDesc,
        /* 기본값 */
        defaultValue:       col.defaultValue,
        defaultValueMsgKey: col.defaultValueMsgKey,
        defaultOptionValue: col.defaultOptionValue,
        /* date */
        defaultDateOffset:  col.defaultDateOffset,
        defaultDate:        col.defaultDate,
        disablePast:        col.disablePast,
        dateSubType:        col.dateSubType,
        defaultToday:       col.defaultToday,
        /* dateRange */
        label2:                  col.label2,
        label2MsgKey:            col.label2MsgKey,
        defaultStartDateOffset:  col.defaultStartDateOffset,
        defaultStartDate:        col.defaultStartDate,
        disableStartPast:        col.disableStartPast,
        defaultEndDateOffset:    col.defaultEndDateOffset,
        defaultEndDate:          col.defaultEndDate,
        disableEndPast:          col.disableEndPast,
        rangeSubType:            col.rangeSubType,
        /* select SLUG 옵션 소스 */
        optionSlug:              col.optionSlug,
        optionValueKey:          col.optionValueKey,
        optionTextKey:           col.optionTextKey,
    } as SearchFieldConfig;
}

/* ── 메인 컴포넌트 ── */

export function SubListRenderer({
    mode,
    widget,
    rows: externalRows,
    onChange,
    onFileChange: externalOnFileChange,
}: SubListRendererProps) {
    const visibleColumns = widget.columns;
    const { t } = useI18n();

    /* action 컬럼 존재 여부 및 삭제 포함 여부 */
    const actionCol = visibleColumns.find(col => col.type === 'action');
    /* action 컬럼에 삭제가 포함된 경우 → 고정 삭제 열 숨기고 action 컬럼에서 통합 처리 */
    const hasActionDelete = !!(actionCol?.actions || []).includes('delete');

    /* 공통코드 목록 */
    const [codeGroups, setCodeGroups] = useState<CodeGroupDef[]>([]);
    useEffect(() => {
        api.get('/codes')
            .then(res => setCodeGroups(res.data || []))
            .catch(() => {});
    }, []);

    /* 파일 컬럼 상태 — rowId → colId → File[] (UI 표시용 내부 관리) */
    const [internalFileMap, setInternalFileMap] = useState<Record<string, Record<string, File[]>>>({});
    /* 항상 내부 state 사용 */
    const effectiveFileMap = internalFileMap;

    /* 기존 파일 메타 — row 데이터의 파일 ID 배열로부터 로드 (수정 모드) */
    const [existingMetaMap, setExistingMetaMap] = useState<
        Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>
    >({});

    /* 행 목록 — 모든 행이 항상 입력 필드로 표시 */
    const [rows, setRows] = useState<SubListRow[]>(externalRows ?? []);

    /* 외부에서 rows prop이 변경되면 내부 상태 동기화 */
    useEffect(() => {
        if (externalRows !== undefined) setRows(externalRows);
    }, [externalRows]);

    /* rows 변경 시 파일 컬럼의 기존 파일 ID → 메타 로드 */
    useEffect(() => {
        if (mode !== 'live') return;
        const fileCols = visibleColumns.filter(c => (FILE_COL_TYPES as readonly string[]).includes(c.type));
        if (fileCols.length === 0) return;

        const allIds: number[] = [];
        rows.forEach(row => {
            fileCols.forEach(col => {
                const val = row[col.key];
                if (Array.isArray(val) && val.length > 0 && val.every(x => typeof x === 'number')) {
                    allIds.push(...(val as number[]));
                }
            });
        });

        if (allIds.length === 0) { setExistingMetaMap({}); return; }

        api.get('/page-files/meta', { params: { ids: allIds.join(',') } })
            .then(res => {
                const metaList = res.data as { id: number; origName: string; fileSize: number }[];
                const newMap: Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>> = {};
                rows.forEach(row => {
                    fileCols.forEach(col => {
                        const val = row[col.key];
                        if (!Array.isArray(val) || !val.every(x => typeof x === 'number')) return;
                        if (!newMap[row._rowId]) newMap[row._rowId] = {};
                        newMap[row._rowId][col.id] = (val as number[]).map(id => {
                            const m = metaList.find(m => m.id === id);
                            return m ? { id: m.id, origName: m.origName, fileSize: m.fileSize } : { id, origName: '', fileSize: 0 };
                        });
                    });
                });
                setExistingMetaMap(newMap);
            })
            .catch(() => {});
    }, [rows, mode]); // eslint-disable-line react-hooks/exhaustive-deps

    /* 추가 버튼 활성 여부 */
    const maxRows = widget.maxRows ?? 0;
    const isAddDisabled = mode === 'preview' || (maxRows > 0 && rows.length >= maxRows);

    /* ── 이벤트 핸들러 ── */

    /** 추가 — 빈 행을 rows에 즉시 추가 (UUID id 영속 저장) */
    const handleAdd = useCallback(() => {
        const newId = crypto.randomUUID();
        const newRow: SubListRow = { _rowId: newId, id: newId };
        const updated = [...rows, newRow];
        setRows(updated);
        onChange?.(updated);
    }, [rows, onChange]);

    /** 파일 변경 핸들러 — 항상 내부 state 업데이트 후 외부 콜백 호출 */
    const handleFileChange = useCallback((rowId: string, colId: string, files: File[]) => {
        /* 항상 내부 state 업데이트 (UI 표시용) */
        setInternalFileMap(prev => ({
            ...prev,
            [rowId]: { ...(prev[rowId] ?? {}), [colId]: files },
        }));
        /* 외부 콜백 — colId가 fieldId 역할, rowId는 SubList 행 식별자 */
        externalOnFileChange?.(colId, files, rowId);
    }, [externalOnFileChange]);

    /** 삭제 — 기존 파일 API 삭제 후 행 제거 */
    const handleDelete = useCallback((rowId: string) => {
        if (!confirm('삭제하시겠습니까?')) return;
        /* 해당 row의 기존 파일 즉시 삭제 */
        const fileMeta = existingMetaMap[rowId] ?? {};
        Object.values(fileMeta).flatMap(metas => metas.map(m => m.id)).forEach(fileId => {
            api.delete(`/page-files/${fileId}`).catch(() => {});
        });
        const updated = rows.filter(r => r._rowId !== rowId);
        setRows(updated);
        onChange?.(updated);
        /* 내부 파일 state 정리 */
        setInternalFileMap(prev => { const next = { ...prev }; delete next[rowId]; return next; });
        setExistingMetaMap(prev => { const next = { ...prev }; delete next[rowId]; return next; });
    }, [rows, onChange, existingMetaMap]);

    /** 행 값 변경 */
    const handleRowChange = useCallback((rowId: string, key: string, value: string) => {
        const updated = rows.map(r => r._rowId === rowId ? { ...r, [key]: value } : r);
        setRows(updated);
        onChange?.(updated);
    }, [rows, onChange]);

    /** 행 복사 — 해당 row를 바로 아래에 삽입 (새 UUID 생성) */
    const handleCopy = useCallback((rowId: string) => {
        const idx = rows.findIndex(r => r._rowId === rowId);
        if (idx === -1) return;
        const newId = crypto.randomUUID();
        const copied: SubListRow = { ...rows[idx], _rowId: newId, id: newId };
        const updated = [...rows.slice(0, idx + 1), copied, ...rows.slice(idx + 1)];
        setRows(updated);
        onChange?.(updated);

        /* 업로드 대기 중인 File 객체(internalFileMap)도 함께 복제한다.
           File은 참조 타입이라 그대로 복사하면 원본 행과 복사 행이 같은 File 인스턴스를
           공유하게 되어 이후 한쪽 행에서만 파일을 지워도 다른 행에 영향을 줄 수 있다.
           new File()로 별도 인스턴스를 만들어 완전히 독립된 행으로 취급한다. */
        const originalFiles = internalFileMap[rowId];
        if (originalFiles) {
            const clonedFiles: Record<string, File[]> = {};
            Object.entries(originalFiles).forEach(([colId, files]) => {
                clonedFiles[colId] = files.map(
                    f => new File([f], f.name, { type: f.type, lastModified: f.lastModified })
                );
            });
            setInternalFileMap(prev => ({ ...prev, [newId]: clonedFiles }));

            /* 화면 표시용 internalFileMap뿐 아니라 상위(useWidgetPageState)의 subListFileMap까지
               갱신해야 한다. 저장 시에는 subListFileMap[widgetId][rowId][colId]를 읽어 업로드하므로
               이 호출이 빠지면 화면엔 파일이 보여도 저장 시 복사 행의 파일이 실제로는 올라가지 않는다. */
            Object.entries(clonedFiles).forEach(([colId, files]) => {
                externalOnFileChange?.(colId, files, newId);
            });
        }
    }, [rows, onChange, internalFileMap, externalOnFileChange]);

    /** 기존 파일 제거 — existingMetaMap + row 데이터의 ID 배열 동시 갱신 */
    const handleRemoveExisting = useCallback((rowId: string, colId: string, fileId: number) => {
        setExistingMetaMap(prev => ({
            ...prev,
            [rowId]: {
                ...(prev[rowId] ?? {}),
                [colId]: (prev[rowId]?.[colId] ?? []).filter(m => m.id !== fileId),
            },
        }));
        const col = visibleColumns.find(c => c.id === colId);
        if (!col) return;
        const updated = rows.map(r => {
            if (r._rowId !== rowId) return r;
            const ids = Array.isArray(r[col.key]) ? (r[col.key] as number[]) : [];
            return { ...r, [col.key]: ids.filter(id => id !== fileId) };
        });
        setRows(updated);
        onChange?.(updated);
    }, [rows, onChange, visibleColumns]);

    /* addButtonLabel — MsgKey 우선, 없으면 직접 텍스트, 없으면 기본값 */
    const addLabel = widget.addButtonLabelMsgKey
        ? t(widget.addButtonLabelMsgKey)
        : (widget.addButtonLabel ?? '추가');

    /* preview 모드 — 빈 샘플 행 1개 표시 */
    const previewRows: SubListRow[] = [{ _rowId: 'preview-1' }];
    const displayRows = mode === 'preview' ? previewRows : rows;

    return (
        <RendererContainer showBorder={widget.showBorder ?? true}>
            <div className="flex flex-col h-full">

                {/* ── 헤더 영역 ── */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/60 gap-2 flex-shrink-0">

                    {/* 왼쪽: 타이틀 + 행 수 */}
                    <div className="flex items-center gap-2 min-w-0">
                        {(widget.titleMsgKey || widget.title) && (
                            <span className="text-sm font-semibold text-slate-800 truncate">
                                {widget.titleMsgKey ? t(widget.titleMsgKey) : widget.title}
                            </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                            {mode === 'preview' ? '-' : `${rows.length}개`}
                        </span>
                    </div>

                    {/* 오른쪽: 추가 버튼 */}
                    <button
                        type="button"
                        disabled={isAddDisabled}
                        onClick={handleAdd}
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
                                        {/* action 컬럼 헤더 — label 없으면 "관리"로 표시 */}
                                        {col.type === 'action'
                                            ? (col.labelMsgKey ? t(col.labelMsgKey) : (col.label || '관리'))
                                            : (col.labelMsgKey ? t(col.labelMsgKey) : col.label)
                                        }
                                        {col.required && (
                                            <span className="ml-0.5 text-red-500">*</span>
                                        )}
                                    </th>
                                ))}
                                {/* 고정 삭제 열 — action 컬럼에 삭제가 없을 때만 표시 */}
                                {!hasActionDelete && (
                                    <th className="px-3 py-2 text-center font-semibold text-slate-600 w-16 whitespace-nowrap">
                                        삭제
                                    </th>
                                )}
                            </tr>
                        </thead>

                        <tbody>
                            {/* 빈 상태 — live 모드 전용 */}
                            {displayRows.length === 0 && mode === 'live' ? (
                                <tr>
                                    <td
                                        colSpan={visibleColumns.length + 1}
                                        className="px-3 py-8 text-center text-xs text-slate-400"
                                    >
                                        등록된 항목이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                displayRows.map(row => (
                                    <tr
                                        key={row._rowId}
                                        className="border-b border-slate-100"
                                    >
                                        {/* 각 셀 — 항상 입력 필드, 파일 타입은 Form과 동일하게 props 전달 */}
                                        {visibleColumns.map(col => {
                                            const isFileType = (FILE_COL_TYPES as readonly string[]).includes(col.type);
                                            /* dateRange 타입 — value 1개가 아니라 from/to 2개 슬롯을 사용 (FormRenderer/SearchRenderer와 동일 컨벤션) */
                                            const isRangeType = col.type === 'dateRange';

                                            /* action 타입 컬럼 — 삭제/복사 버튼 통합 렌더링 */
                                            if (col.type === 'action') {
                                                return (
                                                    <td key={col.id} className="px-2 py-1.5 align-middle">
                                                        <div className="flex items-center gap-1 justify-center">
                                                            {(col.actions || []).includes('delete') && (
                                                                <button
                                                                    type="button"
                                                                    disabled={mode === 'preview'}
                                                                    onClick={() => handleDelete(row._rowId)}
                                                                    className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                                    title="삭제"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            {(col.actions || []).includes('copy') && (
                                                                <button
                                                                    type="button"
                                                                    disabled={mode === 'preview'}
                                                                    onClick={() => handleCopy(row._rowId)}
                                                                    className="p-1.5 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                                    title="복사"
                                                                >
                                                                    <CopyPlus className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={col.id} className="px-2 py-1.5 align-middle">
                                                    <FieldRenderer
                                                        mode={mode}
                                                        field={toFieldConfig(col)}
                                                        /* dateRange는 value/onChange 대신 valueFrom/valueTo/onFromChange/onToChange로 배선 */
                                                        value={isRangeType ? undefined : String(row[col.key] ?? '')}
                                                        onChange={isRangeType ? undefined : (v => handleRowChange(row._rowId, col.key, v))}
                                                        valueFrom={isRangeType ? String(row[col.key + '_from'] ?? '') : undefined}
                                                        valueTo={isRangeType ? String(row[col.key + '_to'] ?? '') : undefined}
                                                        onFromChange={isRangeType ? (v => handleRowChange(row._rowId, col.key + '_from', v)) : undefined}
                                                        onToChange={isRangeType ? (v => handleRowChange(row._rowId, col.key + '_to', v)) : undefined}
                                                        codeGroups={codeGroups}
                                                        fileList={isFileType ? (effectiveFileMap[row._rowId]?.[col.id] ?? []) : undefined}
                                                        existingFileMeta={isFileType ? (existingMetaMap[row._rowId]?.[col.id] ?? []) : undefined}
                                                        onFileChange={isFileType ? (files => handleFileChange(row._rowId, col.id, files)) : undefined}
                                                        onRemoveExisting={isFileType ? (fileId => handleRemoveExisting(row._rowId, col.id, fileId)) : undefined}
                                                    />
                                                </td>
                                            );
                                        })}

                                        {/* 고정 삭제 열 — action 컬럼에 삭제 없을 때만 표시 */}
                                        {!hasActionDelete && (
                                            <td className="px-2 py-1.5 text-center align-middle w-16">
                                                <button
                                                    type="button"
                                                    disabled={mode === 'preview'}
                                                    title="삭제"
                                                    onClick={() => handleDelete(row._rowId)}
                                                    className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </RendererContainer>
    );
}
