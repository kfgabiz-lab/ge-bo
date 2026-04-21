'use client';

/**
 * TableBuilder — 테이블 위젯 컬럼 설정 빌더 공통 컴포넌트
 *
 * widget/page.tsx TableWidgetPanel을 추출하여 재사용 가능하게 만든 컴포넌트.
 * - List 빌더와 동일한 수준의 컬럼 설정 지원
 * - Search 위젯 연결은 searchWidgets prop으로 주입 (allItems 직접 접근 X)
 * - 컬럼 편집 UI는 fields/ 컴포넌트로 완전 위임 (인라인 HTML 금지)
 *
 * 사용법:
 *   <TableBuilder
 *     widget={tableWidget}
 *     searchWidgets={collectWidgets(items,'search').map(w => ({widgetId: w.widgetId, contentKey: w.contentKey}))}
 *     onChange={setTableWidget}
 *   />
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Pencil } from 'lucide-react';
import api from '@/lib/api';
import { CodeGroupDef, CellType, TableColumnConfig, DisplayMode, TemplateItem } from '../../types';
import { createIdGenerator } from '../../utils';
import {
    ColumnBaseField,
    BadgeOptionsField,
    TextCodeGroupField,
    BooleanTextField,
    ActionsField,
} from './fields';

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

/** 테이블 위젯 — 데이터 목록 */
export interface TableWidget {
    type: 'table';
    widgetId: string;
    contentKey: string;
    columns: TableColumnConfig[];           /* List 빌더와 동일한 컬럼 타입 */
    connectedSearchIds: string[];           /* 연결된 Search 위젯 widgetId 목록 */
    connectedSlug?: string;                 /* DB Slug — 데이터 API 호출 대상 */
    pageSize: number;
    displayMode: DisplayMode;              /* 표시 방식 (pagination | scroll) */
}

/* ══════════════════════════════════════════ */
/*  상수                                       */
/* ══════════════════════════════════════════ */

/** 셀 타입 메타 (List 빌더와 동일) */
const CELL_TYPES: { type: CellType; label: string; desc: string }[] = [
    { type: 'text',    label: 'Text',    desc: '일반 텍스트' },
    { type: 'badge',   label: 'Badge',   desc: '배지 (아이콘/모양 옵션)' },
    { type: 'boolean', label: 'Boolean', desc: '공개/비공개' },
    { type: 'actions', label: 'Actions', desc: '액션 버튼' },
];

/* CUSTOM_ACTION_COLORS — 하위 호환 re-export (TableCellRenderer 등에서 참조 가능) */
export { CUSTOM_ACTION_COLORS } from './fields/col-types';

const uid = createIdGenerator('tb'); /* 컬럼 ID 생성기 */

/* ══════════════════════════════════════════ */
/*  Props                                     */
/* ══════════════════════════════════════════ */

interface TableBuilderProps {
    widget: TableWidget;
    onChange: (w: TableWidget) => void;
    /** 연결 가능한 Search 위젯 목록 (widget/page.tsx에서 collectWidgets로 추출 후 전달) */
    searchWidgets: Array<{ widgetId: string; contentKey: string }>;
    /** Slug 레지스트리 옵션 — DB Slug 드롭다운에서 사용 */
    slugOptions: { id: number; slug: string; name: string }[];
}

/* ══════════════════════════════════════════ */
/*  TableBuilder 메인 컴포넌트                 */
/* ══════════════════════════════════════════ */

/** 테이블 위젯 컬럼 설정 빌더 */
export function TableBuilder({ widget, onChange, searchWidgets, slugOptions }: TableBuilderProps) {
    /* 컬럼 편집 아코디언 상태 */
    const [editingColumnId, setEditingColumnId] = useState<string | null>(null);

    /**
     * 컬럼 추가 다이얼로그 상태
     * - null             → 다이얼로그 닫힘
     * - {} (cellType 없) → Phase 1: 셀 타입 선택
     * - { cellType: ... }→ Phase 2: 컬럼 설정 입력
     */
    const [pendingCol, setPendingCol] = useState<Partial<TableColumnConfig> | null>(null);

    /* 공통코드 및 레이어 팝업 템플릿 */
    const [codeGroups, setCodeGroups] = useState<CodeGroupDef[]>([]);
    const [layerTemplates, setLayerTemplates] = useState<TemplateItem[]>([]);
    const [layerTemplatesLoaded, setLayerTemplatesLoaded] = useState(false);

    /* 공통코드 로딩 */
    useEffect(() => {
        api.get('/codes').then(res => setCodeGroups(res.data || [])).catch(() => {});
    }, []);

    /* QUICK_DETAIL 팝업 목록 lazy 로딩 */
    const loadLayerTemplates = () => {
        if (layerTemplatesLoaded) return;
        api.get('/page-templates')
            .then(res => {
                setLayerTemplates((res.data as TemplateItem[]).filter(t => t.templateType === 'QUICK_DETAIL'));
                setLayerTemplatesLoaded(true);
            })
            .catch(() => {});
    };

    /* 컬럼 CRUD */
    const removeColumn = (id: string) =>
        onChange({ ...widget, columns: widget.columns.filter(c => c.id !== id) });
    const updateColumn = (id: string, patch: Partial<TableColumnConfig>) =>
        onChange({ ...widget, columns: widget.columns.map(c => c.id === id ? { ...c, ...patch } : c) });

    /* Search 연결 토글 */
    const toggleSearchConn = (searchId: string) => {
        const ids = widget.connectedSearchIds.includes(searchId)
            ? widget.connectedSearchIds.filter(id => id !== searchId)
            : [...widget.connectedSearchIds, searchId];
        onChange({ ...widget, connectedSearchIds: ids });
    };

    /** 셀 타입 선택 → pendingCol에 타입별 기본값 세팅 (Phase 2 진입) */
    const selectCellType = (type: CellType) => {
        setPendingCol({
            cellType:    type,
            header:      '',
            accessor:    type === 'actions' ? 'actions' : '',
            trueText:    '공개',
            falseText:   '비공개',
            width:       type === 'actions' ? 120 : 150,
            widthUnit:   'px',
            align:       type === 'actions' ? 'center' : 'left',
            sortable:    type !== 'actions',
            badgeShape:  'round',
            showIcon:    false,
            displayAs:   'text',
            actions:     type === 'actions' ? ['edit', 'detail', 'delete'] : undefined,
            cellOptions: type === 'badge'   ? [{ text: '', value: '', color: 'slate' }] : undefined,
        });
        if (type === 'actions') loadLayerTemplates();
    };

    /** pendingCol → 실제 컬럼 추가 확정 */
    const confirmAddColumn = () => {
        const p = pendingCol;
        if (!p?.cellType) return;
        if (p.cellType !== 'actions' && (!p.header?.trim() || !p.accessor?.trim())) return;

        onChange({
            ...widget,
            columns: [...widget.columns, {
                id:       uid(),
                header:   p.header?.trim() ?? '',
                accessor: p.accessor?.trim() || 'actions',
                width:    p.width,
                widthUnit: p.widthUnit ?? 'px',
                align:    p.align ?? 'left',
                sortable: p.sortable ?? true,
                cellType: p.cellType,
                /* badge 전용 */
                cellOptions: p.cellType === 'badge' ? (p.cellOptions ?? []).filter(o => o.text.trim()) : undefined,
                badgeShape:  p.cellType === 'badge' ? p.badgeShape : undefined,
                showIcon:    p.cellType === 'badge' ? p.showIcon   : undefined,
                /* boolean 전용 */
                trueText:  p.cellType === 'boolean' ? p.trueText  : undefined,
                falseText: p.cellType === 'boolean' ? p.falseText : undefined,
                /* actions 전용 */
                actions:            p.cellType === 'actions' ? p.actions            : undefined,
                customActions:      p.cellType === 'actions' ? p.customActions      : undefined,
                editPopupSlug:      p.cellType === 'actions' ? p.editPopupSlug      : undefined,
                detailPopupSlug:    p.cellType === 'actions' ? p.detailPopupSlug    : undefined,
                editFileLayerSlug:  p.cellType === 'actions' ? p.editFileLayerSlug  : undefined,
                detailFileLayerSlug:p.cellType === 'actions' ? p.detailFileLayerSlug: undefined,
                /* text 전용 */
                codeGroupCode: p.cellType === 'text' && p.codeGroupCode ? p.codeGroupCode : undefined,
                displayAs:     p.cellType === 'text' && p.codeGroupCode ? p.displayAs     : undefined,
            }],
        });
        setPendingCol(null);
    };

    /**
     * 컬럼 편집 패널 (아코디언 내부)
     * — 모든 UI를 fields/ 컴포넌트에 위임, 인라인 HTML 없음
     */
    const renderColumnEdit = (col: TableColumnConfig) => {
        /* 편집 모드 공통 onChange: 해당 컬럼 ID로 부분 업데이트 */
        const patch = (p: Partial<TableColumnConfig>) => updateColumn(col.id, p);
        return (
            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-100">
                <ColumnBaseField values={col} onChange={patch} />
                {col.cellType === 'badge'   && <BadgeOptionsField   values={col} onChange={patch} />}
                {col.cellType === 'text'    && <TextCodeGroupField  values={col} onChange={patch} codeGroups={codeGroups} codeGroupsLoading={false} />}
                {col.cellType === 'boolean' && <BooleanTextField    values={col} onChange={patch} />}
                {col.cellType === 'actions' && <ActionsField        values={col} onChange={patch} layerTemplates={layerTemplates} onRequestLayerTemplates={loadLayerTemplates} />}
            </div>
        );
    };

    /* ── 렌더 ── */
    return (
        <div className="space-y-2 pt-1">
            {/* 표시 방식 */}
            <div>
                <label className="text-[10px] font-medium text-slate-500 mb-1 block">표시 방식</label>
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                    {(['pagination', 'scroll'] as const).map(m => (
                        <button key={m} type="button" onClick={() => onChange({ ...widget, displayMode: m })}
                            className={`flex-1 py-1.5 text-[10px] font-semibold rounded transition-all ${(widget.displayMode ?? 'pagination') === m ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {m === 'pagination' ? '페이지네이션' : '무한 스크롤'}
                        </button>
                    ))}
                </div>
            </div>

            {/* 페이지당 건수 (pagination 모드만) */}
            {(widget.displayMode ?? 'pagination') === 'pagination' && (
                <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">페이지당 건수</label>
                    <input type="number" min={5} max={100} value={widget.pageSize}
                        onChange={e => onChange({ ...widget, pageSize: Number(e.target.value) || 10 })}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                </div>
            )}

            {/* 컨텐츠 Key */}
            <div>
                <label className="text-[10px] font-medium text-slate-500 mb-1 block">Key <span className="text-red-400">*</span></label>
                <input type="text" value={widget.contentKey} onChange={e => onChange({ ...widget, contentKey: e.target.value })}
                    placeholder="예: boardTable (페이지 내 고유)"
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900" />
            </div>

            {/* DB Slug — 데이터를 가져올 Slug 레지스트리 선택 */}
            <div>
                <label className="text-[10px] font-medium text-slate-500 mb-1 block">DB Slug</label>
                <select
                    value={widget.connectedSlug ?? ''}
                    onChange={e => onChange({ ...widget, connectedSlug: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900 bg-white"
                >
                    <option value="">(선택 안 함 - 데이터 조회 없음)</option>
                    {slugOptions.map(s => (
                        <option key={s.id} value={s.slug}>{s.name} ({s.slug})</option>
                    ))}
                </select>
            </div>

            {/* 연결된 Search 위젯 */}
            {searchWidgets.length > 0 && (
                <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">검색 연결</p>
                    <div className="space-y-0.5">
                        {searchWidgets.map(sw => (
                            <label key={sw.widgetId} className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={widget.connectedSearchIds.includes(sw.widgetId)}
                                    onChange={() => toggleSearchConn(sw.widgetId)} className="w-3 h-3 rounded border-slate-300 text-slate-900" />
                                <span className="text-[10px] text-slate-600">{sw.contentKey || sw.widgetId}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* 테이블 컬럼 목록 (아코디언) */}
            <div className="space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">테이블 컬럼</p>
                {widget.columns.map(col => (
                    <div key={col.id} className="border border-slate-200 rounded-md overflow-hidden">
                        {/* 컬럼 헤더 행 */}
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 hover:bg-slate-100 transition-all">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
                                col.cellType === 'badge'   ? 'bg-blue-100 text-blue-600' :
                                col.cellType === 'boolean' ? 'bg-emerald-100 text-emerald-600' :
                                col.cellType === 'actions' ? 'bg-orange-100 text-orange-600' :
                                'bg-slate-200 text-slate-600'
                            }`}>{col.cellType}</span>
                            <span className="text-[10px] text-slate-700 flex-1 truncate font-medium">
                                {col.header || (col.cellType === 'actions' ? '액션' : '—')}
                            </span>
                            <button
                                onClick={() => { setEditingColumnId(editingColumnId === col.id ? null : col.id); if (col.cellType === 'actions') loadLayerTemplates(); }}
                                className={`p-1 rounded transition-all flex-shrink-0 ${editingColumnId === col.id ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>
                                <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => removeColumn(col.id)}
                                className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex-shrink-0">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                        {/* 컬럼 편집 패널 (아코디언) */}
                        {editingColumnId === col.id && renderColumnEdit(col)}
                    </div>
                ))}

                {/* 컬럼 추가 다이얼로그 */}
                {pendingCol !== null ? (
                    <div className="border border-slate-200 rounded-md p-2 space-y-1.5">
                        {!pendingCol.cellType ? (
                            /* Phase 1: 셀 타입 선택 */
                            <>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-semibold text-slate-500">셀 타입 선택</span>
                                    <button onClick={() => setPendingCol(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
                                </div>
                                {CELL_TYPES.map(ct => (
                                    <button key={ct.type} onClick={() => selectCellType(ct.type)}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded border border-slate-100 hover:bg-slate-50 text-left transition-all">
                                        <span className="text-[11px] font-semibold text-slate-700">{ct.label}</span>
                                        <span className="text-[10px] text-slate-400">{ct.desc}</span>
                                    </button>
                                ))}
                            </>
                        ) : (
                            /* Phase 2: 컬럼 설정 입력 — renderColumnEdit과 동일한 컴포넌트 재사용 */
                            <div className="p-2 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-mono">{pendingCol.cellType}</span>
                                        <span className="text-[10px] font-semibold text-slate-500">컬럼 설정</span>
                                    </div>
                                    <button onClick={() => setPendingCol(prev => ({ ...prev!, cellType: undefined }))} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                                </div>

                                {/* edit/add 동일 컴포넌트 재사용 */}
                                <ColumnBaseField
                                    values={pendingCol}
                                    onChange={patch => setPendingCol(prev => ({ ...prev!, ...patch }))}
                                    autoFocus
                                />
                                {pendingCol.cellType === 'badge' && (
                                    <BadgeOptionsField
                                        values={pendingCol}
                                        onChange={patch => setPendingCol(prev => ({ ...prev!, ...patch }))}
                                    />
                                )}
                                {pendingCol.cellType === 'text' && (
                                    <TextCodeGroupField
                                        values={pendingCol}
                                        onChange={patch => setPendingCol(prev => ({ ...prev!, ...patch }))}
                                        codeGroups={codeGroups}
                                        codeGroupsLoading={false}
                                    />
                                )}
                                {pendingCol.cellType === 'boolean' && (
                                    <BooleanTextField
                                        values={pendingCol}
                                        onChange={patch => setPendingCol(prev => ({ ...prev!, ...patch }))}
                                    />
                                )}
                                {pendingCol.cellType === 'actions' && (
                                    <ActionsField
                                        values={pendingCol}
                                        onChange={patch => setPendingCol(prev => ({ ...prev!, ...patch }))}
                                        layerTemplates={layerTemplates}
                                        onRequestLayerTemplates={loadLayerTemplates}
                                    />
                                )}

                                {/* 추가 확정 버튼 */}
                                <button onClick={confirmAddColumn}
                                    disabled={pendingCol.cellType !== 'actions' && (!pendingCol.header?.trim() || !pendingCol.accessor?.trim())}
                                    className="w-full py-1.5 text-[11px] font-semibold bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-40 transition-all">
                                    추가
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button onClick={() => setPendingCol({})}
                        className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-slate-200 rounded text-[10px] text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all">
                        <Plus className="w-3 h-3" />컬럼 추가
                    </button>
                )}
            </div>
        </div>
    );
}
