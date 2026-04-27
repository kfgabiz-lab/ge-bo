'use client';

/**
 * ============================================================
 *  [위젯 렌더러] /admin/templates/widget/{slug}
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
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';
import { useCodeStore } from '@/store/useCodeStore';
import { PageGridRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { AnyWidget, PageContentItem, PageWidgetItem, PageTableData } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { FormWidget } from '@/app/admin/templates/make/_shared/components/builder/FormBuilder';
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
/*  메인 페이지                                */
/* ══════════════════════════════════════════ */

export default function WidgetRendererPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const pathname = usePathname();
    const navMenus = useMenuStore((state) => state.navMenus);
    const menuName = findMenuName(navMenus, pathname || '');
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
            const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[])
                .map(item => ({ _id: item.id, ...item.dataJson }));

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

    /**
     * Form 저장/삭제 — Space 버튼 클릭 시 호출
     * connectedFormWidgetId로 Form 위젯을 찾아 connectedSlug API 호출
     * 저장 시 isPk=true인 필드의 fieldKey를 pkKeys로 함께 전송 → 서버 중복 체크
     */
    const handleFormAction = useCallback(async (connectedFormWidgetId: string, action: 'save' | 'delete') => {
        /* Form 위젯 탐색 */
        const formWidget = flatWidgets(widgetItems).find(
            w => w.type === 'form' && (w as FormWidget).widgetId === connectedFormWidgetId
        ) as FormWidget | undefined;
        if (!formWidget?.connectedSlug) {
            toast.error('연결된 Form 위젯 또는 slug를 찾을 수 없습니다.');
            return;
        }

        /* {fieldId → value} → {fieldKey → value} 변환 + PK 키 수집 */
        const rawValues = formValuesMap[connectedFormWidgetId] ?? {};
        const dataJson: Record<string, string> = {};
        const pkKeys: string[] = [];

        formWidget.fields.forEach(f => {
            const key = f.fieldKey || f.label;
            if (key) {
                dataJson[key] = rawValues[f.id] ?? '';
                if (f.isPk) pkKeys.push(key); // isPk=true 필드의 key 수집
            }
        });

        try {
            if (action === 'save') {
                /* pkKeys가 있으면 함께 전송 → 서버에서 PK 중복 체크 */
                await api.post(`/page-data/${formWidget.connectedSlug}`, {
                    dataJson,
                    ...(pkKeys.length > 0 && { pkKeys }),
                });
                toast.success('저장되었습니다.');
            } else {
                /* pkKeys와 dataJson 함께 전송 → BE에서 pk 값으로 id 조회 후 삭제 */
                await api.delete(`/page-data/${formWidget.connectedSlug}`, { data: { dataJson, ...(pkKeys.length > 0 && { pkKeys }) } });
                toast.success('삭제되었습니다.');
            }
        } catch (err: unknown) {
            /* 서버 PK 중복 에러(409) 구분 처리 */
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (action === 'save' && status === 409) {
                toast.error('이미 동일한 키 값의 데이터가 존재합니다.');
            } else {
                toast.error(action === 'save' ? '저장 중 오류가 발생했습니다.' : '삭제 중 오류가 발생했습니다.');
            }
        }
    }, [widgetItems, formValuesMap]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <PageLayout mode="live" title={menuName ?? undefined}>
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
                onFormAction={handleFormAction}
                tableDataMap={tableDataMap}
                sortKeyMap={sortKeyMap}
                sortDirMap={sortDirMap}
                onSort={handleSortChange}
                onPageChange={handlePageChange}
                onLoadMore={handleLoadMore}
            />
        </PageLayout>
    );
}
