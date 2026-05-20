'use client';

/**
 * ============================================================
 *  [위젯 렌더러] /admin/widget/{slug}
 * ============================================================
 *  - DB에서 slug로 위젯 템플릿(PAGE 타입) 로딩
 *  - configJson.widgetItems → 12칸 그리드 레이아웃으로 렌더링
 *  - Search 위젯의 connectedSlug → Table 위젯의 connectedSearchIds 연결
 *  - 검색 시 connectedSlug API 호출 → Table 데이터 자동 업데이트
 *  - 공통 renderer 컴포넌트 사용 (변경 시 빌더 미리보기와 동시 반영)
 * ============================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useCodeStore } from '@/store/useCodeStore';
import { PageGridRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { AnyWidget, PageContentItem, PageWidgetItem, PageTableData } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { FormWidget } from '@/app/admin/templates/make/_shared/components/builder/FormBuilder';
import type { SubListWidget } from '@/app/admin/templates/make/_shared/components/renderer/types';
import type { SubListRow } from '@/app/admin/templates/make/_shared/components/renderer/SubListRenderer';
import type { SearchFieldConfig } from '@/app/admin/templates/make/_shared/types';

/* ══════════════════════════════════════════ */
/*  타입                                      */
/* ══════════════════════════════════════════ */

interface WidgetConfig {
    widgetItems: PageWidgetItem[];
}

/* ══════════════════════════════════════════ */
/*  상수 / 유틸                               */
/* ══════════════════════════════════════════ */

const DEFAULT_PAGE_SIZE = 10;


/* ══════════════════════════════════════════ */
/*  메인 페이지                                */
/* ══════════════════════════════════════════ */

export default function WidgetRendererPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const { groups: codeGroups, fetchGroups } = useCodeStore();

    /* 템플릿 로딩 상태 */
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [widgetItems, setWidgetItems] = useState<PageWidgetItem[]>([]);


    /* 검색 필드 값 — widgetItem 전체 공유 (fieldId 기준 키) */
    const [searchValues, setSearchValues] = useState<Record<string, string>>({});
    const searchValuesRef = useRef<Record<string, string>>({});

    /* 테이블별 데이터 상태 — key: tableWidget.widgetId */
    const [tableDataMap, setPageTableDataMap] = useState<Record<string, PageTableData>>({});
    /* Observer 콜백에서 최신 tableDataMap 참조용 ref */
    const tableDataMapRef = useRef<Record<string, PageTableData>>({});

    /* 테이블별 정렬 상태 */
    const [sortKeyMap, setSortKeyMap] = useState<Record<string, string | null>>({});
    const [sortDirMap, setSortDirMap] = useState<Record<string, 'asc' | 'desc'>>({});

    /* Form 위젯별 입력값 — key: formWidget.widgetId, value: {fieldId → value} */
    const [formValuesMap, setFormValuesMap] = useState<Record<string, Record<string, string>>>({});

    /* SubList 위젯별 행 데이터 */
    const [subListRowsMap, setSubListRowsMap] = useState<Record<string, SubListRow[]>>({});

    /* 카테고리 위젯별 선택 ID — key: widgetId, value: selectedId | null */
    const [categorySelections, setCategorySelections] = useState<Record<string, number | null>>({});

    /** 카테고리 항목 선택 핸들러 — CategoryRenderer → WidgetRenderer → 여기서 상태 업데이트 */
    const handleCategorySelect = useCallback((widgetId: string, selectedId: number | null) => {
        setCategorySelections(prev => ({ ...prev, [widgetId]: selectedId }));
    }, []);

    /**
     * widgetItems에서 모든 위젯을 평탄화하여 반환
     */
    const flatWidgets = (items: PageWidgetItem[]): AnyWidget[] =>
        items.flatMap(item => item.contents.map(c => c.widget));

    /**
     * Search 위젯 widgetId → 해당 위젯의 모든 SearchField 목록 반환
     * 검색 파라미터 구성 시 사용
     */
    const buildSearchFieldsMap = (items: PageWidgetItem[]): Record<string, SearchFieldConfig[]> => {
        const map: Record<string, SearchFieldConfig[]> = {};
        flatWidgets(items).forEach(w => {
            if (w.type === 'search') {
                map[w.widgetId] = w.rows.flatMap(r => r.fields);
            }
        });
        return map;
    };

    /**
     * 테이블 위젯 데이터 fetch
     * - tableWidget: 대상 테이블 위젯
     * - connectedSlug: Table 위젯의 DB Slug
     * - searchFields: 검색 파라미터로 사용할 필드 목록
     * - sv: 현재 검색 값 Map
     * - page: 페이지 번호 (0-based)
     * - sk: 정렬 키
     * - sd: 정렬 방향
     */
    const fetchPageTableData = useCallback(async ({
        tableWidget,
        connectedSlug,
        searchFields,
        sv,
        page = 0,
        sk,
        sd = 'asc',
        append = false,
    }: {
        tableWidget: TableWidget;
        connectedSlug: string;
        searchFields: SearchFieldConfig[];
        sv: Record<string, string>;
        page?: number;
        sk?: string | null;
        sd?: 'asc' | 'desc';
        append?: boolean;   // true: 스크롤 추가 로드, false: 전체 교체
    }) => {
        const wid = tableWidget.widgetId;
        const defaultData: PageTableData = { rows: [], totalElements: 0, totalPages: 0, currentPage: 0, loading: false, appendLoading: false, hasMore: true, nextPage: 0 };

        /* 로딩 상태 — append면 기존 데이터 유지 + 하단 스피너, 아니면 전체 로딩 */
        setPageTableDataMap(prev => ({
            ...prev,
            [wid]: append
                ? { ...(prev[wid] ?? defaultData), appendLoading: true }
                : { ...(prev[wid] ?? defaultData), loading: true },
        }));

        try {
            const pageSize = tableWidget.pageSize || DEFAULT_PAGE_SIZE;
            const params: Record<string, string> = {
                page: String(page),
                size: String(pageSize),
            };
            /* 정렬 조건 */
            if (sk) params.sort = `${sk},${sd}`;

            /* 검색 조건 — fieldKey → label 순으로 파라미터 키 결정 */
            searchFields.forEach(f => {
                const paramKey = f.fieldKey || f.label;
                const val = sv[f.id];
                if (paramKey && val && val.trim()) params[paramKey] = val;
            });

            const res = await api.get(`/page-data/${connectedSlug}`, { params });
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

            const hasMore = res.data.last === false; // 백엔드 DTO에 추가된 last 필드 사용
            setPageTableDataMap(prev => ({
                ...prev,
                [wid]: {
                    /* append면 기존 행 뒤에 추가, 아니면 교체 */
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

    /* 템플릿 + 공통코드 로딩 — 완료 후 각 Table 위젯 초기 데이터 자동 fetch */
    useEffect(() => {
        fetchGroups();
        api.get(`/page-templates/by-slug/${slug}`, { params: { type: 'PAGE' } })
            .then(res => {
                const config = JSON.parse(res.data.configJson) as WidgetConfig;
                const items = config.widgetItems || [];
                setWidgetItems(items);

                /* 초기 데이터 fetch — DB Slug가 설정된 모든 Table 위젯 */
                const fieldsMap = buildSearchFieldsMap(items);

                flatWidgets(items).forEach(w => {
                    if (w.type !== 'table') return;
                    const connectedSlug = w.connectedSlug;
                    if (!connectedSlug) return;

                    /* 연결된 모든 Search 위젯의 필드를 합산 */
                    const searchFields = w.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
                    fetchPageTableData({ tableWidget: w, connectedSlug, searchFields, sv: {} });
                });
            })
            .catch(() => setError('페이지를 불러오는 중 오류가 발생했습니다.'))
            .finally(() => setLoading(false));
    }, [slug, fetchGroups]); // eslint-disable-line react-hooks/exhaustive-deps

    /* tableDataMap 변경 시 ref 동기화 — handleLoadMore 콜백에서 최신값 참조 */
    useEffect(() => {
        tableDataMapRef.current = tableDataMap;
    }, [tableDataMap]);

    const updateSearchValue = useCallback((id: string, val: string) => {
        setSearchValues(prev => {
            const next = { ...prev, [id]: val };
            searchValuesRef.current = next;
            return next;
        });
    }, []);

    /**
     * 검색 실행 — searchWidgetId와 연결된 모든 Table 위젯의 데이터를 재fetch
     */
    const handleSearch = useCallback((searchWidgetId: string) => {
        const fieldsMap = buildSearchFieldsMap(widgetItems);
        const sv = searchValuesRef.current;

        flatWidgets(widgetItems).forEach(w => {
            if (w.type !== 'table') return;
            if (!w.connectedSearchIds.includes(searchWidgetId)) return;
            const connectedSlug = w.connectedSlug;
            if (!connectedSlug) return;
            const searchFields = w.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
            const sk = sortKeyMap[w.widgetId] ?? undefined;
            const sd = sortDirMap[w.widgetId] ?? 'asc';
            fetchPageTableData({ tableWidget: w, connectedSlug, searchFields, sv, page: 0, sk, sd });
        });
    }, [widgetItems, sortKeyMap, sortDirMap, fetchPageTableData]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * 초기화 — 검색값 비우고 데이터 재fetch
     */
    const handleReset = useCallback((searchWidgetId: string) => {
        setSearchValues({});
        searchValuesRef.current = {};
        const fieldsMap = buildSearchFieldsMap(widgetItems);

        flatWidgets(widgetItems).forEach(w => {
            if (w.type !== 'table') return;
            if (!w.connectedSearchIds.includes(searchWidgetId)) return;
            const connectedSlug = w.connectedSlug;
            if (!connectedSlug) return;
            const searchFields = w.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
            fetchPageTableData({ tableWidget: w, connectedSlug, searchFields, sv: {}, page: 0 });
        });
    }, [widgetItems, fetchPageTableData]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * 페이지 이동 — 해당 Table 위젯 데이터 재fetch
     */
    const handlePageChange = useCallback((tableWidgetId: string, page: number) => {
        const fieldsMap = buildSearchFieldsMap(widgetItems);
        const sv = searchValuesRef.current;

        const tableWidget = flatWidgets(widgetItems).find(
            w => w.type === 'table' && (w as TableWidget).widgetId === tableWidgetId
        ) as TableWidget | undefined;
        if (!tableWidget) return;
        const connectedSlug = tableWidget.connectedSlug;
        if (!connectedSlug) return;
        const searchFields = tableWidget.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
        const sk = sortKeyMap[tableWidgetId] ?? undefined;
        const sd = sortDirMap[tableWidgetId] ?? 'asc';
        fetchPageTableData({ tableWidget, connectedSlug, searchFields, sv, page, sk, sd });
    }, [widgetItems, sortKeyMap, sortDirMap, fetchPageTableData]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * 정렬 변경 — 해당 Table 위젯 데이터 재fetch
     */
    const handleSortChange = useCallback((tableWidgetId: string, accessor: string, dir: 'asc' | 'desc') => {
        setSortKeyMap(prev => ({ ...prev, [tableWidgetId]: accessor }));
        setSortDirMap(prev => ({ ...prev, [tableWidgetId]: dir }));

        const fieldsMap = buildSearchFieldsMap(widgetItems);
        const sv = searchValuesRef.current;

        const tableWidget = flatWidgets(widgetItems).find(
            w => w.type === 'table' && (w as TableWidget).widgetId === tableWidgetId
        ) as TableWidget | undefined;
        if (!tableWidget) return;
        const connectedSlug = tableWidget.connectedSlug;
        if (!connectedSlug) return;
        const searchFields = tableWidget.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
        fetchPageTableData({ tableWidget, connectedSlug, searchFields, sv, page: 0, sk: accessor, sd: dir });
    }, [widgetItems, fetchPageTableData]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Form 필드값 변경 — widgetId별로 독립 관리
     */
    const updateFormValue = useCallback((widgetId: string, fieldId: string, value: string) => {
        setFormValuesMap(prev => ({
            ...prev,
            [widgetId]: { ...(prev[widgetId] ?? {}), [fieldId]: value },
        }));
    }, []);

    /** 컨텐츠(Form+SubList) 저장/삭제 — Space 버튼 클릭 시 호출 */
    const handleContentAction = useCallback(async (
        connectedContentWidgetIds: string[],
        action: 'save' | 'delete'
    ) => {
        for (const widgetId of connectedContentWidgetIds) {
            const widget = flatWidgets(widgetItems).find(w =>
                (w.type === 'form' || w.type === 'sublist') &&
                (w as FormWidget | SubListWidget).widgetId === widgetId
            );
            if (!widget) continue;

            /* ── Form 위젯 처리 ── */
            if (widget.type === 'form') {
                const formWidget = widget as FormWidget;
                if (!formWidget.connectedSlug) continue;

                const rawValues = formValuesMap[widgetId] ?? {};
                const dataJson: Record<string, string> = {};
                const pkKeys: string[] = [];
                formWidget.fields.forEach(f => {
                    const key = f.fieldKey || f.label;
                    if (key) {
                        dataJson[key] = rawValues[f.id] ?? '';
                        if (f.isPk) pkKeys.push(key);
                    }
                });

                try {
                    if (action === 'save') {
                        await api.post(`/page-data/${formWidget.connectedSlug}`, {
                            dataJson,
                            ...(pkKeys.length > 0 && { pkKeys }),
                        });
                        toast.success('저장되었습니다.');
                    } else {
                        await api.delete(`/page-data/${formWidget.connectedSlug}`, { data: { dataJson, ...(pkKeys.length > 0 && { pkKeys }) } });
                        toast.success('삭제되었습니다.');
                    }
                } catch (err: unknown) {
                    const status = (err as { response?: { status?: number } })?.response?.status;
                    if (action === 'save' && status === 409) {
                        toast.error('이미 동일한 키 값의 데이터가 존재합니다.');
                    } else {
                        toast.error(action === 'save' ? '저장 중 오류가 발생했습니다.' : '삭제 중 오류가 발생했습니다.');
                    }
                }

            /* ── SubList 위젯 처리 ── */
            } else if (widget.type === 'sublist') {
                const sublistWidget = widget as SubListWidget;
                if (!sublistWidget.connectedSlug) continue;

                const storageKey = `sublistId_${widgetId}`;
                const storedId = Number(sessionStorage.getItem(storageKey)) || null;
                const rows = subListRowsMap[widgetId] ?? [];

                try {
                    if (action === 'save') {
                        const cleanRows = rows.map(({ _rowId, ...rest }) => rest);
                        if (storedId) {
                            await api.put(`/page-data/${sublistWidget.connectedSlug}/${storedId}`, { dataJson: { rows: cleanRows } });
                            toast.success('수정되었습니다.');
                        } else {
                            const res = await api.post(`/page-data/${sublistWidget.connectedSlug}`, { dataJson: { rows: cleanRows } });
                            sessionStorage.setItem(storageKey, String(res.data.id));
                            toast.success('저장되었습니다.');
                        }
                    } else {
                        if (!storedId) { toast.info('삭제할 데이터가 없습니다.'); continue; }
                        if (!confirm('삭제하시겠습니까?')) return;
                        await api.delete(`/page-data/${sublistWidget.connectedSlug}/${storedId}`);
                        sessionStorage.removeItem(storageKey);
                        toast.success('삭제되었습니다.');
                    }
                } catch {
                    toast.error(action === 'save' ? '저장 중 오류가 발생했습니다.' : '삭제 중 오류가 발생했습니다.');
                }
            }
        }
    }, [widgetItems, formValuesMap, subListRowsMap]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * 팝업 저장·삭제 완료 후 모든 Table 위젯 데이터 재조회
     * WidgetRenderer의 onRefresh 콜백으로 연결
     */
    const handleRefresh = useCallback(() => {
        const fieldsMap = buildSearchFieldsMap(widgetItems);
        const sv = searchValuesRef.current;
        flatWidgets(widgetItems).forEach(w => {
            if (w.type !== 'table') return;
            const connectedSlug = (w as TableWidget).connectedSlug;
            if (!connectedSlug) return;
            const searchFields = (w as TableWidget).connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
            fetchPageTableData({ tableWidget: w as TableWidget, connectedSlug, searchFields, sv, page: 0 });
        });
    }, [widgetItems, fetchPageTableData]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * 무한스크롤 다음 페이지 로드 — TableRenderer의 onLoadMore 콜백
     * tableDataMapRef로 최신 상태 참조 (stale closure 방지)
     */
    const handleLoadMore = useCallback((tableWidgetId: string) => {
        const td = tableDataMapRef.current[tableWidgetId];
        /* 로딩 중이거나 더 이상 데이터 없으면 중단 */
        if (!td || !td.hasMore || td.loading || td.appendLoading) return;

        const fieldsMap = buildSearchFieldsMap(widgetItems);
        const tableWidget = flatWidgets(widgetItems).find(
            w => w.type === 'table' && (w as TableWidget).widgetId === tableWidgetId
        ) as TableWidget | undefined;
        if (!tableWidget) return;
        const connectedSlug = tableWidget.connectedSlug;
        if (!connectedSlug) return;
        const searchFields = tableWidget.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
        fetchPageTableData({
            tableWidget,
            connectedSlug,
            searchFields,
            sv: searchValuesRef.current,
            page: td.nextPage,
            sk: sortKeyMap[tableWidgetId] ?? undefined,
            sd: sortDirMap[tableWidgetId] ?? 'asc',
            append: true,
        });
    }, [widgetItems, sortKeyMap, sortDirMap, fetchPageTableData]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 로딩 ── */
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    /* ── 오류 ── */
    if (error) {
        return (
            <div className="flex items-center justify-center h-64 gap-2 text-red-500">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
            </div>
        );
    }

    return (
        <PageLayout mode="live">
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
                tableDataMap={tableDataMap}
                sortKeyMap={sortKeyMap}
                sortDirMap={sortDirMap}
                onSort={handleSortChange}
                onPageChange={handlePageChange}
                onLoadMore={handleLoadMore}
                categorySelections={categorySelections}
                onCategorySelect={handleCategorySelect}
                onRefresh={handleRefresh}
            />
        </PageLayout>
    );
}
