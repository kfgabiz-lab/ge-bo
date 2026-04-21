'use client';

/**
 * TableCellRenderer — 테이블 단일 셀 렌더러
 *
 * - preview: 샘플 데이터 표시 (rowIndex 기반 순환, 클릭 없음)
 * - live: 실 데이터 + 액션 핸들러 연결 ([slug]/page.tsx renderCell 대체)
 *
 * 지원 셀 타입: text | badge | boolean | actions | file
 *
 * 사용법:
 *   // preview
 *   <TableCellRenderer mode="preview" col={col} rowIndex={3} />
 *
 *   // live
 *   <TableCellRenderer mode="live" col={col} row={rowData} codeGroups={codeGroups} handlers={tableHandlers} />
 */

import React from 'react';
import { Pencil, Eye, Trash2, Paperclip } from 'lucide-react';
import { TableColumnConfig, CodeGroupDef } from '../../types';
import type { RendererMode, TableActionHandlers } from './types';

/* ────────────────────────────────────────────────────────── */
/*  색상 정적 맵 (Tailwind purge 방지 — 동적 문자열 사용 금지) */
/* ────────────────────────────────────────────────────────── */

/** badge 색상 (배경·텍스트·테두리) */
const BADGE_CLS: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    blue:    'bg-blue-50 text-blue-700 border border-blue-200',
    amber:   'bg-amber-50 text-amber-700 border border-amber-200',
    red:     'bg-red-50 text-red-700 border border-red-200',
    purple:  'bg-purple-50 text-purple-700 border border-purple-200',
    slate:   'bg-slate-100 text-slate-600 border border-slate-200',
    pink:    'bg-pink-50 text-pink-700 border border-pink-200',
    sky:     'bg-sky-50 text-sky-700 border border-sky-200',
};

/** badge 아이콘 도트 색상 */
const BADGE_DOT: Record<string, string> = {
    emerald: 'bg-emerald-500', blue:   'bg-blue-500',   amber:  'bg-amber-500',
    red:     'bg-red-500',     purple: 'bg-purple-500', slate:  'bg-slate-500',
    pink:    'bg-pink-500',    sky:    'bg-sky-500',
};

/** 커스텀 액션 버튼 색상 */
const CA_CLS: Record<string, string> = {
    slate:  'bg-slate-500 hover:bg-slate-600 text-white',
    blue:   'bg-blue-500 hover:bg-blue-600 text-white',
    green:  'bg-emerald-500 hover:bg-emerald-600 text-white',
    red:    'bg-red-500 hover:bg-red-600 text-white',
    orange: 'bg-orange-500 hover:bg-orange-600 text-white',
};

/* ────────────────────────────────────────────────────────── */

interface TableCellRendererProps {
    mode: RendererMode;
    col: TableColumnConfig;
    row?: Record<string, unknown>;      // live: 실제 행 데이터
    rowIndex?: number;                  // preview: 샘플 순환 인덱스 (0~4)
    codeGroups?: CodeGroupDef[];
    handlers?: TableActionHandlers;
}

export function TableCellRenderer({
    mode,
    col,
    row = {},
    rowIndex = 0,
    codeGroups = [],
    handlers,
}: TableCellRendererProps) {
    const isPreview = mode === 'preview';
    const value = row[col.accessor];

    switch (col.cellType) {

        /* ── badge ── */
        case 'badge': {
            if (isPreview) {
                /* preview: cellOptions 배열을 rowIndex 기준으로 순환 표시 */
                const opt = col.cellOptions?.[rowIndex % (col.cellOptions?.length || 1)];
                if (!opt) return <span className="text-slate-400 text-sm">샘플</span>;
                const shapeCls = (col.badgeShape || 'round') === 'round' ? 'rounded-full' : 'rounded-md font-semibold';
                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium ${shapeCls} ${BADGE_CLS[opt.color] || BADGE_CLS.slate}`}>
                        {col.showIcon && (
                            <span className={`w-1.5 h-1.5 rounded-full ${BADGE_DOT[opt.color] || BADGE_DOT.slate}`} />
                        )}
                        {opt.text}
                    </span>
                );
            }
            /* live: 실제 값으로 cellOptions에서 매칭 */
            const liveOpt = col.cellOptions?.find(o => o.value === String(value ?? ''));
            if (!liveOpt) return <span className="text-sm text-slate-600">{String(value ?? '')}</span>;
            const shapeCls = col.badgeShape === 'square' ? 'rounded' : 'rounded-full';
            return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium ${shapeCls} ${BADGE_CLS[liveOpt.color] || BADGE_CLS.slate}`}>
                    {col.showIcon && (
                        <span className={`w-1.5 h-1.5 rounded-full ${BADGE_DOT[liveOpt.color] || BADGE_DOT.slate}`} />
                    )}
                    {liveOpt.text}
                </span>
            );
        }

        /* ── boolean ── */
        case 'boolean': {
            /* preview: 홀/짝 행 교번으로 true/false 샘플 표시 */
            const boolVal = isPreview ? (rowIndex % 2 === 0) : Boolean(value);
            return (
                <span className={`text-sm ${boolVal ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    {boolVal ? (col.trueText || '공개') : (col.falseText || '비공개')}
                </span>
            );
        }

        /* ── actions ── */
        case 'actions': {
            const justifyCls =
                col.align === 'center' ? 'justify-center' :
                col.align === 'right'  ? 'justify-end'    : 'justify-start';
            return (
                <div className={`flex items-center gap-1 flex-wrap ${justifyCls}`}>
                    {/* 프리셋 버튼 — edit → detail → delete 고정 순서 */}
                    {(col.actions || []).includes('edit') && (
                        <button
                            onClick={!isPreview ? () => handlers?.onEdit?.(row) : undefined}
                            className="p-1.5 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                            title="수정"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {(col.actions || []).includes('detail') && (
                        <button
                            onClick={!isPreview ? () => handlers?.onDetail?.(row) : undefined}
                            className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                            title="상세"
                        >
                            <Eye className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {(col.actions || []).includes('delete') && (
                        <button
                            onClick={!isPreview ? () => handlers?.onDelete?.(row._id as number) : undefined}
                            className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="삭제"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {/* 커스텀 액션 버튼 */}
                    {(col.customActions || []).filter(ca => ca.label).map(ca => (
                        <button
                            key={ca.id}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all ${CA_CLS[ca.color] || CA_CLS.slate}`}
                        >
                            {ca.label}
                        </button>
                    ))}
                </div>
            );
        }

        /* ── file ── */
        case 'file': {
            if (isPreview) {
                /* preview: 파일 2개 첨부 샘플 표시 */
                return (
                    <button className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                        <Paperclip className="w-3.5 h-3.5" />
                        2
                    </button>
                );
            }
            /* live: 실제 파일 ID 배열 수 표시 */
            const ids = Array.isArray(value) ? value : [];
            if (!ids.length) return <span className="text-sm text-slate-400">-</span>;
            return (
                <button
                    onClick={() => handlers?.onFileClick?.(col, row)}
                    className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <Paperclip className="w-3.5 h-3.5" />
                    {ids.length}
                </button>
            );
        }

        /* ── text (default) ── */
        default: {
            if (isPreview) {
                return <span className="text-slate-400 text-sm">샘플 텍스트</span>;
            }
            const strVal = String(value ?? '');
            /* 공통코드 연동 — 코드값을 이름으로 변환 (쉼표 구분 복수값 포함) */
            if (col.codeGroupCode && col.displayAs !== 'value') {
                const details = codeGroups.find(g => g.groupCode === col.codeGroupCode)?.details ?? [];
                const names = strVal.split(',').filter(Boolean)
                    .map(code => details.find(d => d.code === code.trim())?.name ?? code.trim())
                    .join(',');
                return <span className="text-sm text-slate-700">{names || strVal}</span>;
            }
            /* 숫자 포맷 — isNumber이고 실제 숫자인 경우에만 3자리 콤마 */
            const displayVal =
                col.isNumber && strVal !== '' && !isNaN(Number(strVal))
                    ? Number(strVal).toLocaleString()
                    : strVal;
            return <span className="text-sm text-slate-700">{displayVal}</span>;
        }
    }
}
