import { SearchRowConfig, SearchFieldConfig, TableColumnConfig, ButtonConfig, ButtonPosition, DisplayMode, CodeGroupDef } from '../types';
import { varName, parseOpt } from '../utils';

/**
 * List 빌더 전용 코드 생성기
 */
export const buildListTsxFile = (
    rows: SearchRowConfig[],
    columns: TableColumnConfig[],
    collapsible: boolean,
    buttons: ButtonConfig[] = [],
    buttonPosition: ButtonPosition = 'between',
    displayMode: DisplayMode = 'pagination',
    pageSize: number = 10
) => {
    const allFields = rows.flatMap(r => r.fields);
    const ind = (n: number) => '    '.repeat(n);
    const lines: string[] = [];

    /* fieldKey 우선, 없으면 라벨 자동 변환 */
    const fieldVar = (f: SearchFieldConfig) => f.fieldKey || varName(f.label);
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    /* ── import 분석 ── */
    const hasCodeGroup = allFields.some(f => f.codeGroupCode) || columns.some(c => c.codeGroupCode);
    const needsCalendar = allFields.some(f => f.type === 'date' || f.type === 'dateRange');
    const needsChevron = allFields.some(f => f.type === 'select');
    const needsArrow = columns.some(c => c.sortable);
    /* actions 컬럼 존재 여부 */
    const hasActionsCol = columns.some(c => c.cellType === 'actions');
    /* LAYER 팝업 연결 여부 (테이블 컬럼) */
    const hasPopup = columns.some(c => c.editPopupSlug || c.detailPopupSlug || c.editFileLayerSlug || c.detailFileLayerSlug);
    const hasPathPopup = columns.some(c => c.editFileLayerSlug || c.detailFileLayerSlug);
    /* 버튼 분석 */
    const hasBtns = buttons.length > 0;
    const hasBtnPopup = buttons.some(b => b.popupSlug || b.fileLayerSlug);
    const hasBtnPathPopup = buttons.some(b => b.fileLayerSlug);
    /* 개발자방식 — 버튼 + actions 컬럼의 fileLayerSlug 중복 제거 후 import/POPUP_MAP 대상 목록 */
    const fileLayerSlugs = [...new Set([
        ...buttons.map(b => b.fileLayerSlug),
        ...columns.map(c => c.editFileLayerSlug),
        ...columns.map(c => c.detailFileLayerSlug),
    ].filter(Boolean) as string[])];

    /* ── 배지 색상 → 정적 Tailwind 클래스 변환 ── */
    const BADGE_BG: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        slate: 'bg-slate-100 text-slate-700 border-slate-200',
        pink: 'bg-pink-50 text-pink-700 border-pink-200',
        sky: 'bg-sky-50 text-sky-700 border-sky-200',
    };
    const BADGE_DOT: Record<string, string> = {
        emerald: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500',
        red: 'bg-red-500', purple: 'bg-purple-500', slate: 'bg-slate-500',
        pink: 'bg-pink-500', sky: 'bg-sky-500',
    };
    /* 커스텀 액션 버튼 색상 정적 클래스 */
    const CA_COLOR: Record<string, string> = {
        slate: 'bg-slate-500 hover:bg-slate-600 text-white',
        blue: 'bg-blue-500 hover:bg-blue-600 text-white',
        green: 'bg-emerald-500 hover:bg-emerald-600 text-white',
        red: 'bg-red-500 hover:bg-red-600 text-white',
        orange: 'bg-orange-500 hover:bg-orange-600 text-white',
    };

    /* ── 코드 생성 시작 ── */
    lines.push("'use client';");
    lines.push('');
    lines.push("import React, { useState, useEffect, useRef } from 'react';");
    lines.push("import { usePathname } from 'next/navigation';");
    const icons = [
        'Search', 'RotateCcw',
        ...(needsCalendar ? ['Calendar'] : []),
        ...(needsChevron ? ['ChevronDown'] : []),
        ...(needsArrow ? ['ArrowUpDown'] : []),
        ...(hasActionsCol ? ['Pencil', 'Eye', 'Trash2'] : []),
    ];
    lines.push(`import { ${icons.join(', ')} } from 'lucide-react';`);
    lines.push("import { toast } from 'sonner';");
    lines.push("import { SearchForm, SearchRow, SearchField } from '@/components/search';");
    if (hasPopup || hasBtnPopup) lines.push("import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';");
    lines.push("import api from '@/lib/api';");
    if (hasCodeGroup) lines.push("import { useCodeStore } from '@/store/useCodeStore';");
    /* 개발자방식 커스텀 팝업 import */
    fileLayerSlugs.forEach(slug => {
        lines.push(`import ${slug} from './${slug}';`);
    });
    lines.push('');

    /* 유틸리티 함수: findMenuSlug (목록 공통) */
    lines.push('/** pathname을 기반으로 navMenus에서 해당 메뉴의 slug를 찾습니다. */');
    lines.push('function findMenuSlug(menus: any[], path: string): string | undefined {');
    lines.push(`${ind(1)}for (const m of menus) {`);
    lines.push(`${ind(2)}if (m.href === path) return m.slug;`);
    lines.push(`${ind(2)}if (m.children) {`);
    lines.push(`${ind(3)}const found = findMenuSlug(m.children, path);`);
    lines.push(`${ind(3)}if (found !== undefined) return found;`);
    lines.push(`${ind(2)}}`);
    lines.push(`${ind(1)}}`);
    lines.push(`${ind(1)}return undefined;`);
    lines.push('}');
    lines.push('');

    /* 개발자방식 — POPUP_MAP 생성 */
    if (fileLayerSlugs.length > 0) {
        lines.push('/** POPUP_MAP — fileLayerSlug 값으로 로컬 컴포넌트를 조회합니다. */');
        lines.push(`const POPUP_MAP: Record<string, React.ComponentType<{ isOpen: boolean; onClose: () => void; onSave: (data: Record<string, unknown>) => Promise<void> }>> = {`);
        fileLayerSlugs.forEach(slug => {
            lines.push(`${ind(1)}'${slug}': ${slug},`);
        });
        lines.push('};');
        lines.push('');
    }

    /* ── 컴포넌트 시작 ── */
    lines.push('export default function GeneratedPage() {');
    if (hasCodeGroup) {
        lines.push(`${ind(1)}/* ── 공통코드 그룹 ── */`);
        lines.push(`${ind(1)}const { groups, fetchGroups } = useCodeStore();`);
        lines.push(`${ind(1)}useEffect(() => { fetchGroups(); }, [fetchGroups]);`);
        lines.push('');
    }
    lines.push(`${ind(1)}/* 현재 경로와 매칭된 메뉴의 slug — 메뉴 관리에서 설정한 값 */`);
    lines.push(`${ind(1)}const pathname = usePathname();`);
    lines.push(`${ind(1)}const navMenus: any[] = []; // TODO: 실제 메뉴 데이터와 매칭 필요`);
    lines.push(`${ind(1)}const menuSlug = findMenuSlug(navMenus, pathname) ?? '';`);
    lines.push('');

    /* ── State 선언 ── */
    lines.push(`${ind(1)}/* ── 검색 필드 State ── */`);
    allFields.forEach(f => {
        const n = fieldVar(f);
        if (f.type === 'checkbox' || (f.type === 'button' && f.multiSelect)) {
            lines.push(`${ind(1)}const [${n}, set${cap(n)}] = useState<string[]>([]);`);
        } else if (f.type === 'dateRange') {
            const n2 = varName(f.label2 || '');
            lines.push(`${ind(1)}const [${n}, set${cap(n)}] = useState('');`);
            lines.push(`${ind(1)}const [${n2}, set${cap(n2)}] = useState('');`);
        } else {
            lines.push(`${ind(1)}const [${n}, set${cap(n)}] = useState('');`);
        }
    });

    lines.push(`${ind(1)}const [data, setData] = useState<Record<string, unknown>[]>([]);`);
    lines.push(`${ind(1)}const [totalElements, setTotalElements] = useState(0);`);
    if (displayMode === 'pagination') {
        lines.push(`${ind(1)}const [currentPage, setCurrentPage] = useState(0);`);
        lines.push(`${ind(1)}const [totalPages, setTotalPages] = useState(0);`);
    } else {
        lines.push(`${ind(1)}const [hasMore, setHasMore] = useState(true);`);
        lines.push(`${ind(1)}const [page, setPage] = useState(0);`);
        lines.push(`${ind(1)}const observerRef = useRef<HTMLDivElement>(null);`);
    }

    if (hasPopup) {
        lines.push(`${ind(1)}const [tablePopup, setTablePopup] = useState<{ type: 'slug' | 'path'; value: string; editId?: number } | null>(null);`);
    }
    if (hasBtnPopup) {
        lines.push(`${ind(1)}const [activePopup, setActivePopup] = useState<{ type: 'slug' | 'path'; value: string } | null>(null);`);
    }
    lines.push('');

    /* ── handleReset ── */
    lines.push(`${ind(1)}const handleReset = () => {`);
    allFields.forEach(f => {
        const n = fieldVar(f);
        if (f.type === 'checkbox' || (f.type === 'button' && f.multiSelect)) lines.push(`${ind(2)}set${cap(n)}([]);`);
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
    lines.push(`${ind(2)}fetchData(0, true);`);
    lines.push(`${ind(1)}};`);
    lines.push('');

    /* 버튼 클릭 핸들러 */
    if (hasBtns) {
        lines.push(`${ind(1)}/** 버튼 바 클릭 핸들러 */`);
        lines.push(`${ind(1)}const handleButtonClick = (action: string, popupType?: 'slug' | 'path', popupValue?: string) => {`);
        lines.push(`${ind(2)}if ((action === 'register' || action === 'custom') && popupType && popupValue) {`);
        lines.push(`${ind(3)}setActivePopup({ type: popupType, value: popupValue });`);
        lines.push(`${ind(2)}} else if (action === 'excel') {`);
        lines.push(`${ind(3)}/* TODO: 엑셀 다운로드 */`);
        lines.push(`${ind(2)}}`);
        lines.push(`${ind(1)}};`);
        lines.push('');
    }

    const BTN_CLS: Record<string, string> = {
        primary: 'bg-slate-900 text-white hover:bg-slate-800',
        secondary: 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50',
        blue: 'bg-blue-500 text-white hover:bg-blue-600',
        success: 'bg-emerald-500 text-white hover:bg-emerald-600',
        danger: 'bg-red-500 text-white hover:bg-red-600',
    };

    const pushButtonBar = () => {
        if (!hasBtns) return;
        lines.push(`${ind(3)}<div className="flex items-center justify-end gap-2">`);
        buttons.forEach(btn => {
            const cls = BTN_CLS[btn.type] || BTN_CLS.secondary;
            const handler = btn.popupSlug
                ? `handleButtonClick('${btn.action}', 'slug', '${btn.popupSlug}')`
                : btn.fileLayerSlug
                    ? `handleButtonClick('${btn.action}', 'path', '${btn.fileLayerSlug}')`
                    : `handleButtonClick('${btn.action}')`;
            lines.push(`${ind(4)}<button onClick={() => ${handler}} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${cls}">${btn.label}</button>`);
        });
        lines.push(`${ind(3)}</div>`);
    };

    /* ── fetchData ── */
    const searchParams = allFields.map(f => {
        if (f.type === 'dateRange') return `, ${fieldVar(f)}, ${varName(f.label2 || '')}`;
        return `, ${fieldVar(f)}`;
    }).join('');
    lines.push(`${ind(1)}const fetchData = async (page: number, notify = false) => {`);
    lines.push(`${ind(2)}if (!menuSlug) { if (notify) toast.error('메뉴에 slug를 설정해주세요.'); return; }`);
    lines.push(`${ind(2)}try {`);
    lines.push(`${ind(3)}const res = await api.get('/page-data/' + menuSlug, {`);
    lines.push(`${ind(4)}params: { page, size: 10${searchParams} },`);
    lines.push(`${ind(3)}});`);
    lines.push(`${ind(3)}const items = (res.data.content as { id: number; dataJson: Record<string, unknown> }[])`);
    lines.push(`${ind(4)}.map(item => ({ id: item.id, ...item.dataJson }));`);
    lines.push(`${ind(3)}setData(items);`);
    lines.push(`${ind(3)}setTotalElements(res.data.totalElements ?? items.length);`);
    if (displayMode === 'pagination') {
        lines.push(`${ind(3)}setTotalPages(res.data.totalPages ?? 1);`);
        lines.push(`${ind(3)}setCurrentPage(page);`);
    } else {
        lines.push(`${ind(3)}setHasMore(page < (res.data.totalPages - 1));`);
    }
    lines.push(`${ind(2)}} catch (err) {`);
    lines.push(`${ind(3)}console.error('데이터 조회 오류:', err);`);
    lines.push(`${ind(2)}}`);
    lines.push(`${ind(1)}};`);
    lines.push('');

    lines.push(`${ind(1)}useEffect(() => { fetchData(0); }, [menuSlug]);`);
    lines.push('');

    /* ── return JSX ── */
    lines.push(`${ind(1)}return (`);
    lines.push(`${ind(2)}<>`);
    lines.push(`${ind(2)}<div className="space-y-5">`);

    if (hasBtns && buttonPosition === 'above') {
        lines.push(`${ind(3)}{/* 버튼 바 — 검색폼 위 */}`);
        pushButtonBar();
    }

    if (allFields.length > 0) {
        lines.push(`${ind(3)}<SearchForm onSearch={handleSearch} onReset={handleReset}>`);
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
                            lines.push(`${ind(8)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <option key={d.code} value={d.code}>{d.name}</option>)}`);
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
                            lines.push(`${ind(7)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="${n}" value={d.code} checked={${n} === d.code} onChange={() => ${setter}(d.code)} className="w-4 h-4" /><span className="text-sm">{d.name}</span></label>)}`);
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
                            lines.push(`${ind(7)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" value={d.code} checked={${n}.includes(d.code)} onChange={() => ${setter}(${n}.includes(d.code) ? ${n}.filter(v => v !== d.code) : [...${n}, d.code])} className="w-4 h-4" /><span className="text-sm">{d.name}</span></label>)}`);
                        } else {
                            (f.options || []).forEach(opt => {
                                const { text, value } = parseOpt(opt);
                                lines.push(`${ind(7)}<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" value="${value}" checked={${n}.includes('${value}')} onChange={() => ${setter}(${n}.includes('${value}') ? ${n}.filter(v => v !== '${value}') : [...${n}, '${value}'])} className="w-4 h-4" /><span className="text-sm">${text}</span></label>`);
                            });
                        }
                        lines.push(`${ind(6)}</div>`);
                        break;
                    case 'button':
                        lines.push(`${ind(6)}<div className="flex items-center flex-wrap gap-1.5">`);
                        if (f.multiSelect) {
                            if (f.codeGroupCode) {
                                lines.push(`${ind(7)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => (`);
                                lines.push(`${ind(8)}<button key={d.code} type="button" onClick={() => ${setter}(prev => prev.includes(d.code) ? prev.filter(v => v !== d.code) : [...prev, d.code])} className={\`px-2.5 py-2 text-xs font-medium rounded-md border transition-all \${${n}.includes(d.code) ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}\`}>{d.name}</button>`);
                                lines.push(`${ind(7)}))}`);
                            } else {
                                (f.options || []).forEach(opt => {
                                    const { text, value } = parseOpt(opt);
                                    lines.push(`${ind(7)}<button type="button" onClick={() => ${setter}(prev => prev.includes('${value}') ? prev.filter(v => v !== '${value}') : [...prev, '${value}'])} className={\`px-2.5 py-2 text-xs font-medium rounded-md border transition-all \${${n}.includes('${value}') ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}\`}>${text}</button>`);
                                });
                            }
                        } else {
                            if (f.codeGroupCode) {
                                lines.push(`${ind(7)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => (`);
                                lines.push(`${ind(8)}<button key={d.code} type="button" onClick={() => ${setter}(d.code)} className={\`px-2.5 py-2 text-xs font-medium rounded-md border transition-all \${${n} === d.code ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}\`}>{d.name}</button>`);
                                lines.push(`${ind(7)}))}`);
                            } else {
                                (f.options || []).forEach(opt => {
                                    const { text, value } = parseOpt(opt);
                                    lines.push(`${ind(7)}<button type="button" onClick={() => ${setter}('${value}')} className={\`px-2.5 py-2 text-xs font-medium rounded-md border transition-all \${${n} === '${value}' ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}\`}>${text}</button>`);
                                });
                            }
                        }
                        lines.push(`${ind(6)}</div>`);
                        break;
                }
                lines.push(`${ind(5)}</SearchField>`);
            });
            lines.push(`${ind(4)}</SearchRow>`);
        });
        lines.push(`${ind(3)}</SearchForm>`);
    }

    if (columns.length > 0) {
        lines.push(`${ind(3)}<div className="bg-white border border-slate-200 rounded-xl overflow-hidden">`);
        lines.push(`${ind(4)}<div className="flex items-center px-4 py-2.5 border-b border-slate-100">`);
        lines.push(`${ind(5)}<p className="text-xs text-slate-500">전체 <span className="font-semibold text-slate-700">{totalElements.toLocaleString()}</span>건</p>`);
        lines.push(`${ind(4)}</div>`);
        lines.push(`${ind(4)}<div className="overflow-x-auto">`);
        lines.push(`${ind(5)}<table className="w-full text-sm">`);
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
                    if (col.codeGroupCode && col.displayAs !== 'value') {
                        lines.push(`${ind(10)}<span>{(() => { const _d = groups.find(g => g.groupCode === '${col.codeGroupCode}')?.details ?? []; const _v = String(row['${col.accessor}'] ?? ''); return _v.split(',').filter(Boolean).map(c => _d.find(d => d.code === c.trim())?.name ?? c.trim()).join(',') || _v; })()}</span>`);
                    } else {
                        lines.push(`${ind(10)}<span>{String(row['${col.accessor}'] ?? '')}</span>`);
                    }
                    break;
                case 'badge': {
                    const isRound = (col.badgeShape || 'round') === 'round';
                    const shapeClass = isRound ? 'rounded-full' : 'rounded-md font-semibold';
                    if (col.cellOptions && col.cellOptions.length > 0) {
                        const mapEntries = col.cellOptions.map(opt => {
                            const bgCls = BADGE_BG[opt.color] || BADGE_BG['slate'];
                            const dotCls = BADGE_DOT[opt.color] || BADGE_DOT['slate'];
                            return `'${opt.value}': { text: '${opt.text}', cls: '${bgCls}', dot: '${dotCls}' }`;
                        }).join(', ');
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
                    (col.actions || []).forEach(action => {
                        if (action === 'edit') {
                            const handler = col.editPopupSlug
                                ? `{ setTablePopup({ type: 'slug', value: '${col.editPopupSlug}', editId: row.id as number }); }`
                                : col.editFileLayerSlug
                                    ? `{ setTablePopup({ type: 'path', value: '${col.editFileLayerSlug}', editId: row.id as number }); }`
                                    : `{ /* TODO: 수정 처리 */ }`;
                            lines.push(`${ind(11)}<button onClick={() => ${handler}} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 transition-all" title="수정"><Pencil className="w-3.5 h-3.5" /></button>`);
                        } else if (action === 'detail') {
                            const handler = col.detailPopupSlug
                                ? `{ setTablePopup({ type: 'slug', value: '${col.detailPopupSlug}' }); }`
                                : col.detailFileLayerSlug
                                    ? `{ setTablePopup({ type: 'path', value: '${col.detailFileLayerSlug}' }); }`
                                    : `{ /* TODO: 상세 처리 */ }`;
                            lines.push(`${ind(11)}<button onClick={() => ${handler}} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 transition-all" title="상세"><Eye className="w-3.5 h-3.5" /></button>`);
                        } else if (action === 'delete') {
                            lines.push(`${ind(11)}<button onClick={async () => { if (!menuSlug) { toast.error('메뉴에 slug를 설정해주세요.'); return; } if (window.confirm('삭제하시겠습니까?')) { await api.delete('/page-data/' + menuSlug + '/' + (row.id as number)); fetchData(0); } }} className="p-1.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all" title="삭제"><Trash2 className="w-3.5 h-3.5" /></button>`);
                        }
                    });
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
        lines.push(`${ind(7)}))` + `}`);
        lines.push(`${ind(6)}</tbody>`);
        lines.push(`${ind(5)}</table>`);
        lines.push(`${ind(4)}</div>`);

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
            lines.push(`${ind(4)}{hasMore && <div ref={observerRef} className="py-4 text-center text-xs text-slate-400">불러오는 중...</div>}`);
        }
        lines.push(`${ind(3)}</div>`);
    }

    if (hasBtns && buttonPosition === 'between') {
        lines.push(`${ind(3)}{/* 버튼 바 — 검색폼 아래, 테이블 위 */}`);
        pushButtonBar();
    }

    lines.push(`${ind(2)}</div>`);

    if (hasPopup) {
        lines.push(`${ind(2)}{tablePopup?.type === 'slug' && (`);
        lines.push(`${ind(3)}<WidgetRenderer mode="live" widget={null} dataSlug={menuSlug} onPopupSaved={() => { setTablePopup(null); fetchData(0); }} externalPopupTrigger={{ slug: tablePopup.value, ts: tablePopup.ts ?? 0, editId: tablePopup.editId, listSlug: menuSlug }} />`);
        lines.push(`${ind(2)})}`);
    }
    if (hasPathPopup) {
        lines.push(`${ind(2)}{tablePopup?.type === 'path' && (() => {`);
        lines.push(`${ind(3)}const P = POPUP_MAP[tablePopup.value]; if (!P) return null;`);
        lines.push(`${ind(3)}return <P isOpen onClose={() => setTablePopup(null)} onSave={async (data) => { if (!menuSlug) { toast.error('메뉴에 slug를 설정해주세요.'); return; } if (tablePopup.editId != null) { await api.put('/page-data/' + menuSlug + '/' + tablePopup.editId, { dataJson: data }); } else { await api.post('/page-data/' + menuSlug, { dataJson: data }); } setTablePopup(null); fetchData(0); }} />;`);
        lines.push(`${ind(2)}})()}`);
    }
    if (hasBtnPopup) {
        lines.push(`${ind(2)}{activePopup?.type === 'slug' && (`);
        lines.push(`${ind(3)}<WidgetRenderer mode="live" widget={null} dataSlug={menuSlug} onPopupSaved={() => { setActivePopup(null); fetchData(0); }} externalPopupTrigger={{ slug: activePopup.value, ts: activePopup.ts ?? 0, listSlug: menuSlug }} />`);
        lines.push(`${ind(2)})}`);
    }
    if (hasBtnPathPopup) {
        lines.push(`${ind(2)}{activePopup?.type === 'path' && (() => {`);
        lines.push(`${ind(3)}const P = POPUP_MAP[activePopup.value]; if (!P) return null;`);
        lines.push(`${ind(3)}return <P isOpen onClose={() => setActivePopup(null)} onSave={async (data) => { if (!menuSlug) { toast.error('메뉴에 slug를 설정해주세요.'); return; } await api.post('/page-data/' + menuSlug, { dataJson: data }); setActivePopup(null); fetchData(0); }} />;`);
        lines.push(`${ind(2)}})()}`);
    }

    lines.push(`${ind(2)}</>`);
    lines.push(`${ind(1)});`);
    lines.push('}');

    return lines.join('\n');
};
