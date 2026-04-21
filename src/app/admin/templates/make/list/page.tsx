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
    Save, Zap, Loader2, MousePointerClick,
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchForm, SearchRow, SearchField } from '@/components/search';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import api from '@/lib/api';
/* ── 공통 모듈 ── */
import { inputCls, selectCls } from '../_shared/styles';
import {
    CodeGroupDef, TemplateItem, ButtonConfig, ButtonType, ButtonAction,
    ButtonPosition, DisplayMode, CellType, CellOption, TableColumnConfig,
    SearchFieldConfig, SearchRowConfig, SearchFieldType as FieldType
} from '../_shared/types';
import {
    parseOpt, needsOptions as sharedNeedsOptions, toSlug, createIdGenerator,
    varName, showValidationError
} from '../_shared/utils';
import { SelectArrow } from '../_shared/components/SelectArrow';
import { SaveModal, GenerateModal } from '../_shared/components/TemplateModals';

/* ── 공통 빌더 컴포넌트 ── */
import { SearchBuilder } from '../_shared/components/SearchBuilder';
import { TableBuilder, TableWidget } from '../_shared/components/builder/TableBuilder';

import { buildListTsxFile } from '../_shared/generators/listGenerator';

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

/* SearchFieldConfig, SearchRowConfig -> _shared/types.ts 에서 import */

/* CellType, CellOption, TableColumnConfig → _shared/types.ts 에서 import */

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
    { type: 'button', label: 'Button', desc: '선택 버튼', defaultColSpan: 1 },
];

/* ── ID 생성 ── */
const uid = createIdGenerator('f');
const caUid = createIdGenerator('ca'); // 커스텀 액션 버튼 ID 생성

/* ── 커스텀 액션 버튼 색상 맵 (Tailwind 동적 클래스 purge 방지) ── */
const CUSTOM_ACTION_COLORS: { value: string; label: string; cls: string }[] = [
    { value: 'slate', label: '기본', cls: 'bg-slate-500 hover:bg-slate-600 text-white' },
    { value: 'blue', label: '파랑', cls: 'bg-blue-500 hover:bg-blue-600 text-white' },
    { value: 'green', label: '초록', cls: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
    { value: 'red', label: '빨강', cls: 'bg-red-500 hover:bg-red-600 text-white' },
    { value: 'orange', label: '주황', cls: 'bg-orange-500 hover:bg-orange-600 text-white' },
];

/* ── 버튼 타입별 Tailwind 클래스 맵 (Tailwind 동적 클래스 purge 방지) ── */
const BTN_TYPE_CLS: Record<string, string> = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50',
    blue: 'bg-blue-500 text-white hover:bg-blue-600',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    danger: 'bg-red-500 text-white hover:bg-red-600',
};

/* ── 버튼 타입 뱃지 클래스 맵 (설정 패널 헤더용) ── */
const BTN_TYPE_BADGE_CLS: Record<string, string> = {
    primary: 'bg-slate-900 text-white',
    secondary: 'bg-white border border-slate-300 text-slate-600',
    blue: 'bg-blue-100 text-blue-600',
    success: 'bg-emerald-100 text-emerald-600',
    danger: 'bg-red-100 text-red-600',
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
                <div className="flex items-center gap-4 py-2">
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
                <div className="flex items-center gap-4 py-2">
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
        case 'button': {
            /* 공통코드 or 수동 옵션 결정 */
            const btnOpts = field.codeGroupCode
                ? (codeGroups.find(g => g.groupCode === field.codeGroupCode)?.details.filter(d => d.active).map(d => `${d.name}:${d.code}`) || [])
                : (field.options || ['오늘:today', '1주:1week', '1개월:1month', '3개월:3month', '전체:all']);
            /* 다중선택: 쉼표 구분 값 토글 */
            if (field.multiSelect) {
                const selected = (value || '').split(',').filter(Boolean);
                return (
                    <div className="flex items-center flex-wrap gap-1.5">
                        {btnOpts.map(opt => {
                            const { text, value: val } = parseOpt(opt);
                            const isActive = selected.includes(val);
                            return (
                                <button key={opt} type="button" onClick={() => {
                                    const next = isActive ? selected.filter(v => v !== val) : [...selected, val];
                                    handleChange(next.join(','));
                                }} className={`px-2.5 py-2 text-xs font-medium rounded-md border transition-all ${isActive ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}`}>{text}</button>
                            );
                        })}
                    </div>
                );
            }
            return (
                <div className="flex items-center flex-wrap gap-1.5">
                    {btnOpts.map(opt => {
                        const { text, value: val } = parseOpt(opt);
                        const isActive = value === val;
                        return (
                            <button key={opt} type="button" onClick={() => handleChange(val)} className={`px-2.5 py-2 text-xs font-medium rounded-md border transition-all ${isActive ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}`}>{text}</button>
                        );
                    })}
                </div>
            );
        }
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
                lines.push(`const [${name}, set${name.charAt(0).toUpperCase() + name.slice(1)}] = useState('');`);
                break;
            case 'button':
                /* 다중선택이면 string[] 배열, 단일이면 string */
                if (f.multiSelect) {
                    lines.push(`const [${name}, set${name.charAt(0).toUpperCase() + name.slice(1)}] = useState<string[]>([]);`);
                } else {
                    lines.push(`const [${name}, set${name.charAt(0).toUpperCase() + name.slice(1)}] = useState('');`);
                }
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
        if (f.type === 'checkbox' || (f.type === 'button' && f.multiSelect)) {
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
                fl.push(`${ind(depth + 1)}<div className="flex items-center gap-4 py-2">`);
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
                fl.push(`${ind(depth + 1)}<div className="flex items-center gap-4 py-2">`);
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
            case 'button':
                fl.push(`${ind(depth + 1)}<div className="flex items-center flex-wrap gap-1.5">`);
                if (f.multiSelect) {
                    /* 다중선택 모드 — 배열 state로 토글 */
                    if (f.codeGroupCode) {
                        fl.push(`${ind(depth + 2)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => (`);
                        fl.push(`${ind(depth + 3)}<button key={d.code} type="button" onClick={() => ${setter}(prev => prev.includes(d.code) ? prev.filter(v => v !== d.code) : [...prev, d.code])} className={\`px-2.5 py-2 text-xs font-medium rounded-md border transition-all \${${name}.includes(d.code) ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}\`}>{d.name}</button>`);
                        fl.push(`${ind(depth + 2)}))}`);
                    } else {
                        (f.options || []).forEach(opt => {
                            const { text, value } = parseOpt(opt);
                            fl.push(`${ind(depth + 2)}<button type="button" onClick={() => ${setter}(prev => prev.includes('${value}') ? prev.filter(v => v !== '${value}') : [...prev, '${value}'])} className={\`px-2.5 py-2 text-xs font-medium rounded-md border transition-all \${${name}.includes('${value}') ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}\`}>${text}</button>`);
                        });
                    }
                } else {
                    /* 단일선택 모드 */
                    if (f.codeGroupCode) {
                        fl.push(`${ind(depth + 2)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => (`);
                        fl.push(`${ind(depth + 3)}<button key={d.code} type="button" onClick={() => ${setter}(d.code)} className={\`px-2.5 py-2 text-xs font-medium rounded-md border transition-all \${${name} === d.code ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}\`}>{d.name}</button>`);
                        fl.push(`${ind(depth + 2)}))}`);
                    } else {
                        (f.options || []).forEach(opt => {
                            const { text, value } = parseOpt(opt);
                            fl.push(`${ind(depth + 2)}<button type="button" onClick={() => ${setter}('${value}')} className={\`px-2.5 py-2 text-xs font-medium rounded-md border transition-all \${${name} === '${value}' ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}\`}>${text}</button>`);
                        });
                    }
                }
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
    return buildListTsxFile(rows, columns, collapsible, buttons, buttonPosition, displayMode, pageSize);
};

/* ══════════════════════════════════════════ */
/*  메인 페이지 컴포넌트                        */
/* ══════════════════════════════════════════ */

/* ══════════════════════════════════════════ */
/*  메인 페이지 컴포넌트                        */
/* ══════════════════════════════════════════ */
export default function MakeListPage() {
    /* ── UI 상태 ── */
    const [activeTab, setActiveTab] = useState<'search' | 'table' | 'button'>('search');
    const [showCode, setShowCode] = useState(false);
    const [copied, setCopied] = useState(false);
    const [panelOpen, setPanelOpen] = useState(true);

    /* ── 검색 필드 값 관리 (미리보기용) ── */
    const [searchValues, setSearchValues] = useState<Record<string, string>>({});
    const updateSearchValue = (key: string, val: string) => setSearchValues(prev => ({ ...prev, [key]: val }));
    const resetSearchValues = () => setSearchValues({});

    /* ── 검색폼 설정 ── */
    const [fieldRows, setFieldRows] = useState<SearchRowConfig[]>([]);
    const [collapsible, setCollapsible] = useState(false);

    /* ── 테이블 설정 (TableWidget 인터페이스로 통합) ── */
    const [tableWidget, setTableWidget] = useState<TableWidget>({
        type: 'table',
        widgetId: 'main-table',
        contentKey: 'boardList',
        columns: [],
        connectedSearchIds: [],
        displayMode: 'pagination',
        pageSize: 10
    });

    /* ── 파생 상태 ── */
    const allFields = fieldRows.flatMap(r => r.fields);
    const totalFieldCount = allFields.length;

    /* ── 버튼 설정 ── */
    const [buttons, setButtons] = useState<ButtonConfig[]>([]);
    const [buttonPosition, setButtonPosition] = useState<ButtonPosition>('between');

    /* ── 공통코드 상태 ── */
    const [codeGroups, setCodeGroups] = useState<CodeGroupDef[]>([]);
    const [codeGroupsLoading, setCodeGroupsLoading] = useState(false);

    /* ── 템플릿 필터링 ── */
    const [templateSearchQuery, setTemplateSearchQuery] = useState(''); // 템플릿 검색어
    const [templateList, setTemplateList] = useState<TemplateItem[]>([]);
    const listTypeTemplates = templateList.filter(t =>
        t.templateType === 'LIST' &&
        (!templateSearchQuery || t.name.includes(templateSearchQuery) || t.slug.includes(templateSearchQuery))
    );

    /* ── QUICK_DETAIL 팝업 연결용 템플릿 목록 ── */
    const [layerTemplateList, setLayerTemplateList] = useState<TemplateItem[]>([]);
    const [layerTemplatesLoaded, setLayerTemplatesLoaded] = useState(false);
    /** actions 컬럼 편집 시 QUICK_DETAIL 템플릿 목록 lazy 로딩 */
    const loadLayerTemplates = () => {
        if (layerTemplatesLoaded) return;
        api.get('/page-templates')
            .then(res => {
                setLayerTemplateList((res.data as TemplateItem[]).filter(t => t.templateType === 'QUICK_DETAIL'));
                setLayerTemplatesLoaded(true);
            })
            .catch(() => { });
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
    const [isLoadingList, setIsLoadingList] = useState(false);
    /* 템플릿 인라인 편집 상태 */
    const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
    const [editingTemplateName, setEditingTemplateName] = useState('');
    const [editingTemplateSlug, setEditingTemplateSlug] = useState('');
    const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
    const [isDuplicatingId, setIsDuplicatingId] = useState<number | null>(null);
    /* 생성 이력 드롭다운 */
    const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
    const [historyList, setHistoryList] = useState<{ id: number; name: string; folderName: string; fileName: string; createdAt: string }[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isDeletingHistoryId, setIsDeletingHistoryId] = useState<number | null>(null);
    /* 생성 모달 */
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateName, setGenerateName] = useState('');
    const [generateSlug, setGenerateSlug] = useState('');
    const [generateFileName, setGenerateFileName] = useState('page');
    const [isGenerating, setIsGenerating] = useState(false);
    /* 미리보기 팝업 — slug 연결된 액션 버튼 클릭 시 externalPopupTrigger로 WidgetRenderer에 위임 */
    const [previewPopupTrigger, setPreviewPopupTrigger] = useState<{ slug: string; ts: number } | null>(null);

    /* ── 공통코드 목록 로딩 ── */
    useEffect(() => {
        setCodeGroupsLoading(true);
        api.get('/codes')
            .then(res => setCodeGroups(res.data))
            .catch(() => { })
            .finally(() => setCodeGroupsLoading(false));
    }, []);

    /* ── 템플릿 목록 자동 로딩 (패널 마운트 시 1회) ── */
    useEffect(() => {
        setIsLoadingList(true);
        api.get('/page-templates')
            .then(res => setTemplateList(res.data))
            .catch(() => { })
            .finally(() => setIsLoadingList(false));
    }, []);

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
    const tableCode = generateTableCode(tableWidget.columns);
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
            if (parsed.fieldRows) {
                /* ID 재생성 — 저장된 ID와 uid 카운터 충돌 시 동일 ID 필드가 동시 업데이트되는 버그 방지 */
                const newFieldRows = (parsed.fieldRows as SearchRowConfig[]).map(row => ({
                    ...row,
                    id: uid(),
                    fields: row.fields.map((f: SearchFieldConfig) => ({ ...f, id: uid() })),
                }));
                setFieldRows(newFieldRows);
            }
            if (parsed.tableColumns || parsed.tableWidget?.columns) {
                const incomingColumns = parsed.tableColumns || parsed.tableWidget.columns;
                /* 중복 ID 재생성 — 같은 id가 있으면 React key 충돌로 이동 대신 복사 현상 발생 */
                const seenIds = new Set<string>();
                const deduped = (incomingColumns as TableColumnConfig[]).map(col => {
                    if (seenIds.has(col.id)) {
                        return { ...col, id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
                    }
                    seenIds.add(col.id);
                    return col;
                });
                setTableWidget(prev => ({
                    ...prev,
                    columns: deduped,
                    displayMode: parsed.displayMode || parsed.tableWidget?.displayMode || 'pagination',
                    pageSize: parsed.pageSize || parsed.tableWidget?.pageSize || 10
                }));
            }
            if (typeof parsed.collapsible === 'boolean') setCollapsible(parsed.collapsible);
            /* v2: 버튼 설정 복원 (기존 템플릿은 기본값 적용) */
            setButtons(parsed.buttons ?? []);
            setButtonPosition(parsed.buttonPosition ?? 'between');
        } catch {
            toast.error('설정 데이터 파싱 중 오류가 발생했습니다.');
        }
    };

    /* ── 필드 라벨/Key 필수 검사 — 저장/생성 전 공통 사용 ── */
    const validateFieldRequirements = (): boolean => {
        const errors: string[] = [];
        /* 검색 필드: 라벨·Key 빈값 검사 */
        fieldRows.forEach(row => row.fields.forEach(f => {
            if (!f.label.trim()) errors.push(`검색 필드 라벨이 비어 있습니다.`);
            if (!f.fieldKey?.trim()) errors.push(`검색 필드 "${f.label || '?'}"의 Key가 비어 있습니다.`);
        }));
        /* 테이블 컬럼: 헤더명·Key 빈값 검사 (actions 제외) */
        tableWidget.columns.forEach(col => {
            if (col.cellType === 'actions') return;
            if (!col.header.trim()) errors.push(`테이블 컬럼 헤더명이 비어 있습니다.`);
            if (!col.accessor.trim()) errors.push(`테이블 컬럼 "${col.header || '?'}"의 Key가 비어 있습니다.`);
        });
        if (errors.length > 0) { showValidationError(errors); return false; }
        return true;
    };

    /* ── 저장 핸들러 ── */
    const handleSaveOpen = () => {
        if (!validateFieldRequirements()) return;
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
        const configJson = JSON.stringify({
            fieldRows,
            tableColumns: tableWidget.columns,
            tableWidget,
            collapsible,
            buttons,
            buttonPosition,
            displayMode: tableWidget.displayMode,
            pageSize: tableWidget.pageSize
        });
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

    /* ── 템플릿 드롭다운 토글 (열 때 이력 드롭다운 닫기, 닫을 때 검색어 초기화) ── */
    const toggleTemplateDropdown = () => {
        setShowHistoryDropdown(false);
        setTemplateSearchQuery(''); // 열고 닫을 때 검색어 초기화
        setShowTemplateDropdown(prev => !prev);
    };

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

    /* ── 생성 이력 드롭다운 토글 (열 때 API 호출 + 템플릿 드롭다운 닫기) ── */
    const toggleHistoryDropdown = async () => {
        setShowTemplateDropdown(false);
        if (!showHistoryDropdown) {
            setIsLoadingHistory(true);
            try {
                const res = await api.get('/tsx-generation', { params: { templateType: 'LIST', size: 50 } });
                setHistoryList(res.data.content);
            } catch {
                toast.error('생성 이력 로딩 중 오류가 발생했습니다.');
            } finally {
                setIsLoadingHistory(false);
            }
        }
        setShowHistoryDropdown(prev => !prev);
    };

    /** 생성 이력 선택 — configJson을 빌더에 복원 */
    const handleHistorySelect = async (id: number, name: string) => {
        try {
            const res = await api.get(`/tsx-generation/${id}`);
            restoreFromConfigJson(res.data.configJson);
            setShowHistoryDropdown(false);
            toast.success(`"${name}" 이력을 불러왔습니다.`);
        } catch {
            toast.error('이력 불러오기 중 오류가 발생했습니다.');
        }
    };

    /** 생성 이력 삭제 */
    const handleDeleteHistory = async (id: number) => {
        if (!window.confirm('이력을 삭제하시겠습니까?')) return;
        setIsDeletingHistoryId(id);
        try {
            await api.delete(`/tsx-generation/${id}`);
            setHistoryList(prev => prev.filter(h => h.id !== id));
            toast.success('이력이 삭제되었습니다.');
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        } finally {
            setIsDeletingHistoryId(null);
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

    /* ── 생성 핸들러 (TSX 파일 생성 + 이력 저장) ── */
    const handleGenerateOpen = () => {
        if (!validateFieldRequirements()) return;
        setGenerateName(saveModalName || '');
        setGenerateSlug(saveModalSlug || '');
        setGenerateFileName('page');
        setShowGenerateModal(true);
    };

    const handleGenerateConfirm = async () => {
        if (!generateName.trim() || !generateSlug.trim() || !generateFileName.trim()) return;
        setIsGenerating(true);
        /* layerTemplateList에 없는 slug는 stale 값으로 간주 — 생성 시 제거 */
        const validLayerSlugs = new Set(layerTemplateList.map(t => t.slug));
        const sanitizedColumns = tableWidget.columns.map(col => ({
            ...col,
            editPopupSlug: col.editPopupSlug && validLayerSlugs.has(col.editPopupSlug) ? col.editPopupSlug : undefined,
            detailPopupSlug: col.detailPopupSlug && validLayerSlugs.has(col.detailPopupSlug) ? col.detailPopupSlug : undefined,
        }));
        const configJson = JSON.stringify({
            fieldRows,
            tableColumns: sanitizedColumns,
            tableWidget: { ...tableWidget, columns: sanitizedColumns },
            collapsible,
            buttons,
            buttonPosition,
            displayMode: tableWidget.displayMode,
            pageSize: tableWidget.pageSize
        });
        try {
            const tsxCode = buildTsxFile(
                fieldRows,
                sanitizedColumns,
                collapsible,
                buttons,
                buttonPosition,
                tableWidget.displayMode,
                tableWidget.pageSize
            );

            /* 1. TSX 파일만 생성 (page_template DB 저장 없음) */
            const fileRes = await api.post('/page-templates/generate', {
                slug: generateSlug,
                fileName: generateFileName,
                tsxCode,
                templateType: 'LIST',
            });

            /* 2. 생성 이력 저장 (tsx_generation 테이블) */
            await api.post('/tsx-generation', {
                name: generateName,
                folderName: generateSlug,
                fileName: generateFileName + '.tsx',
                templateType: 'LIST',
                configJson,
                tsxCode,
            });

            toast.success(`TSX 파일 생성 완료! → ${fileRes.data.pageUrl}`);
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
                                        {/* 검색 입력 */}
                                        <div className="px-2 py-1.5 border-b border-slate-100">
                                            <div className="flex items-center gap-1.5 px-2 py-1 border border-slate-200 rounded-md bg-slate-50 focus-within:border-slate-400 focus-within:bg-white transition-all">
                                                <Search className="w-3 h-3 text-slate-400 shrink-0" />
                                                <input
                                                    autoFocus
                                                    value={templateSearchQuery}
                                                    onChange={e => setTemplateSearchQuery(e.target.value)}
                                                    placeholder="템플릿 검색..."
                                                    className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                                                />
                                                {templateSearchQuery && (
                                                    <button onClick={() => setTemplateSearchQuery('')} className="text-slate-300 hover:text-slate-500">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {listTypeTemplates.length === 0 ? (
                                            <div className="py-5 text-center text-xs text-slate-400">
                                                {templateSearchQuery ? '검색 결과가 없습니다.' : '저장된 템플릿이 없습니다.'}
                                            </div>
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
                        {/* 생성 이력 드롭다운 */}
                        <div className="px-3 pb-2 border-b border-slate-100 bg-slate-50/30">
                            <div className="relative">
                                <button
                                    onClick={toggleHistoryDropdown}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 border rounded-md text-xs transition-all ${showHistoryDropdown ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white hover:border-slate-400'}`}
                                >
                                    <span className="text-slate-400">생성 이력...</span>
                                    {isLoadingHistory
                                        ? <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                                        : <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showHistoryDropdown ? 'rotate-180' : ''}`} />
                                    }
                                </button>
                                {showHistoryDropdown && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                                        {historyList.length === 0 ? (
                                            <div className="py-5 text-center text-xs text-slate-400">생성 이력이 없습니다.</div>
                                        ) : (
                                            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                                                {historyList.map(h => (
                                                    <div key={h.id} className="group px-3 py-2 hover:bg-slate-50 transition-all">
                                                        <div className="flex items-center gap-1">
                                                            {/* 이름 클릭 → 빌더 복원 */}
                                                            <button
                                                                onClick={() => handleHistorySelect(h.id, h.name)}
                                                                className="flex-1 text-left min-w-0"
                                                            >
                                                                <span className="text-[11px] font-medium text-slate-800 truncate block">{h.name}</span>
                                                                <p className="text-[10px] text-slate-400 font-mono truncate">{h.folderName}/{h.fileName}</p>
                                                            </button>
                                                            {/* 삭제 버튼 — hover 시 표시 */}
                                                            <button
                                                                onClick={e => { e.stopPropagation(); handleDeleteHistory(h.id); }}
                                                                disabled={isDeletingHistoryId === h.id}
                                                                className="p-1 rounded opacity-0 group-hover:opacity-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50 shrink-0"
                                                                title="삭제"
                                                            >
                                                                {isDeletingHistoryId === h.id
                                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                    : <Trash2 className="w-3 h-3" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 패널 헤더: 탭 + 닫기 버튼 */}
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                                <button onClick={() => setActiveTab('search')} className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all ${activeTab === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <Search className="w-3 h-3" />검색 <span className="text-slate-400 font-normal">{totalFieldCount}</span>
                                </button>
                                <button onClick={() => setActiveTab('table')} className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all ${activeTab === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <TableProperties className="w-3 h-3" />테이블 <span className="text-slate-400 font-normal">{tableWidget.columns.length}</span>
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

                            {activeTab === 'search' && (
                                <SearchBuilder
                                    rows={fieldRows}
                                    onChange={setFieldRows}
                                />
                            )}

                            {/* ── 테이블 탭 ── */}
                            {activeTab === 'table' && (
                                <TableBuilder
                                    widget={tableWidget}
                                    onChange={setTableWidget}
                                    searchWidgets={[]} // 리스트 빌더에서는 단일 테이블이므로 빈 배열 또는 검색 위젯 필요 시 추가
                                />
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
                                                {/* action=register/custom 시 팝업 연결 옵션 노출 */}
                                                {(btn.action === 'register' || btn.action === 'custom') && (
                                                    <>
                                                        {/* 관리자방식 — DB 저장 레이어 팝업 slug */}
                                                        <div>
                                                            <label className="text-[10px] font-medium text-slate-500 mb-1 block">
                                                                연결팝업 또는 연결경로 <span className="text-slate-400 font-normal">(관리자방식 — DB slug)</span>
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
                                                                <p className="text-[10px] text-slate-400 mt-1">등록된 QUICK_DETAIL 팝업이 없습니다.</p>
                                                            )}
                                                        </div>
                                                        {/* 개발자방식 — 생성된 로컬 파일 컴포넌트명 (예: LayerPopup) */}
                                                        <div>
                                                            <label className="text-[10px] font-medium text-slate-500 mb-1 block">
                                                                연결 경로 <span className="text-slate-400 font-normal">(개발자방식 — 로컬 컴포넌트명)</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={btn.fileLayerSlug || ''}
                                                                onChange={e => updateButton(btn.id, { fileLayerSlug: e.target.value || undefined })}
                                                                placeholder="예: LayerPopup"
                                                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                                                            />
                                                            <p className="text-[10px] text-slate-400 mt-1">Layer Builder로 생성한 파일명 (확장자 제외)</p>
                                                        </div>
                                                    </>
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
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-h-[500px] space-y-4">
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
                            {tableWidget.columns.length === 0 ? (
                                <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
                                    <TableProperties className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-slate-400">왼쪽에서 테이블 컬럼을 추가하세요</p>
                                    <p className="text-xs text-slate-300 mt-1">헤더명, accessor, 너비, 정렬을 설정할 수 있습니다</p>
                                </div>
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                                    <table style={{ width: tableWidget.columns.some(c => c.widthUnit === '%') ? `${tableWidget.columns.reduce((sum, c) => sum + (c.widthUnit === '%' ? (c.width || 0) : 0), 0)}%` : undefined, minWidth: tableWidget.columns.reduce((sum, c) => sum + (c.widthUnit === '%' ? 0 : (c.width || 150)), 0) || '100%' }}>
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                {tableWidget.columns.map(col => (
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
                                                    {tableWidget.columns.map(col => (
                                                        <td key={col.id} className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap" style={{ textAlign: col.align }}>
                                                            {col.cellType === 'text' && <span className="text-slate-400">샘플 텍스트</span>}
                                                            {col.cellType === 'badge' && (() => { const opt = col.cellOptions?.[row % (col.cellOptions?.length || 1)]; const isRound = (col.badgeShape || 'round') === 'round'; return opt ? <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium ${isRound ? 'rounded-full' : 'rounded-md font-semibold'} bg-${opt.color}-50 text-${opt.color}-700 border border-${opt.color}-200`}>{col.showIcon && <span className={`w-1.5 h-1.5 rounded-full bg-${opt.color}-500`} />}{opt.text}</span> : null; })()}
                                                            {col.cellType === 'boolean' && <span className={row % 2 === 0 ? 'text-emerald-600' : 'text-slate-400'}>{row % 2 === 0 ? (col.trueText || '공개') : (col.falseText || '비공개')}</span>}
                                                            {col.cellType === 'actions' && (
                                                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                                                    {(col.actions || []).includes('edit') && (
                                                                        <button
                                                                            onClick={() => { if (col.editPopupSlug) { setPreviewPopupTrigger({ slug: col.editPopupSlug, ts: Date.now() }); } }}
                                                                            className="p-1.5 rounded text-slate-400 hover:bg-slate-100"
                                                                        ><Pencil className="w-3.5 h-3.5" /></button>
                                                                    )}
                                                                    {(col.actions || []).includes('detail') && (
                                                                        <button
                                                                            onClick={() => { if (col.detailPopupSlug) { setPreviewPopupTrigger({ slug: col.detailPopupSlug, ts: Date.now() }); } }}
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
                name={generateName}
                slug={generateSlug}
                fileName={generateFileName}
                isGenerating={isGenerating}
                onNameChange={setGenerateName}
                onSlugChange={setGenerateSlug}
                onFileNameChange={setGenerateFileName}
                onConfirm={handleGenerateConfirm}
            />

            {/* 미리보기 팝업 — externalPopupTrigger로 WidgetRenderer에 팝업 위임 */}
            <WidgetRenderer
                mode="live"
                widget={null}
                externalPopupTrigger={previewPopupTrigger}
            />
        </div>
    );
}
