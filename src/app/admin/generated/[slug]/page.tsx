'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableActionHandlers, SearchWidget, SpaceWidget } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { FormWidget } from '@/app/admin/templates/make/_shared/components/builder/FormBuilder';

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

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

/** LIST 템플릿 configJson */
interface ListConfig {
    fieldRows: SearchRowConfig[];
    tableColumns: TableColumnConfig[];
    collapsible: boolean;
    buttons?: ButtonConfig[];
    buttonPosition?: ButtonPosition;
    displayMode?: 'pagination' | 'scroll';
    pageSize?: number;
}

/** QUICK_LIST 템플릿 configJson */
interface QuickListConfig {
    searchContent: { id: string; colSpan: number; rowSpan: number; widget: SearchWidget };
    spaceContent:  { id: string; colSpan: number; rowSpan: number; widget: SpaceWidget };
    tableContent:  { id: string; colSpan: number; rowSpan: number; widget: TableWidget };
}

/** QUICK_DETAIL 템플릿 configJson */
interface QuickDetailConfig {
    formContent:  { id: string; colSpan: number; rowSpan: number; widget: FormWidget };
    spaceContent: { id: string; colSpan: number; rowSpan: number; widget: SpaceWidget };
    outputMode:   'page' | 'layerpopup';
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
    const pathname  = usePathname();
    const router    = useRouter();
    const searchParams = useSearchParams();
    const navMenus  = useMenuStore((state) => state.navMenus);
    const menuName  = findMenuName(navMenus, pathname || '');
    const dataSlug  = useMenuPageSlug(slug);

    /* ── 템플릿 상태 ── */
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [templateType, setTemplateType] = useState<string>('LIST');

    /* LIST configJson */
    const [config, setConfig] = useState<ListConfig | null>(null);
    /* QUICK_LIST configJson */
    const [qlConfig, setQlConfig] = useState<QuickListConfig | null>(null);
    /* QUICK_DETAIL configJson */
    const [qdConfig, setQdConfig] = useState<QuickDetailConfig | null>(null);

    /* 데이터 조회에 사용할 slug — templateType별로 결정 */
    const fetchSlugRef = useRef<string>('');

    /* ── 검색 필드 값 ── */
    const [searchValues, setSearchValues] = useState<Record<string, string>>({});

    /* ── 테이블 데이터 ── */
    const [tableData,      setTableData]      = useState<Record<string, unknown>[]>([]);
    const [dataLoading,    setDataLoading]    = useState(false);
    const [appendLoading,  setAppendLoading]  = useState(false);
    const [totalElements,  setTotalElements]  = useState(0);
    const [totalPages,     setTotalPages]     = useState(0);
    const [currentPage,    setCurrentPage]    = useState(0);
    const [hasMore,        setHasMore]        = useState(true);

    const hasMoreRef     = useRef(true);
    const isLoadingRef   = useRef(false);
    const nextPageRef    = useRef(0);
    const searchValuesRef = useRef<Record<string, string>>({});
    const configRef      = useRef<ListConfig | null>(null);

    /* ── 정렬 ── */
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    /* ── QUICK_DETAIL 전용: 폼 상태 ── */
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    const [formId,     setFormId]     = useState<number | null>(null);

    /* 공통코드 */
    const { groups: codeGroups, fetchGroups } = useCodeStore();

    /**
     * 데이터 목록 조회 — GET /api/v1/page-data/{slug}
     * LIST / QUICK_LIST 공통 사용
     */
    const fetchData = useCallback(async (
        page: number,
        sv?:  Record<string, string>,
        cfg?: ListConfig | null,
        append = false,
        sk?: string | null,
        sd?: 'asc' | 'desc',
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
            const reqParams: Record<string, string> = {
                page: String(page),
                size: String(size),
            };
            if (resolvedSk) reqParams.sort = `${resolvedSk},${resolvedSd}`;
            if (resolvedCfg) {
                resolvedCfg.fieldRows.flatMap(r => r.fields).forEach(f => {
                    const paramKey = f.fieldKey || f.accessor || f.label;
                    const val = resolvedSv[f.id];
                    if (paramKey && val && val.trim()) reqParams[paramKey] = val;
                });
            }
            /* fetchSlugRef: QUICK_LIST는 tableContent.contentKey, LIST는 dataSlug */
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

    /* 무한 스크롤 */
    const handleLoadMore = useCallback(() => {
        if (!hasMoreRef.current || isLoadingRef.current) return;
        fetchData(nextPageRef.current, searchValuesRef.current, configRef.current, true);
    }, [fetchData]);

    /* ── 템플릿 로딩 ── */
    useEffect(() => {
        fetchGroups();
        api.get(`/page-templates/by-slug/${slug}`)
            .then(res => {
                setTemplateName(res.data.name);
                const tt: string = res.data.templateType || 'LIST';
                setTemplateType(tt);

                if (tt === 'QUICK_LIST') {
                    const cfg = JSON.parse(res.data.configJson) as QuickListConfig;
                    setQlConfig(cfg);
                    /* 데이터 slug: 테이블 connectedSlug 우선, 없으면 URL slug */
                    const fetchSlug = cfg.tableContent?.widget?.connectedSlug || dataSlug;
                    fetchSlugRef.current = fetchSlug;
                    /* fetchData 재사용을 위해 동일 구조로 정규화 */
                    const synthetic: ListConfig = {
                        fieldRows:    cfg.searchContent?.widget?.rows    || [],
                        tableColumns: cfg.tableContent?.widget?.columns  || [],
                        collapsible:  true,
                        displayMode:  cfg.tableContent?.widget?.displayMode,
                        pageSize:     cfg.tableContent?.widget?.pageSize,
                    };
                    setConfig(synthetic);
                    configRef.current = synthetic;
                    searchValuesRef.current = {};
                    fetchData(0, {}, synthetic);

                } else if (tt === 'QUICK_DETAIL') {
                    const cfg = JSON.parse(res.data.configJson) as QuickDetailConfig;
                    setQdConfig(cfg);
                    const fetchSlug = cfg.formContent?.widget?.connectedSlug || dataSlug;
                    fetchSlugRef.current = fetchSlug;
                    /* URL ?id=xxx 로 기존 데이터 로드 */
                    const queryId = searchParams.get('id');
                    if (queryId) {
                        const numId = Number(queryId);
                        setFormId(numId);
                        api.get(`/page-data/${fetchSlug}/${numId}`)
                            .then(dataRes => {
                                const dataJson = dataRes.data.dataJson || {};
                                const vals: Record<string, string> = {};
                                cfg.formContent.widget.fields.forEach(f => {
                                    if (f.fieldKey && dataJson[f.fieldKey] !== undefined) {
                                        vals[f.id] = String(dataJson[f.fieldKey] ?? '');
                                    }
                                });
                                setFormValues(vals);
                            })
                            .catch(() => toast.error('기존 데이터를 불러오는 중 오류가 발생했습니다.'));
                    }

                } else {
                    /* LIST (기본값) */
                    fetchSlugRef.current = dataSlug;
                    const cfg = JSON.parse(res.data.configJson) as ListConfig;
                    setConfig(cfg);
                    configRef.current = cfg;
                    searchValuesRef.current = {};
                    fetchData(0, {}, cfg);
                }
            })
            .catch(() => setError('페이지를 불러오는 중 오류가 발생했습니다.'))
            .finally(() => setLoading(false));
    }, [slug, fetchGroups]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const handleSearch = () => {
        searchValuesRef.current = searchValues;
        if (config?.displayMode === 'scroll') {
            setTableData([]);
            setHasMore(true);
            hasMoreRef.current = true;
            nextPageRef.current = 0;
        }
        fetchData(0, searchValues);
    };

    /* ── LIST 버튼바 팝업 외부 트리거 (WidgetRenderer에 위임) ── */
    const [btnPopupTrigger, setBtnPopupTrigger] = useState<{ slug: string; ts: number } | null>(null);

    /** LIST 버튼 바 클릭 핸들러 */
    const handleButtonClick = (btn: ButtonConfig) => {
        if (btn.action === 'register' || btn.action === 'custom') {
            if (btn.popupSlug) {
                /* 팝업 오픈을 WidgetRenderer에 위임 (externalPopupTrigger 방식) */
                setBtnPopupTrigger({ slug: btn.popupSlug, ts: Date.now() });
            } else if (btn.action === 'register') {
                toast.info('등록 페이지 연동이 설정되지 않았습니다.');
            }
        } else if (btn.action === 'excel') {
            handleExcelDownload(btn.excelFormat ?? 'xlsx');
        }
    };

    /** 엑셀 다운로드 */
    const handleExcelDownload = async (format: string) => {
        const cols = config?.tableColumns.filter(c => c.cellType !== 'actions' && c.accessor) ?? [];
        const headers = encodeURIComponent(cols.map(c => c.header).join(','));
        const keys    = encodeURIComponent(cols.map(c => c.accessor).join(','));
        const params  = new URLSearchParams({ format, headers, keys });
        Object.entries(searchValuesRef.current).forEach(([k, v]) => {
            if (v) params.set(k, v);
        });
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002/api/v1';
            const targetSlug = fetchSlugRef.current || dataSlug;
            const res = await fetch(`${apiBase}/page-data/${targetSlug}/export?${params.toString()}`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('다운로드 실패');
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            const disposition = res.headers.get('Content-Disposition') ?? '';
            const match = disposition.match(/filename\*?=(?:UTF-8'')?(.+)/i);
            a.download = match ? decodeURIComponent(match[1].replace(/"/g, '')) : `export.${format}`;
            a.href = url;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('엑셀 다운로드 중 오류가 발생했습니다.');
        }
    };

    /** 테이블 행 삭제 */
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

    /** QUICK_DETAIL 폼 저장/삭제 핸들러 */
    const handleFormAction = useCallback(async (_widgetId: string, action: 'save' | 'delete') => {
        const targetSlug = fetchSlugRef.current;
        if (!targetSlug) { toast.error('연결된 데이터 slug가 없습니다.'); return; }

        if (action === 'save') {
            const fields = qdConfig?.formContent?.widget?.fields ?? [];
            const body: Record<string, string> = {};
            fields.forEach(f => {
                if (f.fieldKey) body[f.fieldKey] = formValues[f.id] ?? '';
            });
            try {
                if (formId) {
                    await api.put(`/page-data/${targetSlug}/${formId}`, { dataJson: body });
                    toast.success('수정되었습니다.');
                } else {
                    const res = await api.post(`/page-data/${targetSlug}`, { dataJson: body });
                    setFormId(res.data.id);
                    toast.success('저장되었습니다.');
                }
            } catch {
                toast.error('저장 중 오류가 발생했습니다.');
            }
        } else if (action === 'delete') {
            if (!formId) { toast.info('삭제할 데이터가 없습니다.'); return; }
            if (!confirm('삭제하시겠습니까?')) return;
            try {
                await api.delete(`/page-data/${targetSlug}/${formId}`);
                toast.success('삭제되었습니다.');
                router.back();
            } catch {
                toast.error('삭제 중 오류가 발생했습니다.');
            }
        }
    }, [qdConfig, formValues, formId, router]);

    /** 테이블 셀 액션 핸들러 — edit/detail/fileClick은 WidgetRenderer가 내부 처리 */
    const tableHandlers: TableActionHandlers = {
        onDelete: (id) => handleDeleteClick(id),
    };

    /** config.fieldRows → SearchWidget 변환 */
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

    /** config.tableColumns → TableWidget 변환 */
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

    /* ── 로딩 중 ── */
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
    /*  QUICK_DETAIL 렌더링                       */
    /* ══════════════════════════════════════════ */
    if (templateType === 'QUICK_DETAIL' && qdConfig) {
        return (
            <PageLayout title={menuName || templateName}>
                {/* 폼 위젯 */}
                {qdConfig.formContent?.widget && (
                    <WidgetRenderer
                        mode="live"
                        widget={qdConfig.formContent.widget}
                        codeGroups={codeGroups}
                        formValues={formValues}
                        onFormValuesChange={(id, v) =>
                            setFormValues(prev => ({ ...prev, [id]: v }))
                        }
                    />
                )}
                {/* 공간영역 (저장/삭제/닫기 버튼) */}
                {qdConfig.spaceContent?.widget && (
                    <WidgetRenderer
                        mode="live"
                        widget={qdConfig.spaceContent.widget}
                        onFormAction={handleFormAction}
                    />
                )}
            </PageLayout>
        );
    }

    /* ══════════════════════════════════════════ */
    /*  QUICK_LIST 렌더링                         */
    /* ══════════════════════════════════════════ */
    if (templateType === 'QUICK_LIST' && qlConfig && config) {
        return (
            <PageLayout title={menuName || templateName}>
                {/* 검색 위젯 */}
                {searchWidget && (
                    <WidgetRenderer
                        mode="live"
                        widget={searchWidget}
                        collapsible={config.collapsible}
                        searchValues={searchValues}
                        onSearchChange={updateValue}
                        onSearch={handleSearch}
                        onReset={resetValues}
                        codeGroups={codeGroups}
                    />
                )}
                {/* 공간영역 (등록 버튼 등) */}
                {/* 공간영역 — WidgetRenderer가 팝업 오픈을 내부 처리 */}
                {qlConfig.spaceContent?.widget && (
                    <WidgetRenderer
                        mode="live"
                        widget={qlConfig.spaceContent.widget}
                        dataSlug={fetchSlugRef.current || dataSlug}
                        onPopupSaved={() => fetchData(currentPage)}
                    />
                )}
                {/* 데이터 테이블 — edit/detail 팝업을 WidgetRenderer가 내부 처리 */}
                {tableWidget && (
                    <WidgetRenderer
                        mode="live"
                        widget={tableWidget}
                        codeGroups={codeGroups}
                        handlers={tableHandlers}
                        dataSlug={fetchSlugRef.current || dataSlug}
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
                        onLoadMore={handleLoadMore}
                        appendLoading={appendLoading}
                        hasMore={hasMore}
                    />
                )}
            </PageLayout>
        );
    }

    /* ══════════════════════════════════════════ */
    /*  LIST 렌더링 (기본값)                       */
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
        <PageLayout title={menuName || templateName}>
            {buttonPosition === 'above' && <ButtonBar />}

            {searchWidget && (
                <WidgetRenderer
                    mode="live"
                    widget={searchWidget}
                    collapsible={config.collapsible}
                    searchValues={searchValues}
                    onSearchChange={updateValue}
                    onSearch={handleSearch}
                    onReset={resetValues}
                    codeGroups={codeGroups}
                />
            )}

            {buttonPosition === 'between' && <ButtonBar />}

            {/* 데이터 테이블 — edit/detail 팝업을 WidgetRenderer가 내부 처리 */}
            {tableWidget && (
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
                    onLoadMore={handleLoadMore}
                    appendLoading={appendLoading}
                    hasMore={hasMore}
                />
            )}

            {/* 버튼바 팝업 트리거 — 위젯 없이 팝업 오버레이만 렌더링 */}
            <WidgetRenderer
                mode="live"
                widget={null}
                dataSlug={dataSlug}
                onPopupSaved={() => fetchData(currentPage)}
                externalPopupTrigger={btnPopupTrigger}
            />
        </PageLayout>
    );
}
