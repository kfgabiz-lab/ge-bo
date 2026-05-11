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
import { WidgetRenderer, PageGridRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableActionHandlers, SearchWidget, PageContentItem, PageWidgetItem, PageTableData } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { FormWidget } from '@/app/admin/templates/make/_shared/components/builder/FormBuilder';
import type { SubListWidget } from '@/app/admin/templates/make/_shared/components/renderer/types';
import type { SubListRow } from '@/app/admin/templates/make/_shared/components/renderer/SubListRenderer';
import type { AnyWidget } from '@/app/admin/templates/make/_shared/components/renderer';

import api from '@/lib/api';
import { toast } from 'sonner';
import { useCodeStore } from '@/store/useCodeStore';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMenuPageSlug } from '@/hooks/useMenuPageSlug';
import { TableColumnConfig, ButtonConfig, ButtonPosition, SearchRowConfig } from '@/app/admin/templates/make/_shared/types';
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

/** 메뉴 트리 재귀 탐색으로 현재 URL의 메뉴 설명 반환 */
function findMenuDescription(menus: MenuItem[], pathname: string): string | null {
    for (const item of menus) {
        if (item.url === pathname) return item.description ?? null;
        if (item.children?.length) {
            const found = findMenuDescription(item.children, pathname);
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


/** 구버전 QUICK_LIST configJson → widgetItems 변환 (미리보기와 동일한 1개 outer item 구조) */
function convertLegacyQuickList(cfg: Record<string, unknown>): PageWidgetItem[] {
    const s = cfg.searchContent as PageContentItem;
    const p = cfg.spaceContent  as PageContentItem;
    const t = cfg.tableContent  as PageContentItem;
    const contents = [s, p, t].filter(Boolean) as PageContentItem[];
    return [{
        id: 'wi-all',
        colSpan: 12,
        rowSpan: (s?.rowSpan ?? 2) + (p?.rowSpan ?? 1) + (t?.rowSpan ?? 5),
        contents,
    }];
}

/** 구버전 QUICK_DETAIL configJson → widgetItems 변환 (미리보기와 동일한 1개 outer item 구조) */
function convertLegacyQuickDetail(cfg: Record<string, unknown>): PageWidgetItem[] {
    const f = cfg.formContent  as PageContentItem;
    const s = cfg.spaceContent as PageContentItem;
    const contents = [f, s].filter(Boolean) as PageContentItem[];
    return [{
        id: 'wi-all',
        colSpan: 12,
        rowSpan: (f?.rowSpan ?? 3) + (s?.rowSpan ?? 1),
        contents,
    }];
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
    const menuName        = findMenuName(navMenus, pathname || '');
    const menuDescription = findMenuDescription(navMenus, pathname || '');
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
    const [tableDataMap,  setPageTableDataMap]  = useState<Record<string, PageTableData>>({});
    const tableDataMapRef = useRef<Record<string, PageTableData>>({});

    /* ── 테이블별 정렬 ── */
    const [sortKeyMap, setSortKeyMap] = useState<Record<string, string | null>>({});
    const [sortDirMap, setSortDirMap] = useState<Record<string, 'asc' | 'desc'>>({});

    /* ── Form 위젯별 입력값 ── */
    const [formValuesMap, setFormValuesMap] = useState<Record<string, Record<string, string>>>({});

    /* ── SubList 위젯별 행 데이터 (widgetId → rows) ── */
    const [subListRowsMap, setSubListRowsMap] = useState<Record<string, SubListRow[]>>({});
    /** SubList 파일 — widgetId → rowId → colId → 새로 선택한 파일 목록 */
    const [subListFileMap, setSubListFileMap] = useState<Record<string, Record<string, Record<string, File[]>>>>({});

    /* ── 파일 업로드 상태 ── */
    /** widgetId → fieldId → 새로 선택한 파일 목록 */
    const [fileValuesMap, setFileValuesMap] = useState<Record<string, Record<string, File[]>>>({});
    /** widgetId → fieldId → 기존 파일 메타 (수정 모드) */
    const [existingFileMetaMap, setExistingFileMetaMap] = useState<Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>>({});
    /** fileId → blob URL 캐시 (이미지 필드 미리보기용) */
    const [imgBlobUrls, setImgBlobUrls] = useState<Record<number, string>>({});

    /* ── LIST 방식 전용 상태 ── */
    const [tableData,     setPageTableData]     = useState<Record<string, unknown>[]>([]);
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
        const defaultData: PageTableData = { rows: [], totalElements: 0, totalPages: 0, currentPage: 0, loading: false, appendLoading: false, hasMore: true, nextPage: 0 };

        setPageTableDataMap(prev => ({
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
            /* contentKey 기반 구조: dataJson 내 값이 object면 flat-map으로 펼쳐 테이블 row 구성 */
            const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[])
                .map(item => {
                    const flat: Record<string, unknown> = { _id: item.id };
                    Object.entries(item.dataJson ?? {}).forEach(([k, v]) => {
                        if (k === 'id') return; /* id는 _id로 이미 처리 */
                        if (v && typeof v === 'object' && !Array.isArray(v)) {
                            Object.assign(flat, v); /* contentKey wrapper 펼치기 */
                        } else {
                            flat[k] = v;
                        }
                    });
                    return flat;
                });
            const hasMore = res.data.last === false;

            setPageTableDataMap(prev => ({
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
            setPageTableDataMap(prev => ({
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
                (resolvedCfg.fieldRows ?? []).flatMap(r => r.fields).forEach(f => {
                    const paramKey = f.fieldKey || f.accessor || f.label;
                    const val = resolvedSv[f.id];
                    if (paramKey && val && val.trim()) reqParams[paramKey] = val;
                });
            }
            const targetSlug = fetchSlugRef.current || dataSlug;
            const res = await api.get(`/page-data/${targetSlug}`, { params: reqParams });
            const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[])
                .map(item => ({ _id: item.id, ...item.dataJson }));
            setPageTableData(prev => append ? [...prev, ...rows] : rows);
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
                            /* connectedSlug가 있는 첫 번째 Form 위젯으로 slug 결정 */
                            const formWidget = flatWidgets(items).find(w => w.type === 'form') as FormWidget | undefined;
                            const connectedSlug = formWidget?.connectedSlug;
                            if (connectedSlug) {
                                const numId = Number(queryId);

                                /* page_data 단건 로드 — dataJson 안에 contentKey별로 데이터 존재 */
                                api.get(`/page-data/${connectedSlug}/${numId}`)
                                    .then(async dataRes => {
                                        const dataJson: Record<string, unknown> = dataRes.data.dataJson || {};

                                        /* 모든 Form 위젯에 값 복원 */
                                        const allWidgets = flatWidgets(items);
                                        const formWidgets = allWidgets.filter(w => w.type === 'form') as FormWidget[];
                                        formWidgets.forEach(fw => {
                                            const section = (fw.contentKey && dataJson[fw.contentKey]) ? dataJson[fw.contentKey] as Record<string, unknown> : dataJson;
                                            const vals: Record<string, string> = {};
                                            fw.fields.forEach(f => {
                                                if (f.fieldKey && section[f.fieldKey] !== undefined) {
                                                    const raw = section[f.fieldKey];
                                                    /* 파일 필드는 숫자 배열 — 텍스트 필드만 string으로 복원 */
                                                    if (!Array.isArray(raw)) vals[f.id] = String(raw ?? '');
                                                }
                                            });
                                            setFormValuesMap(prev => ({ ...prev, [fw.widgetId]: vals }));
                                        });

                                        /* SubList 위젯 rows 복원 */
                                        const sublistWidgets = allWidgets.filter(w => w.type === 'sublist') as SubListWidget[];
                                        sublistWidgets.forEach(sw => {
                                            const section = (sw.contentKey && dataJson[sw.contentKey]) ? dataJson[sw.contentKey] as Record<string, unknown> : {};
                                            const rawRows = (section.rows ?? []) as Record<string, unknown>[];
                                            const loadedRows: SubListRow[] = rawRows.map((r, i) => ({ _rowId: `row-${i}`, ...r }));
                                            setSubListRowsMap(prev => ({ ...prev, [sw.widgetId]: loadedRows }));
                                        });

                                        /* 파일 메타 로드 — dataJson의 각 필드에 저장된 fileId 배열로 조회 */
                                        try {
                                            const fileIds: number[] = [];
                                            const collectIds = (obj: Record<string, unknown>) => {
                                                Object.values(obj).forEach(v => {
                                                    if (Array.isArray(v) && v.every(x => typeof x === 'number')) fileIds.push(...v as number[]);
                                                    else if (v && typeof v === 'object' && !Array.isArray(v)) collectIds(v as Record<string, unknown>);
                                                });
                                            };
                                            collectIds(dataJson);

                                            if (fileIds.length > 0) {
                                                const metaRes = await api.get('/page-files/meta', { params: { ids: fileIds.join(',') } });
                                                const metaList = metaRes.data as { id: number; fieldKey: string; origName: string; fileSize: number; mimeType: string }[];

                                                /* Form 위젯 파일 메타 복원 */
                                                formWidgets.forEach(fw => {
                                                    const section = (fw.contentKey && dataJson[fw.contentKey]) ? dataJson[fw.contentKey] as Record<string, unknown> : dataJson;
                                                    const fieldKeyToId: Record<string, string> = {};
                                                    fw.fields.forEach(f => { if (f.fieldKey) fieldKeyToId[f.fieldKey] = f.id; });
                                                    const imageFieldIds = new Set(fw.fields.filter(f => f.type === 'image').map(f => f.id));
                                                    const metaByFieldId: Record<string, { id: number; origName: string; fileSize: number }[]> = {};

                                                    fw.fields.forEach(f => {
                                                        if (!f.fieldKey) return;
                                                        const ids = section[f.fieldKey];
                                                        if (!Array.isArray(ids)) return;
                                                        const fid = f.id;
                                                        metaByFieldId[fid] = (ids as number[]).map(id => {
                                                            const m = metaList.find(m => m.id === id);
                                                            return m ? { id: m.id, origName: m.origName, fileSize: m.fileSize } : { id, origName: '', fileSize: 0 };
                                                        });
                                                        /* 이미지 blob URL 로드 */
                                                        if (imageFieldIds.has(fid)) {
                                                            (ids as number[]).forEach(id => {
                                                                api.get(`/page-files/${id}`, { responseType: 'blob' })
                                                                    .then(blobRes => {
                                                                        const url = URL.createObjectURL(blobRes.data);
                                                                        setImgBlobUrls(prev => ({ ...prev, [id]: url }));
                                                                    })
                                                                    .catch(() => {});
                                                            });
                                                        }
                                                    });
                                                    setExistingFileMetaMap(prev => ({ ...prev, [fw.widgetId]: metaByFieldId }));
                                                });
                                            }
                                        } catch { /* 파일 없으면 조용히 처리 */ }

                                        /* sessionStorage에 pageDataId 기록 (저장/삭제 시 사용) */
                                        sessionStorage.setItem(`pageDataId_${connectedSlug}`, String(numId));
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

    /**
     * 컨텐츠(Form + SubList) 저장/삭제
     *
     * [설계 원칙]
     * - connectedContentWidgetIds 내 위젯들을 connectedSlug 기준으로 그룹핑
     * - 같은 slug에 속한 Form + SubList를 ONE page_data 레코드에 통합 저장
     * - data_json 구조: { id, [contentKey]: { ...fields }, [sublistContentKey]: { rows: [...] } }
     * - 파일 필드: fieldKey 값에 파일 ID 배열 [id1, id2] 직접 저장 (_files wrapper 없음)
     * - sessionStorage 키: pageDataId_{connectedSlug} (위젯별 key 미사용)
     */
    const handleContentAction = useCallback(async (
        connectedContentWidgetIds: string[],
        action: 'save' | 'delete'
    ) => {
        const allFlat = flatWidgets(widgetItems);

        /* 대상 위젯 수집 */
        const targetWidgets = connectedContentWidgetIds
            .map(wid => allFlat.find(w => (w.type === 'form' || w.type === 'sublist') && (w as FormWidget | SubListWidget).widgetId === wid))
            .filter(Boolean) as (FormWidget | SubListWidget)[];

        if (targetWidgets.length === 0) return;

        /* connectedSlug 결정 — Form 위젯 우선, 없으면 SubList */
        const formW = targetWidgets.find(w => w.type === 'form') as FormWidget | undefined;
        const connectedSlug = formW?.connectedSlug ?? (targetWidgets.find(w => w.type === 'sublist') as SubListWidget | undefined)?.connectedSlug;
        if (!connectedSlug) return;

        const storageKey = `pageDataId_${connectedSlug}`;
        const storedId = Number(sessionStorage.getItem(storageKey)) || null;

        try {
            if (action === 'delete') {
                if (!storedId) { toast.info('삭제할 데이터가 없습니다.'); return; }
                if (!confirm('삭제하시겠습니까?')) return;
                await api.delete(`/page-data/${connectedSlug}/${storedId}`);
                sessionStorage.removeItem(storageKey);
                toast.success('삭제되었습니다.');
                router.back();
                return;
            }

            /* ── SAVE ── */

            /* 1. 파일 업로드 — Form 위젯의 파일 필드 */
            /** fieldId → 업로드된 파일 ID 배열 */
            const newFileIdsByFieldId: Record<string, number[]> = {};
            for (const w of targetWidgets) {
                if (w.type !== 'form') continue;
                const fw = w as FormWidget;
                const newFiles = fileValuesMap[fw.widgetId] ?? {};
                for (const [fieldId, files] of Object.entries(newFiles)) {
                    const field = fw.fields.find(f => f.id === fieldId);
                    if (!field?.fieldKey || !files.length) continue;
                    const ids: number[] = [];
                    for (const file of files) {
                        const fd = new FormData();
                        fd.append('file', file);
                        fd.append('templateSlug', connectedSlug);
                        fd.append('fieldKey', field.fieldKey);
                        const uploadRes = await api.post('/page-files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                        ids.push(uploadRes.data.id);
                    }
                    newFileIdsByFieldId[fieldId] = ids;
                }
            }

            /* 2. data_json 구성 — contentKey 기반 ONE 레코드 */
            const dataJson: Record<string, unknown> = {};
            const pkKeys: string[] = [];

            for (const w of targetWidgets) {
                if (w.type === 'form') {
                    const fw = w as FormWidget;
                    const rawValues = formValuesMap[fw.widgetId] ?? {};
                    const section: Record<string, unknown> = {};
                    fw.fields.forEach(f => {
                        const key = f.fieldKey || f.label;
                        if (!key) return;
                        if (f.type === 'file' || f.type === 'image') {
                            /* 기존 파일 ID + 새로 업로드된 ID 합산 */
                            const existingIds = (existingFileMetaMap[fw.widgetId]?.[f.id] ?? []).map(m => m.id);
                            const newIds = newFileIdsByFieldId[f.id] ?? [];
                            section[key] = [...existingIds, ...newIds];
                        } else {
                            section[key] = rawValues[f.id] ?? '';
                        }
                        if (f.isPk) pkKeys.push(key);
                    });
                    /* contentKey가 있으면 해당 키 아래 중첩, 없으면 flat */
                    if (fw.contentKey) dataJson[fw.contentKey] = section;
                    else Object.assign(dataJson, section);

                } else if (w.type === 'sublist') {
                    const sw = w as SubListWidget;
                    const rawRows = subListRowsMap[sw.widgetId] ?? [];
                    const processedRows: Record<string, unknown>[] = [];
                    for (const row of rawRows) {
                        const { _rowId, ...rest } = row;
                        const processedRow: Record<string, unknown> = { ...rest };
                        /* SubList 파일 컬럼 업로드 */
                        for (const col of (sw.columns ?? [])) {
                            if (!['file', 'image'].includes(col.type)) continue;
                            const existingIds = Array.isArray(processedRow[col.key]) ? (processedRow[col.key] as number[]) : [];
                            const newFiles = subListFileMap[sw.widgetId]?.[_rowId]?.[col.id] ?? [];
                            const allIds = [...existingIds];
                            for (const file of newFiles) {
                                const fd = new FormData();
                                fd.append('file', file);
                                fd.append('templateSlug', connectedSlug);
                                fd.append('fieldKey', col.key);
                                const uploadRes = await api.post('/page-files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                const newId = uploadRes.data.id;
                                allIds.push(newId);
                                newFileIdsByFieldId[col.id] = [...(newFileIdsByFieldId[col.id] ?? []), newId];
                            }
                            processedRow[col.key] = allIds;
                        }
                        processedRows.push(processedRow);
                    }
                    const section: Record<string, unknown> = { rows: processedRows };
                    if (sw.contentKey) dataJson[sw.contentKey] = section;
                    else dataJson.rows = processedRows;
                }
            }

            /* 3. 저장 (생성 or 수정) */
            let savedDataId: number;
            if (storedId) {
                await api.put(`/page-data/${connectedSlug}/${storedId}`, { dataJson });
                savedDataId = storedId;
                toast.success('수정되었습니다.');
            } else {
                const res = await api.post(`/page-data/${connectedSlug}`, {
                    dataJson,
                    ...(pkKeys.length > 0 && { pkKeys }),
                });
                savedDataId = res.data.id;
                sessionStorage.setItem(storageKey, String(savedDataId));
                toast.success('저장되었습니다.');
            }

            /* 4. 업로드된 파일 → page_data 레코드에 연결 */
            const allNewIds = Object.values(newFileIdsByFieldId).flat();
            if (allNewIds.length > 0) {
                await api.patch('/page-files/link', { fileIds: allNewIds, dataId: savedDataId });
                /* 새 파일 선택 상태 초기화 */
                setFileValuesMap(prev => {
                    const next = { ...prev };
                    targetWidgets.forEach(w => { if (w.type === 'form') delete next[(w as FormWidget).widgetId]; });
                    return next;
                });
            }

            /* 5. 저장 후 파일 메타 재조회 — existingFileMetaMap 갱신 */
            try {
                const fileIds: number[] = [];
                const collectIds = (obj: Record<string, unknown>) => {
                    Object.values(obj).forEach(v => {
                        if (Array.isArray(v) && v.every(x => typeof x === 'number')) fileIds.push(...v as number[]);
                        else if (v && typeof v === 'object' && !Array.isArray(v)) collectIds(v as Record<string, unknown>);
                    });
                };
                collectIds(dataJson);

                if (fileIds.length > 0) {
                    const metaRes = await api.get('/page-files/meta', { params: { ids: fileIds.join(',') } });
                    const metaList = metaRes.data as { id: number; fieldKey: string; origName: string; fileSize: number; mimeType: string }[];

                    for (const w of targetWidgets) {
                        if (w.type !== 'form') continue;
                        const fw = w as FormWidget;
                        const section = fw.contentKey ? dataJson[fw.contentKey] as Record<string, unknown> : dataJson;
                        const metaByFieldId: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
                        const imageFieldIds = new Set(fw.fields.filter(f => f.type === 'image').map(f => f.id));

                        fw.fields.forEach(f => {
                            if (!f.fieldKey || (f.type !== 'file' && f.type !== 'image')) return;
                            const ids = section[f.fieldKey];
                            if (!Array.isArray(ids)) return;
                            metaByFieldId[f.id] = (ids as number[]).map(id => {
                                const m = metaList.find(m => m.id === id);
                                return m ? { id: m.id, origName: m.origName, fileSize: m.fileSize } : { id, origName: '', fileSize: 0 };
                            });
                            if (imageFieldIds.has(f.id)) {
                                (ids as number[]).forEach(id => {
                                    if (imgBlobUrls[id]) return; /* 이미 캐시된 경우 스킵 */
                                    api.get(`/page-files/${id}`, { responseType: 'blob' })
                                        .then(blobRes => {
                                            const url = URL.createObjectURL(blobRes.data);
                                            setImgBlobUrls(prev => ({ ...prev, [id]: url }));
                                        })
                                        .catch(() => {});
                                });
                            }
                        });
                        setExistingFileMetaMap(prev => ({ ...prev, [fw.widgetId]: metaByFieldId }));
                    }
                }
            } catch { /* 파일 메타 갱신 실패는 조용히 처리 */ }

        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (action === 'save' && status === 409) {
                toast.error('이미 동일한 키 값의 데이터가 존재합니다.');
            } else {
                toast.error(action === 'save' ? '저장 중 오류가 발생했습니다.' : '삭제 중 오류가 발생했습니다.');
            }
        }
    }, [widgetItems, formValuesMap, fileValuesMap, subListRowsMap, subListFileMap, existingFileMetaMap, imgBlobUrls, router]); // eslint-disable-line react-hooks/exhaustive-deps

    /** 파일 선택 핸들러 — Form: rowId 없음 / SubList: rowId 있음 */
    const handleFileChange = useCallback((widgetId: string, fieldId: string, files: File[], rowId?: string) => {
        if (rowId !== undefined) {
            /* SubList 파일 변경 — widgetId → rowId → colId → File[] */
            setSubListFileMap(prev => ({
                ...prev,
                [widgetId]: {
                    ...(prev[widgetId] ?? {}),
                    [rowId]: {
                        ...(prev[widgetId]?.[rowId] ?? {}),
                        [fieldId]: files,
                    },
                },
            }));
            return;
        }
        setFileValuesMap(prev => ({
            ...prev,
            [widgetId]: { ...(prev[widgetId] ?? {}), [fieldId]: files },
        }));
    }, []);

    /** 기존 파일 삭제 핸들러 */
    const handleRemoveExisting = useCallback(async (widgetId: string, fieldId: string, fileId: number) => {
        try {
            await api.delete(`/page-files/${fileId}`);
            setExistingFileMetaMap(prev => ({
                ...prev,
                [widgetId]: {
                    ...(prev[widgetId] ?? {}),
                    [fieldId]: (prev[widgetId]?.[fieldId] ?? []).filter(f => f.id !== fileId),
                },
            }));
            /* 이미지 blob URL 캐시 제거 */
            setImgBlobUrls(prev => { const n = { ...prev }; delete n[fileId]; return n; });
        } catch {
            toast.error('파일 삭제 중 오류가 발생했습니다.');
        }
    }, []);

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
            setPageTableData([]);
            setHasMore(true);
            hasMoreRef.current = true;
            nextPageRef.current = 0;
        }
        fetchData(0, {});
    };

    const handleListSearch = () => {
        searchValuesRef.current = searchValues;
        if (config?.displayMode === 'scroll') {
            setPageTableData([]);
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
        if (!config || !config.fieldRows || config.fieldRows.length === 0) return null;
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
        if (!config || !config.tableColumns || config.tableColumns.length === 0) return null;
        return {
            type: 'table',
            widgetId: 'main-table',
            contentKey: 'table',
            columns: config.tableColumns,
            connectedSearchIds: config.fieldRows?.length > 0 ? ['main-search'] : [],
            pageSize: config.pageSize ?? DEFAULT_PAGE_SIZE,
            displayMode: config.displayMode ?? 'pagination',
        };
    }, [config]);

    /* 팝업 저장에 사용할 dataSlug 사전 계산 (widgetItems 방식 전용) */
    const resolvedDataSlug = useMemo(() => {
        const tw = flatWidgets(widgetItems).find(w => w.type === 'table') as TableWidget | undefined;
        return tw?.connectedSlug ?? dataSlug;
    }, [widgetItems, dataSlug]);

    /* 팝업 저장 후 테이블 새로고침 콜백 (widgetItems 방식 전용) */
    const handleRefresh = useCallback(() => {
        const tw = flatWidgets(widgetItems).find(w => w.type === 'table') as TableWidget | undefined;
        if (tw?.connectedSlug) {
            const fieldsMap = buildSearchFieldsMap(widgetItems);
            const searchFields = tw.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
            fetchTableData({ tableWidget: tw, connectedSlug: tw.connectedSlug, searchFields, sv: searchValuesRef.current, page: 0 });
        }
    }, [widgetItems, fetchTableData, buildSearchFieldsMap]); // eslint-disable-line react-hooks/exhaustive-deps

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
            <PageLayout title={menuName || templateName} description={menuDescription ?? undefined} mode="live">
                <PageGridRenderer
                    mode="live"
                    widgetItems={widgetItems}
                    searchValues={searchValues}
                    onSearchChange={updateSearchValue}
                    onSearch={handleSearch}
                    onReset={handleReset}
                    codeGroups={codeGroups}
                    formValuesMap={formValuesMap}
                    onFormValuesChange={updateFormValue}
                    onContentAction={handleContentAction}
                    subListRowsMap={subListRowsMap}
                    onSubListRowsChange={(wId, rows) => setSubListRowsMap(prev => ({ ...prev, [wId]: rows }))}
                    fileValuesMap={fileValuesMap}
                    existingFileMetaMap={existingFileMetaMap}
                    imgBlobUrls={imgBlobUrls}
                    onFileChange={handleFileChange}
                    onRemoveExisting={handleRemoveExisting}
                    tableDataMap={tableDataMap}
                    sortKeyMap={sortKeyMap}
                    sortDirMap={sortDirMap}
                    onSort={handleSortChange}
                    onPageChange={handlePageChange}
                    onLoadMore={handleLoadMore}
                    dataSlug={resolvedDataSlug}
                    onRefresh={handleRefresh}
                />
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
            <PageLayout title={menuName || templateName} description={menuDescription ?? undefined} mode="live">
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
                            onRefresh={() => fetchData(currentPage)}
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
                onRefresh={() => fetchData(currentPage)}
                externalPopupTrigger={btnPopupTrigger}
            />
        </>
    );
}
