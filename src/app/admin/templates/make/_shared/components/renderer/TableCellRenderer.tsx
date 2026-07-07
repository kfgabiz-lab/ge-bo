'use client';

/**
 * TableCellRenderer — 테이블 단일 셀 렌더러
 *
 * - preview: 샘플 데이터 표시 (rowIndex 기반 순환, 클릭 없음)
 * - live: 실 데이터 + 액션 핸들러 연결 ([slug]/page.tsx renderCell 대체)
 *
 * 지원 셀 타입: text | badge | boolean | actions | file | date | dateRangeStatus | inlineEdit | button
 *
 * 사용법:
 *   // preview
 *   <TableCellRenderer mode="preview" col={col} rowIndex={3} />
 *
 *   // live
 *   <TableCellRenderer mode="live" col={col} row={rowData} codeGroups={codeGroups} handlers={tableHandlers} />
 */

import React from 'react';
import { Pencil, Trash2, Paperclip } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { TableColumnConfig, CodeGroupDef } from '../../types';
import type { RendererMode, TableActionHandlers } from './types';
import { evalColumnDataExpr, formatFetchedRelValue, formatNowBySubType, resolveCodeLabel, applyMask } from '../../utils';
import { CUSTOM_ACTION_COLORS } from '../builder/fields/col-types';

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
    const { t } = useI18n();
    /* data 표현식이 있으면 평가, 없으면 flattenPageDataItem으로 만들어진 row에서 직접 접근
       단, row[accessor]가 배열(ARRAY_CONTAINS 다건 매칭)이면 evalColumnDataExpr을 거치지 않고 그대로 둔다 —
       default 케이스에서 formatFetchedRelValue(→formatFetchedRelArray)로 레코드별 data 표현식을 반복 평가하기 위함 */
    const rawValue = row[col.accessor];
    const value = col.data && !isPreview && !Array.isArray(rawValue)
        ? evalColumnDataExpr(col.data, row)
        : rawValue;

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
            const boolText = boolVal
                ? (col.trueTextMsgKey ? t(col.trueTextMsgKey) : (col.trueText || '공개'))
                : (col.falseTextMsgKey ? t(col.falseTextMsgKey) : (col.falseText || '비공개'));
            return (
                <span className={`text-sm truncate block ${boolVal ? 'text-emerald-600 font-medium' : 'text-slate-400'}`} title={boolText}>
                    {boolText}
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
                    {/* 프리셋 버튼 — edit → delete 고정 순서 */}
                    {(col.actions || []).includes('edit') && (
                        <button
                            onClick={!isPreview ? () => handlers?.onEdit?.(row) : undefined}
                            className="p-1.5 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                            title="수정"
                        >
                            <Pencil className="w-3.5 h-3.5" />
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
                </div>
            );
        }

        /* ── button ── */
        case 'button': {
            const justifyCls =
                col.align === 'center' ? 'justify-center' :
                col.align === 'right'  ? 'justify-end'    : 'justify-start';

            /* 버튼은 클릭 시 이동 대상 유효성을 사전 검증하지 않는 것과 마찬가지로,
               노출 여부도 조건으로 판단하지 않고 항상 노출한다 */
            const colorDef = CUSTOM_ACTION_COLORS.find(c => c.value === (col.buttonColor ?? 'slate')) ?? CUSTOM_ACTION_COLORS[0];

            return (
                <div className={`flex ${justifyCls}`}>
                    <button
                        type="button"
                        onClick={!isPreview ? () => handlers?.onButtonClick?.(col, row) : undefined}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${colorDef.cls}`}
                    >
                        {col.buttonLabel || '버튼'}
                    </button>
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

        /* ── date ── */
        case 'date': {
            if (isPreview) {
                return <span className="text-slate-400 text-sm">2024-01-15 14:30</span>;
            }
            const rawVal = String(value ?? '');
            if (!rawVal) return <span className="text-sm text-slate-400">-</span>;
            /* dateFormat 없으면 원본값 그대로 표시 */
            if (!col.dateFormat) return <span className="text-sm text-slate-700 truncate block" title={rawVal}>{rawVal}</span>;
            /* ISO 파싱 → 포맷 적용, 실패 시 원본값 */
            const d = new Date(rawVal);
            if (isNaN(d.getTime())) return <span className="text-sm text-slate-700 truncate block" title={rawVal}>{rawVal}</span>;
            const YYYY = String(d.getFullYear());
            const MM   = String(d.getMonth() + 1).padStart(2, '0');
            const DD   = String(d.getDate()).padStart(2, '0');
            const HH   = String(d.getHours()).padStart(2, '0');
            const mm   = String(d.getMinutes()).padStart(2, '0');
            const ss   = String(d.getSeconds()).padStart(2, '0');
            const formatted = col.dateFormat
                .replace('YYYY', YYYY).replace('MM', MM).replace('DD', DD)
                .replace('HH', HH).replace('mm', mm).replace('ss', ss);
            return <span className="text-sm text-slate-700 truncate block" title={formatted}>{formatted}</span>;
        }

        /* ── dateRangeStatus ── */
        case 'dateRangeStatus': {
            /* 다국어 키 우선, 없으면 직접 텍스트, 없으면 기본값 */
            const beforeLabel  = col.beforeTextMsgKey  ? t(col.beforeTextMsgKey)  : (col.beforeText  || '예정');
            const inRangeLabel = col.inRangeTextMsgKey ? t(col.inRangeTextMsgKey) : (col.inRangeText || '진행중');
            const afterLabel   = col.afterTextMsgKey   ? t(col.afterTextMsgKey)   : (col.afterText   || '종료');
            /* preview: 고정 샘플 텍스트 순환 표시 */
            if (isPreview) {
                const previewTexts = [beforeLabel, inRangeLabel, afterLabel];
                return <span className="text-sm text-slate-600">{previewTexts[rowIndex % 3]}</span>;
            }
            /* live: 연결된 dateRange 컬럼의 _from/_to 분리 값으로 오늘 날짜 비교 → 상태 텍스트 반환 */
            const fromStr = col.linkedDateRangeKey
                ? String(row[col.linkedDateRangeKey + '_from'] ?? '')
                : '';
            const toStr = col.linkedDateRangeKey
                ? String(row[col.linkedDateRangeKey + '_to'] ?? '')
                : '';
            if (!fromStr && !toStr) return <span className="text-sm text-slate-400">-</span>;
            /* rangeSubType에 맞는 현재 시각 포맷으로 비교 기준 산출 — 저장값(input value)과 동일 포맷이어야 함 */
            const subType = col.linkedRangeSubType ?? 'date';
            const nowStr = formatNowBySubType(subType);
            let statusText = '-';
            if (fromStr && nowStr < fromStr) {
                statusText = beforeLabel;
            } else if (fromStr && toStr && nowStr >= fromStr && nowStr <= toStr) {
                statusText = inRangeLabel;
            } else if (toStr && nowStr > toStr) {
                statusText = afterLabel;
            }
            return <span className="text-sm text-slate-600">{statusText}</span>;
        }

        /* ── inlineEdit ── */
        case 'inlineEdit': {
            const editType = col.inlineEditType ?? 'toggle';
            /* inlineEdit는 저장 경로(inlineEditFieldKey)가 표시값 경로와 동일해야 함
             * accessor가 다르게 설정된 경우에도 inlineEditFieldKey로 현재 값을 읽음 */
            const inlineValue = col.inlineEditFieldKey
                ? row[col.inlineEditFieldKey]
                : value;

            /* 옵션 파싱: "텍스트|값" 형식 → { text, value } 배열 */
            const opts = (col.options ?? []).map(o => {
                const [text, val] = o.split('|');
                return { text: text?.trim() ?? o, value: val?.trim() ?? o };
            });

            /* 공통코드 연동 옵션 */
            const codeDetails = col.codeGroupCode
                ? (codeGroups?.find(g => g.groupCode === col.codeGroupCode)?.details ?? [])
                : [];
            const resolvedOpts = codeDetails.length > 0
                ? codeDetails.map(d => ({ text: d.name, value: d.code }))
                : opts;

            /* ── 토글 ── */
            if (editType === 'toggle') {
                const boolVal = isPreview ? (rowIndex % 2 === 0) : Boolean(value);
                return (
                    <button
                        type="button"
                        onClick={!isPreview && col.inlineEditFieldKey
                            ? () => handlers?.onInlineEdit?.(row._id as number, col.inlineEditFieldKey!, !boolVal)
                            : undefined}
                        className={`relative w-9 h-5 rounded-full transition-colors ${boolVal ? 'bg-slate-900' : 'bg-slate-300'} ${isPreview ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${boolVal ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                );
            }

            /* ── 라디오 ── */
            if (editType === 'radio') {
                const currentVal = isPreview ? (resolvedOpts[rowIndex % Math.max(resolvedOpts.length, 1)]?.value ?? '') : String(value ?? '');
                if (!resolvedOpts.length) return <span className="text-slate-400 text-xs">옵션 없음</span>;
                return (
                    <div className="flex items-center gap-2 flex-wrap">
                        {resolvedOpts.map(opt => (
                            <label key={opt.value} className={`flex items-center gap-1 ${isPreview ? 'cursor-default' : 'cursor-pointer'}`}>
                                <input
                                    type="radio"
                                    checked={currentVal === opt.value}
                                    onChange={!isPreview && col.inlineEditFieldKey
                                        ? () => handlers?.onInlineEdit?.(row._id as number, col.inlineEditFieldKey!, opt.value)
                                        : undefined}
                                    disabled={isPreview}
                                    className="w-3 h-3 accent-slate-900"
                                />
                                <span className="text-xs text-slate-700">{opt.text}</span>
                            </label>
                        ))}
                    </div>
                );
            }

            /* ── 체크박스 ── */
            if (editType === 'checkbox') {
                /* 체크박스: 단일 boolean처럼 동작 (옵션 없으면) 또는 다중 배열 */
                if (!resolvedOpts.length) {
                    const boolVal = isPreview ? (rowIndex % 2 === 0) : Boolean(value);
                    return (
                        <input
                            type="checkbox"
                            checked={boolVal}
                            onChange={!isPreview && col.inlineEditFieldKey
                                ? () => handlers?.onInlineEdit?.(row._id as number, col.inlineEditFieldKey!, !boolVal)
                                : undefined}
                            disabled={isPreview}
                            className="w-4 h-4 accent-slate-900"
                        />
                    );
                }
                /* 다중 선택: 저장값은 배열 */
                const selectedVals: string[] = isPreview
                    ? [resolvedOpts[rowIndex % resolvedOpts.length]?.value ?? '']
                    : (Array.isArray(value) ? (value as string[]) : []);
                return (
                    <div className="flex items-center gap-2 flex-wrap">
                        {resolvedOpts.map(opt => {
                            const checked = selectedVals.includes(opt.value);
                            return (
                                <label key={opt.value} className={`flex items-center gap-1 ${isPreview ? 'cursor-default' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={!isPreview && col.inlineEditFieldKey ? () => {
                                            const next = checked
                                                ? selectedVals.filter(v => v !== opt.value)
                                                : [...selectedVals, opt.value];
                                            handlers?.onInlineEdit?.(row._id as number, col.inlineEditFieldKey!, next);
                                        } : undefined}
                                        disabled={isPreview}
                                        className="w-3 h-3 accent-slate-900"
                                    />
                                    <span className="text-xs text-slate-700">{opt.text}</span>
                                </label>
                            );
                        })}
                    </div>
                );
            }

            return null;
        }

        /* ── text (default) ── */
        default: {
            if (isPreview) {
                return <span className="text-slate-400 text-sm">샘플 텍스트</span>;
            }
            /* 연결 Slug(FETCH) 다건 매칭 배열 — col.relationSlugId가 있는 컬럼만 해당(회귀 방지 가드).
               relationSlugId 없이 배열이 온 경우(체크박스 다중선택 string[], multiSelect number[] 등)는
               이 분기를 타지 않고 아래 공통 로직(typeof === 'object' → 빈값)으로 처리한다 */
            if (Array.isArray(value) && col.relationSlugId) {
                /* 다건 매칭 배열(string[]/record[]) — 공통 헬퍼로 위임, 출력방식(한줄/여러줄)은 col.fetchDisplayMode 따름 */
                const formatted = formatFetchedRelValue(value, row, col.relationSlugId, col.data, col.fetchDisplayMode ?? 'ONE_LINE');
                if (!formatted) return <span className="text-sm text-slate-400">-</span>;
                if (col.fetchDisplayMode === 'MULTI_LINE') {
                    return <span className="text-sm text-slate-700 whitespace-pre-wrap block" title={formatted}>{formatted}</span>;
                }
                return <span className="text-sm text-slate-700 truncate block" title={formatted}>{formatted}</span>;
            }
            /* Object인 경우 빈값 처리 — fetch_fields 없이 Map 전체가 들어온 경우 방어 */
            const strVal = (value == null || typeof value === 'object') ? '' : String(value);
            /* 공통코드 연동 — 코드값을 이름으로 변환 (쉼표 구분 복수값 + nameMsgKey 다국어 공통함수 사용) */
            if (col.codeGroupCode && col.displayAs !== 'value') {
                const displayNames = resolveCodeLabel(strVal, col.codeGroupCode, col.displayAs, codeGroups, t);
                return <span className="text-sm text-slate-700 truncate block" title={displayNames}>{displayNames}</span>;
            }
            /* 마스킹 처리 — 공통코드 연동 대상이 아닌 순수 텍스트에만 적용 (email/phone/name/custom) */
            if (col.maskType) {
                const masked = applyMask(strVal, col.maskType, col.maskPattern, col.maskCustomRegex, col.maskCustomReplacement);
                return <span className="text-sm text-slate-700 truncate block" title={masked}>{masked}</span>;
            }
            /* 숫자 포맷 — isNumber이고 실제 숫자인 경우에만 3자리 콤마 */
            const displayVal =
                col.isNumber && strVal !== '' && !isNaN(Number(strVal))
                    ? Number(strVal).toLocaleString()
                    : strVal;
            return <span className="text-sm text-slate-700 truncate block" title={displayVal}>{displayVal}</span>;
        }
    }
}
