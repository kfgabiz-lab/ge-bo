'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { PageGridRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { PageWidgetItem, PageTableData } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { FormWidget } from '@/app/admin/templates/make/_shared/components/builder/FormBuilder';
import type { SubListWidget, MultiSelectWidget } from '@/app/admin/templates/make/_shared/components/renderer/types';
import type { SubListRow } from '@/app/admin/templates/make/_shared/components/renderer/SubListRenderer';
import type { AnyWidget } from '@/app/admin/templates/make/_shared/components/renderer';

import api from '@/lib/api';
import { toast } from 'sonner';
import { validateFormFields, buildDataJson } from '@/app/admin/templates/make/_shared/utils';
import { useCodeStore } from '@/store/use-code-store';
import { usePageTitleStore } from '@/store/use-page-title-store';
import { useI18n } from '@/hooks/use-i18n';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMenuPageSlug } from '@/hooks/use-menu-page-slug';
import PageLayout from '@/components/layout/page-layout';

const DEFAULT_PAGE_SIZE = 10;

/* ══════════════════════════════════════════ */
/*  메인 페이지 — /admin/widgetSub/{slug}     */
/* ══════════════════════════════════════════ */

export default function GeneratedPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const router        = useRouter();
    const searchParams  = useSearchParams();
    const dataSlug      = useMenuPageSlug(slug);
    const { groups: codeGroups, fetchGroups } = useCodeStore();
    const setPageTitle = usePageTitleStore(s => s.setPageTitle);
    const { t } = useI18n();

    /* ── 기본 상태 ── */
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState<string | null>(null);
    const [widgetItems, setWidgetItems] = useState<PageWidgetItem[]>([]);

    /* ── 검색 필드값 ── */
    const [searchValues, setSearchValues] = useState<Record<string, string>>({});
    const searchValuesRef = useRef<Record<string, string>>({});

    /* ── 테이블별 데이터 상태 ── */
    const [tableDataMap, setPageTableDataMap] = useState<Record<string, PageTableData>>({});
    const tableDataMapRef = useRef<Record<string, PageTableData>>({});

    /* ── 테이블별 정렬 ── */
    const [sortKeyMap, setSortKeyMap] = useState<Record<string, string | null>>({});
    const [sortDirMap, setSortDirMap] = useState<Record<string, 'asc' | 'desc'>>({});

    /* ── Form 위젯별 입력값 ── */
    const [formValuesMap, setFormValuesMap] = useState<Record<string, Record<string, string>>>({});

    /* ── 다중 slug 그룹 ID (수정 모드) ── */
    const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

    /* ── SubList 위젯별 행 데이터 ── */
    const [subListRowsMap, setSubListRowsMap] = useState<Record<string, SubListRow[]>>({});

    /* ── MultiSelect 위젯별 선택 ID 배열 ── */
    const [multiSelectValuesMap, setMultiSelectValuesMap] = useState<Record<string, number[]>>({});
    /** SubList 파일 — widgetId → rowId → colId → 새로 선택한 파일 목록 */
    const [subListFileMap, setSubListFileMap] = useState<Record<string, Record<string, Record<string, File[]>>>>({});

    /* ── 파일 업로드 상태 ── */
    /** widgetId → fieldId → 새로 선택한 파일 목록 */
    const [fileValuesMap,       setFileValuesMap]       = useState<Record<string, Record<string, File[]>>>({});
    /** widgetId → fieldId → 기존 파일 메타 (수정 모드) */
    const [existingFileMetaMap, setExistingFileMetaMap] = useState<Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>>({});
    /** fileId → blob URL 캐시 (이미지 필드 미리보기용) */
    const [imgBlobUrls, setImgBlobUrls] = useState<Record<number, string>>({});

    /** widgetItems에서 모든 위젯 평탄화 */
    const flatWidgets = (items: PageWidgetItem[]): AnyWidget[] =>
        items.flatMap(item => item.contents.map(c => c.widget));

    /** form/sublist/multiselect 위젯 데이터 dataJson → 상태 복원 공통 로직 */
    const restoreFromDataJson = useCallback(async (
        dataJson: Record<string, unknown>,
        targetForms: FormWidget[],
        targetSublists: SubListWidget[],
        targetMultiSelects: MultiSelectWidget[] = [],
    ) => {
        targetForms.forEach(fw => {
            const section = (fw.contentKey && dataJson[fw.contentKey])
                ? dataJson[fw.contentKey] as Record<string, unknown>
                : dataJson;
            const vals: Record<string, string> = {};
            fw.fields.forEach(f => {
                if (f.fieldKey && section[f.fieldKey] !== undefined) {
                    const raw = section[f.fieldKey];
                    if (!Array.isArray(raw)) vals[f.id] = String(raw ?? '');
                }
            });
            setFormValuesMap(prev => ({ ...prev, [fw.widgetId]: vals }));
        });

        targetSublists.forEach(sw => {
            const section = (sw.contentKey && dataJson[sw.contentKey])
                ? dataJson[sw.contentKey] as Record<string, unknown>
                : {};
            const rawRows = (section.rows ?? []) as Record<string, unknown>[];
            setSubListRowsMap(prev => ({
                ...prev,
                [sw.widgetId]: rawRows.map((r, i) => ({ _rowId: `row-${i}`, ...r })),
            }));
        });

        /* MultiSelect 복원 — contentKey 배열 값을 number[] 로 복원 */
        targetMultiSelects.forEach(mw => {
            if (!mw.contentKey) return;
            const raw = dataJson[mw.contentKey];
            if (Array.isArray(raw)) {
                setMultiSelectValuesMap(prev => ({
                    ...prev,
                    [mw.widgetId]: (raw as unknown[]).filter(x => typeof x === 'number') as number[],
                }));
            }
        });

        /* 파일 메타 로드 */
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

                targetForms.forEach(fw => {
                    const section = (fw.contentKey && dataJson[fw.contentKey])
                        ? dataJson[fw.contentKey] as Record<string, unknown>
                        : dataJson;
                    /* image 타입만 imageFieldIds에 포함 — media는 파일별 mimeType으로 개별 판별 */
                    const imageFieldIds = new Set(fw.fields.filter(f => f.type === 'image').map(f => f.id));
                    const metaByFieldId: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
                    fw.fields.forEach(f => {
                        if (!f.fieldKey || (f.type !== 'file' && f.type !== 'image' && f.type !== 'media')) return;
                        const ids = section[f.fieldKey];
                        if (!Array.isArray(ids)) return;
                        metaByFieldId[f.id] = (ids as number[]).map(id => {
                            const m = metaList.find(m => m.id === id);
                            return m ? { id: m.id, origName: m.origName, fileSize: m.fileSize } : { id, origName: '', fileSize: 0 };
                        });
                        if (imageFieldIds.has(f.id)) {
                            (ids as number[]).forEach(id => {
                                api.get(`/page-files/${id}`, { responseType: 'blob' })
                                    .then(blobRes => setImgBlobUrls(prev => ({ ...prev, [id]: URL.createObjectURL(blobRes.data) })))
                                    .catch(() => {});
                            });
                        } else if (f.type === 'media') {
                            /* media 타입: 이미지·동영상 모두 blob URL 생성 (이미지→img, 동영상→video) */
                            (ids as number[]).forEach(id => {
                                api.get(`/page-files/${id}`, { responseType: 'blob' })
                                    .then(blobRes => setImgBlobUrls(prev => ({ ...prev, [id]: URL.createObjectURL(blobRes.data) })))
                                    .catch(() => {});
                            });
                        }
                    });
                    setExistingFileMetaMap(prev => ({ ...prev, [fw.widgetId]: metaByFieldId }));
                });
            }
        } catch { /* 파일 없으면 조용히 처리 */ }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
     * 테이블 위젯 데이터 fetch
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
            const rows = (res.data.content as {
                id: number;
                groupId?: string | null;
                dataJson: Record<string, unknown>;
                createdAt?: string | null;
                createdBy?: string | null;
                updatedAt?: string | null;
                updatedBy?: string | null;
            }[])
                .map(item => {
                    /* _id: 단건 PK, _groupId: 다중 slug 그룹 ID (수정 버튼 URL 파라미터에 사용) */
                    const flat: Record<string, unknown> = { _id: item.id, _groupId: item.groupId ?? null };
                    Object.entries(item.dataJson ?? {}).forEach(([k, v]) => {
                        if (k === 'id') return;
                        if (v && typeof v === 'object' && !Array.isArray(v)) {
                            Object.assign(flat, v); /* contentKey wrapper 펼치기 */
                        } else {
                            flat[k] = v;
                        }
                    });
                    /* 감사 컬럼 — 테이블에서 createdAt/createdBy/updatedAt/updatedBy 키로 사용 가능 */
                    flat['createdAt'] = item.createdAt ?? null;
                    flat['createdBy'] = item.createdBy ?? null;
                    flat['updatedAt'] = item.updatedAt ?? null;
                    flat['updatedBy'] = item.updatedBy ?? null;
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

    /* ── 템플릿 로딩 ── */
    useEffect(() => {
        fetchGroups();
        api.get(`/page-templates/by-slug/${slug}`)
            .then(async res => {
                const raw = JSON.parse(res.data.configJson) as Record<string, unknown>;
                const items: PageWidgetItem[] = raw.widgetItems ? raw.widgetItems as PageWidgetItem[] : [];
                setWidgetItems(items);
                /* 빌더에서 설정한 페이지 제목을 전역 스토어에 저장 (메뉴명 없을 때 폴백으로 사용)
                 * pageTitleMsgKey 우선 → 없으면 pageTitle 직접 텍스트 사용 */
                const msgKey = (raw.pageTitleMsgKey as string) || '';
                setPageTitle(msgKey ? t(msgKey) : ((raw.pageTitle as string) || ''));

                /* Table 위젯 초기 데이터 fetch */
                const fieldsMap = buildSearchFieldsMap(items);
                flatWidgets(items).forEach(w => {
                    if (w.type !== 'table') return;
                    const tw = w as TableWidget;
                    if (!tw.connectedSlug) return;
                    const searchFields = tw.connectedSearchIds.flatMap(sid => fieldsMap[sid] ?? []);
                    fetchTableData({ tableWidget: tw, connectedSlug: tw.connectedSlug, searchFields, sv: {} });
                });

                /* 수정 모드 초기 데이터 로드
                 * - ?group_id=uuid : 다중 slug 수정 — 각 form slug별로 개별 조회
                 * - ?id=123        : 단일 slug 수정 — 기존 방식 유지
                 */
            })
            .catch(() => setError('페이지를 불러오는 중 오류가 발생했습니다.'))
            .finally(() => setLoading(false));
    }, [slug, fetchGroups]); // eslint-disable-line react-hooks/exhaustive-deps

    /* tableDataMap ref 동기화 */
    useEffect(() => { tableDataMapRef.current = tableDataMap; }, [tableDataMap]);

    /* ── 수정 모드 데이터 복원 — widgetItems·searchParams 변화 시 재실행 ──
     * ?group_id=uuid : 다중 slug 수정 — 각 form slug별로 개별 조회
     * ?id=123        : 단일 slug 수정 — 기존 방식 유지
     * 둘 다 없으면   : 신규 입력 모드 — form 값 초기화
     */
    useEffect(() => {
        if (widgetItems.length === 0) return;

        const allWidgets        = flatWidgets(widgetItems);
        const formWidgets       = allWidgets.filter(w => w.type === 'form') as FormWidget[];
        const sublistWidgets    = allWidgets.filter(w => w.type === 'sublist') as SubListWidget[];
        const multiSelectWidgets = allWidgets.filter(w => w.type === 'multiselect') as MultiSelectWidget[];

        const queryGroupId = searchParams.get('group_id');
        const queryId      = searchParams.get('id');

        if (queryGroupId) {
            setCurrentGroupId(queryGroupId);
            const slugSet = new Set(
                [
                    ...formWidgets.map(fw => fw.connectedSlug),
                    ...sublistWidgets.map(sw => sw.connectedSlug),
                    ...multiSelectWidgets.map(mw => mw.connectedSlug),
                ].filter((s): s is string => !!s)
            );
            slugSet.forEach(s => {
                api.get(`/page-data/${s}/group/${queryGroupId}`)
                    .then(async dataRes => {
                        const dataJson: Record<string, unknown> = dataRes.data.dataJson || {};
                        const slugForms        = formWidgets.filter(fw => fw.connectedSlug === s);
                        const slugSublists     = sublistWidgets.filter(sw => sw.connectedSlug === s);
                        const slugMultiSelects = multiSelectWidgets.filter(mw => mw.connectedSlug === s);
                        await restoreFromDataJson(dataJson, slugForms, slugSublists, slugMultiSelects);
                    })
                    .catch(() => {});
            });
        } else if (queryId) {
            const formWidget    = formWidgets[0];
            const connectedSlug = formWidget?.connectedSlug;
            if (connectedSlug) {
                api.get(`/page-data/${connectedSlug}/${Number(queryId)}`)
                    .then(async dataRes => {
                        const dataJson: Record<string, unknown> = dataRes.data.dataJson || {};
                        await restoreFromDataJson(dataJson, formWidgets, sublistWidgets, multiSelectWidgets);
                    })
                    .catch(() => toast.error('기존 데이터를 불러오는 중 오류가 발생했습니다.'));
            }
        } else {
            /* 신규 모드 — 필드별 기본값 + URL params(initialValues) 적용 */
            setCurrentGroupId(null);
            setMultiSelectValuesMap({});
            const initMap: Record<string, Record<string, string>> = {};
            /* 오늘 날짜 (YYYY-MM-DD) — date 필드 defaultToday에 사용 */
            const todayStr = new Date().toISOString().slice(0, 10);
            formWidgets.forEach(fw => {
                const vals: Record<string, string> = {};
                fw.fields.forEach(f => {
                    const key = f.fieldKey || f.label || '';
                    const urlVal = key ? searchParams.get(key) : null;

                    if (f.type === 'date' && f.defaultToday) {
                        /* 오늘 날짜 자동 설정 */
                        vals[f.id] = urlVal ?? todayStr;
                    } else if (f.defaultOptionValue && (f.type === 'select' || f.type === 'radio' || f.type === 'checkbox')) {
                        /* 옵션 기본 선택값 */
                        vals[f.id] = urlVal ?? f.defaultOptionValue;
                    } else if (f.defaultValueMsgKey) {
                        /* 다국어 기본값 — 현재 언어로 번역 후 세팅 */
                        vals[f.id] = urlVal ?? t(f.defaultValueMsgKey);
                    } else if (f.defaultValue) {
                        /* 직접 텍스트 기본값 (hidden 포함) */
                        vals[f.id] = urlVal ?? f.defaultValue;
                    }
                });
                initMap[fw.widgetId] = vals;
            });
            setFormValuesMap(initMap);
        }
    }, [widgetItems, searchParams, restoreFromDataJson]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 핸들러 ── */

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
        action: 'save' | 'delete',
        goBackAfterAction?: boolean
    ) => {
        const allFlat = flatWidgets(widgetItems);

        /* 대상 위젯 수집 — form / sublist / multiselect 모두 포함 */
        const targetWidgets = connectedContentWidgetIds
            .map(wid => allFlat.find(w =>
                (w.type === 'form' || w.type === 'sublist' || w.type === 'multiselect') &&
                (w as FormWidget | SubListWidget | MultiSelectWidget).widgetId === wid
            ))
            .filter(Boolean) as (FormWidget | SubListWidget | MultiSelectWidget)[];

        if (targetWidgets.length === 0) return;

        /* slug별 그룹핑 — 같은 slug의 위젯은 하나의 page_data에 통합, 다른 slug는 별도 저장 */
        const slugGroupsMap = new Map<string, (FormWidget | SubListWidget | MultiSelectWidget)[]>();
        for (const w of targetWidgets) {
            const s = (w as FormWidget | SubListWidget | MultiSelectWidget).connectedSlug;
            if (!s) continue;
            if (!slugGroupsMap.has(s)) slugGroupsMap.set(s, []);
            slugGroupsMap.get(s)!.push(w);
        }
        if (slugGroupsMap.size === 0) return;

        /* URL 파라미터로 수정 모드 구분 */
        const storedGroupId = searchParams.get('group_id') ?? currentGroupId;
        const storedId      = searchParams.get('id') ? Number(searchParams.get('id')) : null;
        const isUpdate      = !!(storedGroupId || storedId);

        try {
            /* ── DELETE ── */
            if (action === 'delete') {
                if (!isUpdate) { toast.info('삭제할 데이터가 없습니다.'); return; }
                if (!confirm('삭제하시겠습니까?')) return;

                if (storedGroupId) {
                    /* 다중 slug — group_id 기반 일괄 삭제 (첫 번째 slug로 API 호출) */
                    const firstSlug = slugGroupsMap.keys().next().value!;
                    await api.delete(`/page-data/${firstSlug}/group/${storedGroupId}`);
                } else {
                    /* 단일 slug */
                    const firstSlug = slugGroupsMap.keys().next().value!;
                    await api.delete(`/page-data/${firstSlug}/${storedId}`);
                }
                toast.success('삭제되었습니다.');
                router.back();
                return;
            }

            /* ── SAVE ── */

            /* 0. 유효성 검사 — Form 위젯 전체 */
            for (const w of targetWidgets) {
                if (w.type !== 'form') continue;
                const fw = w as FormWidget;
                if (!validateFormFields(fw.fields, formValuesMap[fw.widgetId] ?? {}, fileValuesMap[fw.widgetId] ?? {}, existingFileMetaMap[fw.widgetId] ?? {})) return;
            }

            /* 다중 slug 저장 시 confirm */
            const slugGroups = Array.from(slugGroupsMap.entries());
            if (slugGroups.length > 1 && !isUpdate) {
                const slugNames = slugGroups.map(([s]) => s).join(', ');
                if (!confirm(`다음 ${slugGroups.length}개 항목에 저장됩니다:\n${slugNames}\n\n계속하시겠습니까?`)) return;
            }

            /* group_id 결정 — 신규: 생성, 수정: 기존 유지 */
            const groupId = slugGroups.length > 1
                ? (storedGroupId ?? crypto.randomUUID())
                : undefined;

            /* slug 그룹별 반복 저장 */
            for (const [connectedSlug, widgets] of slugGroups) {
                const newFileIdsByFieldId: Record<string, number[]> = {};

                /* 1. 파일 업로드 */
                for (const w of widgets) {
                    if (w.type !== 'form') continue;
                    const fw = w as FormWidget;
                    for (const [fieldId, files] of Object.entries(fileValuesMap[fw.widgetId] ?? {})) {
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

                /* 2. SubList rows 처리 — 파일 업로드 후 processedRows 확정 */
                const processedSubListRowsMap: Record<string, Record<string, unknown>[]> = {};
                for (const w of widgets) {
                    if (w.type !== 'sublist') continue;
                    const sw = w as SubListWidget;
                    const processedRows: Record<string, unknown>[] = [];
                    for (const row of (subListRowsMap[sw.widgetId] ?? [])) {
                        const { _rowId, ...rest } = row;
                        const processedRow: Record<string, unknown> = { ...rest };
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
                    processedSubListRowsMap[sw.widgetId] = processedRows;
                }

                /* 3. formFileIdsMap 구성 — 기존 meta ID + 신규 업로드 ID 합산 */
                const formFileIdsMap: Record<string, Record<string, number[]>> = {};
                for (const w of widgets) {
                    if (w.type !== 'form') continue;
                    const fw = w as FormWidget;
                    formFileIdsMap[fw.widgetId] = {};
                    for (const f of fw.fields) {
                        if (f.type !== 'file' && f.type !== 'image' && f.type !== 'media') continue;
                        const existingIds = (existingFileMetaMap[fw.widgetId]?.[f.id] ?? []).map(m => m.id);
                        formFileIdsMap[fw.widgetId][f.id] = [...existingIds, ...(newFileIdsByFieldId[f.id] ?? [])];
                    }
                }

                /* 4. data_json 구성 — 공통 함수 사용 */
                const multiSelectMap: Record<string, number[]> = {};
                for (const w of widgets) {
                    if (w.type !== 'multiselect') continue;
                    const mw = w as MultiSelectWidget;
                    multiSelectMap[mw.widgetId] = multiSelectValuesMap[mw.widgetId] ?? [];
                }
                const { dataJson, pkKeys } = buildDataJson(
                    widgets as Parameters<typeof buildDataJson>[0],
                    formValuesMap,
                    formFileIdsMap,
                    processedSubListRowsMap,
                    multiSelectMap,
                );

                /* 3. 저장 (생성 or 수정) */
                let savedDataId: number;
                /* 수정 대상 id 결정: group_id 있으면 BE에서 group_id+slug로 조회해 얻은 id, 없으면 storedId */
                const slugStoredId = storedGroupId
                    ? await api.get(`/page-data/${connectedSlug}/group/${storedGroupId}`)
                        .then(r => r.data.id as number).catch(() => null)
                    : storedId;

                if (slugStoredId) {
                    await api.put(`/page-data/${connectedSlug}/${slugStoredId}`, { dataJson, templateSlug: slug });
                    savedDataId = slugStoredId;
                } else {
                    const res = await api.post(`/page-data/${connectedSlug}`, {
                        dataJson,
                        ...(pkKeys.length > 0 && { pkKeys }),
                        ...(groupId && { groupId }),
                        templateSlug: slug,
                    });
                    savedDataId = res.data.id;
                }

                /* 4. 업로드 파일 → page_data 레코드 연결 */
                const allNewIds = Object.values(newFileIdsByFieldId).flat();
                if (allNewIds.length > 0) {
                    await api.patch('/page-files/link', { fileIds: allNewIds, dataId: savedDataId });
                    setFileValuesMap(prev => {
                        const next = { ...prev };
                        widgets.forEach(w => { if (w.type === 'form') delete next[(w as FormWidget).widgetId]; });
                        return next;
                    });
                }

                /* 5. 저장 후 파일 메타 재조회 */
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
                        for (const w of widgets) {
                            if (w.type !== 'form') continue;
                            const fw = w as FormWidget;
                            const section = fw.contentKey ? dataJson[fw.contentKey] as Record<string, unknown> : dataJson;
                            /* image 타입만 imageFieldIds에 포함 — media는 파일별 mimeType으로 개별 판별 */
                            const imageFieldIds = new Set(fw.fields.filter(f => f.type === 'image').map(f => f.id));
                            const metaByFieldId: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
                            fw.fields.forEach(f => {
                                if (!f.fieldKey || (f.type !== 'file' && f.type !== 'image' && f.type !== 'media')) return;
                                const ids = section[f.fieldKey];
                                if (!Array.isArray(ids)) return;
                                metaByFieldId[f.id] = (ids as number[]).map(id => {
                                    const m = metaList.find(m => m.id === id);
                                    return m ? { id: m.id, origName: m.origName, fileSize: m.fileSize } : { id, origName: '', fileSize: 0 };
                                });
                                if (imageFieldIds.has(f.id)) {
                                    (ids as number[]).forEach(id => {
                                        if (imgBlobUrls[id]) return;
                                        api.get(`/page-files/${id}`, { responseType: 'blob' })
                                            .then(blobRes => setImgBlobUrls(prev => ({ ...prev, [id]: URL.createObjectURL(blobRes.data) })))
                                            .catch(() => {});
                                    });
                                } else if (f.type === 'media') {
                                    /* media 타입: 이미지·동영상 모두 blob URL 생성 (이미지→img, 동영상→video) */
                                    (ids as number[]).forEach(id => {
                                        if (imgBlobUrls[id]) return;
                                        api.get(`/page-files/${id}`, { responseType: 'blob' })
                                            .then(blobRes => setImgBlobUrls(prev => ({ ...prev, [id]: URL.createObjectURL(blobRes.data) })))
                                            .catch(() => {});
                                    });
                                }
                            });
                            setExistingFileMetaMap(prev => ({ ...prev, [fw.widgetId]: metaByFieldId }));
                        }
                    }
                } catch { /* 파일 메타 갱신 실패는 조용히 처리 */ }
            } /* slug 그룹 반복 끝 */

            toast.success(isUpdate ? '수정되었습니다.' : '저장되었습니다.');

            if (goBackAfterAction) {
                router.back();
                return;
            }

        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (action === 'save' && status === 409) {
                toast.error('이미 동일한 키 값의 데이터가 존재합니다.');
            } else {
                toast.error(action === 'save' ? '저장 중 오류가 발생했습니다.' : '삭제 중 오류가 발생했습니다.');
            }
        }
    }, [widgetItems, formValuesMap, fileValuesMap, subListRowsMap, subListFileMap, existingFileMetaMap, imgBlobUrls, multiSelectValuesMap, router, searchParams, currentGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

    /** 파일 선택 핸들러 — Form: rowId 없음 / SubList: rowId 있음 */
    const handleFileChange = useCallback((widgetId: string, fieldId: string, files: File[], rowId?: string) => {
        if (rowId !== undefined) {
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

    /* 팝업 저장에 사용할 dataSlug 사전 계산 */
    const resolvedDataSlug = useMemo(() => {
        const tw = flatWidgets(widgetItems).find(w => w.type === 'table') as TableWidget | undefined;
        return tw?.connectedSlug ?? dataSlug;
    }, [widgetItems, dataSlug]);

    /* 팝업 저장 후 테이블 새로고침 */
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
                multiSelectValuesMap={multiSelectValuesMap}
                onMultiSelectChange={(wId, ids) => setMultiSelectValuesMap(prev => ({ ...prev, [wId]: ids }))}
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
                pageSlug={slug}
            />
        </PageLayout>
    );
}
