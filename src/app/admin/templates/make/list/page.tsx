'use client';

/**
 * ============================================================
 *  [페이지 메이커] Make > List — 검색폼 + 목록 자동 생성
 * ============================================================
 *  1. 왼쪽 패널에서 검색 필드 / 테이블 컬럼을 추가·삭제·순서변경
 *  2. 오른쪽 패널에서 실시간 미리보기
 *  3. "코드 생성" 버튼으로 완성 코드 복사
 * ============================================================
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    Plus, Trash2, GripVertical, Copy, Check, Eye, Code,
    ChevronUp, ChevronDown, X, Search, RotateCcw,
    Calendar, Pencil, Wand2, TableProperties, PanelLeftOpen, ArrowUpDown,
    Save, Zap, Loader2, MousePointerClick, Database, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchForm, SearchRow, SearchField } from '@/components/search';
import LayerPopupRenderer from '@/components/layer/LayerPopupRenderer';
import api from '@/lib/api';
/* ── 공통 모듈 ── */
import { inputCls, selectCls } from '../_shared/styles';
import { CodeGroupDef, TemplateItem, ButtonConfig, ButtonType, ButtonAction, ButtonPosition, DisplayMode } from '../_shared/types';
import { parseOpt, needsOptions as sharedNeedsOptions, toSlug, createIdGenerator, varName, showValidationError } from '../_shared/utils';
import { SelectArrow } from '../_shared/components/SelectArrow';
import { RowHeader } from '../_shared/components/RowHeader';
import { OptionInputRows, stringsToOpts, optsToStrings } from '../_shared/components/OptionInputRows';
import { CodeGroupSelector } from '../_shared/components/CodeGroupSelector';
import { ValidationSection, ValidationValues } from '../_shared/components/ValidationSection';
import { FieldPickerTypeList } from '../_shared/components/FieldPickerTypeList';
import { SaveModal, GenerateModal } from '../_shared/components/TemplateModals';
import { useDatabaseStore } from '@/store/useDatabaseStore';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortableRows } from '../_shared/hooks/useSortableRows';
import { SortableRowWrapper, SortableFieldWrapper } from '../_shared/components/DndWrappers';

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

/** 검색 필드 유형 */
type FieldType = 'input' | 'select' | 'date' | 'dateRange' | 'radio' | 'checkbox' | 'quickDate';

/** 검색 필드 설정 */
interface SearchFieldConfig {
    id: string;
    type: FieldType;
    label: string;
    label2?: string;           // dateRange 전용 두 번째 라벨
    fieldKey?: string;         // 검색 파라미터 키 (미입력 시 label 자동 변환)
    placeholder?: string;
    colSpan: 1 | 2 | 3 | 4 | 5;
    required?: boolean;        // 필수 여부
    options?: string[];        // select, radio, checkbox 옵션
    /* validation */
    minLength?: number;        // input 전용: 최소 글자 수
    maxLength?: number;        // input 전용: 최대 글자 수
    pattern?: string;          // input 전용: 정규식 패턴
    patternDesc?: string;      // input 전용: 정규식 설명 (예: "숫자만 입력")
    minSelect?: number;        // checkbox 전용: 최소 선택 수
    maxSelect?: number;        // checkbox 전용: 최대 선택 수
    codeGroupCode?: string;    // 공통코드 연동 시 groupCode (undefined = 수동 입력, 문자열 = 공통코드 모드)
}

/** 검색 행 설정 */
interface SearchRowConfig {
    id: string;
    cols: 1 | 2 | 3 | 4 | 5;
    fields: SearchFieldConfig[];
}

/** 셀 렌더링 타입 */
type CellType = 'text' | 'badge' | 'boolean' | 'actions';

/** 셀 옵션 (badge/status/priority용) */
interface CellOption {
    text: string;
    value: string;
    color: string;
}

/** 테이블 컬럼 설정 */
interface TableColumnConfig {
    id: string;
    header: string;
    accessor: string;
    width?: number;
    widthUnit?: 'px' | '%';
    align: 'left' | 'center' | 'right';
    sortable: boolean;
    cellType: CellType;
    cellOptions?: CellOption[];        // badge 옵션
    showIcon?: boolean;                // badge 아이콘(●) 표시
    badgeShape?: 'round' | 'square';   // badge 모양 (둥근/각진)
    trueText?: string;                 // boolean 타입 true 텍스트
    falseText?: string;                // boolean 타입 false 텍스트
    actions?: ('edit' | 'detail' | 'delete')[]; // 프리셋 액션 버튼
    customActions?: { id: string; label: string; color: string }[]; // 커스텀 버튼
    editPopupSlug?: string;   // 수정 버튼에 연결된 LAYER 팝업 slug
    detailPopupSlug?: string; // 상세 버튼에 연결된 LAYER 팝업 slug
}

/* ── 셀 타입 메타 ── */
const CELL_TYPES: { type: CellType; label: string; desc: string }[] = [
    { type: 'text', label: 'Text', desc: '일반 텍스트' },
    { type: 'badge', label: 'Badge', desc: '배지 (아이콘/모양 옵션)' },
    { type: 'boolean', label: 'Boolean', desc: '공개/비공개' },
    { type: 'actions', label: 'Actions', desc: '액션 버튼' },
];

/* ── 프리셋 색상 ── */
const PRESET_COLORS = [
    { name: '초록', value: 'emerald' },
    { name: '파랑', value: 'blue' },
    { name: '노랑', value: 'amber' },
    { name: '빨강', value: 'red' },
    { name: '보라', value: 'purple' },
    { name: '회색', value: 'slate' },
    { name: '분홍', value: 'pink' },
    { name: '하늘', value: 'sky' },
];

/* ── 필드 유형 메타 정보 ── */
const FIELD_TYPES: { type: FieldType; label: string; desc: string; defaultColSpan: 1 | 2 }[] = [
    { type: 'input', label: 'Input', desc: '텍스트 입력', defaultColSpan: 1 },
    { type: 'select', label: 'Select', desc: '셀렉트 박스', defaultColSpan: 1 },
    { type: 'date', label: 'Date', desc: '날짜 단독', defaultColSpan: 1 },
    { type: 'dateRange', label: 'Date Range', desc: '날짜 범위 (from~to)', defaultColSpan: 2 },
    { type: 'radio', label: 'Radio', desc: '라디오 단일선택', defaultColSpan: 1 },
    { type: 'checkbox', label: 'Checkbox', desc: '체크박스 복수선택', defaultColSpan: 1 },
    { type: 'quickDate', label: 'Quick Date', desc: '빠른 선택 버튼', defaultColSpan: 1 },
];

/* ── ID 생성 ── */
const uid = createIdGenerator('f');
const caUid = createIdGenerator('ca'); // 커스텀 액션 버튼 ID 생성

/* ── DB 연동: 자동 적용 시 제외할 시스템 컬럼 목록 ── */
const SYSTEM_COLUMNS = new Set([
    'reg_dt', 'mdf_dt', 'reg_user_id', 'mdf_user_id', 'reg_id', 'mdf_id',
    'reg_date', 'mdf_date', 'reg_user', 'mdf_user',
    'created_at', 'updated_at', 'created_by', 'updated_by',
    'create_dt', 'modify_dt', 'create_date', 'modify_date',
    'ins_dt', 'upd_dt', 'ins_user', 'upd_user', 'ins_user_id', 'upd_user_id',
    'insert_dt', 'update_dt', 'insert_user', 'update_user',
]);

/* ── 커스텀 액션 버튼 색상 맵 (Tailwind 동적 클래스 purge 방지) ── */
const CUSTOM_ACTION_COLORS: { value: string; label: string; cls: string }[] = [
    { value: 'slate',   label: '기본',   cls: 'bg-slate-500 hover:bg-slate-600 text-white' },
    { value: 'blue',    label: '파랑',   cls: 'bg-blue-500 hover:bg-blue-600 text-white' },
    { value: 'green',   label: '초록',   cls: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
    { value: 'red',     label: '빨강',   cls: 'bg-red-500 hover:bg-red-600 text-white' },
    { value: 'orange',  label: '주황',   cls: 'bg-orange-500 hover:bg-orange-600 text-white' },
];

/* ── 버튼 타입별 Tailwind 클래스 맵 (Tailwind 동적 클래스 purge 방지) ── */
const BTN_TYPE_CLS: Record<string, string> = {
    primary:   'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50',
    blue:      'bg-blue-500 text-white hover:bg-blue-600',
    success:   'bg-emerald-500 text-white hover:bg-emerald-600',
    danger:    'bg-red-500 text-white hover:bg-red-600',
};

/* ── 버튼 타입 뱃지 클래스 맵 (설정 패널 헤더용) ── */
const BTN_TYPE_BADGE_CLS: Record<string, string> = {
    primary:   'bg-slate-900 text-white',
    secondary: 'bg-white border border-slate-300 text-slate-600',
    blue:      'bg-blue-100 text-blue-600',
    success:   'bg-emerald-100 text-emerald-600',
    danger:    'bg-red-100 text-red-600',
};

const COL_SPAN_CLS: Record<number, string> = { 1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4', 5: 'col-span-5' };

/* ══════════════════════════════════════════ */
/*  검색 필드 미리보기 렌더러                    */
/* ══════════════════════════════════════════ */
const FieldPreview = ({ field, value, onChange, codeGroups = [] }: {
    field: SearchFieldConfig;
    value?: string;
    onChange?: (v: string) => void;
    codeGroups?: { groupCode: string; details: { code: string; name: string; active: boolean }[] }[];
}) => {
    const handleChange = (v: string) => onChange?.(v);
    /* 공통코드 연동 시 options 동적 해석 */
    const resolveOptions = (f: SearchFieldConfig): string[] => {
        if (f.codeGroupCode) {
            return codeGroups.find(g => g.groupCode === f.codeGroupCode)
                ?.details.filter(d => d.active).map(d => `${d.name}:${d.code}`) ?? [];
        }
        return f.options ?? [];
    };
    switch (field.type) {
        case 'input':
            return <input type="text" placeholder={field.placeholder || '입력하세요'} className={inputCls} value={value || ''} onChange={e => handleChange(e.target.value)} />;
        case 'select':
            return (
                <div className="relative">
                    <select className={selectCls} value={value || ''} onChange={e => handleChange(e.target.value)}>
                        <option value="">{field.placeholder || '선택하세요'}</option>
                        {resolveOptions(field).map(opt => { const { text, value: val } = parseOpt(opt); return <option key={opt} value={val}>{text}</option>; })}
                    </select>
                    <SelectArrow />
                </div>
            );
        case 'date':
            return <input type="date" className={inputCls} value={value || ''} onChange={e => handleChange(e.target.value)} />;
        case 'dateRange': {
            const parts = (value || '~').split('~');
            const from = parts[0] || '';
            const to = parts[1] || '';
            const updateRange = (f: string, t: string) => handleChange(`${f}~${t}`);
            return (
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="date" className={`${inputCls} pl-9`} value={from} onChange={e => updateRange(e.target.value, to)} />
                    </div>
                    <span className="text-sm text-slate-400 flex-shrink-0">~</span>
                    <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="date" className={`${inputCls} pl-9`} value={to} onChange={e => updateRange(from, e.target.value)} />
                    </div>
                </div>
            );
        }
        case 'radio':
            return (
                <div className="flex items-center gap-4 pt-0.5">
                    {(field.codeGroupCode !== undefined ? resolveOptions(field) : (field.options?.length ? field.options : ['옵션1:opt1', '옵션2:opt2', '옵션3:opt3'])).map(opt => {
                        const { text, value: val } = parseOpt(opt);
                        return (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name={`preview-${field.id}`} value={val} checked={value === val} onChange={() => handleChange(val)} className="w-4 h-4 border-slate-400 text-slate-900 cursor-pointer" />
                                <span className="text-sm text-slate-700">{text}</span>
                            </label>
                        );
                    })}
                </div>
            );
        case 'checkbox':
            return (
                <div className="flex items-center gap-4 pt-0.5">
                    {(field.codeGroupCode !== undefined ? resolveOptions(field) : (field.options?.length ? field.options : ['옵션1:opt1', '옵션2:opt2', '옵션3:opt3'])).map(opt => {
                        const { text, value: val } = parseOpt(opt);
                        const selected = (value || '').split(',').filter(Boolean);
                        const isChecked = selected.includes(val);
                        return (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" value={val} checked={isChecked} onChange={() => {
                                    const next = isChecked ? selected.filter(v => v !== val) : [...selected, val];
                                    handleChange(next.join(','));
                                }} className="w-4 h-4 rounded border-slate-400 text-slate-900 cursor-pointer" />
                                <span className="text-sm text-slate-700">{text}</span>
                            </label>
                        );
                    })}
                </div>
            );
        case 'quickDate':
            return (
                <div className="flex items-center gap-1.5">
                    {(field.options || ['오늘:today', '1주:1week', '1개월:1month', '3개월:3month', '전체:all']).map(opt => {
                        const { text, value: val } = parseOpt(opt);
                        const isActive = value === val;
                        return (
                            <button key={opt} type="button" onClick={() => handleChange(val)} className={`px-2.5 py-2 text-xs font-medium rounded-md border transition-all ${isActive ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}`}>{text}</button>
                        );
                    })}
                </div>
            );
        default:
            return null;
    }
};

/* ══════════════════════════════════════════ */
/*  코드 생성기                                */
/* ══════════════════════════════════════════ */
const generateSearchCode = (rows: SearchRowConfig[], collapsible: boolean): string => {
    const allFields = rows.flatMap(r => r.fields);
    if (allFields.length === 0) return '// 검색 필드를 추가해주세요';

    const ind = (n: number) => '    '.repeat(n);
    const lines: string[] = [];

    /* ══════════════════════════════════════ */
    /*  1. State 선언                         */
    /* ══════════════════════════════════════ */
    /* 공통코드 연동 필드 존재 여부 */
    if (allFields.some(f => f.codeGroupCode)) {
        lines.push("/* ※ 아래 import 필요: import { useCodeStore } from '@/store/useCodeStore'; */");
        lines.push('const { groups } = useCodeStore();');
        lines.push('');
    }
    lines.push('/* ── State 선언 ── */');
    allFields.forEach(f => {
        const name = varName(f.label);
        switch (f.type) {
            case 'input':
            case 'date':
            case 'select':
            case 'radio':
            case 'quickDate':
                lines.push(`const [${name}, set${name.charAt(0).toUpperCase() + name.slice(1)}] = useState('');`);
                break;
            case 'dateRange':
                lines.push(`const [${varName(f.label)}, set${varName(f.label).charAt(0).toUpperCase() + varName(f.label).slice(1)}] = useState('');`);
                lines.push(`const [${varName(f.label2 || '')}, set${varName(f.label2 || '').charAt(0).toUpperCase() + varName(f.label2 || '').slice(1)}] = useState('');`);
                break;
            case 'checkbox':
                lines.push(`const [${name}, set${name.charAt(0).toUpperCase() + name.slice(1)}] = useState<string[]>([]);`);
                break;
        }
    });

    /* ══════════════════════════════════════ */
    /*  2. handleReset                        */
    /* ══════════════════════════════════════ */
    lines.push('');
    lines.push('/* ── 초기화 ── */');
    lines.push('const handleReset = () => {');
    allFields.forEach(f => {
        const name = varName(f.label);
        const setter = `set${name.charAt(0).toUpperCase() + name.slice(1)}`;
        if (f.type === 'checkbox') {
            lines.push(`${ind(1)}${setter}([]);`);
        } else if (f.type === 'dateRange') {
            lines.push(`${ind(1)}${setter}('');`);
            const name2 = varName(f.label2 || '');
            lines.push(`${ind(1)}set${name2.charAt(0).toUpperCase() + name2.slice(1)}('');`);
        } else {
            lines.push(`${ind(1)}${setter}('');`);
        }
    });
    lines.push('};');

    /* ══════════════════════════════════════ */
    /*  3. handleSearch (validation + 검색)    */
    /* ══════════════════════════════════════ */
    lines.push('');
    lines.push('/* ── 검색 (validation 포함) ── */');
    lines.push('const handleSearch = () => {');
    lines.push(`${ind(1)}const errors: string[] = [];`);
    lines.push('');

    allFields.forEach(f => {
        const name = varName(f.label);
        const label = f.type === 'dateRange' ? `${f.label} ~ ${f.label2 || ''}` : f.label;

        if (f.type === 'dateRange') {
            const name2 = varName(f.label2 || '');
            if (f.required) {
                lines.push(`${ind(1)}if (!${name} || !${name2}) errors.push('[필수] ${label}');`);
            }
            lines.push(`${ind(1)}if (${name} && ${name2} && ${name2} < ${name}) errors.push('[종료일이 시작일보다 빠름] ${label}');`);
        } else if (f.type === 'input') {
            if (f.required) lines.push(`${ind(1)}if (!${name}) errors.push('[필수] ${label}');`);
            if (f.minLength) lines.push(`${ind(1)}if (${name} && ${name}.length < ${f.minLength}) errors.push(\`[최소 ${f.minLength}자] ${label} (현재 \${${name}.length}자)\`);`);
            if (f.maxLength) lines.push(`${ind(1)}if (${name} && ${name}.length > ${f.maxLength}) errors.push(\`[최대 ${f.maxLength}자] ${label} (현재 \${${name}.length}자)\`);`);
            if (f.pattern) lines.push(`${ind(1)}if (${name} && !/${f.pattern}/.test(${name})) errors.push('[${f.patternDesc || f.pattern}] ${label}');`);
        } else if (f.type === 'checkbox') {
            if (f.required) lines.push(`${ind(1)}if (${name}.length === 0) errors.push('[필수] ${label}');`);
            if (f.minSelect) lines.push(`${ind(1)}if (${name}.length < ${f.minSelect}) errors.push(\`[최소 ${f.minSelect}개 선택] ${label} (현재 \${${name}.length}개)\`);`);
            if (f.maxSelect) lines.push(`${ind(1)}if (${name}.length > ${f.maxSelect}) errors.push(\`[최대 ${f.maxSelect}개 선택] ${label} (현재 \${${name}.length}개)\`);`);
        } else {
            if (f.required) lines.push(`${ind(1)}if (!${name}) errors.push('[필수] ${label}');`);
        }
    });

    lines.push('');
    lines.push(`${ind(1)}if (errors.length > 0) {`);
    lines.push(`${ind(2)}alert(\`Validation 오류:\\n\\n- \${errors.join('\\n- ')}\`);`);
    lines.push(`${ind(2)}return;`);
    lines.push(`${ind(1)}}`);
    lines.push('');
    lines.push(`${ind(1)}/* 검색 데이터 */`);
    lines.push(`${ind(1)}const searchData = {`);
    allFields.forEach(f => {
        const name = varName(f.label);
        if (f.type === 'dateRange') {
            lines.push(`${ind(2)}${name}: { from: ${name}, to: ${varName(f.label2 || '')} },`);
        } else {
            lines.push(`${ind(2)}${name},`);
        }
    });
    lines.push(`${ind(1)}};`);
    lines.push(`${ind(1)}console.log('검색 데이터:', searchData);`);
    lines.push(`${ind(1)}// TODO: API 호출`);
    lines.push('};');

    /* ══════════════════════════════════════ */
    /*  4. JSX                                */
    /* ══════════════════════════════════════ */
    lines.push('');
    lines.push('/* ── JSX ── */');

    const dateRangeInputCode = (depth: number, vName: string, setter: string): string => {
        const ls: string[] = [];
        ls.push(`${ind(depth)}<div className="relative">`);
        ls.push(`${ind(depth + 1)}<Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />`);
        ls.push(`${ind(depth + 1)}<input type="date" value={${vName}} onChange={e => ${setter}(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />`);
        ls.push(`${ind(depth)}</div>`);
        return ls.join('\n');
    };

    const fieldCode = (f: SearchFieldConfig, depth: number): string => {
        const colProp = f.colSpan > 1 ? ` colSpan={${f.colSpan}}` : '';
        const reqProp = f.required ? ' required' : '';
        const fl: string[] = [];
        const name = varName(f.label);
        const setter = `set${name.charAt(0).toUpperCase() + name.slice(1)}`;
        const fieldLabel = f.type === 'dateRange' ? `${f.label} ~ ${f.label2 || ''}` : f.label;

        fl.push(`${ind(depth)}<SearchField label="${fieldLabel}"${colProp}${reqProp}>`);

        switch (f.type) {
            case 'input': {
                const attrs: string[] = [`type="text"`, `value={${name}}`, `onChange={e => ${setter}(e.target.value)}`, `placeholder="${f.placeholder || '입력하세요'}"`];
                if (f.minLength) attrs.push(`minLength={${f.minLength}}`);
                if (f.maxLength) attrs.push(`maxLength={${f.maxLength}}`);
                if (f.pattern) attrs.push(`pattern="${f.pattern}"`);
                if (f.pattern && f.patternDesc) attrs.push(`title="${f.patternDesc}"`);
                attrs.push(`className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"`);
                fl.push(`${ind(depth + 1)}<input ${attrs.join(' ')} />`);
                break;
            }
            case 'select':
                fl.push(`${ind(depth + 1)}<div className="relative">`);
                fl.push(`${ind(depth + 2)}<select value={${name}} onChange={e => ${setter}(e.target.value)} className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">`);
                fl.push(`${ind(depth + 3)}<option value="">전체</option>`);
                if (f.codeGroupCode) {
                    /* 공통코드 연동 */
                    fl.push(`${ind(depth + 3)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => (`);
                    fl.push(`${ind(depth + 4)}<option key={d.code} value={d.code}>{d.name}</option>`);
                    fl.push(`${ind(depth + 3)}))`);
                    fl.push(`${ind(depth + 3)}}`);
                } else {
                    (f.options || []).forEach(opt => {
                        const { text, value } = parseOpt(opt);
                        fl.push(`${ind(depth + 3)}<option value="${value}">${text}</option>`);
                    });
                }
                fl.push(`${ind(depth + 2)}</select>`);
                fl.push(`${ind(depth + 2)}<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />`);
                fl.push(`${ind(depth + 1)}</div>`);
                break;
            case 'date':
                fl.push(`${ind(depth + 1)}<input type="date" value={${name}} onChange={e => ${setter}(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />`);
                break;
            case 'dateRange': {
                const name2 = varName(f.label2 || '');
                const setter2 = `set${name2.charAt(0).toUpperCase() + name2.slice(1)}`;
                fl.push(`${ind(depth + 1)}<div className="flex items-center gap-2">`);
                fl.push(dateRangeInputCode(depth + 2, name, setter));
                fl.push(`${ind(depth + 2)}<span className="text-sm text-slate-400">~</span>`);
                fl.push(dateRangeInputCode(depth + 2, name2, setter2));
                fl.push(`${ind(depth + 1)}</div>`);
                break;
            }
            case 'radio':
                fl.push(`${ind(depth + 1)}<div className="flex items-center gap-4 pt-0.5">`);
                if (f.codeGroupCode) {
                    /* 공통코드 연동 */
                    fl.push(`${ind(depth + 2)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => (`);
                    fl.push(`${ind(depth + 3)}<label key={d.code} className="flex items-center gap-2 cursor-pointer">`);
                    fl.push(`${ind(depth + 4)}<input type="radio" name="${f.label}" value={d.code} checked={${name} === d.code} onChange={e => ${setter}(e.target.value)} className="w-4 h-4 border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer" />`);
                    fl.push(`${ind(depth + 4)}<span className="text-sm text-slate-700">{d.name}</span>`);
                    fl.push(`${ind(depth + 3)}</label>`);
                    fl.push(`${ind(depth + 2)}))`);
                    fl.push(`${ind(depth + 2)}}`);
                } else {
                    (f.options || []).forEach((opt, i) => {
                        const { text, value } = parseOpt(opt);
                        fl.push(`${ind(depth + 2)}<label className="flex items-center gap-2 cursor-pointer">`);
                        fl.push(`${ind(depth + 3)}<input type="radio" name="${f.label}" value="${value}" checked={${name} === '${value}'} onChange={e => ${setter}(e.target.value)} className="w-4 h-4 border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer" />`);
                        fl.push(`${ind(depth + 3)}<span className="text-sm text-slate-700">${text}</span>`);
                        fl.push(`${ind(depth + 2)}</label>`);
                    });
                }
                fl.push(`${ind(depth + 1)}</div>`);
                break;
            case 'checkbox':
                fl.push(`${ind(depth + 1)}<div className="flex items-center gap-4 pt-0.5">`);
                if (f.codeGroupCode) {
                    /* 공통코드 연동 */
                    fl.push(`${ind(depth + 2)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => (`);
                    fl.push(`${ind(depth + 3)}<label key={d.code} className="flex items-center gap-2 cursor-pointer">`);
                    fl.push(`${ind(depth + 4)}<input type="checkbox" value={d.code} checked={${name}.includes(d.code)} onChange={e => ${setter}(prev => e.target.checked ? [...prev, d.code] : prev.filter(v => v !== d.code))} className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer" />`);
                    fl.push(`${ind(depth + 4)}<span className="text-sm text-slate-700">{d.name}</span>`);
                    fl.push(`${ind(depth + 3)}</label>`);
                    fl.push(`${ind(depth + 2)}))`);
                    fl.push(`${ind(depth + 2)}}`);
                } else {
                    (f.options || []).forEach(opt => {
                        const { text, value } = parseOpt(opt);
                        fl.push(`${ind(depth + 2)}<label className="flex items-center gap-2 cursor-pointer">`);
                        fl.push(`${ind(depth + 3)}<input type="checkbox" value="${value}" checked={${name}.includes('${value}')} onChange={e => ${setter}(prev => e.target.checked ? [...prev, '${value}'] : prev.filter(v => v !== '${value}'))} className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer" />`);
                        fl.push(`${ind(depth + 3)}<span className="text-sm text-slate-700">${text}</span>`);
                        fl.push(`${ind(depth + 2)}</label>`);
                    });
                }
                fl.push(`${ind(depth + 1)}</div>`);
                break;
            case 'quickDate':
                fl.push(`${ind(depth + 1)}<div className="flex items-center gap-1.5">`);
                (f.options || []).forEach(opt => {
                    const { text, value } = parseOpt(opt);
                    fl.push(`${ind(depth + 2)}<button type="button" onClick={() => ${setter}('${value}')} className={\`px-3 py-2 text-xs font-medium rounded-md border transition-all \${${name} === '${value}' ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}\`}>${text}</button>`);
                });
                fl.push(`${ind(depth + 1)}</div>`);
                break;
        }

        fl.push(`${ind(depth)}</SearchField>`);
        return fl.join('\n');
    };

    lines.push(`<SearchForm${collapsible ? ' collapsible' : ''} onSearch={handleSearch} onReset={handleReset}>`);
    rows.forEach(row => {
        lines.push(`${ind(1)}<SearchRow cols={${row.cols}}>`);
        row.fields.forEach(f => lines.push(fieldCode(f, 2)));
        lines.push(`${ind(1)}</SearchRow>`);
    });
    lines.push('</SearchForm>');
    return lines.join('\n');
};

const generateTableCode = (columns: TableColumnConfig[]): string => {
    if (columns.length === 0) return '// 테이블 컬럼을 추가해주세요';

    const lines: string[] = [];
    lines.push(`const columnHelper = createColumnHelper<DataType>();`);
    lines.push('');
    lines.push('const columns = [');
    columns.forEach(col => {
        lines.push(`    columnHelper.accessor('${col.accessor}', {`);
        lines.push(`        header: '${col.header}',`);
        if (col.width) lines.push(`        size: ${col.width},`);
        lines.push(`        enableSorting: ${col.sortable},`);
        if (col.align !== 'left') {
            lines.push(`        meta: { align: '${col.align}' },`);
        }
        lines.push('    }),');
    });
    lines.push('];');
    return lines.join('\n');
};

/* ══════════════════════════════════════════ */
/*  완전한 TSX 파일 생성기                      */
/* ══════════════════════════════════════════ */
const buildTsxFile = (
    rows: SearchRowConfig[],
    columns: TableColumnConfig[],
    collapsible: boolean,
    buttons: ButtonConfig[] = [],
    buttonPosition: ButtonPosition = 'between',
    displayMode: DisplayMode = 'pagination',
    pageSize: number = 10,
): string => {
    const allFields = rows.flatMap(r => r.fields);
    const ind = (n: number) => '    '.repeat(n);
    const lines: string[] = [];

    const varName = (label: string) => {
        const cleaned = label.replace(/[^a-zA-Z0-9가-힣]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'field';
        return /^[0-9]/.test(cleaned) ? `field_${cleaned}` : cleaned;
    };
    /* fieldKey 우선, 없으면 라벨 자동 변환 */
    const fieldVar = (f: SearchFieldConfig) => f.fieldKey || varName(f.label);
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    /* ── import 분석 ── */
    const hasCodeGroup = allFields.some(f => f.codeGroupCode);
    const needsCalendar = allFields.some(f => f.type === 'date' || f.type === 'dateRange');
    const needsChevron = allFields.some(f => f.type === 'select');
    const needsArrow = columns.some(c => c.sortable);
    /* actions 컬럼 존재 여부 */
    const hasActionsCol = columns.some(c => c.cellType === 'actions');
    /* LAYER 팝업 연결 여부 (테이블 컬럼) */
    const hasPopup = columns.some(c => c.editPopupSlug || c.detailPopupSlug);
    /* 버튼 분석 */
    const hasBtns = buttons.length > 0;
    const hasBtnPopup = buttons.some(b => b.popupSlug);
    /* toast 필요 여부 — excel 또는 register+popupSlug 없음 버튼이 있을 때 */
    const needsToast = buttons.some(b => b.action === 'excel' || (b.action === 'register' && !b.popupSlug));
    const lucideIcons = [
        ...(needsCalendar ? ['Calendar'] : []),
        ...(needsChevron ? ['ChevronDown'] : []),
        ...(needsArrow ? ['ArrowUpDown'] : []),
        ...(hasActionsCol ? ['Pencil', 'Eye', 'Trash2'] : []),
    ];

    /* ── 배지 색상 → 정적 Tailwind 클래스 변환 (코드 생성 시점에 resolve) ── */
    const BADGE_BG: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        blue:    'bg-blue-50 text-blue-700 border-blue-200',
        amber:   'bg-amber-50 text-amber-700 border-amber-200',
        red:     'bg-red-50 text-red-700 border-red-200',
        purple:  'bg-purple-50 text-purple-700 border-purple-200',
        slate:   'bg-slate-100 text-slate-700 border-slate-200',
        pink:    'bg-pink-50 text-pink-700 border-pink-200',
        sky:     'bg-sky-50 text-sky-700 border-sky-200',
    };
    const BADGE_DOT: Record<string, string> = {
        emerald: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500',
        red: 'bg-red-500', purple: 'bg-purple-500', slate: 'bg-slate-500',
        pink: 'bg-pink-500', sky: 'bg-sky-500',
    };
    /* 커스텀 액션 버튼 색상 정적 클래스 */
    const CA_COLOR: Record<string, string> = {
        slate:  'bg-slate-500 hover:bg-slate-600 text-white',
        blue:   'bg-blue-500 hover:bg-blue-600 text-white',
        green:  'bg-emerald-500 hover:bg-emerald-600 text-white',
        red:    'bg-red-500 hover:bg-red-600 text-white',
        orange: 'bg-orange-500 hover:bg-orange-600 text-white',
    };

    /* ── 파일 시작 ── */
    lines.push("'use client';");
    lines.push('');
    /* 스크롤 모드면 useEffect, useRef 추가 */
    const needsScrollImports = displayMode === 'scroll';
    lines.push(`import React, { useState${needsScrollImports ? ', useEffect, useRef' : ''} } from 'react';`);;
    if (lucideIcons.length > 0) lines.push(`import { ${lucideIcons.join(', ')} } from 'lucide-react';`);
    lines.push("import { SearchForm, SearchRow, SearchField } from '@/components/search';");
    if (hasCodeGroup) lines.push("import { useCodeStore } from '@/store/useCodeStore';");
    /* 팝업 연결 컬럼 또는 버튼 팝업이 있을 때 LayerPopupRenderer import */
    if (hasPopup || hasBtnPopup) lines.push("import LayerPopupRenderer from '@/components/layer/LayerPopupRenderer';");
    /* 버튼 toast 필요 시 import */
    if (needsToast) lines.push("import { toast } from 'sonner';");
    lines.push('');

    /* ── 컴포넌트 시작 ── */
    lines.push('export default function GeneratedPage() {');
    if (hasCodeGroup) {
        lines.push(`${ind(1)}const { groups } = useCodeStore();`);
        lines.push('');
    }

    /* ── State 선언 ── */
    lines.push(`${ind(1)}/* ── 검색 필드 State ── */`);
    allFields.forEach(f => {
        const n = fieldVar(f);
        if (f.type === 'checkbox') {
            lines.push(`${ind(1)}const [${n}, set${cap(n)}] = useState<string[]>([]);`);
        } else if (f.type === 'dateRange') {
            const n2 = varName(f.label2 || '');
            lines.push(`${ind(1)}const [${n}, set${cap(n)}] = useState('');`);
            lines.push(`${ind(1)}const [${n2}, set${cap(n2)}] = useState('');`);
        } else {
            lines.push(`${ind(1)}const [${n}, set${cap(n)}] = useState('');`);
        }
    });
    /* 테이블 데이터 State */
    lines.push(`${ind(1)}const [data, setData] = useState<Record<string, unknown>[]>([]);`);
    /* 페이징/스크롤 공통 State */
    lines.push(`${ind(1)}const [totalElements, setTotalElements] = useState(0);`);
    if (displayMode === 'pagination') {
        lines.push(`${ind(1)}const [currentPage, setCurrentPage] = useState(0);`);
        lines.push(`${ind(1)}const [totalPages, setTotalPages] = useState(0);`);
    } else {
        /* 스크롤 모드 전용 — 더 불러올 데이터 여부 */
        lines.push(`${ind(1)}const [hasMore, setHasMore] = useState(true);`);
        lines.push(`${ind(1)}const [page, setPage] = useState(0);`);
        lines.push(`${ind(1)}const observerRef = useRef<HTMLDivElement>(null);`);
    }
    /* 팝업 State — 팝업 연결 컬럼이 있을 때만 생성 */
    if (hasPopup) {
        lines.push(`${ind(1)}const [popupOpen, setPopupOpen] = useState(false);`);
        lines.push(`${ind(1)}const [popupSlug, setPopupSlug] = useState('');`);
        lines.push(`${ind(1)}const [popupData, setPopupData] = useState<Record<string, unknown>>({});`);
    }
    /* 버튼 팝업 State — 버튼 중 popupSlug가 있는 버튼이 있을 때만 생성 */
    if (hasBtnPopup) {
        lines.push(`${ind(1)}const [btnPopupOpen, setBtnPopupOpen] = useState(false);`);
        lines.push(`${ind(1)}const [btnPopupSlug, setBtnPopupSlug] = useState('');`);
    }
    lines.push('');

    /* ── handleReset ── */
    lines.push(`${ind(1)}const handleReset = () => {`);
    allFields.forEach(f => {
        const n = fieldVar(f);
        if (f.type === 'checkbox') lines.push(`${ind(2)}set${cap(n)}([]);`);
        else if (f.type === 'dateRange') {
            lines.push(`${ind(2)}set${cap(n)}('');`);
            const n2 = varName(f.label2 || '');
            lines.push(`${ind(2)}set${cap(n2)}('');`);
        } else lines.push(`${ind(2)}set${cap(n)}('');`);
    });
    lines.push(`${ind(1)}};`);
    lines.push('');

    /* ── handleSearch ── */
    lines.push(`${ind(1)}const handleSearch = () => {`);
    lines.push(`${ind(2)}const errors: string[] = [];`);
    allFields.forEach(f => {
        const n = fieldVar(f);
        const lbl = f.type === 'dateRange' ? `${f.label} ~ ${f.label2 || ''}` : f.label;
        if (f.required) {
            if (f.type === 'checkbox') lines.push(`${ind(2)}if (${n}.length === 0) errors.push('[필수] ${lbl}');`);
            else if (f.type === 'dateRange') lines.push(`${ind(2)}if (!${n} || !${varName(f.label2 || '')}) errors.push('[필수] ${lbl}');`);
            else lines.push(`${ind(2)}if (!${n}) errors.push('[필수] ${lbl}');`);
        }
        if (f.type === 'input') {
            if (f.minLength) lines.push(`${ind(2)}if (${n} && ${n}.length < ${f.minLength}) errors.push('[최소 ${f.minLength}자] ${lbl}');`);
            if (f.maxLength) lines.push(`${ind(2)}if (${n} && ${n}.length > ${f.maxLength}) errors.push('[최대 ${f.maxLength}자] ${lbl}');`);
        }
    });
    lines.push(`${ind(2)}if (errors.length > 0) { alert(errors.join('\\n')); return; }`);
    lines.push(`${ind(2)}// TODO: API 호출 후 setData(응답결과)`);
    lines.push(`${ind(1)}};`);
    lines.push('');

    /* 버튼 클릭 핸들러 — 버튼이 있을 때만 생성 */
    if (hasBtns) {
        lines.push(`${ind(1)}/** 버튼 바 클릭 핸들러 */`);
        lines.push(`${ind(1)}const handleButtonClick = (action: string, popupSlug?: string) => {`);
        lines.push(`${ind(2)}if (action === 'register' || action === 'custom') {`);
        lines.push(`${ind(3)}if (popupSlug) { setBtnPopupSlug(popupSlug); setBtnPopupOpen(true); }`);
        lines.push(`${ind(3)}else if (action === 'register') { ${needsToast ? "toast.info('등록 페이지 연동이 설정되지 않았습니다.');" : "/* TODO: 등록 처리 */"} }`);
        lines.push(`${ind(2)}} else if (action === 'excel') {`);
        lines.push(`${ind(3)}${needsToast ? "toast.info('엑셀 다운로드는 추후 연동 예정입니다.');" : "/* TODO: 엑셀 다운로드 */"}`);
        lines.push(`${ind(2)}}`);
        lines.push(`${ind(1)}};`);
        lines.push('');
    }

    /* ── 버튼 타입별 클래스 (코드 생성 시점에 정적으로 resolve) ── */
    const BTN_CLS: Record<string, string> = {
        primary:   'bg-slate-900 text-white hover:bg-slate-800',
        secondary: 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50',
        blue:      'bg-blue-500 text-white hover:bg-blue-600',
        success:   'bg-emerald-500 text-white hover:bg-emerald-600',
        danger:    'bg-red-500 text-white hover:bg-red-600',
    };

    /* 버튼 바 JSX 라인 생성 헬퍼 */
    const pushButtonBar = () => {
        if (!hasBtns) return;
        lines.push(`${ind(3)}<div className="flex items-center justify-end gap-2">`);
        buttons.forEach(btn => {
            const cls = BTN_CLS[btn.type] || BTN_CLS.secondary;
            const handler = btn.popupSlug
                ? `handleButtonClick('${btn.action}', '${btn.popupSlug}')`
                : `handleButtonClick('${btn.action}')`;
            lines.push(`${ind(4)}<button onClick={() => ${handler}} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${cls}">${btn.label}</button>`);
        });
        lines.push(`${ind(3)}</div>`);
    };

    /* ── return JSX ── */
    lines.push(`${ind(1)}return (`);
    lines.push(`${ind(2)}<div className="space-y-5">`);

    /* 버튼 바 — above: 검색폼 위 */
    if (hasBtns && buttonPosition === 'above') {
        lines.push(`${ind(3)}{/* 버튼 바 — 검색폼 위 */}`);
        pushButtonBar();
    }

    /* 검색폼 */
    if (allFields.length > 0) {
        lines.push(`${ind(3)}<SearchForm${collapsible ? ' collapsible' : ''} onSearch={handleSearch} onReset={handleReset}>`);
        rows.forEach(row => {
            lines.push(`${ind(4)}<SearchRow cols={${row.cols}}>`);
            row.fields.forEach(f => {
                const n = fieldVar(f);
                const setter = `set${cap(n)}`;
                const colProp = f.colSpan > 1 ? ` colSpan={${f.colSpan}}` : '';
                const reqProp = f.required ? ' required' : '';
                const lbl = f.type === 'dateRange' ? `${f.label} ~ ${f.label2 || ''}` : f.label;
                lines.push(`${ind(5)}<SearchField label="${lbl}"${colProp}${reqProp}>`);
                switch (f.type) {
                    case 'input':
                        lines.push(`${ind(6)}<input type="text" value={${n}} onChange={e => ${setter}(e.target.value)} placeholder="${f.placeholder || '입력하세요'}" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />`);
                        break;
                    case 'select':
                        lines.push(`${ind(6)}<div className="relative">`);
                        lines.push(`${ind(7)}<select value={${n}} onChange={e => ${setter}(e.target.value)} className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">`);
                        lines.push(`${ind(8)}<option value="">전체</option>`);
                        if (f.codeGroupCode) {
                            lines.push(`${ind(8)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <option key={d.code} value={d.code}>{'{'}d.name{'}'}</option>)}`);
                        } else {
                            (f.options || []).forEach(opt => {
                                const { text, value } = parseOpt(opt);
                                lines.push(`${ind(8)}<option value="${value}">${text}</option>`);
                            });
                        }
                        lines.push(`${ind(7)}</select>`);
                        lines.push(`${ind(7)}<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />`);
                        lines.push(`${ind(6)}</div>`);
                        break;
                    case 'date':
                        lines.push(`${ind(6)}<div className="relative">`);
                        lines.push(`${ind(7)}<Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />`);
                        lines.push(`${ind(7)}<input type="date" value={${n}} onChange={e => ${setter}(e.target.value)} className="w-full pl-9 border border-slate-200 rounded-md py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />`);
                        lines.push(`${ind(6)}</div>`);
                        break;
                    case 'dateRange': {
                        const n2 = varName(f.label2 || '');
                        const setter2 = `set${cap(n2)}`;
                        lines.push(`${ind(6)}<div className="flex items-center gap-2">`);
                        lines.push(`${ind(7)}<div className="relative flex-1"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="date" value={${n}} onChange={e => ${setter}(e.target.value)} className="w-full pl-9 border border-slate-200 rounded-md py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all" /></div>`);
                        lines.push(`${ind(7)}<span className="text-sm text-slate-400">~</span>`);
                        lines.push(`${ind(7)}<div className="relative flex-1"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="date" value={${n2}} onChange={e => ${setter2}(e.target.value)} className="w-full pl-9 border border-slate-200 rounded-md py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all" /></div>`);
                        lines.push(`${ind(6)}</div>`);
                        break;
                    }
                    case 'radio':
                        lines.push(`${ind(6)}<div className="flex items-center gap-4">`);
                        if (f.codeGroupCode) {
                            lines.push(`${ind(7)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="${n}" value={d.code} checked={${n} === d.code} onChange={() => ${setter}(d.code)} className="w-4 h-4" /><span className="text-sm">{'{'}d.name{'}'}</span></label>)}`);
                        } else {
                            (f.options || []).forEach(opt => {
                                const { text, value } = parseOpt(opt);
                                lines.push(`${ind(7)}<label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="${n}" value="${value}" checked={${n} === '${value}'} onChange={() => ${setter}('${value}')} className="w-4 h-4" /><span className="text-sm">${text}</span></label>`);
                            });
                        }
                        lines.push(`${ind(6)}</div>`);
                        break;
                    case 'checkbox':
                        lines.push(`${ind(6)}<div className="flex items-center gap-4">`);
                        if (f.codeGroupCode) {
                            lines.push(`${ind(7)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" value={d.code} checked={${n}.includes(d.code)} onChange={() => ${setter}(${n}.includes(d.code) ? ${n}.filter(v => v !== d.code) : [...${n}, d.code])} className="w-4 h-4" /><span className="text-sm">{'{'}d.name{'}'}</span></label>)}`);
                        } else {
                            (f.options || []).forEach(opt => {
                                const { text, value } = parseOpt(opt);
                                lines.push(`${ind(7)}<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" value="${value}" checked={${n}.includes('${value}')} onChange={() => ${setter}(${n}.includes('${value}') ? ${n}.filter(v => v !== '${value}') : [...${n}, '${value}'])} className="w-4 h-4" /><span className="text-sm">${text}</span></label>`);
                            });
                        }
                        lines.push(`${ind(6)}</div>`);
                        break;
                    case 'quickDate':
                        lines.push(`${ind(6)}<div className="flex items-center gap-1.5">`);
                        (f.options || ['오늘:today', '1주:1week', '1개월:1month', '3개월:3month', '전체:all']).forEach(opt => {
                            const { text, value } = parseOpt(opt);
                            lines.push(`${ind(7)}<button type="button" onClick={() => ${setter}('${value}')} className={\`px-2.5 py-2 text-xs font-medium rounded-md border transition-all \${${n} === '${value}' ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}\`}>${text}</button>`);
                        });
                        lines.push(`${ind(6)}</div>`);
                        break;
                }
                lines.push(`${ind(5)}</SearchField>`);
            });
            lines.push(`${ind(4)}</SearchRow>`);
        });
        lines.push(`${ind(3)}</SearchForm>`);
    }

    /* 테이블 */
    if (columns.length > 0) {
        lines.push(`${ind(3)}<div className="bg-white border border-slate-200 rounded-xl overflow-hidden">`);
        /* 전체 건수 */
        lines.push(`${ind(4)}<div className="flex items-center px-4 py-2.5 border-b border-slate-100">`);
        lines.push(`${ind(5)}<p className="text-xs text-slate-500">전체 <span className="font-semibold text-slate-700">{totalElements.toLocaleString()}</span>건</p>`);
        lines.push(`${ind(4)}</div>`);
        lines.push(`${ind(4)}<div className="overflow-x-auto">`);
        lines.push(`${ind(5)}<table className="w-full text-sm">`);
        /* thead */
        lines.push(`${ind(6)}<thead><tr className="border-b border-slate-200 bg-slate-50/80">`);
        columns.forEach(col => {
            const w = col.width ? `, width: '${col.width}${col.widthUnit || 'px'}'` : '';
            lines.push(`${ind(7)}<th className="px-4 py-3 text-xs font-semibold text-slate-600" style={{ textAlign: '${col.align}'${w} }}>`);
            lines.push(col.sortable
                ? `${ind(8)}<span className="flex items-center gap-1">${col.header} <ArrowUpDown className="w-3 h-3 text-slate-400 cursor-pointer" /></span>`
                : `${ind(8)}${col.header}`
            );
            lines.push(`${ind(7)}</th>`);
        });
        lines.push(`${ind(6)}</tr></thead>`);
        /* tbody — 데이터 없으면 빈 행, 있으면 data.map으로 렌더링 */
        lines.push(`${ind(6)}<tbody>`);
        lines.push(`${ind(7)}{data.length === 0 ? (`);
        lines.push(`${ind(8)}<tr><td colSpan={${columns.length}} className="py-16 text-center text-sm text-slate-400">데이터가 없습니다.</td></tr>`);
        lines.push(`${ind(7)}) : data.map((row, idx) => (`);
        lines.push(`${ind(8)}<tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">`);
        columns.forEach(col => {
            const w = col.width ? `, width: '${col.width}${col.widthUnit || 'px'}'` : '';
            lines.push(`${ind(9)}<td className="px-4 py-3 text-slate-700 whitespace-nowrap" style={{ textAlign: '${col.align}'${w} }}>`);
            switch (col.cellType) {
                case 'text':
                    lines.push(`${ind(10)}<span>{String(row['${col.accessor}'] ?? '')}</span>`);
                    break;
                case 'badge': {
                    /* 배지 색상을 코드 생성 시점에 정적 클래스로 resolve */
                    const isRound = (col.badgeShape || 'round') === 'round';
                    const shapeClass = isRound ? 'rounded-full' : 'rounded-md font-semibold';
                    if (col.cellOptions && col.cellOptions.length > 0) {
                        const mapEntries = col.cellOptions
                            .map(opt => {
                                const bgCls = BADGE_BG[opt.color] || BADGE_BG['slate'];
                                const dotCls = BADGE_DOT[opt.color] || BADGE_DOT['slate'];
                                return `'${opt.value}': { text: '${opt.text}', cls: '${bgCls}', dot: '${dotCls}' }`;
                            })
                            .join(', ');
                        const iconCode = col.showIcon ? `<span className={\`w-1.5 h-1.5 rounded-full mr-1 \${b.dot}\`} />` : '';
                        lines.push(`${ind(10)}{(() => { const m: Record<string, { text: string; cls: string; dot: string }> = { ${mapEntries} }; const v = String(row['${col.accessor}'] ?? ''); const b = m[v]; return b ? <span className={\`inline-flex items-center px-2.5 py-1 text-[11px] font-medium border ${shapeClass} \${b.cls}\`}>${iconCode}{b.text}</span> : <span>{v}</span>; })()}`);
                    } else {
                        lines.push(`${ind(10)}<span>{String(row['${col.accessor}'] ?? '')}</span>`);
                    }
                    break;
                }
                case 'boolean':
                    lines.push(`${ind(10)}{row['${col.accessor}'] ? <span className="text-emerald-600">${col.trueText || '공개'}</span> : <span className="text-slate-400">${col.falseText || '비공개'}</span>}`);
                    break;
                case 'actions': {
                    lines.push(`${ind(10)}<div className="flex items-center justify-center gap-1 flex-wrap">`);
                    /* 프리셋 버튼 — 팝업 slug가 있으면 팝업 열기, 없으면 TODO */
                    (col.actions || []).forEach(action => {
                        if (action === 'edit') {
                            const handler = col.editPopupSlug
                                ? `{ setPopupSlug('${col.editPopupSlug}'); setPopupData(row); setPopupOpen(true); }`
                                : `{ /* TODO: 수정 처리 */ }`;
                            lines.push(`${ind(11)}<button onClick={() => ${handler}} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 transition-all" title="수정"><Pencil className="w-3.5 h-3.5" /></button>`);
                        } else if (action === 'detail') {
                            const handler = col.detailPopupSlug
                                ? `{ setPopupSlug('${col.detailPopupSlug}'); setPopupData(row); setPopupOpen(true); }`
                                : `{ /* TODO: 상세 처리 */ }`;
                            lines.push(`${ind(11)}<button onClick={() => ${handler}} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 transition-all" title="상세"><Eye className="w-3.5 h-3.5" /></button>`);
                        } else if (action === 'delete') {
                            lines.push(`${ind(11)}<button onClick={() => { if (window.confirm('삭제하시겠습니까?')) { /* TODO: 삭제 처리 */ } }} className="p-1.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all" title="삭제"><Trash2 className="w-3.5 h-3.5" /></button>`);
                        }
                    });
                    /* 커스텀 버튼 */
                    (col.customActions || []).filter(ca => ca.label).forEach(ca => {
                        const cls = CA_COLOR[ca.color] || CA_COLOR['slate'];
                        lines.push(`${ind(11)}<button onClick={() => { /* TODO: ${ca.label} 처리 */ }} className="px-2 py-0.5 text-[11px] font-medium rounded transition-all ${cls}">${ca.label}</button>`);
                    });
                    lines.push(`${ind(10)}</div>`);
                    break;
                }
            }
            lines.push(`${ind(9)}</td>`);
        });
        lines.push(`${ind(8)}</tr>`);
        lines.push(`${ind(7)})}`);
        lines.push(`${ind(6)}</tbody>`);
        lines.push(`${ind(5)}</table>`);
        lines.push(`${ind(4)}</div>`);
        /* 페이지네이션 UI — pagination 모드일 때만 */
        if (displayMode === 'pagination') {
            lines.push(`${ind(4)}{totalPages > 1 && (`);
            lines.push(`${ind(5)}<div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-slate-100">`);
            lines.push(`${ind(6)}<button onClick={() => setCurrentPage(0)} disabled={currentPage === 0} className="w-8 h-8 flex items-center justify-center text-xs rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">«</button>`);
            lines.push(`${ind(6)}<button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="w-8 h-8 flex items-center justify-center text-xs rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">‹</button>`);
            lines.push(`${ind(6)}{Array.from({ length: Math.min(totalPages, 5) }, (_, i) => { const start = Math.max(0, Math.min(currentPage - 2, totalPages - 5)); const p = start + i; return p < totalPages ? <button key={p} onClick={() => setCurrentPage(p)} className={\`w-8 h-8 text-xs rounded-md transition-all \${currentPage === p ? 'bg-slate-900 text-white font-semibold' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}\`}>{p + 1}</button> : null; })}`);
            lines.push(`${ind(6)}<button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1} className="w-8 h-8 flex items-center justify-center text-xs rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">›</button>`);
            lines.push(`${ind(6)}<button onClick={() => setCurrentPage(totalPages - 1)} disabled={currentPage >= totalPages - 1} className="w-8 h-8 flex items-center justify-center text-xs rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">»</button>`);
            lines.push(`${ind(5)}</div>`);
            lines.push(`${ind(4)})} `);
        } else {
            /* 스크롤 모드 — sentinel div (Intersection Observer 타겟) */
            lines.push(`${ind(4)}{hasMore && <div ref={observerRef} className="py-4 text-center text-xs text-slate-400">불러오는 중...</div>}`);
        }
        lines.push(`${ind(3)}</div>`);
    }

    /* 버튼 바 — between: 검색폼 아래, 테이블 위 */
    if (hasBtns && buttonPosition === 'between') {
        lines.push(`${ind(3)}{/* 버튼 바 — 검색폼 아래, 테이블 위 */}`);
        pushButtonBar();
    }

    lines.push(`${ind(2)}</div>`);

    /* 테이블 팝업 — 팝업 연결 컬럼이 있을 때만 */
    if (hasPopup) {
        lines.push(`${ind(2)}{/* 레이어 팝업 — slug와 행 데이터를 받아 동적으로 팝업 렌더링 */}`);
        lines.push(`${ind(2)}<LayerPopupRenderer open={popupOpen} onClose={() => setPopupOpen(false)} slug={popupSlug} initialData={popupData} />`);
    }
    /* 버튼 팝업 — popupSlug 있는 버튼이 있을 때만 */
    if (hasBtnPopup) {
        lines.push(`${ind(2)}{/* 버튼 바 팝업 */}`);
        lines.push(`${ind(2)}<LayerPopupRenderer open={btnPopupOpen} onClose={() => setBtnPopupOpen(false)} slug={btnPopupSlug} />`);
    }
    lines.push(`${ind(1)});`);
    lines.push('}');
    return lines.join('\n');
};

/* ══════════════════════════════════════════ */
/*  메인 페이지 컴포넌트                        */
/* ══════════════════════════════════════════ */
export default function MakeListPage() {
    /* ── UI 상태 ── */
    const [activeTab, setActiveTab] = useState<'search' | 'table' | 'button'>('search');
    const [showCode, setShowCode] = useState(false);
    const [copied, setCopied] = useState(false);
    const [panelOpen, setPanelOpen] = useState(true);

    /* ── 데이터 소스 선택 (공통 JSON / DB 연동) ── */
    const [dataSource, setDataSource] = useState<'json' | 'db'>('json');
    const [dbTableSearch, setDbTableSearch] = useState('');
    const { tables, selectedTable, selectTable, isLoading: isDbLoading, isColumnsLoading, fetchTables } = useDatabaseStore();

    /* ── 검색 필드 값 관리 (미리보기용) ── */
    const [searchValues, setSearchValues] = useState<Record<string, string>>({});
    const updateSearchValue = (key: string, val: string) => setSearchValues(prev => ({ ...prev, [key]: val }));
    const resetSearchValues = () => setSearchValues({});

    /* ── 검색폼 설정 ── */
    const [fieldRows, setFieldRows] = useState<SearchRowConfig[]>([]);

    /* ── Drag & Drop — 공통 훅 사용 ── */
    const { sensors, handleDragStart, handleDragOver, handleDragEnd } = useSortableRows(fieldRows, setFieldRows);

    const [collapsible, setCollapsible] = useState(false);
    /** 접힌 행 ID 집합 — Row 헤더 클릭으로 토글 */
    const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
    const toggleRowCollapse = (id: string) =>
        setCollapsedRows(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    /* ── 표시 방식 설정 ── */
    const [displayMode, setDisplayMode] = useState<DisplayMode>('pagination');
    const [pageSize, setPageSize] = useState(10);
    const [showFieldPicker, setShowFieldPicker] = useState<number | null>(null);

    /* ── 필드 추가 시 라벨 입력 상태 ── */
    const [pendingType, setPendingType] = useState<FieldType | null>(null);
    const [pendingLabel, setPendingLabel] = useState('');
    const [pendingOptions, setPendingOptions] = useState<{ text: string; value: string }[]>([]);
    const [pendingColSpan, setPendingColSpan] = useState<1|2|3|4|5>(1);
    /* ── 필드 추가 시 validation 상태 ── */
    const [pendingRequired, setPendingRequired] = useState(false);
    const [pendingMinLength, setPendingMinLength] = useState<number | undefined>();
    const [pendingMaxLength, setPendingMaxLength] = useState<number | undefined>();
    const [pendingPattern, setPendingPattern] = useState('');
    const [pendingPatternDesc, setPendingPatternDesc] = useState('');
    const [pendingMinSelect, setPendingMinSelect] = useState<number | undefined>();
    const [pendingMaxSelect, setPendingMaxSelect] = useState<number | undefined>();

    /* ── 테이블 설정 ── */
    const [tableColumns, setTableColumns] = useState<TableColumnConfig[]>([]);
    /* ── 컬럼 추가 다이얼로그 상태 ── */
    const [pendingCellType, setPendingCellType] = useState<CellType | null>(null);
    const [pendingColHeader, setPendingColHeader] = useState('');
    const [pendingColAccessor, setPendingColAccessor] = useState('');
    const [pendingColOptions, setPendingColOptions] = useState<CellOption[]>([]);
    const [pendingColShowIcon, setPendingColShowIcon] = useState(false);
    const [pendingColBadgeShape, setPendingColBadgeShape] = useState<'round' | 'square'>('round');
    const [pendingColTrueText, setPendingColTrueText] = useState('공개');
    const [pendingColFalseText, setPendingColFalseText] = useState('비공개');
    const [pendingColActions, setPendingColActions] = useState<('edit'|'detail'|'delete')[]>(['edit', 'detail', 'delete']);
    const [pendingColCustomActions, setPendingColCustomActions] = useState<{ id: string; label: string; color: string }[]>([]);
    const [pendingEditPopupSlug, setPendingEditPopupSlug] = useState('');
    const [pendingDetailPopupSlug, setPendingDetailPopupSlug] = useState('');
    const [pendingColWidth, setPendingColWidth] = useState<number | undefined>(150);
    const [pendingColWidthUnit, setPendingColWidthUnit] = useState<'px' | '%'>('px');
    const [pendingColSortable, setPendingColSortable] = useState(true);
    const [pendingColAlign, setPendingColAlign] = useState<'left'|'center'|'right'>('left');

    /* ── 필드 편집 상태 ── */
    const [editingField, setEditingField] = useState<string | null>(null);

    /* ── 버튼 설정 ── */
    const [buttons, setButtons] = useState<ButtonConfig[]>([]);
    const [buttonPosition, setButtonPosition] = useState<ButtonPosition>('between');

    /* ── 공통코드 상태 ── */
    const [codeGroups, setCodeGroups] = useState<CodeGroupDef[]>([]);
    const [codeGroupsLoading, setCodeGroupsLoading] = useState(false);
    const [pendingOptionMode, setPendingOptionMode] = useState<'manual' | 'code'>('manual');
    const [pendingCodeGroupCode, setPendingCodeGroupCode] = useState('');

    /* ── DB 연동: 컬럼 자동 적용 ── */
    const handleDbAutoApply = useCallback(() => {
        if (!selectedTable || selectedTable.columns.length === 0) return;

        /* 시스템 컬럼 제외 후 적용 대상 컬럼 필터링 */
        const targetCols = selectedTable.columns.filter(
            col => !SYSTEM_COLUMNS.has(col.columnName.toLowerCase())
        );

        /* 검색 필드 생성 (PK 제외) — 각 필드 객체 먼저 생성 */
        const searchFields: SearchFieldConfig[] = targetCols
            .filter(col => !col.isPrimaryKey)
            .map(col => {
                const dt = col.dataType.toLowerCase();
                const label = col.comment || col.columnName;
                const key = col.columnName;

                /* DB 타입 → 검색 필드 타입 매핑 */
                let fieldType: FieldType = 'input';
                let colSpan: 1 | 2 | 3 | 4 | 5 = 1;
                let options: string[] | undefined;

                if (dt === 'boolean' || (dt.includes('tinyint') && col.length === 1)) {
                    fieldType = 'select';
                    options = ['전체:', 'Y:Y', 'N:N'];
                } else if (dt.includes('datetime') || dt.includes('timestamp')) {
                    fieldType = 'dateRange';
                    colSpan = 2;
                } else if (dt === 'date') {
                    fieldType = 'date';
                } else if (dt.includes('select') || dt === 'enum') {
                    fieldType = 'select';
                } else {
                    fieldType = 'input';
                }

                return {
                    id: uid(),
                    type: fieldType,
                    label,
                    fieldKey: key,
                    placeholder: fieldType === 'select' ? '전체' : fieldType === 'input' ? '입력하세요' : '',
                    colSpan,
                    options,
                };
            });

        /* 4 colSpan 기준으로 row 패킹 — 남은 공간 부족 시 다음 row로 */
        const ROW_COLS = 4 as const;
        const newFieldRows: SearchRowConfig[] = [];
        let currentFields: SearchFieldConfig[] = [];
        let remaining = ROW_COLS;

        for (const field of searchFields) {
            if (field.colSpan > remaining) {
                /* 현재 row 저장 후 새 row 시작 */
                if (currentFields.length > 0) {
                    newFieldRows.push({ id: uid(), cols: ROW_COLS, fields: currentFields });
                }
                currentFields = [field];
                remaining = ROW_COLS - field.colSpan;
            } else {
                currentFields.push(field);
                remaining -= field.colSpan;
            }
            /* row가 꽉 찼으면 즉시 마감 */
            if (remaining === 0) {
                newFieldRows.push({ id: uid(), cols: ROW_COLS, fields: currentFields });
                currentFields = [];
                remaining = ROW_COLS;
            }
        }
        /* 마지막 row 잔여 필드 처리 */
        if (currentFields.length > 0) {
            newFieldRows.push({ id: uid(), cols: ROW_COLS, fields: currentFields });
        }

        /* 목록 컬럼 생성 (PK 포함, 첫 번째로 배치) */
        const newTableColumns: TableColumnConfig[] = targetCols.map(col => {
            const dt = col.dataType.toLowerCase();
            const label = col.comment || col.columnName;

            let cellType: CellType = 'text';
            let trueText: string | undefined;
            let falseText: string | undefined;

            if (dt === 'boolean' || (dt.includes('tinyint') && col.length === 1)) {
                cellType = 'boolean';
                trueText = 'Y';
                falseText = 'N';
            } else if (dt === 'enum') {
                cellType = 'badge';
            }

            return {
                id: uid(),
                header: label,
                accessor: col.columnName,
                width: 150,
                widthUnit: 'px' as const,
                align: 'left' as const,
                sortable: false,
                cellType,
                trueText,
                falseText,
            };
        });

        /* 기존 설정 교체 후 검색 탭으로 포커스 */
        setFieldRows(newFieldRows);
        setTableColumns(newTableColumns);
        setActiveTab('search');
        toast.success(`"${selectedTable.tableName}" 자동 적용 완료 (검색 ${newFieldRows.length}개, 컬럼 ${newTableColumns.length}개)`);
    }, [selectedTable, setFieldRows, setTableColumns, setActiveTab]);

    /* ── LAYER 팝업 연결용 템플릿 목록 ── */
    const [layerTemplateList, setLayerTemplateList] = useState<TemplateItem[]>([]);
    const [layerTemplatesLoaded, setLayerTemplatesLoaded] = useState(false);
    /** actions 컬럼 편집 시 LAYER 템플릿 목록 lazy 로딩 */
    const loadLayerTemplates = () => {
        if (layerTemplatesLoaded) return;
        api.get('/page-templates')
            .then(res => {
                setLayerTemplateList((res.data as TemplateItem[]).filter(t => t.templateType === 'LAYER'));
                setLayerTemplatesLoaded(true);
            })
            .catch(() => {});
    };

    /* ── 페이지 템플릿 상태 ── */
    const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
    const [currentTemplateName, setCurrentTemplateName] = useState('');
    /* 저장 모달 */
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveModalName, setSaveModalName] = useState('');
    const [saveModalSlug, setSaveModalSlug] = useState('');
    const [saveModalDesc, setSaveModalDesc] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    /* 템플릿 선택 드롭다운 */
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
    const [templateList, setTemplateList] = useState<TemplateItem[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    /* 템플릿 인라인 편집 상태 */
    const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
    const [editingTemplateName, setEditingTemplateName] = useState('');
    const [editingTemplateSlug, setEditingTemplateSlug] = useState('');
    const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
    const [isDuplicatingId, setIsDuplicatingId] = useState<number | null>(null);
    /* 생성 모달 */
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateSlug, setGenerateSlug] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    /* 미리보기 팝업 — slug 연결된 액션 버튼 클릭 시 즉시 오픈 */
    const [previewPopupOpen, setPreviewPopupOpen] = useState(false);
    const [previewPopupSlug, setPreviewPopupSlug] = useState('');

    /* ── 공통코드 목록 로딩 ── */
    useEffect(() => {
        setCodeGroupsLoading(true);
        api.get('/codes')
            .then(res => setCodeGroups(res.data))
            .catch(() => {})
            .finally(() => setCodeGroupsLoading(false));
    }, []);

    /* ── 템플릿 목록 자동 로딩 (패널 마운트 시 1회) ── */
    useEffect(() => {
        setIsLoadingList(true);
        api.get('/page-templates')
            .then(res => setTemplateList(res.data))
            .catch(() => {})
            .finally(() => setIsLoadingList(false));
    }, []);

    /* ═══════════════════════════════════════ */
    /*  검색 필드 조작                          */
    /* ═══════════════════════════════════════ */

    /* 필드 유형 선택 → 라벨 입력 단계로 전환 */
    const resetPendingValidation = () => {
        setPendingRequired(false);
        setPendingMinLength(undefined);
        setPendingMaxLength(undefined);
        setPendingPattern('');
        setPendingPatternDesc('');
        setPendingMinSelect(undefined);
        setPendingMaxSelect(undefined);
    };

    const selectFieldType = (type: FieldType) => {
        setPendingType(type);
        setPendingLabel('');
        setPendingLabel2('');
        setPendingOptions([{ text: '', value: '' }]);
        setPendingColSpan(FIELD_TYPES.find(t => t.type === type)?.defaultColSpan || 1);
        resetPendingValidation();
        setPendingOptionMode('manual');
        setPendingCodeGroupCode('');
    };

    /* 라벨 입력 완료 → 실제 필드 추가 */
    const [pendingLabel2, setPendingLabel2] = useState('');
    const [pendingFieldKey, setPendingFieldKey] = useState('');

    /* 옵션이 필요한 타입인지 확인 (quickDate 포함) */
    const needsOptions = (type: FieldType | null) => sharedNeedsOptions(type) || type === 'quickDate';

    const confirmAddField = () => {
        if (showFieldPicker === null || !pendingType || !pendingLabel.trim()) return;
        if (pendingType === 'dateRange' && !pendingLabel2.trim()) return;
        /* 공통코드 모드 여부 판단 (select/radio/checkbox만 지원) */
        const isCodeMode = pendingOptionMode === 'code' && ['select', 'radio', 'checkbox'].includes(pendingType);
        if (isCodeMode && !pendingCodeGroupCode) return;
        const validOpts = pendingOptions.filter(o => o.text.trim());
        if (!isCodeMode && needsOptions(pendingType) && validOpts.length === 0) return;
        /* options / codeGroupCode 결정 */
        let fieldOptions: string[] | undefined;
        let fieldCodeGroupCode: string | undefined;
        if (isCodeMode) {
            const grp = codeGroups.find(g => g.groupCode === pendingCodeGroupCode);
            fieldOptions = grp?.details.filter(d => d.active).map(d => `${d.name}:${d.code}`);
            fieldCodeGroupCode = pendingCodeGroupCode;
        } else {
            fieldOptions = needsOptions(pendingType) ? validOpts.map(o => `${o.text.trim()}:${o.value.trim() || o.text.trim()}`) : undefined;
        }
        const newField: SearchFieldConfig = {
            id: uid(),
            type: pendingType,
            label: pendingLabel.trim(),
            label2: pendingType === 'dateRange' ? pendingLabel2.trim() : undefined,
            fieldKey: pendingFieldKey.trim() || undefined,
            placeholder: pendingType === 'input' ? '입력하세요' : pendingType === 'select' ? '전체' : '',
            colSpan: pendingColSpan,
            required: pendingRequired || undefined,
            options: fieldOptions,
            minLength: pendingType === 'input' && pendingMinLength ? pendingMinLength : undefined,
            maxLength: pendingType === 'input' && pendingMaxLength ? pendingMaxLength : undefined,
            pattern: pendingType === 'input' && pendingPattern ? pendingPattern : undefined,
            patternDesc: pendingType === 'input' && pendingPatternDesc ? pendingPatternDesc : undefined,
            minSelect: pendingType === 'checkbox' && pendingMinSelect ? pendingMinSelect : undefined,
            maxSelect: pendingType === 'checkbox' && pendingMaxSelect ? pendingMaxSelect : undefined,
            codeGroupCode: fieldCodeGroupCode,
        };
        const rowIdx = showFieldPicker;
        setFieldRows(prev => prev.map((row, i) => i === rowIdx ? { ...row, fields: [...row.fields, newField] } : row));
        setPendingType(null);
        setPendingLabel('');
        setPendingLabel2('');
        setPendingFieldKey('');
        setPendingOptions([]);
        resetPendingValidation();
        setPendingOptionMode('manual');
        setPendingCodeGroupCode('');
        setShowFieldPicker(null);
    };

    const cancelAddField = () => {
        setPendingType(null);
        setPendingLabel('');
        setPendingLabel2('');
        setPendingFieldKey('');
        setPendingOptions([]);
        setPendingColSpan(1);
        resetPendingValidation();
        setPendingOptionMode('manual');
        setPendingCodeGroupCode('');
        setShowFieldPicker(null);
    };

    const removeSearchField = (rowIdx: number, id: string) => {
        setFieldRows(prev => {
            const next = prev.map((row, i) => i === rowIdx ? { ...row, fields: row.fields.filter(f => f.id !== id) } : row);
            return next.filter(row => row.fields.length > 0);
        });
        if (editingField === id) setEditingField(null);
    };

    const updateSearchField = (id: string, updates: Partial<SearchFieldConfig>) => {
        setFieldRows(prev => prev.map(row => ({ ...row, fields: row.fields.map(f => f.id === id ? { ...f, ...updates } : f) })));
    };

    const moveFieldInRow = (rowIdx: number, fieldIdx: number, direction: 'up' | 'down') => {
        const target = direction === 'up' ? fieldIdx - 1 : fieldIdx + 1;
        setFieldRows(prev => prev.map((row, i) => {
            if (i !== rowIdx || target < 0 || target >= row.fields.length) return row;
            const next = [...row.fields];
            [next[fieldIdx], next[target]] = [next[target], next[fieldIdx]];
            return { ...row, fields: next };
        }));
    };

    /* ── 행 조작 ── */
    const addRow = () => setFieldRows(prev => [...prev, { id: uid(), cols: 4, fields: [] }]);

    const removeRow = (rowIdx: number) => {
        setFieldRows(prev => prev.filter((_, i) => i !== rowIdx));
        setShowFieldPicker(null);
    };

    const moveRow = (rowIdx: number, direction: 'up' | 'down') => {
        const target = direction === 'up' ? rowIdx - 1 : rowIdx + 1;
        setFieldRows(prev => {
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            [next[rowIdx], next[target]] = [next[target], next[rowIdx]];
            return next;
        });
    };

    const updateRowCols = (rowIdx: number, cols: 1|2|3|4|5) => {
        setFieldRows(prev => prev.map((row, i) => i === rowIdx ? { ...row, cols } : row));
    };

    /* 모든 필드를 flat으로 가져오기 (validation/JSON 용) */
    const allFields = fieldRows.flatMap(r => r.fields);
    const totalFieldCount = allFields.length;

    /* LIST 타입 템플릿만 필터링 (templateType 없는 구버전도 포함) */
    const listTypeTemplates = templateList.filter(t => !t.templateType || t.templateType === 'LIST');

    /* 컴포넌트 레벨 key 헬퍼 (드롭다운 렌더링용) */
    const getFieldKey = (f: SearchFieldConfig) => f.fieldKey || varName(f.label);

    /* ═══════════════════════════════════════ */
    /*  테이블 컬럼 조작                        */
    /* ═══════════════════════════════════════ */
    const selectCellType = (type: CellType) => {
        setPendingCellType(type);
        setPendingColHeader(type === 'actions' ? '' : '');
        setPendingColAccessor(type === 'actions' ? 'actions' : '');
        setPendingColShowIcon(false);
        setPendingColTrueText('공개');
        setPendingColFalseText('비공개');
        setPendingColActions(['edit', 'detail', 'delete']);
        setPendingColCustomActions([]);
        setPendingEditPopupSlug('');
        setPendingDetailPopupSlug('');
        if (type === 'actions') loadLayerTemplates();
        setPendingColWidth(type === 'actions' ? 120 : 150);
        setPendingColWidthUnit('px');
        setPendingColSortable(type !== 'actions');
        setPendingColAlign(type === 'actions' ? 'center' : 'left');
        setPendingColBadgeShape('round');
        if (type === 'badge') setPendingColOptions([{ text: '', value: '', color: 'slate' }]);
        else setPendingColOptions([]);
    };

    const confirmAddColumn = () => {
        if (!pendingCellType) return;
        if (pendingCellType !== 'actions' && (!pendingColHeader.trim() || !pendingColAccessor.trim())) return;
        setTableColumns(prev => [...prev, {
            id: uid(),
            header: pendingColHeader.trim(),
            accessor: pendingColAccessor.trim() || 'actions',
            width: pendingColWidth,
            widthUnit: pendingColWidthUnit,
            align: pendingColAlign,
            sortable: pendingColSortable,
            cellType: pendingCellType,
            cellOptions: pendingCellType === 'badge' ? pendingColOptions.filter(o => o.text.trim()) : undefined,
            showIcon: pendingCellType === 'badge' ? pendingColShowIcon : undefined,
            badgeShape: pendingCellType === 'badge' ? pendingColBadgeShape : undefined,
            trueText: pendingCellType === 'boolean' ? pendingColTrueText : undefined,
            falseText: pendingCellType === 'boolean' ? pendingColFalseText : undefined,
            actions: pendingCellType === 'actions' ? pendingColActions : undefined,
            customActions: pendingCellType === 'actions' ? pendingColCustomActions : undefined,
            editPopupSlug: pendingCellType === 'actions' ? (pendingEditPopupSlug || undefined) : undefined,
            detailPopupSlug: pendingCellType === 'actions' ? (pendingDetailPopupSlug || undefined) : undefined,
        }]);
        setPendingCellType(null);
        setShowFieldPicker(null);
    };

    const cancelAddColumn = () => {
        setPendingCellType(null);
        setShowFieldPicker(null);
    };

    const removeTableColumn = (id: string) => {
        setTableColumns(prev => prev.filter(c => c.id !== id));
    };

    const updateTableColumn = (id: string, updates: Partial<TableColumnConfig>) => {
        setTableColumns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const moveColumn = (index: number, direction: 'up' | 'down') => {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= tableColumns.length) return;
        const next = [...tableColumns];
        [next[index], next[target]] = [next[target], next[index]];
        setTableColumns(next);
    };

    /* ═══════════════════════════════════════ */
    /*  버튼 CRUD 핸들러                        */
    /* ═══════════════════════════════════════ */
    /* useRef로 고정 — 렌더마다 재생성되어 카운터 초기화 방지 */
    const btnIdGenRef = useRef(createIdGenerator('btn'));

    /** 버튼 추가 — 기본값으로 초기화 */
    const addButton = () => {
        setButtons(prev => [...prev, {
            id: btnIdGenRef.current(),
            label: '버튼',
            type: 'primary' as ButtonType,
            action: 'custom' as ButtonAction,
        }]);
    };

    /** 버튼 필드 업데이트 */
    const updateButton = (id: string, updates: Partial<ButtonConfig>) => {
        setButtons(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    /** 버튼 삭제 */
    const removeButton = (id: string) => {
        setButtons(prev => prev.filter(b => b.id !== id));
    };

    /** 버튼 순서 이동 */
    const moveButton = (index: number, direction: 'up' | 'down') => {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= buttons.length) return;
        const next = [...buttons];
        [next[index], next[target]] = [next[target], next[index]];
        setButtons(next);
    };

    /* ═══════════════════════════════════════ */
    /*  코드 복사                               */
    /* ═══════════════════════════════════════ */
    const searchCode = generateSearchCode(fieldRows, collapsible);
    const tableCode = generateTableCode(tableColumns);
    const currentCode = [searchCode, '', tableCode].filter(Boolean).join('\n');

    const handleCopy = async () => {
        await navigator.clipboard.writeText(currentCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    /* ── configJson → 메이커 상태 복원 ── */
    const restoreFromConfigJson = (configJson: string) => {
        try {
            const parsed = JSON.parse(configJson);
            if (parsed.fieldRows) setFieldRows(parsed.fieldRows);
            if (parsed.tableColumns) {
                /* 중복 ID 재생성 — 같은 id가 있으면 React key 충돌로 이동 대신 복사 현상 발생 */
                const seenIds = new Set<string>();
                const deduped = (parsed.tableColumns as TableColumnConfig[]).map(col => {
                    if (seenIds.has(col.id)) {
                        return { ...col, id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
                    }
                    seenIds.add(col.id);
                    return col;
                });
                setTableColumns(deduped);
            }
            if (typeof parsed.collapsible === 'boolean') setCollapsible(parsed.collapsible);
            /* v2: 버튼 설정 복원 (기존 템플릿은 기본값 적용) */
            setButtons(parsed.buttons ?? []);
            setButtonPosition(parsed.buttonPosition ?? 'between');
            /* v3: 표시 방식 복원 (기존 템플릿은 기본값 pagination 적용) */
            setDisplayMode(parsed.displayMode ?? 'pagination');
            setPageSize(parsed.pageSize ?? 10);
        } catch {
            toast.error('설정 데이터 파싱 중 오류가 발생했습니다.');
        }
    };

    /* ── 저장 핸들러 ── */
    const handleSaveOpen = () => {
        setSaveModalName(currentTemplateName || '');
        /* 신규 저장일 때만 slug/설명 초기화 — 수정 모드는 기존 값 유지 */
        if (!currentTemplateId) {
            setSaveModalSlug('');
            setSaveModalDesc('');
        }
        setShowSaveModal(true);
    };

    const handleSaveConfirm = async () => {
        if (!saveModalName.trim() || !saveModalSlug.trim()) return;
        setIsSaving(true);
        const configJson = JSON.stringify({ fieldRows, tableColumns, collapsible, buttons, buttonPosition, displayMode, pageSize });
        try {
            if (currentTemplateId) {
                /* 수정 */
                const res = await api.put(`/page-templates/${currentTemplateId}`, {
                    name: saveModalName,
                    slug: saveModalSlug,
                    description: saveModalDesc,
                    configJson,
                    collapsible,
                });
                setCurrentTemplateName(res.data.name);
                toast.success('템플릿이 수정되었습니다.');
            } else {
                /* 신규 저장 */
                const res = await api.post('/page-templates', {
                    name: saveModalName,
                    slug: saveModalSlug,
                    description: saveModalDesc,
                    configJson,
                    collapsible,
                });
                setCurrentTemplateId(res.data.id);
                setCurrentTemplateName(res.data.name);
                setSaveModalSlug(res.data.slug);
                toast.success('템플릿이 저장되었습니다.');
            }
            setShowSaveModal(false);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    /* ── 템플릿 드롭다운 토글 ── */
    const toggleTemplateDropdown = () => setShowTemplateDropdown(prev => !prev);

    /** 템플릿 불러오기 — 선택 후 드롭다운 닫기 */
    const handleLoadSelect = (tpl: TemplateItem) => {
        restoreFromConfigJson(tpl.configJson);
        setCurrentTemplateId(tpl.id);
        setCurrentTemplateName(tpl.name);
        setSaveModalSlug(tpl.slug);
        setSaveModalDesc(tpl.description || '');
        setEditingTemplateId(null);
        setShowTemplateDropdown(false);
        toast.success(`"${tpl.name}" 템플릿을 불러왔습니다.`);
    };

    /** 템플릿 삭제 */
    const handleDeleteTemplate = async (id: number) => {
        if (!window.confirm('템플릿을 삭제하시겠습니까?')) return;
        setIsDeletingId(id);
        try {
            await api.delete(`/page-templates/${id}`);
            setTemplateList(prev => prev.filter(t => t.id !== id));
            /* 현재 로드된 템플릿이 삭제된 경우 초기화 */
            if (currentTemplateId === id) {
                setCurrentTemplateId(null);
                setCurrentTemplateName('');
            }
            toast.success('템플릿이 삭제되었습니다.');
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        } finally {
            setIsDeletingId(null);
        }
    };

    /** 템플릿 복사 */
    const handleDuplicateTemplate = async (tpl: TemplateItem) => {
        setIsDuplicatingId(tpl.id);
        try {
            const newName = `${tpl.name} (복사)`;
            const newSlug = `${tpl.slug}-copy`;
            const res = await api.post('/page-templates', {
                name: newName,
                slug: newSlug,
                description: tpl.description || '',
                configJson: tpl.configJson,
                templateType: 'LIST',
            });
            setTemplateList(prev => [...prev, res.data]);
            toast.success(`"${newName}" 으로 복사되었습니다.`);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '복사 중 오류가 발생했습니다.');
        } finally {
            setIsDuplicatingId(null);
        }
    };

    /** 템플릿 이름/slug 인라인 수정 */
    const handleUpdateTemplateMeta = async (id: number, existingConfigJson: string) => {
        if (!editingTemplateName.trim() || !editingTemplateSlug.trim()) return;
        try {
            await api.put(`/page-templates/${id}`, {
                name: editingTemplateName,
                slug: editingTemplateSlug,
                configJson: existingConfigJson,
                templateType: 'LIST',
            });
            setTemplateList(prev => prev.map(t =>
                t.id === id ? { ...t, name: editingTemplateName, slug: editingTemplateSlug } : t
            ));
            if (currentTemplateId === id) setCurrentTemplateName(editingTemplateName);
            setEditingTemplateId(null);
            toast.success('수정되었습니다.');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '수정 중 오류가 발생했습니다.');
        }
    };

    /* ── 생성 핸들러 (TSX 파일 생성) ── */
    const handleGenerateOpen = () => {
        setGenerateSlug(saveModalSlug || '');
        setShowGenerateModal(true);
    };

    const handleGenerateConfirm = async () => {
        if (!generateSlug.trim()) return;
        setIsGenerating(true);
        const configJson = JSON.stringify({ fieldRows, tableColumns, collapsible, buttons, buttonPosition, displayMode, pageSize });
        try {
            const tsxCode = buildTsxFile(fieldRows, tableColumns, collapsible, buttons, buttonPosition, displayMode, pageSize);
            if (currentTemplateId) {
                /* 기존 템플릿 → PUT으로 파일 재생성 */
                const res = await api.put(`/page-templates/${currentTemplateId}`, {
                    name: currentTemplateName,
                    slug: generateSlug,
                    description: '',
                    configJson,
                    tsxCode,
                    collapsible,
                });
                toast.success(`TSX 파일 생성 완료! → ${res.data.pageUrl}`);
            } else {
                /* 미저장 → POST로 DB + 파일 동시 생성 */
                const name = saveModalName || generateSlug;
                const res = await api.post('/page-templates', {
                    name,
                    slug: generateSlug,
                    description: '',
                    configJson,
                    tsxCode,
                    collapsible,
                });
                setCurrentTemplateId(res.data.id);
                setCurrentTemplateName(res.data.name);
                setSaveModalSlug(res.data.slug);
                toast.success(`TSX 파일 생성 완료! → ${res.data.pageUrl}`);
            }
            setShowGenerateModal(false);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || 'TSX 파일 생성 중 오류가 발생했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* ── 페이지 헤더 ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-slate-400" />
                        페이지 메이커 — List
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        필드를 추가하면 검색폼/테이블 코드가 자동 생성됩니다.
                        {currentTemplateName && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                                <Save className="w-3 h-3" />{currentTemplateName}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* ── 메인 레이아웃 ── */}
            <div className={`grid ${panelOpen ? 'grid-cols-[340px_1fr]' : 'grid-cols-1'} gap-5 items-start`}>

                {/* ═══════════════════════════════════════ */}
                {/*  왼쪽: 설정 패널                         */}
                {/* ═══════════════════════════════════════ */}
                {panelOpen && (
                <div className="bg-white border border-slate-200 rounded-xl sticky top-4">
                    {/* 템플릿 선택 드롭다운 */}
                    <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 bg-slate-50/30">
                        <div className="relative">
                            {/* 드롭다운 트리거 */}
                            <button
                                onClick={toggleTemplateDropdown}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 border rounded-md text-xs transition-all ${showTemplateDropdown ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white hover:border-slate-400'}`}
                            >
                                <span className={currentTemplateName ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                                    {currentTemplateName || '템플릿 선택...'}
                                </span>
                                {isLoadingList
                                    ? <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                                    : <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} />
                                }
                            </button>
                            {/* 드롭다운 목록 */}
                            {showTemplateDropdown && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                                    {listTypeTemplates.length === 0 ? (
                                        <div className="py-5 text-center text-xs text-slate-400">저장된 템플릿이 없습니다.</div>
                                    ) : (
                                        <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                                            {listTypeTemplates.map(tpl => (
                                                <div
                                                    key={tpl.id}
                                                    className={`group px-3 py-2 transition-all ${currentTemplateId === tpl.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                                                >
                                                    {editingTemplateId === tpl.id ? (
                                                        /* 인라인 편집 폼 */
                                                        <div className="space-y-1.5 py-0.5">
                                                            <input
                                                                value={editingTemplateName}
                                                                onChange={e => setEditingTemplateName(e.target.value)}
                                                                onClick={e => e.stopPropagation()}
                                                                className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-slate-900"
                                                                placeholder="이름"
                                                                autoFocus
                                                            />
                                                            {/* 수정 시 slug 변경 불가 */}
                                                            <input
                                                                value={editingTemplateSlug}
                                                                readOnly
                                                                onClick={e => e.stopPropagation()}
                                                                className="w-full border border-slate-200 rounded px-2 py-1 text-[10px] font-mono bg-slate-50 text-slate-400 cursor-not-allowed"
                                                                placeholder="slug"
                                                            />
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); setEditingTemplateId(null); }}
                                                                    className="flex-1 py-1 text-[10px] text-slate-500 border border-slate-200 rounded hover:bg-slate-50 transition-all"
                                                                >취소</button>
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); handleUpdateTemplateMeta(tpl.id, tpl.configJson); }}
                                                                    disabled={!editingTemplateName.trim() || !editingTemplateSlug.trim()}
                                                                    className="flex-1 py-1 text-[10px] text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-40 transition-all"
                                                                >저장</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* 일반 항목 */
                                                        <div className="flex items-center gap-1">
                                                            {/* 이름 클릭 → 불러오기 */}
                                                            <button
                                                                onClick={() => handleLoadSelect(tpl)}
                                                                className="flex-1 text-left min-w-0"
                                                            >
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[11px] font-medium text-slate-800 truncate">{tpl.name}</span>
                                                                    {currentTemplateId === tpl.id && (
                                                                        <span className="text-[9px] font-bold text-blue-500 bg-blue-100 px-1 py-0.5 rounded shrink-0">현재</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-slate-400 font-mono truncate">{tpl.slug}</p>
                                                            </button>
                                                            {/* 수정/복사/삭제 — hover 시 표시 */}
                                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); setEditingTemplateId(tpl.id); setEditingTemplateName(tpl.name); setEditingTemplateSlug(tpl.slug); }}
                                                                    className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                                                                    title="수정"
                                                                ><Pencil className="w-3 h-3" /></button>
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); handleDuplicateTemplate(tpl); }}
                                                                    disabled={isDuplicatingId === tpl.id}
                                                                    className="p-1 rounded text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all disabled:opacity-50"
                                                                    title="복사"
                                                                >
                                                                    {isDuplicatingId === tpl.id
                                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                        : <Copy className="w-3 h-3" />}
                                                                </button>
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                                                                    disabled={isDeletingId === tpl.id}
                                                                    className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                                                                    title="삭제"
                                                                >
                                                                    {isDeletingId === tpl.id
                                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                        : <Trash2 className="w-3 h-3" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* 데이터 소스 선택 탭 */}
                    <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/30 flex items-center gap-1">
                        <button
                            onClick={() => setDataSource('json')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md border transition-all ${
                                dataSource === 'json'
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                            }`}
                        >
                            <Code className="w-3 h-3" />
                            공통(JSON)
                        </button>
                        <button
                            onClick={() => { setDataSource('db'); if (tables.length === 0) fetchTables(); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md border transition-all ${
                                dataSource === 'db'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                            }`}
                        >
                            <Database className="w-3 h-3" />
                            DB 연동
                        </button>
                    </div>

                    {/* DB 연동 모드: 테이블 선택 패널 */}
                    {dataSource === 'db' && (
                        <div className="border-b border-slate-100 bg-blue-50/30">
                            {/* 테이블 검색 */}
                            <div className="px-3 pt-2.5 pb-1.5">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                    <input
                                        type="text"
                                        value={dbTableSearch}
                                        onChange={e => setDbTableSearch(e.target.value)}
                                        placeholder="테이블명 / 설명 검색"
                                        className="w-full pl-7 pr-3 py-1.5 text-[11px] border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                    />
                                </div>
                            </div>
                            {/* 테이블 목록 */}
                            <div className="max-h-[160px] overflow-y-auto px-1.5 pb-1.5 space-y-0.5">
                                {isDbLoading ? (
                                    <div className="flex items-center justify-center py-4 gap-2 text-slate-400">
                                        <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                        <span className="text-[11px]">불러오는 중...</span>
                                    </div>
                                ) : tables.filter(t =>
                                    t.tableName.toLowerCase().includes(dbTableSearch.toLowerCase()) ||
                                    (t.comment ?? '').toLowerCase().includes(dbTableSearch.toLowerCase())
                                ).length === 0 ? (
                                    <div className="py-4 text-center text-[11px] text-slate-400">
                                        {dbTableSearch ? '검색 결과가 없습니다.' : '테이블이 없습니다.'}
                                    </div>
                                ) : (
                                    tables
                                        .filter(t =>
                                            t.tableName.toLowerCase().includes(dbTableSearch.toLowerCase()) ||
                                            (t.comment ?? '').toLowerCase().includes(dbTableSearch.toLowerCase())
                                        )
                                        .map(table => {
                                            const isSelected = selectedTable?.tableName === table.tableName;
                                            return (
                                                <button
                                                    key={table.tableName}
                                                    onClick={() => selectTable(isSelected ? null : table)}
                                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all ${
                                                        isSelected
                                                            ? 'bg-blue-600 text-white'
                                                            : 'hover:bg-blue-50 text-slate-700'
                                                    }`}
                                                >
                                                    {/* 주 텍스트: comment 우선, 없으면 tableName */}
                                                    <div className="flex flex-col flex-1 min-w-0 mr-1.5">
                                                        <span className="text-[11px] font-medium truncate">
                                                            {table.comment || table.tableName}
                                                        </span>
                                                        {table.comment && (
                                                            <span className={`text-[10px] font-mono truncate ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                                                                {table.tableName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-[10px] shrink-0 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                                                        {table.columnCount}
                                                    </span>
                                                </button>
                                            );
                                        })
                                )}
                            </div>
                            {/* 자동 적용 버튼 */}
                            <div className="px-3 py-2 border-t border-blue-100/60">
                                <button
                                    disabled={!selectedTable || isColumnsLoading}
                                    onClick={handleDbAutoApply}
                                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                                        selectedTable && !isColumnsLoading
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    {isColumnsLoading
                                        ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        : <Sparkles className="w-3 h-3" />
                                    }
                                    {isColumnsLoading
                                        ? '컬럼 로딩 중...'
                                        : selectedTable
                                            ? `"${selectedTable.tableName}" 자동 적용`
                                            : '테이블을 선택하세요'
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 패널 헤더: 탭 + 닫기 버튼 */}
                    <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                            <button onClick={() => setActiveTab('search')} className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all ${activeTab === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <Search className="w-3 h-3" />검색 <span className="text-slate-400 font-normal">{totalFieldCount}</span>
                            </button>
                            <button onClick={() => setActiveTab('table')} className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all ${activeTab === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <TableProperties className="w-3 h-3" />테이블 <span className="text-slate-400 font-normal">{tableColumns.length}</span>
                            </button>
                            <button onClick={() => { setActiveTab('button'); loadLayerTemplates(); }} className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all ${activeTab === 'button' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <MousePointerClick className="w-3 h-3" />버튼 <span className="text-slate-400 font-normal">{buttons.length}</span>
                            </button>
                        </div>
                        <button onClick={() => setPanelOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 transition-all" title="패널 닫기">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">

                        {/* ── 검색폼 탭 ── */}
                        {activeTab === 'search' && (
                        <>
                                {/* 접기/펼치기 옵션 */}
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-md border border-slate-100">
                                    <span className="text-xs font-medium text-slate-600">Collapsible (접기/펼치기)</span>
                                    <button
                                        type="button"
                                        onClick={() => setCollapsible(!collapsible)}
                                        className={`relative w-9 h-5 rounded-full transition-colors ${collapsible ? 'bg-slate-900' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${collapsible ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>

                                {/* 행 기반 필드 목록 */}
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragOver={handleDragOver}
                                    onDragEnd={handleDragEnd}
                                >
                                <SortableContext items={fieldRows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                                {fieldRows.map((row, ri) => (
                                    <SortableRowWrapper key={row.id} id={row.id}>
                                    {(rowHandleProps) => (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        {/* 행 헤더 — 공통 컴포넌트 (클릭으로 접기/펼치기) */}
                                        <RowHeader
                                            rowIdx={ri}
                                            rowCount={fieldRows.length}
                                            cols={row.cols}
                                            onChangeCols={n => updateRowCols(ri, n)}
                                            onMoveUp={() => moveRow(ri, 'up')}
                                            onMoveDown={() => moveRow(ri, 'down')}
                                            onRemove={() => removeRow(ri)}
                                            collapsed={collapsedRows.has(row.id)}
                                            onToggleCollapse={() => toggleRowCollapse(row.id)}
                                            dragHandleProps={rowHandleProps}
                                        />
                                        {/* 행 안의 필드 목록 — 접힘 시 숨김 */}
                                        {!collapsedRows.has(row.id) && (
                                        <div className="p-2 space-y-1.5">
                                            <SortableContext items={row.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                            {row.fields.map((field, fi) => (
                                                <SortableFieldWrapper key={field.id} id={field.id}>
                                                {(fieldHandleProps) => (
                                                <div className={`border rounded-md transition-all ${editingField === field.id ? 'border-slate-900 bg-slate-50' : 'border-slate-100'}`}>
                                                    <div className="flex items-center gap-1.5 px-2 py-1.5">
                                                        <span
                                                            {...(fieldHandleProps as React.HTMLAttributes<HTMLSpanElement>)}
                                                            className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
                                                        >
                                                            <GripVertical className="w-3 h-3 text-slate-300" />
                                                        </span>
                                                        <span className="text-[10px] px-1 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">{field.type}</span>
                                                        <span className="text-[11px] font-medium text-slate-700 truncate flex-1">{field.type === 'dateRange' ? `${field.label} ~ ${field.label2 || ''}` : field.label}</span>
                                                        {field.required && <span className="text-red-500 text-[10px] font-bold">*</span>}
                                                        {field.colSpan > 1 && <span className="text-[10px] text-slate-400">×{field.colSpan}</span>}
                                                        <div className="flex items-center gap-0.5">
                                                            <button onClick={() => moveFieldInRow(ri, fi, 'up')} disabled={fi === 0} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                                                            <button onClick={() => moveFieldInRow(ri, fi, 'down')} disabled={fi === row.fields.length - 1} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                                                            <button onClick={() => setEditingField(editingField === field.id ? null : field.id)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><Pencil className="w-3 h-3" /></button>
                                                            <button onClick={() => removeSearchField(ri, field.id)} className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                    {/* 필드 편집 패널 */}
                                                    {editingField === field.id && (
                                                        <div className="px-2 pb-1.5 pt-1 space-y-1.5 border-t border-slate-100">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">{field.type === 'dateRange' ? '라벨 1' : '라벨'}</label>
                                                                    <input type="text" value={field.label} onChange={e => updateSearchField(field.id, { label: e.target.value })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                                                                </div>
                                                                {field.type === 'dateRange' ? (
                                                                    <div>
                                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">라벨 2</label>
                                                                        <input type="text" value={field.label2 || ''} onChange={e => updateSearchField(field.id, { label2: e.target.value })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">ColSpan</label>
                                                                        <select value={field.colSpan} onChange={e => updateSearchField(field.id, { colSpan: Number(e.target.value) as 1|2|3|4|5 })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900 bg-white">
                                                                            {Array.from({ length: row.cols }, (_, i) => i + 1).filter(n => field.type === 'dateRange' ? n >= 2 : true).map(n => <option key={n} value={n}>{n}칸</option>)}
                                                                        </select>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* 검색 key 편집 */}
                                                            <div>
                                                                <label className="text-[10px] font-medium text-slate-500 mb-1 block">Key <span className="text-slate-400 font-normal">(미입력 시 라벨 자동변환)</span></label>
                                                                <input type="text" value={field.fieldKey || ''} onChange={e => updateSearchField(field.id, { fieldKey: e.target.value || undefined })} placeholder="예: userName, status..." className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900" />
                                                            </div>
                                                            {/* input/checkbox는 아래 ValidationSection에서 필수항목 처리 → 중복 방지 */}
                                                            {field.type !== 'input' && field.type !== 'checkbox' && (
                                                                <div className="flex items-center justify-between px-1 py-1">
                                                                    <span className="text-[10px] font-medium text-slate-500">필수 항목</span>
                                                                    <button type="button" onClick={() => updateSearchField(field.id, { required: !field.required })} className={`relative w-9 h-5 rounded-full transition-colors ${field.required ? 'bg-slate-900' : 'bg-slate-300'}`}>
                                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${field.required ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {(field.type === 'input' || field.type === 'select') && (
                                                                <div>
                                                                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">Placeholder</label>
                                                                    <input type="text" value={field.placeholder || ''} onChange={e => updateSearchField(field.id, { placeholder: e.target.value })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                                                                </div>
                                                            )}
                                                            {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox' || field.type === 'quickDate') && (
                                                                <div className="space-y-1.5">
                                                                    {/* 수동입력/공통코드 탭 (quickDate 제외) */}
                                                                    {field.type !== 'quickDate' && (
                                                                        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                                                                            <button type="button" onClick={() => updateSearchField(field.id, { codeGroupCode: undefined })} className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${field.codeGroupCode === undefined ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>수동 입력</button>
                                                                            <button type="button" onClick={() => updateSearchField(field.id, { codeGroupCode: '' })} className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${field.codeGroupCode !== undefined ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>공통코드</button>
                                                                        </div>
                                                                    )}
                                                                    {field.codeGroupCode !== undefined && field.type !== 'quickDate' ? (
                                                                        /* 공통코드 선택 UI — 공통 컴포넌트 */
                                                                        <CodeGroupSelector
                                                                            codeGroups={codeGroups}
                                                                            codeGroupsLoading={codeGroupsLoading}
                                                                            value={field.codeGroupCode || ''}
                                                                            onChange={(code, opts) => updateSearchField(field.id, { codeGroupCode: code, options: opts })}
                                                                        />
                                                                    ) : (
                                                                        /* 수동 입력 UI — 공통 컴포넌트 */
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-medium text-slate-500 block">옵션 (text : value)</label>
                                                                            <OptionInputRows
                                                                                options={stringsToOpts(field.options || [])}
                                                                                onChange={opts => updateSearchField(field.id, { options: optsToStrings(opts) })}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {/* 필수항목 토글 + Validation — 공통 컴포넌트 */}
                                                            {(field.type === 'input' || field.type === 'checkbox') && (
                                                                <ValidationSection
                                                                    fieldType={field.type}
                                                                    values={{
                                                                        required: field.required || false,
                                                                        minLength: field.minLength,
                                                                        maxLength: field.maxLength,
                                                                        pattern: field.pattern || '',
                                                                        patternDesc: field.patternDesc || '',
                                                                        minSelect: field.minSelect,
                                                                        maxSelect: field.maxSelect,
                                                                    }}
                                                                    onChange={updates => {
                                                                        const upd: Partial<SearchFieldConfig> = {};
                                                                        if (updates.required !== undefined) upd.required = updates.required || undefined;
                                                                        if ('minLength' in updates) upd.minLength = updates.minLength;
                                                                        if ('maxLength' in updates) upd.maxLength = updates.maxLength;
                                                                        if (updates.pattern !== undefined) upd.pattern = updates.pattern || undefined;
                                                                        if (updates.patternDesc !== undefined) upd.patternDesc = updates.patternDesc || undefined;
                                                                        if ('minSelect' in updates) upd.minSelect = updates.minSelect;
                                                                        if ('maxSelect' in updates) upd.maxSelect = updates.maxSelect;
                                                                        updateSearchField(field.id, upd);
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                )}
                                                </SortableFieldWrapper>
                                            ))}
                                            </SortableContext>
                                            {/* 행 안에 필드 추가 버튼 */}
                                            {showFieldPicker === ri ? (
                                                <div className="border border-slate-200 rounded-md p-2 space-y-1 bg-slate-50">
                                                    {pendingType ? (
                                                        <div className="p-2 space-y-2">
                                                            {/* 헤더: 유형 뱃지 + 라벨 입력 */}
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-mono">{pendingType}</span>
                                                                    <span className="text-[10px] font-semibold text-slate-500">라벨 입력</span>
                                                                </div>
                                                                <button onClick={cancelAddField} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                            {/* 라벨 */}
                                                            <input type="text" value={pendingLabel} onChange={e => setPendingLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && pendingType !== 'dateRange') confirmAddField(); if (e.key === 'Escape') cancelAddField(); }} placeholder={pendingType === 'dateRange' ? '예: 시작일' : '예: 검색어, 카테고리...'} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900" autoFocus />
                                                            {pendingType === 'dateRange' && (<>
                                                                <span className="text-[10px] font-semibold text-slate-500">두 번째 라벨</span>
                                                                <input type="text" value={pendingLabel2} onChange={e => setPendingLabel2(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') confirmAddField(); if (e.key === 'Escape') cancelAddField(); }} placeholder="예: 종료일" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900" />
                                                            </>)}
                                                            {/* Key */}
                                                            <div>
                                                                <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Key <span className="text-slate-400 font-normal">(미입력 시 라벨 자동변환)</span></label>
                                                                <input type="text" value={pendingFieldKey} onChange={e => setPendingFieldKey(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') cancelAddField(); }} placeholder="예: userName, status..." className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900" />
                                                            </div>
                                                            {/* ColSpan 선택 */}
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-semibold text-slate-500">ColSpan (칸 수)</span>
                                                                <div className="flex items-center gap-0.5">
                                                                    {([1,2,3,4,5] as const).map(n => {
                                                                        const minSpan = pendingType === 'dateRange' ? 2 : 1;
                                                                        return (
                                                                            <button key={n} type="button" onClick={() => n >= minSpan && setPendingColSpan(n)} disabled={n < minSpan} className={`w-5 h-5 text-[10px] font-semibold rounded transition-all ${pendingColSpan === n ? 'bg-slate-900 text-white' : n < minSpan ? 'bg-slate-100 text-slate-300 border border-slate-100 cursor-not-allowed' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}>{n}</button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                            {/* 옵션 (select/radio/checkbox/quickDate) */}
                                                            {needsOptions(pendingType) && (
                                                                <div className="space-y-1.5">
                                                                    {/* 수동입력/공통코드 탭 (select/radio/checkbox만) */}
                                                                    {(pendingType === 'select' || pendingType === 'radio' || pendingType === 'checkbox') && (
                                                                        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                                                                            <button type="button" onClick={() => { setPendingOptionMode('manual'); setPendingCodeGroupCode(''); setPendingOptions([{ text: '', value: '' }]); }} className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${pendingOptionMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>수동 입력</button>
                                                                            <button type="button" onClick={() => setPendingOptionMode('code')} className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${pendingOptionMode === 'code' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>공통코드</button>
                                                                        </div>
                                                                    )}
                                                                    {pendingOptionMode === 'code' && (pendingType === 'select' || pendingType === 'radio' || pendingType === 'checkbox') ? (
                                                                        /* 공통코드 선택 UI — 공통 컴포넌트 */
                                                                        <CodeGroupSelector
                                                                            codeGroups={codeGroups}
                                                                            codeGroupsLoading={codeGroupsLoading}
                                                                            value={pendingCodeGroupCode}
                                                                            onChange={(code, opts) => {
                                                                                setPendingCodeGroupCode(code);
                                                                                if (opts) setPendingOptions(stringsToOpts(opts));
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        /* 수동 입력 UI — 공통 컴포넌트 */
                                                                        <OptionInputRows
                                                                            options={pendingOptions}
                                                                            onChange={setPendingOptions}
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                            {/* 필수항목 토글 + Validation — 공통 컴포넌트 */}
                                                            <ValidationSection
                                                                fieldType={pendingType}
                                                                values={{
                                                                    required: pendingRequired,
                                                                    minLength: pendingMinLength,
                                                                    maxLength: pendingMaxLength,
                                                                    pattern: pendingPattern,
                                                                    patternDesc: pendingPatternDesc,
                                                                    minSelect: pendingMinSelect,
                                                                    maxSelect: pendingMaxSelect,
                                                                }}
                                                                onChange={updates => {
                                                                    if (updates.required !== undefined) setPendingRequired(updates.required);
                                                                    if ('minLength' in updates) setPendingMinLength(updates.minLength);
                                                                    if ('maxLength' in updates) setPendingMaxLength(updates.maxLength);
                                                                    if (updates.pattern !== undefined) setPendingPattern(updates.pattern);
                                                                    if (updates.patternDesc !== undefined) setPendingPatternDesc(updates.patternDesc);
                                                                    if ('minSelect' in updates) setPendingMinSelect(updates.minSelect);
                                                                    if ('maxSelect' in updates) setPendingMaxSelect(updates.maxSelect);
                                                                }}
                                                            />
                                                            {/* 취소 | 추가 */}
                                                            <div className="flex gap-1.5">
                                                                <button onClick={cancelAddField} className="px-3 py-2 border border-slate-200 text-slate-500 text-xs rounded-md hover:bg-slate-50 transition-all">취소</button>
                                                                <button onClick={confirmAddField} disabled={
                                                                    !pendingLabel.trim() ||
                                                                    (needsOptions(pendingType) && (
                                                                        pendingOptionMode === 'code'
                                                                            ? !pendingCodeGroupCode
                                                                            : pendingOptions.filter(o => o.text.trim()).length === 0
                                                                    ))
                                                                } className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold rounded-md transition-all">추가</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* 필드 유형 선택 — 공통 컴포넌트 */
                                                        <FieldPickerTypeList
                                                            types={FIELD_TYPES}
                                                            onSelect={type => selectFieldType(type as FieldType)}
                                                            onCancel={() => setShowFieldPicker(null)}
                                                        />
                                                    )}
                                                </div>
                                            ) : (
                                                <button onClick={() => { setShowFieldPicker(ri); setPendingType(null); }} className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-slate-200 rounded text-[10px] font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all">
                                                    <Plus className="w-3 h-3" />필드 추가
                                                </button>
                                            )}
                                        </div>
                                        )}
                                    </div>
                                    )}
                                    </SortableRowWrapper>
                                ))}
                                </SortableContext>
                                </DndContext>

                                {/* 행 추가 버튼 */}
                                <button
                                    onClick={addRow}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-xs font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" />행 추가
                                </button>
                            </>
                        )}

                        {/* ── 테이블 탭 ── */}
                        {activeTab === 'table' && (
                        <>
                                {/* 표시 방식 설정 */}
                                <div className="px-3 py-2.5 bg-slate-50 rounded-md border border-slate-100 space-y-2">
                                    <span className="text-xs font-medium text-slate-600">표시 방식</span>
                                    <div className="flex gap-1.5">
                                        {(['pagination', 'scroll'] as DisplayMode[]).map(mode => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setDisplayMode(mode)}
                                                className={`flex-1 py-1.5 text-[11px] font-medium rounded-md border transition-all ${displayMode === mode ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                {mode === 'pagination' ? '페이지네이션' : '무한 스크롤'}
                                            </button>
                                        ))}
                                    </div>
                                    {/* 페이지네이션 모드일 때만 페이지 크기 설정 표시 */}
                                    {displayMode === 'pagination' && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-slate-500 flex-shrink-0">페이지당</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={200}
                                                value={pageSize}
                                                onChange={e => setPageSize(Math.max(1, Number(e.target.value) || 10))}
                                                className="w-16 border border-slate-200 rounded-md px-2 py-1 text-xs text-center text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                            />
                                            <span className="text-[11px] text-slate-500">건</span>
                                        </div>
                                    )}
                                </div>

                                {tableColumns.map((col, i) => (
                                    <div key={col.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                        {/* 컬럼 헤더 */}
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">{col.cellType}</span>
                                            <span className="text-xs font-medium text-slate-700 flex-1 truncate">{col.header || '(액션)'}</span>
                                            <div className="flex items-center gap-0.5">
                                                <button onClick={() => moveColumn(i, 'up')} disabled={i === 0} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                                                <button onClick={() => moveColumn(i, 'down')} disabled={i === tableColumns.length - 1} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                                                <button onClick={() => { setEditingField(editingField === col.id ? null : col.id); if (col.cellType === 'actions') loadLayerTemplates(); }} className="p-1 rounded text-slate-400 hover:bg-slate-100"><Pencil className="w-3 h-3" /></button>
                                                <button onClick={() => removeTableColumn(col.id)} className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                        {/* 컬럼 편집 패널 */}
                                        {editingField === col.id && (
                                            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-100">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">헤더명</label>
                                                        <input type="text" value={col.header} onChange={e => updateTableColumn(col.id, { header: e.target.value })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">accessor</label>
                                                        <input type="text" value={col.accessor} onChange={e => updateTableColumn(col.id, { accessor: e.target.value })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">너비</label>
                                                        <div className="flex">
                                                            <input type="number" value={col.width || ''} onChange={e => updateTableColumn(col.id, { width: Number(e.target.value) || undefined })} className="flex-1 min-w-0 border border-slate-200 rounded-l px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                                                            <select value={col.widthUnit || 'px'} onChange={e => updateTableColumn(col.id, { widthUnit: e.target.value as 'px'|'%' })} className="border border-l-0 border-slate-200 rounded-r px-1 py-1.5 text-xs bg-slate-50 focus:outline-none focus:border-slate-900">
                                                                <option value="px">px</option><option value="%">%</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">정렬</label>
                                                        <select value={col.align} onChange={e => updateTableColumn(col.id, { align: e.target.value as 'left'|'center'|'right' })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900 bg-white">
                                                            <option value="left">좌측</option><option value="center">중앙</option><option value="right">우측</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={col.sortable} onChange={e => updateTableColumn(col.id, { sortable: e.target.checked })} className="w-3.5 h-3.5 rounded border-slate-400 text-slate-900" />
                                                    <span className="text-[11px] text-slate-600">정렬 활성화</span>
                                                </label>
                                                {/* badge/priority 옵션 */}
                                                {col.cellType === 'badge' && (
                                                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-semibold text-slate-400 uppercase">옵션</span>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex items-center gap-0.5">
                                                                    <button type="button" onClick={() => updateTableColumn(col.id, { badgeShape: 'round' })} className={`px-1.5 py-0.5 text-[9px] rounded transition-all ${(col.badgeShape || 'round') === 'round' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>둥근</button>
                                                                    <button type="button" onClick={() => updateTableColumn(col.id, { badgeShape: 'square' })} className={`px-1.5 py-0.5 text-[9px] rounded transition-all ${col.badgeShape === 'square' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>각진</button>
                                                                </div>
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <span className="text-[10px] text-slate-500">●</span>
                                                                    <button type="button" onClick={() => updateTableColumn(col.id, { showIcon: !col.showIcon })} className={`relative w-7 h-4 rounded-full transition-colors ${col.showIcon ? 'bg-slate-900' : 'bg-slate-300'}`}>
                                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${col.showIcon ? 'translate-x-3' : 'translate-x-0.5'}`} />
                                                                    </button>
                                                                </label>
                                                            </div>
                                                        </div>
                                                        {(col.cellOptions || []).map((opt, oi) => (
                                                            <div key={oi} className="flex items-center gap-1">
                                                                <input type="text" value={opt.text} onChange={e => { const next = [...(col.cellOptions || [])]; next[oi] = { ...next[oi], text: e.target.value }; updateTableColumn(col.id, { cellOptions: next }); }} placeholder="텍스트" className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                                                                <input type="text" value={opt.value} onChange={e => { const next = [...(col.cellOptions || [])]; next[oi] = { ...next[oi], value: e.target.value }; updateTableColumn(col.id, { cellOptions: next }); }} placeholder="value" className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900" />
                                                                <select value={opt.color} onChange={e => { const next = [...(col.cellOptions || [])]; next[oi] = { ...next[oi], color: e.target.value }; updateTableColumn(col.id, { cellOptions: next }); }} className="w-16 border border-slate-200 rounded px-1 py-1.5 text-xs focus:outline-none focus:border-slate-900 bg-white">
                                                                    {PRESET_COLORS.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                                                                </select>
                                                                <button onClick={() => updateTableColumn(col.id, { cellOptions: (col.cellOptions || []).filter((_, j) => j !== oi) })} disabled={(col.cellOptions || []).length <= 1} className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"><X className="w-3 h-3" /></button>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => updateTableColumn(col.id, { cellOptions: [...(col.cellOptions || []), { text: '', value: '', color: 'slate' }] })} className="w-full flex items-center justify-center gap-1 py-1 border border-dashed border-slate-200 rounded text-[10px] font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"><Plus className="w-3 h-3" />옵션 추가</button>
                                                    </div>
                                                )}
                                                {/* boolean 설정 */}
                                                {col.cellType === 'boolean' && (
                                                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                                                        <div>
                                                            <label className="text-[10px] font-medium text-slate-500 mb-1 block">True 텍스트</label>
                                                            <input type="text" value={col.trueText || ''} onChange={e => updateTableColumn(col.id, { trueText: e.target.value })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" placeholder="공개" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-medium text-slate-500 mb-1 block">False 텍스트</label>
                                                            <input type="text" value={col.falseText || ''} onChange={e => updateTableColumn(col.id, { falseText: e.target.value })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" placeholder="비공개" />
                                                        </div>
                                                    </div>
                                                )}
                                                {/* actions 설정 */}
                                                {col.cellType === 'actions' && (
                                                    <div className="space-y-1.5 pt-1 border-t border-slate-100" onClick={loadLayerTemplates}>
                                                        <span className="text-[10px] font-semibold text-slate-400 uppercase">액션 버튼</span>
                                                        {/* 프리셋 버튼 체크박스 + 팝업 연결 */}
                                                        {(['edit', 'detail', 'delete'] as const).map(action => (
                                                            <div key={action} className="space-y-1">
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <input type="checkbox" checked={(col.actions || []).includes(action)} onChange={e => {
                                                                        const prev = col.actions || [];
                                                                        updateTableColumn(col.id, { actions: e.target.checked ? [...prev, action] : prev.filter(a => a !== action) });
                                                                    }} className="w-3.5 h-3.5 rounded border-slate-400 text-slate-900" />
                                                                    <span className="text-[11px] text-slate-600">{{ edit: '수정', detail: '상세', delete: '삭제' }[action]}</span>
                                                                </label>
                                                                {/* 수정/상세에 팝업 연결 드롭다운 */}
                                                                {action !== 'delete' && (col.actions || []).includes(action) && (
                                                                    <div className="ml-5">
                                                                        <select
                                                                            value={action === 'edit' ? (col.editPopupSlug || '') : (col.detailPopupSlug || '')}
                                                                            onChange={e => updateTableColumn(col.id, action === 'edit' ? { editPopupSlug: e.target.value || undefined } : { detailPopupSlug: e.target.value || undefined })}
                                                                            className="w-full text-[10px] border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-slate-900"
                                                                        >
                                                                            <option value="">팝업 없음</option>
                                                                            {layerTemplateList.map(t => <option key={t.id} value={t.slug}>{t.name}</option>)}
                                                                        </select>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {/* 커스텀 버튼 목록 */}
                                                        {(col.customActions || []).map(ca => (
                                                            <div key={ca.id} className="flex items-center gap-1.5 pl-0.5">
                                                                <select value={ca.color} onChange={e => updateTableColumn(col.id, { customActions: (col.customActions || []).map(c => c.id === ca.id ? { ...c, color: e.target.value } : c) })} className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white">
                                                                    {CUSTOM_ACTION_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                                </select>
                                                                <input type="text" value={ca.label} onChange={e => updateTableColumn(col.id, { customActions: (col.customActions || []).map(c => c.id === ca.id ? { ...c, label: e.target.value } : c) })} placeholder="버튼명" className="flex-1 text-[11px] border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-slate-900" />
                                                                <button onClick={() => updateTableColumn(col.id, { customActions: (col.customActions || []).filter(c => c.id !== ca.id) })} className="text-slate-300 hover:text-red-400 transition-all"><X className="w-3 h-3" /></button>
                                                            </div>
                                                        ))}
                                                        {/* 커스텀 버튼 추가 */}
                                                        <button onClick={() => updateTableColumn(col.id, { customActions: [...(col.customActions || []), { id: caUid(), label: '', color: 'slate' }] })} className="w-full flex items-center justify-center gap-1 py-0.5 border border-dashed border-slate-200 rounded text-[10px] text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all">
                                                            <Plus className="w-3 h-3" />버튼 추가
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* 컬럼 추가 다이얼로그 */}
                                {showFieldPicker === -1 ? (
                                    <div className="border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
                                        {pendingCellType ? (
                                            /* 헤더명/accessor + 타입별 설정 입력 */
                                            <div className="p-2 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-mono">{pendingCellType}</span>
                                                        <span className="text-[10px] font-semibold text-slate-500">컬럼 설정</span>
                                                    </div>
                                                    <button onClick={cancelAddColumn} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                                {pendingCellType !== 'actions' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[10px] font-medium text-slate-500 mb-1 block">헤더명</label>
                                                            <input type="text" value={pendingColHeader} onChange={e => setPendingColHeader(e.target.value)} placeholder="예: 상태, 분류..." className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" autoFocus />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-medium text-slate-500 mb-1 block">accessor (키)</label>
                                                            <input type="text" value={pendingColAccessor} onChange={e => setPendingColAccessor(e.target.value)} placeholder="예: status" className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900" />
                                                        </div>
                                                    </div>
                                                )}
                                                {/* 검색 필드 key 연결 (actions 타입 제외, 검색 필드가 1개 이상일 때만 표시) */}
                                                {pendingCellType !== 'actions' && allFields.length > 0 && (
                                                    <div>
                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">검색 필드 연결 <span className="text-slate-400 font-normal">(선택 시 accessor 자동 입력)</span></label>
                                                        <div className="relative">
                                                            <select
                                                                value={allFields.find(f => getFieldKey(f) === pendingColAccessor)?.id || ''}
                                                                onChange={e => {
                                                                    const f = allFields.find(f => f.id === e.target.value);
                                                                    if (f) { setPendingColAccessor(getFieldKey(f)); setPendingColHeader(f.label); }
                                                                }}
                                                                className="w-full appearance-none border border-slate-300 rounded px-2 py-1.5 pr-7 text-xs focus:outline-none focus:border-slate-900 bg-white"
                                                            >
                                                                <option value="">-- 직접 입력 --</option>
                                                                {allFields.map(f => (
                                                                    <option key={f.id} value={f.id}>{f.label} → {getFieldKey(f)}</option>
                                                                ))}
                                                            </select>
                                                            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">너비</label>
                                                        <div className="flex">
                                                            <input type="number" value={pendingColWidth || ''} onChange={e => setPendingColWidth(Number(e.target.value) || undefined)} className="flex-1 min-w-0 border border-slate-300 rounded-l px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" placeholder="150" />
                                                            <select value={pendingColWidthUnit} onChange={e => setPendingColWidthUnit(e.target.value as 'px'|'%')} className="border border-l-0 border-slate-300 rounded-r px-1 py-1.5 text-xs bg-slate-50 focus:outline-none focus:border-slate-900">
                                                                <option value="px">px</option><option value="%">%</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">정렬</label>
                                                        <select value={pendingColAlign} onChange={e => setPendingColAlign(e.target.value as 'left'|'center'|'right')} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900 bg-white">
                                                            <option value="left">좌측</option><option value="center">중앙</option><option value="right">우측</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex items-end pb-0.5">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox" checked={pendingColSortable} onChange={e => setPendingColSortable(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-400 text-slate-900" />
                                                            <span className="text-[11px] text-slate-600">정렬</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                {/* Badge 옵션 */}
                                                {pendingCellType === 'badge' && (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-semibold text-slate-500">옵션 (text : value : 색상)</span>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex items-center gap-0.5">
                                                                    <button type="button" onClick={() => setPendingColBadgeShape('round')} className={`px-1.5 py-0.5 text-[9px] rounded transition-all ${pendingColBadgeShape === 'round' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>둥근</button>
                                                                    <button type="button" onClick={() => setPendingColBadgeShape('square')} className={`px-1.5 py-0.5 text-[9px] rounded transition-all ${pendingColBadgeShape === 'square' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>각진</button>
                                                                </div>
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <span className="text-[10px] text-slate-500">●</span>
                                                                    <button type="button" onClick={() => setPendingColShowIcon(!pendingColShowIcon)} className={`relative w-7 h-4 rounded-full transition-colors ${pendingColShowIcon ? 'bg-slate-900' : 'bg-slate-300'}`}>
                                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${pendingColShowIcon ? 'translate-x-3' : 'translate-x-0.5'}`} />
                                                                    </button>
                                                                </label>
                                                            </div>
                                                        </div>
                                                        {pendingColOptions.map((opt, oi) => (
                                                            <div key={oi} className="flex items-center gap-1">
                                                                <input type="text" value={opt.text} onChange={e => { const n = [...pendingColOptions]; n[oi] = { ...n[oi], text: e.target.value }; setPendingColOptions(n); }} placeholder="텍스트" className="flex-1 min-w-0 border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                                                                <input type="text" value={opt.value} onChange={e => { const n = [...pendingColOptions]; n[oi] = { ...n[oi], value: e.target.value }; setPendingColOptions(n); }} placeholder="value" className="flex-1 min-w-0 border border-slate-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900" />
                                                                <select value={opt.color} onChange={e => { const n = [...pendingColOptions]; n[oi] = { ...n[oi], color: e.target.value }; setPendingColOptions(n); }} className="w-16 border border-slate-300 rounded px-1 py-1.5 text-xs focus:outline-none focus:border-slate-900 bg-white">
                                                                    {PRESET_COLORS.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                                                                </select>
                                                                <button onClick={() => setPendingColOptions(prev => prev.filter((_, j) => j !== oi))} disabled={pendingColOptions.length <= 1} className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"><X className="w-3 h-3" /></button>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => setPendingColOptions(prev => [...prev, { text: '', value: '', color: 'slate' }])} className="w-full flex items-center justify-center gap-1 py-1 border border-dashed border-slate-300 rounded text-[10px] font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"><Plus className="w-3 h-3" />옵션 추가</button>
                                                    </div>
                                                )}
                                                {/* Boolean 설정 */}
                                                {pendingCellType === 'boolean' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div><label className="text-[10px] font-medium text-slate-500 mb-1 block">True 텍스트</label><input type="text" value={pendingColTrueText} onChange={e => setPendingColTrueText(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" /></div>
                                                        <div><label className="text-[10px] font-medium text-slate-500 mb-1 block">False 텍스트</label><input type="text" value={pendingColFalseText} onChange={e => setPendingColFalseText(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" /></div>
                                                    </div>
                                                )}
                                                {/* Actions 설정 */}
                                                {pendingCellType === 'actions' && (
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-semibold text-slate-500">액션 버튼</span>
                                                        {/* 프리셋 버튼 체크박스 + 팝업 연결 */}
                                                        {(['edit', 'detail', 'delete'] as const).map(action => (
                                                            <div key={action} className="space-y-1">
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <input type="checkbox" checked={pendingColActions.includes(action)} onChange={e => setPendingColActions(prev => e.target.checked ? [...prev, action] : prev.filter(a => a !== action))} className="w-3.5 h-3.5 rounded border-slate-400 text-slate-900" />
                                                                    <span className="text-[11px] text-slate-600">{{ edit: '수정', detail: '상세', delete: '삭제' }[action]}</span>
                                                                </label>
                                                                {action !== 'delete' && pendingColActions.includes(action) && (
                                                                    <div className="ml-5">
                                                                        <select
                                                                            value={action === 'edit' ? pendingEditPopupSlug : pendingDetailPopupSlug}
                                                                            onChange={e => action === 'edit' ? setPendingEditPopupSlug(e.target.value) : setPendingDetailPopupSlug(e.target.value)}
                                                                            className="w-full text-[10px] border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-slate-900"
                                                                        >
                                                                            <option value="">팝업 없음</option>
                                                                            {layerTemplateList.map(t => <option key={t.id} value={t.slug}>{t.name}</option>)}
                                                                        </select>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {/* 커스텀 버튼 목록 */}
                                                        {pendingColCustomActions.map(ca => (
                                                            <div key={ca.id} className="flex items-center gap-1.5 pl-0.5">
                                                                <select value={ca.color} onChange={e => setPendingColCustomActions(prev => prev.map(c => c.id === ca.id ? { ...c, color: e.target.value } : c))} className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white">
                                                                    {CUSTOM_ACTION_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                                </select>
                                                                <input type="text" value={ca.label} onChange={e => setPendingColCustomActions(prev => prev.map(c => c.id === ca.id ? { ...c, label: e.target.value } : c))} placeholder="버튼명" className="flex-1 text-[11px] border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-slate-900" />
                                                                <button onClick={() => setPendingColCustomActions(prev => prev.filter(c => c.id !== ca.id))} className="text-slate-300 hover:text-red-400 transition-all"><X className="w-3 h-3" /></button>
                                                            </div>
                                                        ))}
                                                        {/* 커스텀 버튼 추가 */}
                                                        <button onClick={() => setPendingColCustomActions(prev => [...prev, { id: caUid(), label: '', color: 'slate' }])} className="w-full flex items-center justify-center gap-1 py-0.5 border border-dashed border-slate-200 rounded text-[10px] text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all">
                                                            <Plus className="w-3 h-3" />버튼 추가
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="flex gap-1.5 pt-1">
                                                    <button onClick={cancelAddColumn} className="flex-1 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-md hover:bg-white transition-all">취소</button>
                                                    <button onClick={confirmAddColumn} disabled={pendingCellType !== 'actions' && (!pendingColHeader.trim() || !pendingColAccessor.trim())} className="flex-1 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed">추가</button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* 셀 타입 선택 */
                                            <>
                                                <div className="flex items-center justify-between px-2 pb-1">
                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase">셀 타입 선택</span>
                                                    <button onClick={() => setShowFieldPicker(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                                {CELL_TYPES.map(ct => (
                                                    <button key={ct.type} onClick={() => selectCellType(ct.type)} className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-white hover:shadow-sm text-left transition-all">
                                                        <div><span className="text-xs font-semibold text-slate-700">{ct.label}</span><span className="text-[10px] text-slate-400 ml-2">{ct.desc}</span></div>
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { setShowFieldPicker(-1); setPendingCellType(null); }}
                                        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-xs font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" />컬럼 추가
                                    </button>
                                )}
                            </>
                        )}

                        {/* ── 버튼 탭 ── */}
                        {activeTab === 'button' && (
                        <>
                            {/* 버튼 위치 선택 */}
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-md border border-slate-100">
                                <span className="text-xs font-medium text-slate-600">버튼 위치</span>
                                <select
                                    value={buttonPosition}
                                    onChange={e => setButtonPosition(e.target.value as ButtonPosition)}
                                    className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-slate-900"
                                >
                                    <option value="above">검색폼 위</option>
                                    <option value="between">검색폼-테이블 사이</option>
                                </select>
                            </div>

                            {/* 버튼 목록 */}
                            {buttons.map((btn, bi) => (
                                <div key={btn.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                    {/* 버튼 항목 헤더 */}
                                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50">
                                        <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                        <span className="text-[11px] font-medium text-slate-700 flex-1 truncate">{btn.label || '(라벨 없음)'}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${BTN_TYPE_BADGE_CLS[btn.type] || BTN_TYPE_BADGE_CLS.secondary}`}>
                                            {btn.type}
                                        </span>
                                        <button onClick={() => moveButton(bi, 'up')} disabled={bi === 0} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                                        <button onClick={() => moveButton(bi, 'down')} disabled={bi === buttons.length - 1} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                                        <button onClick={() => removeButton(btn.id)} className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                    {/* 버튼 편집 필드 */}
                                    <div className="p-2 space-y-1.5">
                                        {/* 라벨 */}
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-500 mb-1 block">라벨 *</label>
                                            <input
                                                type="text"
                                                value={btn.label}
                                                onChange={e => updateButton(btn.id, { label: e.target.value })}
                                                placeholder="버튼 라벨"
                                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-medium text-slate-500 mb-1 block">유형</label>
                                                <select
                                                    value={btn.type}
                                                    onChange={e => updateButton(btn.id, { type: e.target.value as ButtonType })}
                                                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900"
                                                >
                                                    <option value="primary">Primary (검정)</option>
                                                    <option value="secondary">Secondary (테두리)</option>
                                                    <option value="blue">Blue (파랑)</option>
                                                    <option value="success">Success (초록)</option>
                                                    <option value="danger">Danger (빨강)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-medium text-slate-500 mb-1 block">액션</label>
                                                <select
                                                    value={btn.action}
                                                    onChange={e => {
                                                        const newAction = e.target.value as ButtonAction;
                                                        /* excel로 바꿀 때만 popupSlug 초기화 (register↔custom 전환은 유지) */
                                                        updateButton(btn.id, { action: newAction, ...(newAction === 'excel' ? { popupSlug: undefined } : {}) });
                                                    }}
                                                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900"
                                                >
                                                    <option value="register">등록 (register)</option>
                                                    <option value="excel">엑셀 다운로드 (excel)</option>
                                                    <option value="custom">사용자 정의 (custom)</option>
                                                </select>
                                            </div>
                                        </div>
                                        {/* action=register/custom 시 팝업 연결 select 노출 */}
                                        {(btn.action === 'register' || btn.action === 'custom') && (
                                            <div>
                                                <label className="text-[10px] font-medium text-slate-500 mb-1 block">
                                                    연결 팝업 <span className="text-slate-400 font-normal">(선택 — 없으면 기본 동작)</span>
                                                </label>
                                                <select
                                                    value={btn.popupSlug || ''}
                                                    onChange={e => updateButton(btn.id, { popupSlug: e.target.value || undefined })}
                                                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900"
                                                >
                                                    <option value="">— 팝업 없음 —</option>
                                                    {layerTemplateList.map(tpl => (
                                                        <option key={tpl.id} value={tpl.slug}>
                                                            {tpl.name} ({tpl.slug})
                                                        </option>
                                                    ))}
                                                </select>
                                                {layerTemplateList.length === 0 && (
                                                    <p className="text-[10px] text-slate-400 mt-1">등록된 LAYER 팝업이 없습니다.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* 버튼 0개일 때 빈 상태 안내 */}
                            {buttons.length === 0 && (
                                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                                    <MousePointerClick className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-slate-400">버튼이 없습니다</p>
                                    <p className="text-[10px] text-slate-300 mt-0.5">아래 버튼으로 추가하세요</p>
                                </div>
                            )}

                            {/* 버튼 추가 */}
                            <button
                                onClick={addButton}
                                className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-xs font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" />버튼 추가
                            </button>
                        </>
                        )}
                    </div>
                </div>
                )}

                {/* ═══════════════════════════════════════ */}
                {/*  오른쪽: 미리보기 + 코드                  */}
                {/* ═══════════════════════════════════════ */}
                <div className="space-y-4">
                    {/* 상단 툴바 */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {!panelOpen && (
                                <button onClick={() => setPanelOpen(true)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition-all border border-slate-200" title="패널 열기">
                                    <PanelLeftOpen className="w-4 h-4" />
                                </button>
                            )}
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setShowCode(false)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${!showCode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                            >
                                <Eye className="w-3.5 h-3.5" />미리보기
                            </button>
                            <button
                                onClick={() => setShowCode(true)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${showCode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                            >
                                <Code className="w-3.5 h-3.5" />코드
                            </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {/* 저장 버튼 */}
                            <button
                                onClick={handleSaveOpen}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-all"
                                title={currentTemplateId ? '템플릿 수정 저장' : '새 템플릿 저장'}
                            >
                                <Save className="w-3.5 h-3.5" />{currentTemplateId ? '수정' : '저장'}
                            </button>
                            {/* 생성 버튼 */}
                            <button
                                onClick={handleGenerateOpen}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 rounded-md hover:bg-emerald-600 transition-all"
                                title="TSX 파일 생성"
                            >
                                <Zap className="w-3.5 h-3.5" />생성
                            </button>
                            {/* 코드 복사 버튼 */}
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-all"
                            >
                                {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" />복사됨</> : <><Copy className="w-3.5 h-3.5" />코드 복사</>}
                            </button>
                        </div>
                    </div>

                    {/* 컨텐츠 영역 */}
                    {showCode ? (
                        /* 코드 뷰 */
                        <div className="bg-[#161929] rounded-xl p-5 overflow-x-auto min-h-[300px]">
                            <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre">{currentCode}</pre>
                        </div>
                    ) : (
                        /* 미리보기 */
                        <div className="space-y-4">
                            {/* 버튼 바 — above: 검색폼 위에 렌더링 */}
                            {buttons.length > 0 && buttonPosition === 'above' && (
                                <div className="flex items-center justify-end gap-2 px-1">
                                    {buttons.map(btn => (
                                        <button
                                            key={btn.id}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${BTN_TYPE_CLS[btn.type] || BTN_TYPE_CLS.secondary}`}
                                        >
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* 검색폼 */}
                            {allFields.length === 0 ? (
                                <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
                                    <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-slate-400">왼쪽에서 검색 필드를 추가하세요</p>
                                    <p className="text-xs text-slate-300 mt-1">Input, Select, Date 등을 조합하여 검색폼을 만들 수 있습니다</p>
                                </div>
                            ) : (
                                    <SearchForm collapsible={collapsible} onSearch={() => {
                                        /* validation 수행 */
                                        const errors: { id: string; msg: string }[] = [];
                                        allFields.forEach(f => {
                                            const v = searchValues[f.id] || '';
                                            const label = f.type === 'dateRange' ? `${f.label} ~ ${f.label2 || ''}` : f.label;
                                            if (f.type === 'dateRange') {
                                                const parts = v.split('~');
                                                if (f.required && (!parts[0] || !parts[1])) errors.push({ id: f.id, msg: `[필수] ${label}` });
                                                if (parts[0] && parts[1] && parts[1] < parts[0]) errors.push({ id: f.id, msg: `[종료일이 시작일보다 빠름] ${label}` });
                                            } else {
                                                if (f.required && !v) errors.push({ id: f.id, msg: `[필수] ${label}` });
                                                if (f.type === 'input' && v) {
                                                    if (f.minLength && v.length < f.minLength) errors.push({ id: f.id, msg: `[최소 ${f.minLength}자] ${label} (현재 ${v.length}자)` });
                                                    if (f.maxLength && v.length > f.maxLength) errors.push({ id: f.id, msg: `[최대 ${f.maxLength}자] ${label} (현재 ${v.length}자)` });
                                                    if (f.pattern && !new RegExp(f.pattern).test(v)) errors.push({ id: f.id, msg: `[${f.patternDesc || f.pattern}] ${label}` });
                                                }
                                                if (f.type === 'checkbox') {
                                                    const cnt = v ? v.split(',').filter(Boolean).length : 0;
                                                    if (f.minSelect && cnt < f.minSelect) errors.push({ id: f.id, msg: `[최소 ${f.minSelect}개 선택] ${label} (현재 ${cnt}개)` });
                                                    if (f.maxSelect && cnt > f.maxSelect) errors.push({ id: f.id, msg: `[최대 ${f.maxSelect}개 선택] ${label} (현재 ${cnt}개)` });
                                                }
                                            }
                                        });

                                        if (errors.length > 0) {
                                            /* 오류 필드 하이라이트 + 포커싱 */
                                            const errorIds = new Set(errors.map(e => e.id));
                                            errorIds.forEach(id => {
                                                const el = document.querySelector(`[data-field-id="${id}"]`) as HTMLElement | null;
                                                if (el) {
                                                    el.classList.add('ring-2', 'ring-red-400', 'rounded-md');
                                                    setTimeout(() => el.classList.remove('ring-2', 'ring-red-400', 'rounded-md'), 3000);
                                                }
                                            });
                                            /* 첫 번째 오류 필드 포커싱 */
                                            const firstEl = document.querySelector(`[data-field-id="${errors[0].id}"] input, [data-field-id="${errors[0].id}"] select`) as HTMLElement | null;
                                            if (firstEl) { firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); firstEl.focus(); }
                                            showValidationError(errors.map(e => e.msg));
                                            return;
                                        }

                                        /* JSON 데이터 생성 */
                                        const data: Record<string, string | { from: string; to: string }> = {};
                                        allFields.forEach(f => {
                                            const v = searchValues[f.id] || '';
                                            if (f.type === 'dateRange') {
                                                const parts = v.split('~');
                                                data[f.label] = { from: parts[0] || '', to: parts[1] || '' };
                                            } else {
                                                data[f.label] = v;
                                            }
                                        });
                                        alert(JSON.stringify(data, null, 2));
                                    }} onReset={() => resetSearchValues()}>
                                        {fieldRows.map((row, ri) => (
                                            <SearchRow key={ri} cols={row.cols}>
                                                {row.fields.map(field => (
                                                    <div key={field.id} data-field-id={field.id} className={COL_SPAN_CLS[field.colSpan] || 'col-span-1'}>
                                                        <SearchField label={field.type === 'dateRange' ? `${field.label} ~ ${field.label2 || ''}` : field.label} required={field.required}>
                                                            <FieldPreview field={field} value={searchValues[field.id] || ''} onChange={v => updateSearchValue(field.id, v)} codeGroups={codeGroups} />
                                                        </SearchField>
                                                    </div>
                                                ))}
                                            </SearchRow>
                                        ))}
                                    </SearchForm>
                            )}

                            {/* 버튼 바 — between: 검색폼 아래, 테이블 위에 렌더링 */}
                            {buttons.length > 0 && buttonPosition === 'between' && (
                                <div className="flex items-center justify-end gap-2 px-1">
                                    {buttons.map(btn => (
                                        <button
                                            key={btn.id}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${BTN_TYPE_CLS[btn.type] || BTN_TYPE_CLS.secondary}`}
                                        >
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* 테이블 */}
                            {tableColumns.length === 0 ? (
                                <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
                                    <TableProperties className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-slate-400">왼쪽에서 테이블 컬럼을 추가하세요</p>
                                    <p className="text-xs text-slate-300 mt-1">헤더명, accessor, 너비, 정렬을 설정할 수 있습니다</p>
                                </div>
                            ) : (
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                                        <table style={{ width: tableColumns.some(c => c.widthUnit === '%') ? `${tableColumns.reduce((sum, c) => sum + (c.widthUnit === '%' ? (c.width || 0) : 0), 0)}%` : undefined, minWidth: tableColumns.reduce((sum, c) => sum + (c.widthUnit === '%' ? 0 : (c.width || 150)), 0) || '100%' }}>
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    {tableColumns.map(col => (
                                                        <th key={col.id} className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap" style={{ width: col.width ? `${col.width}${col.widthUnit || 'px'}` : 'auto', textAlign: col.align }}>
                                                            <span className="inline-flex items-center gap-1">
                                                                {col.header}
                                                                {col.sortable && <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                                                            </span>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[1, 2, 3, 4, 5].map(row => (
                                                    <tr key={row} className="border-b border-slate-100 hover:bg-slate-50/50">
                                                        {tableColumns.map(col => (
                                                            <td key={col.id} className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap" style={{ textAlign: col.align }}>
                                                                {col.cellType === 'text' && <span className="text-slate-400">샘플 텍스트</span>}
                                                                {col.cellType === 'badge' && (() => { const opt = col.cellOptions?.[row % (col.cellOptions?.length || 1)]; const isRound = (col.badgeShape || 'round') === 'round'; return opt ? <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium ${isRound ? 'rounded-full' : 'rounded-md font-semibold'} bg-${opt.color}-50 text-${opt.color}-700 border border-${opt.color}-200`}>{col.showIcon && <span className={`w-1.5 h-1.5 rounded-full bg-${opt.color}-500`} />}{opt.text}</span> : null; })()}
                                                                {col.cellType === 'boolean' && <span className={row % 2 === 0 ? 'text-emerald-600' : 'text-slate-400'}>{row % 2 === 0 ? (col.trueText || '공개') : (col.falseText || '비공개')}</span>}
                                                                {col.cellType === 'actions' && (
                                                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                                                        {(col.actions || []).includes('edit') && (
                                                                            <button
                                                                                onClick={() => { if (col.editPopupSlug) { setPreviewPopupSlug(col.editPopupSlug); setPreviewPopupOpen(true); } }}
                                                                                className="p-1.5 rounded text-slate-400 hover:bg-slate-100"
                                                                            ><Pencil className="w-3.5 h-3.5" /></button>
                                                                        )}
                                                                        {(col.actions || []).includes('detail') && (
                                                                            <button
                                                                                onClick={() => { if (col.detailPopupSlug) { setPreviewPopupSlug(col.detailPopupSlug); setPreviewPopupOpen(true); } }}
                                                                                className="p-1.5 rounded text-slate-400 hover:bg-slate-100"
                                                                            ><Eye className="w-3.5 h-3.5" /></button>
                                                                        )}
                                                                        {(col.actions || []).includes('delete') && <button className="p-1.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                                                                        {/* 커스텀 버튼 렌더링 */}
                                                                        {(col.customActions || []).filter(ca => ca.label).map(ca => (
                                                                            <button key={ca.id} className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all ${CUSTOM_ACTION_COLORS.find(c => c.value === ca.color)?.cls || CUSTOM_ACTION_COLORS[0].cls}`}>{ca.label}</button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 저장 모달 — 공통 컴포넌트 */}
            <SaveModal
                show={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                isEdit={!!currentTemplateId}
                name={saveModalName}
                slug={saveModalSlug}
                desc={saveModalDesc}
                isSaving={isSaving}
                onNameChange={setSaveModalName}
                onSlugChange={setSaveModalSlug}
                onDescChange={setSaveModalDesc}
                onConfirm={handleSaveConfirm}
                toSlug={toSlug}
            />

            {/* 생성 모달 — 공통 컴포넌트 */}
            <GenerateModal
                show={showGenerateModal}
                onClose={() => setShowGenerateModal(false)}
                slug={generateSlug}
                isGenerating={isGenerating}
                onSlugChange={setGenerateSlug}
                onConfirm={handleGenerateConfirm}
                fileHint="ListPage.tsx"
            />

            {/* 미리보기 팝업 — slug 연결된 액션 버튼 클릭 시 즉시 오픈 */}
            <LayerPopupRenderer
                open={previewPopupOpen}
                onClose={() => setPreviewPopupOpen(false)}
                slug={previewPopupSlug}
            />
        </div>
    );
}
