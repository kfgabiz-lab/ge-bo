'use client';

/**
 * ============================================================
 *  [생성된 페이지] /admin/generated/{slug}
 * ============================================================
 *  - templateType에 따라 렌더링 방식 결정
 *  - QUICK_LIST / QUICK_DETAIL / PAGE : widgetItems 구조 → widgettest와 동일 렌더링
 *  - LIST : 기존 방식 유지 (fieldRows/tableColumns 구조)
 * ============================================================
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableActionHandlers, SearchWidget } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { FormWidget } from '@/app/admin/templates/make/_shared/components/builder/FormBuilder';
import type { AnyWidget } from '@/app/admin/templates/make/_shared/components/renderer';

import api from '@/lib/api';
import { toast } from 'sonner';
import { useCodeStore } from '@/store/useCodeStore';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMenuPageSlug } from '@/hooks/useMenuPageSlug';
import { TableColumnConfig, ButtonConfig, ButtonPosition, SearchRowConfig } from '@/app/admin/templates/make/_shared/types';
import { getSpaceGridColumn } from '@/app/admin/templates/make/_shared/utils';
import PageLayout from '@/components/layout/PageLayout';

/** 메뉴 트리 재귀 탐색으로 현재 URL의 메뉴명 반환 */
function findMenuName(menus: MenuItem[], pathname: string): string | null {
    for (const item of menus) {
        if (item.url === pathname) return item.name;
        if (item.children?.length) {
            const found = findMenuName(item.children, pathname);
            if (found) return found;
        }
    }
    return null;
}

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

/** LIST 템플릿 configJson (기존 방식 유지) */
interface ListConfig {
    fieldRows: SearchRowConfig[];
    tableColumns: TableColumnConfig[];
    collapsible: boolean;
    buttons?: ButtonConfig[];
    buttonPosition?: ButtonPosition;
    displayMode?: 'pagination' | 'scroll';
    pageSize?: number;
}

/** widgetItems 구조 (QUICK_LIST / QUICK_DETAIL / PAGE 공통) */
interface PageContentItem {
    id: string;
    colSpan: number;
    rowSpan: number;
    widget: AnyWidget;
}

interface PageWidgetItem {
    id: string;
    colSpan: number;
    rowSpan: number;
    contents: PageContentItem[];
}

/** 테이블 위젯별 데이터 상태 */
interface TableData {
    rows: Record<string, unknown>[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    loading: boolean;
    appendLoading: boolean;
    hasMore: boolean;
    nextPage: number;
}

/** 구버전 QUICK_LIST configJson → widgetItems 변환 */
function convertLegacyQuickList(cfg: Record<string, unknown>): PageWidgetItem[] {
    const s = cfg.searchContent as PageContentItem;
    const p = cfg.spaceContent  as PageContentItem;
    const t = cfg.tableContent  as PageContentItem;
    return [
        { id: 'wi-search', colSpan: 12, rowSpan: s?.rowSpan ?? 2, contents: s ? [s] : [] },
        { id: 'wi-space',  colSpan: 12, rowSpan: p?.rowSpan ?? 1, contents: p ? [p] : [] },
        { id: 'wi-table',  colSpan: 12, rowSpan: t?.rowSpan ?? 5, contents: t ? [t] : [] },
    ];
}

/** 구버전 QUICK_DETAIL configJson → widgetItems 변환 */
function convertLegacyQuickDetail(cfg: Record<string, unknown>): PageWidgetItem[] {
    const f = cfg.formContent  as PageContentItem;
    const s = cfg.spaceContent as PageContentItem;
    return [
        { id: 'wi-form',  colSpan: 12, rowSpan: f?.rowSpan ?? 3, contents: f ? [f] : [] },
        { id: 'wi-space', colSpan: 12, rowSpan: s?.rowSpan ?? 1, contents: s ? [s] : [] },
    ];
}

/* ══════════════════════════════════════════ */
/*  공통 스타일                                */
/* ══════════════════════════════════════════ */

const BTN_TYPE_CLS: Record<string, string> = {
    primary:   'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50',
    blue:      'bg-blue-500 text-white hover:bg-blue-600',
    success:   'bg-emerald-500 text-white hover:bg-emerald-600',
    danger:    'bg-red-500 text-white hover:bg-red-600',
};

const DEFAULT_PAGE_SIZE = 10;

/* ══════════════════════════════════════════ */
/*  메인 페이지                                */
/* ══════════════════════════════════════════ */

export default function GeneratedPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const pathname     = usePathname();
    const router       = useRouter();
    const searchParams = useSearchParams();
    const navMenus     = useMenuStore((state) => state.navMenus);
    const menuName     = findMenuName(navMenus, pathname || '');
    const dataSlug     = useMenuPageSlug(slug);
    const { groups: codeGroups, fetchGroups } = useCodeStore();

    /* ── 템플릿 상태 ── */
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState<string | null>(null);
    const [templateName,  setTemplateName]  = useState('');
    const [templateType,  setTemplateType]  = useState<string>('LIST');

    /* widgetItems 방식 (QUICK_LIST / QUICK_DETAIL / PAGE) */
    const [widgetItems,   setWidgetItems]   = useState<PageWidgetItem[]>([]);

    /* LIST 방식 */
    const [config,        setConfig]        = useState<ListConfig | null>(null);

    /* ── 검색 필드값 ── */
    const [searchValues,  setSearchValues]  = useState<Record<string, string>>({});
    const searchValuesRef = useRef<Record<string, string>>({});

    /* ── 테이블별 데이터 상태 (widgetItems 방식) ── */
    const [tableDataMap,  setTableDataMap]  = useState<Record<string, TableData>>({});
    const tableDataMapRef = useRef<Record<string, TableData>>({});

    /* ── 테이블별 정렬 ── */
    const [sortKeyMap, setSortKeyMap] = useState<Record<string, string | null>>({});
    const [sortDirMap, setSortDirMap] = useState<Record<string, 'asc' | 'desc'>>({});

    /* ── Form 위젯별 입력값 ── */
    const [formValuesMap, setFormValuesMap] = useState<Record<string, Record<string, string>>>({});

    /* ── LIST 방식 전용 상태 ── */
    const [tableData,     setTableData]     = useState<Record<string, unknown>[]>([]);
    const [dataLoading,   setDataLoading]   = useState(false);
    const [appendLoading, setAppendLoading] = useState(false);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages,    setTotalPages]    = useState(0);
    const [currentPage,   setCurrentPage]   = useState(0);
    const [hasMore,       setHasMore]       = useState(true);
    const hasMoreRef    = useRef(true);
    const isLoadingRef  = useRef(false);
    const nextPageRef   = useRef(0);
    const configRef     = useRef<ListConfig | null>(null);
    const fetchSlugRef  = useRef<string>('');
    const [sortKey,     setSortKey]     = useState<string | null>(null);
    const [sortDir,     setSortDir]     = useState<'asc' | 'desc'>('asc');
    const [btnPopupTrigger, setBtnPopupTrigger] = useState<{ slug: string; ts: number } | null>(null);

    /**
     * widgetItems에서 모든 위젯 평탄화
     */
    const flatWidgets = (items: PageWidgetItem[]): AnyWidget[] =>
        items.flatMap(item => item.contents.map(c => c.widget));

    /**
     * Search 위젯 widgetId → 해당 위젯의 SearchField 목록
     */
    const buildSearchFieldsMap = useCallback((items: PageWidgetItem[]) => {
        const map: Record<string, import('@/app/admin/templates/make/_shared/types').SearchFieldConfig[]> = {};
        flatWidgets(items).forEach(w => {
            if (w.type === 'search') {
                map[w.widgetId] = w.rows.flatMap((r: import('@/app/admin/templates/make/_shared/types').SearchRowConfig) => r.fields);
            }
        });
        return map;
    }, []);

    /**
     * 테이블 위젯 데이터 fetch (widgetItems 방식)
     */
    const fetchTableData = useCallback(async ({
        tableWidget, connectedSlug, searchFields, sv,
        page = 0, sk, sd = 'asc', append = false,
    }: {
        tableWidget: TableWidget;
        connectedSlug: string;
        searchFields: import('@/app/admin/templates/make/_shared/types').SearchFieldConfig[];
        sv: Record<string, string>;
        page?: number;
        sk?: string | null;
        sd?: 'asc' | 'desc';
        append?: boolean;
    }) => {
        const wid = tableWidget.widgetId;
        const defaultData: TableData = { rows: [], totalElements: 0, totalPages: 0, currentPage: 0, loading: false, appendLoading: false, hasMore: true, nextPage: 0 };

        setTableDataMap(prev => ({
            ...prev,
            [wid]: append
                ? { ...(prev[wid] ?? defaultData), appendLoading: true }
                : { ...(prev[wid] ?? defaultData), loading: true },
        }));

        try {
            const pageSize = tableWidget.pageSize || DEFAULT_PAGE_SIZE;
            const reqParams: Record<string, string> = { page: String(page), size: String(pageSize) };
            if (sk) reqParams.sort = `${sk},${sd}`;
            searchFields.forEach(f => {
                const paramKey = f.fieldKey || f.label;
                const val = sv[f.id];
                if (paramKey && val && val.trim()) reqParams[paramKey] = val;
            });

            const res = await api.get(`/page-data/${connectedSlug}`, { params: reqParams });
            const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[])
                .map(item => ({ _id: item.id, ...item.dataJson }));
            const hasMore = res.data.last === false;

            setTableDataMap(prev => ({
                ...prev,
                [wid]: {
                    rows: append ? [...(prev[wid]?.rows ?? []), ...rows] : rows,
                    totalElements: res.data.totalElements,
                    totalPages: res.data.totalPages,
                    currentPage: page,
                    loading: false,
                    appendLoading: false,
                    hasMore,
                    nextPage: hasMore ? page + 1 : page,
                },
            }));
        } catch {
            toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
            setTableDataMap(prev => ({
                ...prev,
                [wid]: { ...(prev[wid] ?? defaultData), loading: false, appendLoading: false },
            }));
        }
    }, []);

    /**
     * LIST 방식 데이터 fetch
     */
    const fetchData = useCallback(async (
        page: number, sv?: Record<string, string>, cfg?: ListConfig | null,
        append = false, sk?: string | null, sd?: 'asc' | 'desc',
    ) => {
        const resolvedSv  = sv  ?? searchValuesRef.current;
        const resolvedCfg = cfg !== undefined ? cfg : configRef.current;
        const resolvedSk  = sk !== undefined ? sk : sortKey;
        const resolvedSd  = sd ?? sortDir;

        if (isLoadingRef.current) return;
        isLoadingRef.current = true;
        if (append) setAppendLoading(true);
        else setDataLoading(true);
        try {
            const size = resolvedCfg?.pageSize ?? DEFAULT_PAGE_SIZE;
            const reqParams: Record<string, string> = { page: String(page), size: String(size) };
            if (resolvedSk) reqParams.sort = `${resolvedSk},${resolvedSd}`;
            if (resolvedCfg) {
                resolvedCfg.fieldRows.flatMap(r => r.fields).forEach(f => {
                    const paramKey = f.fieldKey || f.accessor || f.label;
                    const val = resolvedSv[f.id];
                    if (paramKey && val && val.trim()) reqParams[paramKey] = val;
                });
            }
            const targetSlug = fetchSlugRef.current || dataSlug;
            const res = await api.get(`/page-data/${targetSlug}`, { params: reqParams });
            const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[])
                .map(item => ({ _id: item.id, ...item.dataJson }));
            setTableData(prev => append ? [...prev, ...rows] : rows);
            setTotalElements(res.data.totalElements);
            setTotalPages(res.data.totalPages);
            const more = !res.data.last && rows.length > 0;
            setCurrentPage(page);
            setHasMore(more);
            hasMoreRef.current = more;
            nextPageRef.current = more ? page + 1 : page;
            configRef.current = resolvedCfg;
            searchValuesRef.current = resolvedSv;
        } catch {
            toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            isLoadingRef.current = false;
            if (append) setAppendLoading(false);
            else setDataLoading(false);
        }
    }, [dataSlug, sortKey, sortDir]);

    /* ── 템플릿 로딩 ── */
    useEffect(() => {
        fetchGroups();
        api.get(`/page-templates/by-slug/${slug}`)
            .then(res => {
                setTemplateName(res.data.name);
                const tt: string = res.data.templateType || 'LIST';
                setTemplateType(tt);
                const raw = JSON.parse(res.data.configJson) as Record<string, unknown>;

                if (tt === 'QUICK_LIST' || tt === 'QUICK_DETAIL' || tt === 'PAGE') {
                    /* widgetItems 구조 또는 구버전 자동 변환 */
                    let items: PageWidgetItem[] = [];
                    if (raw.widgetItems) {
                        items = raw.widgetItems as PageWidgetItem[];
                    } else if (tt === 'QUICK_LIST') {
                        items = convertLegacyQuickList(raw);
                    } else if (tt === 'QUICK_DETAIL') {
                        items = convertLegacyQuickDetail(raw);
                    }
                    setWidgetItems(items);

                    /* Table 위젯 초기 데이터 fetch */
                    const fieldsMap = buildSearchFieldsMap(items);
                    flatWidgets(items).forEach(w => {
                        if (w.type !== 'table') return;
                        const tw = w as TableWidget;
                        if (!tw.connectedSlug) return;
                        const searchFields = tw.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
                        fetchTableData({ tableWidget: tw, connectedSlug: tw.connectedSlug, searchFields, sv: {} });
                    });

                    /* QUICK_DETAIL: URL ?id=xxx 로 기존 데이터 로드 */
                    if (tt === 'QUICK_DETAIL') {
                        const queryId = searchParams.get('id');
                        if (queryId) {
                            const formWidget = flatWidgets(items).find(w => w.type === 'form') as FormWidget | undefined;
                            if (formWidget?.connectedSlug) {
                                const numId = Number(queryId);
                                api.get(`/page-data/${formWidget.connectedSlug}/${numId}`)
                                    .then(dataRes => {
                                        const dataJson = dataRes.data.dataJson || {};
                                        const vals: Record<string, string> = {};
                                        formWidget.fields.forEach(f => {
                                            if (f.fieldKey && dataJson[f.fieldKey] !== undefined) {
                                                vals[f.id] = String(dataJson[f.fieldKey] ?? '');
                                            }
                                        });
                                        setFormValuesMap(prev => ({ ...prev, [formWidget.widgetId]: vals }));
                                    })
                                    .catch(() => toast.error('기존 데이터를 불러오는 중 오류가 발생했습니다.'));
                            }
                        }
                    }

                } else {
                    /* LIST 기존 방식 */
                    fetchSlugRef.current = dataSlug;
                    const cfg = raw as unknown as ListConfig;
                    setConfig(cfg);
                    configRef.current = cfg;
                    searchValuesRef.current = {};
                    fetchData(0, {}, cfg);
                }
            })
            .catch(() => setError('페이지를 불러오는 중 오류가 발생했습니다.'))
            .finally(() => setLoading(false));
    }, [slug, fetchGroups]); // eslint-disable-line react-hooks/exhaustive-deps

    /* tableDataMap ref 동기화 */
    useEffect(() => { tableDataMapRef.current = tableDataMap; }, [tableDataMap]);

    /* ── widgetItems 방식 핸들러 ── */

    const updateSearchValue = useCallback((id: string, val: string) => {
        setSearchValues(prev => {
            const next = { ...prev, [id]: val };
            searchValuesRef.current = next;
            return next;
        });
    }, []);

    /** Search 위젯과 연결된 Table 위젯 데이터 재fetch */
    const handleSearch = useCallback((searchWidgetId: string) => {
        const fieldsMap = buildSearchFieldsMap(widgetItems);
        const sv = searchValuesRef.current;
        flatWidgets(widgetItems).forEach(w => {
            if (w.type !== 'table') return;
            const tw = w as TableWidget;
            if (!tw.connectedSearchIds.includes(searchWidgetId)) return;
            if (!tw.connectedSlug) return;
            const searchFields = tw.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
            fetchTableData({ tableWidget: tw, connectedSlug: tw.connectedSlug, searchFields, sv, page: 0, sk: sortKeyMap[tw.widgetId], sd: sortDirMap[tw.widgetId] ?? 'asc' });
        });
    }, [widgetItems, sortKeyMap, sortDirMap, fetchTableData, buildSearchFieldsMap]); // eslint-disable-line react-hooks/exhaustive-deps

    /** 검색 초기화 */
    const handleReset = useCallback((searchWidgetId: string) => {
        setSearchValues({});
        searchValuesRef.current = {};
        const fieldsMap = buildSearchFieldsMap(widgetItems);
        flatWidgets(widgetItems).forEach(w => {
            if (w.type !== 'table') return;
            const tw = w as TableWidget;
            if (!tw.connectedSearchIds.includes(searchWidgetId)) return;
            if (!tw.connectedSlug) return;
            const searchFields = tw.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
            fetchTableData({ tableWidget: tw, connectedSlug: tw.connectedSlug, searchFields, sv: {}, page: 0 });
        });
    }, [widgetItems, fetchTableData, buildSearchFieldsMap]); // eslint-disable-line react-hooks/exhaustive-deps

    /** 페이지 이동 */
    const handlePageChange = useCallback((tableWidgetId: string, page: number) => {
        const fieldsMap = buildSearchFieldsMap(widgetItems);
        const sv = searchValuesRef.current;
        const tw = flatWidgets(widgetItems).find(w => w.type === 'table' && (w as TableWidget).widgetId === tableWidgetId) as TableWidget | undefined;
        if (!tw?.connectedSlug) return;
        const searchFields = tw.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
        fetchTableData({ tableWidget: tw, connectedSlug: tw.connectedSlug, searchFields, sv, page, sk: sortKeyMap[tableWidgetId], sd: sortDirMap[tableWidgetId] ?? 'asc' });
    }, [widgetItems, sortKeyMap, sortDirMap, fetchTableData, buildSearchFieldsMap]); // eslint-disable-line react-hooks/exhaustive-deps

    /** 정렬 변경 */
    const handleSortChange = useCallback((tableWidgetId: string, accessor: string, dir: 'asc' | 'desc') => {
        setSortKeyMap(prev => ({ ...prev, [tableWidgetId]: accessor }));
        setSortDirMap(prev => ({ ...prev, [tableWidgetId]: dir }));
        const fieldsMap = buildSearchFieldsMap(widgetItems);
        const sv = searchValuesRef.current;
        const tw = flatWidgets(widgetItems).find(w => w.type === 'table' && (w as TableWidget).widgetId === tableWidgetId) as TableWidget | undefined;
        if (!tw?.connectedSlug) return;
        const searchFields = tw.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
        fetchTableData({ tableWidget: tw, connectedSlug: tw.connectedSlug, searchFields, sv, page: 0, sk: accessor, sd: dir });
    }, [widgetItems, fetchTableData, buildSearchFieldsMap]); // eslint-disable-line react-hooks/exhaustive-deps

    /** Form 필드값 변경 */
    const updateFormValue = useCallback((widgetId: string, fieldId: string, value: string) => {
        setFormValuesMap(prev => ({
            ...prev,
            [widgetId]: { ...(prev[widgetId] ?? {}), [fieldId]: value },
        }));
    }, []);

    /** Form 저장/삭제 */
    const handleFormAction = useCallback(async (connectedFormWidgetId: string, action: 'save' | 'delete') => {
        const formWidget = flatWidgets(widgetItems).find(
            w => w.type === 'form' && (w as FormWidget).widgetId === connectedFormWidgetId
        ) as FormWidget | undefined;
        if (!formWidget?.connectedSlug) {
            toast.error('연결된 Form 위젯 또는 slug를 찾을 수 없습니다.');
            return;
        }

        const rawValues = formValuesMap[connectedFormWidgetId] ?? {};
        const dataJson: Record<string, string> = {};
        const pkKeys: string[] = [];
        formWidget.fields.forEach(f => {
            const key = f.fieldKey || f.label;
            if (key) {
                dataJson[key] = rawValues[f.id] ?? '';
                if (f.isPk) pkKeys.push(key);
            }
        });

        /* QUICK_DETAIL 단일 폼: formId 기반 PUT/DELETE 지원 */
        const formIdKey = `formId_${connectedFormWidgetId}`;
        const storedId = Number(sessionStorage.getItem(formIdKey)) || null;

        try {
            if (action === 'save') {
                if (storedId) {
                    await api.put(`/page-data/${formWidget.connectedSlug}/${storedId}`, { dataJson });
                    toast.success('수정되었습니다.');
                } else {
                    const res = await api.post(`/page-data/${formWidget.connectedSlug}`, {
                        dataJson,
                        ...(pkKeys.length > 0 && { pkKeys }),
                    });
                    sessionStorage.setItem(formIdKey, String(res.data.id));
                    toast.success('저장되었습니다.');
                }
            } else {
                if (!storedId) { toast.info('삭제할 데이터가 없습니다.'); return; }
                if (!confirm('삭제하시겠습니까?')) return;
                await api.delete(`/page-data/${formWidget.connectedSlug}/${storedId}`);
                sessionStorage.removeItem(formIdKey);
                toast.success('삭제되었습니다.');
                router.back();
            }
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (action === 'save' && status === 409) {
                toast.error('이미 동일한 키 값의 데이터가 존재합니다.');
            } else {
                toast.error(action === 'save' ? '저장 중 오류가 발생했습니다.' : '삭제 중 오류가 발생했습니다.');
            }
        }
    }, [widgetItems, formValuesMap, router]); // eslint-disable-line react-hooks/exhaustive-deps

    /** 무한스크롤 추가 로드 */
    const handleLoadMore = useCallback((tableWidgetId: string) => {
        const td = tableDataMapRef.current[tableWidgetId];
        if (!td || !td.hasMore || td.loading || td.appendLoading) return;
        const fieldsMap = buildSearchFieldsMap(widgetItems);
        const tw = flatWidgets(widgetItems).find(w => w.type === 'table' && (w as TableWidget).widgetId === tableWidgetId) as TableWidget | undefined;
        if (!tw?.connectedSlug) return;
        const searchFields = tw.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
        fetchTableData({
            tableWidget: tw, connectedSlug: tw.connectedSlug, searchFields,
            sv: searchValuesRef.current, page: td.nextPage,
            sk: sortKeyMap[tableWidgetId], sd: sortDirMap[tableWidgetId] ?? 'asc', append: true,
        });
    }, [widgetItems, sortKeyMap, sortDirMap, fetchTableData, buildSearchFieldsMap]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── LIST 방식 핸들러 ── */

    const handleListLoadMore = useCallback(() => {
        if (!hasMoreRef.current || isLoadingRef.current) return;
        fetchData(nextPageRef.current, searchValuesRef.current, configRef.current, true);
    }, [fetchData]);

    const updateValue = (id: string, val: string) =>
        setSearchValues(prev => ({ ...prev, [id]: val }));

    const resetValues = () => {
        setSearchValues({});
        searchValuesRef.current = {};
        if (config?.displayMode === 'scroll') {
            setTableData([]);
            setHasMore(true);
            hasMoreRef.current = true;
            nextPageRef.current = 0;
        }
        fetchData(0, {});
    };

    const handleListSearch = () => {
        searchValuesRef.current = searchValues;
        if (config?.displayMode === 'scroll') {
            setTableData([]);
            setHasMore(true);
            hasMoreRef.current = true;
            nextPageRef.current = 0;
        }
        fetchData(0, searchValues);
    };

    const handleButtonClick = (btn: ButtonConfig) => {
        if (btn.action === 'register' || btn.action === 'custom') {
            if (btn.popupSlug) {
                setBtnPopupTrigger({ slug: btn.popupSlug, ts: Date.now() });
            } else if (btn.action === 'register') {
                toast.info('등록 페이지 연동이 설정되지 않았습니다.');
            }
        } else if (btn.action === 'excel') {
            handleExcelDownload(btn.excelFormat ?? 'xlsx');
        }
    };

    const handleExcelDownload = async (format: string) => {
        const cols = config?.tableColumns.filter(c => c.cellType !== 'actions' && c.accessor) ?? [];
        const headers = encodeURIComponent(cols.map(c => c.header).join(','));
        const keys    = encodeURIComponent(cols.map(c => c.accessor).join(','));
        const params  = new URLSearchParams({ format, headers, keys });
        Object.entries(searchValuesRef.current).forEach(([k, v]) => { if (v) params.set(k, v); });
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002/api/v1';
            const targetSlug = fetchSlugRef.current || dataSlug;
            const res = await fetch(`${apiBase}/page-data/${targetSlug}/export?${params.toString()}`, { credentials: 'include' });
            if (!res.ok) throw new Error('다운로드 실패');
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            const disposition = res.headers.get('Content-Disposition') ?? '';
            const match = disposition.match(/filename\*?=(?:UTF-8'')?(.+)/i);
            a.download = match ? decodeURIComponent(match[1].replace(/"/g, '')) : `export.${format}`;
            a.href = url; a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('엑셀 다운로드 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteClick = async (id: number) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            const targetSlug = fetchSlugRef.current || dataSlug;
            await api.delete(`/page-data/${targetSlug}/${id}`);
            toast.success('삭제되었습니다.');
            fetchData(currentPage);
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    const tableHandlers: TableActionHandlers = {
        onDelete: (id) => handleDeleteClick(id),
    };

    /** LIST 방식: config.fieldRows → SearchWidget 변환 */
    const searchWidget = useMemo<SearchWidget | null>(() => {
        if (!config || config.fieldRows.length === 0) return null;
        return {
            type: 'search',
            widgetId: 'main-search',
            contentKey: 'search',
            connectedSlug: fetchSlugRef.current || dataSlug,
            rows: config.fieldRows,
        };
    }, [config, dataSlug]);

    /** LIST 방식: config.tableColumns → TableWidget 변환 */
    const tableWidget = useMemo<TableWidget | null>(() => {
        if (!config || config.tableColumns.length === 0) return null;
        return {
            type: 'table',
            widgetId: 'main-table',
            contentKey: 'table',
            columns: config.tableColumns,
            connectedSearchIds: config.fieldRows.length > 0 ? ['main-search'] : [],
            pageSize: config.pageSize ?? DEFAULT_PAGE_SIZE,
            displayMode: config.displayMode ?? 'pagination',
        };
    }, [config]);

    /* ── 로딩 ── */
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">페이지 로딩 중...</span>
            </div>
        );
    }

    /* ── 오류 ── */
    if (error) {
        return (
            <div className="flex items-center justify-center h-64 gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
            </div>
        );
    }

    /* ══════════════════════════════════════════ */
    /*  QUICK_LIST / QUICK_DETAIL / PAGE 렌더링   */
    /*  — widgettest와 완전히 동일한 방식          */
    /* ══════════════════════════════════════════ */
    if (templateType === 'QUICK_LIST' || templateType === 'QUICK_DETAIL' || templateType === 'PAGE') {
        return (
            <PageLayout title={menuName || templateName} mode="live">
                {widgetItems.map(item => (
                    <div
                        key={item.id}
                        className={`col-span-${item.colSpan}`}
                        style={{ gridColumn: `span ${item.colSpan}`, gridRow: `span ${item.rowSpan}` }}
                    >
                        {/* inner sub-grid — widgettest와 동일한 80px 고정 행 */}
                        <div
                            className="h-full w-full"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${item.colSpan}, 1fr)`,
                                gridAutoRows: '80px',
                                gridAutoFlow: 'row dense',
                                gap: '8px',
                            }}
                        >
                            {item.contents.map(c => {
                                const wid = (c.widget as { widgetId?: string }).widgetId ?? '';
                                const td = tableDataMap[wid];
                                return (
                                    <div
                                        key={c.id}
                                        style={{
                                            /* space 위젯: align 기반 그리드 열 위치 계산 (정렬 보장) */
                                            gridColumn: c.widget.type === 'space'
                                                ? getSpaceGridColumn(c.widget.align, Math.min(c.colSpan, item.colSpan), item.colSpan)
                                                : `span ${Math.min(c.colSpan, item.colSpan)}`,
                                            gridRow: `span ${c.rowSpan}`,
                                        }}
                                    >
                                        <WidgetRenderer
                                            mode="live"
                                            widget={c.widget}
                                            contentColSpan={c.colSpan}
                                            /* 검색 */
                                            searchValues={searchValues}
                                            onSearchChange={updateSearchValue}
                                            onSearch={() => handleSearch(wid)}
                                            onReset={() => handleReset(wid)}
                                            codeGroups={codeGroups}
                                            /* 폼 */
                                            formValues={formValuesMap[wid] ?? {}}
                                            onFormValuesChange={(fieldId, value) => updateFormValue(wid, fieldId, value)}
                                            onFormAction={handleFormAction}
                                            /* 테이블 */
                                            tableData={td?.rows}
                                            tableLoading={td?.loading}
                                            sortKey={sortKeyMap[wid] ?? null}
                                            sortDir={sortDirMap[wid] ?? 'asc'}
                                            onSort={(accessor, dir) => handleSortChange(wid, accessor, dir)}
                                            totalElements={td?.totalElements}
                                            totalPages={td?.totalPages}
                                            currentPage={td?.currentPage}
                                            onPageChange={(page) => handlePageChange(wid, page)}
                                            onLoadMore={() => handleLoadMore(wid)}
                                            appendLoading={td?.appendLoading}
                                            hasMore={td?.hasMore ?? true}
                                            /* space — 팝업 저장 후 테이블 새로고침 */
                                            dataSlug={(() => {
                                                const tw = flatWidgets(widgetItems).find(w => w.type === 'table') as TableWidget | undefined;
                                                return tw?.connectedSlug ?? dataSlug;
                                            })()}
                                            onPopupSaved={() => {
                                                const tw = flatWidgets(widgetItems).find(w => w.type === 'table') as TableWidget | undefined;
                                                if (tw) {
                                                    const fieldsMap = buildSearchFieldsMap(widgetItems);
                                                    const searchFields = tw.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
                                                    fetchTableData({ tableWidget: tw, connectedSlug: tw.connectedSlug ?? '', searchFields, sv: searchValuesRef.current, page: td?.currentPage ?? 0 });
                                                }
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </PageLayout>
        );
    }

    /* ══════════════════════════════════════════ */
    /*  LIST 렌더링 (기존 방식 유지)               */
    /* ══════════════════════════════════════════ */
    if (!config) {
        return (
            <div className="flex items-center justify-center h-64 gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">설정을 불러올 수 없습니다.</span>
            </div>
        );
    }

    const buttons        = config.buttons ?? [];
    const buttonPosition = config.buttonPosition ?? 'between';
    const ButtonBar = () => buttons.length === 0 ? null : (
        <div className="flex items-center justify-end gap-2">
            {buttons.map(btn => (
                <button
                    key={btn.id}
                    onClick={() => handleButtonClick(btn)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${BTN_TYPE_CLS[btn.type] || BTN_TYPE_CLS.secondary}`}
                >
                    {btn.label}
                </button>
            ))}
        </div>
    );

    return (
        <>
            <PageLayout title={menuName || templateName} mode="live">
                {buttonPosition === 'above' && (
                    <div style={{ gridColumn: 'span 12' }}><ButtonBar /></div>
                )}
                {searchWidget && (
                    <div style={{ gridColumn: 'span 12' }}>
                        <WidgetRenderer
                            mode="live"
                            widget={searchWidget}
                            collapsible={config.collapsible}
                            searchValues={searchValues}
                            onSearchChange={updateValue}
                            onSearch={handleListSearch}
                            onReset={resetValues}
                            codeGroups={codeGroups}
                        />
                    </div>
                )}
                {buttonPosition === 'between' && (
                    <div style={{ gridColumn: 'span 12' }}><ButtonBar /></div>
                )}
                {tableWidget && (
                    <div style={{ gridColumn: 'span 12' }}>
                        <WidgetRenderer
                            mode="live"
                            widget={tableWidget}
                            codeGroups={codeGroups}
                            handlers={tableHandlers}
                            dataSlug={dataSlug}
                            onPopupSaved={() => fetchData(currentPage)}
                            tableData={tableData}
                            tableLoading={dataLoading}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={(accessor: string, dir: 'asc' | 'desc') => {
                                setSortKey(accessor);
                                setSortDir(dir);
                                fetchData(0, undefined, undefined, false, accessor, dir);
                            }}
                            totalElements={totalElements}
                            totalPages={totalPages}
                            currentPage={currentPage}
                            onPageChange={(page: number) => fetchData(page)}
                            onLoadMore={handleListLoadMore}
                            appendLoading={appendLoading}
                            hasMore={hasMore}
                        />
                    </div>
                )}
            </PageLayout>

            {/* 버튼바 팝업 트리거 */}
            <WidgetRenderer
                mode="live"
                widget={null}
                dataSlug={dataSlug}
                onPopupSaved={() => fetchData(currentPage)}
                externalPopupTrigger={btnPopupTrigger}
            />
        </>
    );
}
