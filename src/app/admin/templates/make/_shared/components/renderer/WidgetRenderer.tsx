'use client';

/**
 * WidgetRenderer — 위젯 타입별 통합 Dispatcher (최상위)
 *
 * widget.type에 따라 SearchRenderer / TableRenderer / FormRenderer /
 * SpaceRenderer 중 적절한 렌더러로 자동 분기한다.
 *
 * 모든 렌더러가 사용되는 곳(빌더 미리보기 / 생성 파일 / 메뉴 페이지)에서
 * 이 컴포넌트 하나만 사용해야 한다. 개별 렌더러 직접 사용 금지.
 *
 * [팝업 내부 처리 — live 모드 전용]
 * SpaceRenderer의 connType='popup' 버튼, TableRenderer의 수정·상세·파일 버튼 클릭 시
 * 아래 로직을 내부적으로 처리한다:
 *   - outputMode='page'       → router.push('/admin/widgetSub/{slug}?id={id}')
 *   - outputMode='layerpopup' → CenterPopupLayout / RightDrawerLayout + 재귀 WidgetRenderer
 *
 * 사용법:
 *   // preview (빌더 미리보기 패널)
 *   <WidgetRenderer mode="preview" widget={content.widget} contentColSpan={content.colSpan} />
 *
 *   // live — 팝업 포함
 *   <WidgetRenderer
 *     mode="live"
 *     widget={widget}
 *     dataSlug="my-list"
 *     onRefresh={() => fetchData(0)}
 *     codeGroups={codeGroups}
 *     handlers={tableHandlers}
 *     ...
 *   />
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';

/* ── Ctrl+` 단축키: hidden 필드 콘솔 출력 싱글톤 ──
 * WidgetRenderer가 여러 개 마운트되어도 리스너는 하나만 등록.
 * 각 인스턴스가 콜백을 등록하면 Ctrl+` 시 일괄 호출 */
const _hiddenLogCallbacks = new Set<() => void>();
if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.ctrlKey && e.code === 'Backquote') {
            e.preventDefault();
            e.stopPropagation();
            toast.info('🔒 Hidden 필드 콘솔 출력');
            _hiddenLogCallbacks.forEach(fn => fn());
        }
    }, { capture: true });
}
import api from '@/lib/api';
import { PageGridContainer } from '@/components/layout/page-grid-container';
import { CodeGroupDef } from '../../types';
import { SearchRenderer } from './SearchRenderer';
import { TableRenderer } from './TableRenderer';
import { FormRenderer } from './FormRenderer';
import { SpaceRenderer } from './SpaceRenderer';
import { CategoryRenderer } from './CategoryRenderer';
import { SubListRenderer } from './SubListRenderer';
import { MultiSelectRenderer } from './MultiSelectRenderer';
import { TabRenderer } from './TabRenderer';
import CenterPopupLayout from '@/components/layout/popup/center-popup-layout';
import RightDrawerLayout from '@/components/layout/popup/right-drawer-layout';
import type { AnyWidget, RendererMode, TableActionHandlers } from './types';
import type { FormFieldItem } from '../builder/FormBuilder';
import { fetchTemplateConfig } from '../../templateApi';
import type { TemplatePopupConfig } from '../../templateApi';
import { PageGridRenderer } from './PageGridRenderer';
import { validateFormFields, buildDataJson } from '../../utils';

/**
 * 팝업 폼 필드에 기존 DB 데이터를 매핑하는 내부 유틸
 * - editId가 있으면 slug+id로 dataJson 조회 후 fieldKey 기준 매핑
 * - contentKey가 있으면 dataJson[contentKey] 섹션에서 읽음 (중첩 저장 구조 대응)
 * - initialValues가 있으면 fieldKey 기준으로 덮어씀 (우선순위 최상위)
 */
async function fetchAndMapFieldValues(
    connectedSlug: string,
    editId: number | null,
    fields: FormFieldItem[],
    initialValues?: Record<string, string>,
    contentKey?: string,
): Promise<{ values: Record<string, string>; existingFileIds: Record<string, number[]>; sourceData: Record<string, unknown> }> {
    let sourceData: Record<string, unknown> = {};
    if (editId != null && connectedSlug) {
        try {
            const res = await api.get(`/page-data/${connectedSlug}/${editId}`);
            sourceData = typeof res.data.dataJson === 'string'
                ? JSON.parse(res.data.dataJson)
                : (res.data.dataJson ?? {});
        } catch { /* 조회 실패 시 빈 값으로 처리 */ }
    }

    /* contentKey가 있으면 해당 섹션에서 읽기, 없으면 root에서 읽기 */
    const section: Record<string, unknown> = (
        contentKey &&
        sourceData[contentKey] &&
        typeof sourceData[contentKey] === 'object' &&
        !Array.isArray(sourceData[contentKey])
    ) ? sourceData[contentKey] as Record<string, unknown> : sourceData;

    const values: Record<string, string>           = {};
    const existingFileIds: Record<string, number[]> = {};

    fields.forEach(f => {
        const key = f.fieldKey || f.label;
        if (f.type === 'file' || f.type === 'image') {
            const ids = section[key];
            if (Array.isArray(ids)) existingFileIds[f.id] = ids.map(Number);
        } else if (f.type === 'hidden') {
            values[f.id] = section[key] !== undefined
                ? String(section[key])
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                : ((f as any).defaultValue ?? '');
        } else if (section[key] !== undefined) {
            values[f.id] = String(section[key]);
        }
        if (initialValues && key && key in initialValues) {
            values[f.id] = initialValues[key];
        }
    });

    return { values, existingFileIds, sourceData };
}

/** 위젯 컨테이너 기본 클래스 (빈 위젯 등 미처리 타입 fallback용) */
const BASE_CLS =
    'h-full w-full rounded border bg-white border-slate-300 shadow-sm overflow-hidden p-2';


interface WidgetRendererProps {
    mode: RendererMode;
    widget: AnyWidget | null;
    /** Form 위젯 그리드 열 수 (부모 위젯의 colSpan, 기본 12) */
    contentColSpan?: number;

    /* ── live 모드 전용 — search ── */
    /** 검색폼 접기/펼치기 여부 */
    collapsible?: boolean;
    codeGroups?: CodeGroupDef[];
    searchValues?: Record<string, string>;
    onSearchChange?: (fieldId: string, value: string) => void;
    onSearch?: () => void;
    onReset?: () => void;

    /* ── live 모드 전용 — form ── */
    /** Form 위젯 필드값 (fieldId → value) */
    formValues?: Record<string, string>;
    /** Form 필드값 변경 핸들러 */
    onFormValuesChange?: (fieldId: string, value: string) => void;
    /** 페이지 내 모든 Form 위젯 통합 values — cross-form hideCondition 평가용 */
    allFormValues?: Record<string, string>;
    /** 페이지 내 모든 Form 위젯 fieldKey → fieldId 역매핑 — cross-form hideCondition 평가용 */
    allFieldKeyToId?: Record<string, string>;
    /** Space 위젯 버튼 클릭 시 컨텐츠(Form+SubList) 저장/삭제 동작 */
    onContentAction?: (connectedContentWidgetIds: string[], action: 'save' | 'delete', goBackAfterAction?: boolean) => void;
    /** Space 위젯 닫기 버튼 — 없으면 router.back() */
    onClose?: () => void;

    /* ── live 모드 전용 — form 파일 업로드 ── */
    /** 새로 선택한 파일 목록 (fieldId → File[]) */
    fileValues?: Record<string, File[]>;
    /** 기존 파일 메타 (fieldId → 메타 배열) */
    existingFileMeta?: Record<string, { id: number; origName: string; fileSize: number }[]>;
    /** 이미지 blob URL 캐시 (fileId → blob URL) */
    imgBlobUrls?: Record<number, string>;
    /** 파일 변경 핸들러 — Form: (fieldId, files) / SubList: (fieldId, files, rowId) */
    onFileChange?: (fieldId: string, files: File[], rowId?: string) => void;
    /** 기존 파일 제거 핸들러 */
    onRemoveExisting?: (fieldId: string, fileId: number) => void;

    /* ── live 모드 전용 — table ── */
    handlers?: TableActionHandlers;
    /** 테이블 실데이터 rows */
    tableData?: Record<string, unknown>[];
    /** 초기/검색 로딩 여부 */
    tableLoading?: boolean;
    sortKey?: string | null;
    sortDir?: 'asc' | 'desc';
    onSort?: (accessor: string, dir: 'asc' | 'desc') => void;
    totalElements?: number;
    totalPages?: number;
    currentPage?: number;
    onPageChange?: (page: number) => void;
    /** 무한스크롤 다음 페이지 로드 콜백 */
    onLoadMore?: () => void;
    /** 무한스크롤 추가 로딩 여부 */
    appendLoading?: boolean;
    hasMore?: boolean;

    /* ── live 모드 전용 — sublist ── */
    /** SubList 위젯별 행 데이터 (widgetId → SubListRow[]) */
    subListRowsMap?: Record<string, import('./SubListRenderer').SubListRow[]>;
    /** SubList 행 변경 콜백 — (widgetId, rows) */
    onSubListRowsChange?: (widgetId: string, rows: import('./SubListRenderer').SubListRow[]) => void;

    /* ── live 모드 전용 — multiselect ── */
    /** widgetId → 선택된 ID 배열 */
    multiSelectValuesMap?: Record<string, number[]>;
    /** 선택 변경 콜백 — (widgetId, ids) */
    onMultiSelectChange?: (widgetId: string, ids: number[]) => void;

    /* ── live 모드 전용 — category ── */
    /** 카테고리 위젯별 선택된 항목 ID (widgetId → selectedId) */
    categorySelections?: Record<string, number | null>;
    /** 카테고리 항목 선택 시 호출 — (widgetId, selectedId) */
    onCategorySelect?: (widgetId: string, selectedId: number | null) => void;

    /* ── live 모드 전용 — 팝업 컨텍스트 ── */
    /**
     * 팝업 내 저장·수정·삭제 API 호출에 사용할 page-data slug.
     * SpaceRenderer(connType='popup') 또는 TableRenderer(edit/detail) 팝업 오픈 시 참조.
     */
    dataSlug?: string;
    /** 팝업 저장·삭제 완료 후 콜백 (목록 새로고침 등) */
    /** 팝업 저장·삭제 완료 후 콜백 — 테이블 목록 새로고침 등에 사용 */
    onRefresh?: () => void;
    /**
     * 외부에서 팝업을 직접 트리거할 때 사용 (LIST 버튼바, test 페이지 등).
     * ts가 변경될 때마다 팝업을 오픈한다.
     */
    externalPopupTrigger?: {
        slug: string;
        ts: number;
        editId?: number | null;
        listSlug?: string;
    } | null;
}

export function WidgetRenderer({
    mode,
    widget,
    contentColSpan = 12,
    /* search */
    collapsible,
    codeGroups = [],
    searchValues = {},
    onSearchChange,
    onSearch,
    onReset,
    /* form */
    formValues = {},
    onFormValuesChange,
    allFormValues,
    allFieldKeyToId,
    onContentAction,
    onClose,
    /* file */
    fileValues,
    existingFileMeta,
    imgBlobUrls,
    onFileChange,
    onRemoveExisting,
    /* table */
    handlers,
    tableData,
    tableLoading,
    sortKey,
    sortDir,
    onSort,
    totalElements,
    totalPages,
    currentPage,
    onPageChange,
    onLoadMore,
    appendLoading,
    hasMore,
    /* sublist */
    subListRowsMap,
    onSubListRowsChange,
    /* multiselect */
    multiSelectValuesMap,
    onMultiSelectChange,
    /* category */
    categorySelections,
    onCategorySelect,
    /* 팝업 컨텍스트 */
    dataSlug,
    onRefresh,
    externalPopupTrigger,
}: WidgetRendererProps) {
    const router  = useRouter();
    const { t }   = useI18n();

    /* ══════════════════════════════════════════ */
    /*  내부 팝업 상태                             */
    /* ══════════════════════════════════════════ */

    const [popupOpen,            setPopupOpen]            = useState(false);
    const [popupCfg,             setPopupCfg]             = useState<TemplatePopupConfig | null>(null);
    const [popupSaving,          setPopupSaving]          = useState(false);
    const [popupEditId,          setPopupEditId]          = useState<number | null>(null);
    const [popupListSlug,        setPopupListSlug]        = useState('');
    /* 카테고리 팝업 저장 후 목록 재조회용 — 증가할 때마다 CategoryRenderer가 fetchItems 호출 */
    const [categoryRefreshTick,  setCategoryRefreshTick]  = useState(0);

    /* 팝업 폼 필드값 — widgetId → { fieldId: 값 } (page 모드 formValuesMap과 동일 구조) */
    const [popupFormValuesMap,   setPopupFormValuesMap]   = useState<Record<string, Record<string, string>>>({});
    /* 팝업 폼 새 파일 — widgetId → { fieldId: File[] } */
    const [popupFileValuesMap,   setPopupFileValuesMap]   = useState<Record<string, Record<string, File[]>>>({});
    /* 팝업 내 SubList rows 상태 — widgetId → SubListRow[] */
    const [popupSubListRowsMap,  setPopupSubListRowsMap]  = useState<Record<string, import('./SubListRenderer').SubListRow[]>>({});
    /* 팝업 내 SubList 파일 맵 — widgetId → rowId → colId → File[] */
    const [popupSubListFileMap,  setPopupSubListFileMap]  = useState<Record<string, Record<string, Record<string, File[]>>>>({});
    /* 팝업 기존 파일 메타 — widgetId → { fieldId: meta[] } (page 모드 existingFileMetaMap과 동일 구조) */
    const [popupExistingMetaMap, setPopupExistingMetaMap] = useState<
        Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>
    >({});
    const [popupImgBlobUrls,     setPopupImgBlobUrls]     = useState<Record<number, string>>({});

    /* ── Ctrl+` 단축키: hidden 필드 콘솔 출력 ──
     * 최신 상태를 ref로 유지하고 _hiddenLogCallbacks에 콜백 등록 */
    const popupCfgRef    = useRef(popupCfg);    popupCfgRef.current    = popupCfg;
    const popupFormValuesMapRef = useRef(popupFormValuesMap);  popupFormValuesMapRef.current = popupFormValuesMap;
    const formValuesRef  = useRef(formValues);   formValuesRef.current  = formValues;
    const widgetRef      = useRef(widget);       widgetRef.current      = widget;
    useEffect(() => {
        const logHidden = () => {
            /* 팝업 폼 hidden 필드 — widgetItems(PageWidgetItem[]) contents에서 form 위젯 추출 */
            const popupFields = (popupCfgRef.current?.widgetItems ?? [])
                .flatMap(item => item.contents)
                .filter(c => c.widget?.type === 'form')
                .flatMap(c => (c.widget?.fields ?? [])) as FormFieldItem[];
            const hiddenPopup = popupFields.filter(f => f.type === 'hidden');
            if (hiddenPopup.length > 0) {
                console.group('%c[Hidden] Popup Form', 'color: orange; font-weight: bold');
                hiddenPopup.forEach(f => {
                    /* 전체 formValuesMap에서 fieldId 탐색 */
                    const val = Object.values(popupFormValuesMapRef.current).find(vals => f.id in vals)?.[f.id];
                    console.log(`  ${f.fieldKey || f.label} =`, val ?? '(없음)');
                });
                console.groupEnd();
            }
            /* 일반 폼 위젯 hidden 필드 */
            const w = widgetRef.current;
            if (w?.type === 'form') {
                const hiddenForm = (w.fields as FormFieldItem[]).filter(f => f.type === 'hidden');
                if (hiddenForm.length > 0) {
                    console.group('%c[Hidden] Form Widget', 'color: orange; font-weight: bold');
                    hiddenForm.forEach(f => {
                        console.log(`  ${f.fieldKey || f.label} =`, formValuesRef.current[f.id] ?? '(없음)');
                    });
                    console.groupEnd();
                }
            }
        };
        _hiddenLogCallbacks.add(logHidden);
        return () => { _hiddenLogCallbacks.delete(logHidden); };
    }, []);

    /* ── 팝업 닫기 ── */
    const handlePopupClose = useCallback(() => {
        setPopupOpen(false);
        setPopupCfg(null);
        setPopupEditId(null);
        setPopupSubListRowsMap({});
    }, []);

    /**
     * 팝업 오픈 핸들러 (live 모드 전용)
     * @param slug          QUICK_DETAIL 템플릿 slug
     * @param editId        수정 대상 데이터 ID (신규 등록이면 null)
     * @param _listSlug     미사용 (각자 slug 독립 정책 — 팝업 폼의 connectedSlug 직접 사용)
     * @param initialValues 초기값 맵 — fieldKey 기준으로 폼 필드에 매핑 (파라미터 전달용)
     * @param groupId       다중 slug 저장 그룹 ID — page 이동 시 ?group_id=uuid 파라미터로 전달
     */
    const handleInternalPopupOpen = useCallback(async (
        slug: string,
        editId?: number | null,
        _listSlug?: string,
        initialValues?: Record<string, string>,
        groupId?: string | null,
    ) => {
        if (mode !== 'live') return;

        /* 상태 초기화 */
        setPopupCfg(null);
        setPopupSaving(false);
        setPopupEditId(editId ?? null);
        setPopupListSlug('');
        setPopupFormValuesMap({});
        setPopupFileValuesMap({});
        setPopupExistingMetaMap({});
        setPopupImgBlobUrls({});
        setPopupSubListRowsMap({});
        setPopupSubListFileMap({});

        try {
            /* 1단계: 팝업 템플릿 설정 조회 (공통 유틸) */
            const cfg = await fetchTemplateConfig(slug);

            /* outputMode='page': 팝업 없이 상세 페이지로 이동 */
            if (cfg.outputMode === 'page') {
                /* group_id 있으면 다중 slug 수정 모드 — group_id 우선 사용 */
                const params = new URLSearchParams();
                if (groupId) params.set('group_id', groupId);
                else if (editId != null) params.set('id', String(editId));
                /* initialValues(depth, parentId 등) → URL 파라미터로 직렬화 */
                if (initialValues) {
                    Object.entries(initialValues).forEach(([k, v]) => params.set(k, v));
                }
                const qs = params.toString() ? `?${params.toString()}` : '';
                router.push(`/admin/widgetSub/${slug}${qs}`);
                return;
            }

            /* widgetItems(PageWidgetItem[]) → contents에서 form 위젯 추출 */
            const formContents = cfg.widgetItems.flatMap(item => item.contents).filter(c => c.widget?.type === 'form');

            /* 팝업 저장에 사용할 slug: 첫 번째 폼 위젯의 connectedSlug */
            const formConnectedSlug = (formContents[0]?.widget?.connectedSlug as string | undefined) || '';
            setPopupListSlug(formConnectedSlug);

            /* 2단계: row 데이터 조회 + 폼 필드 매핑 — widgetId별로 분리 (page 모드와 동일 구조) */
            const formValuesAccum: Record<string, Record<string, string>>   = {};
            const fileIdsAccum:    Record<string, Record<string, number[]>> = {};
            const allFields: FormFieldItem[]                                 = [];
            let sourceData: Record<string, unknown>                          = {};

            for (const formContent of formContents) {
                const fw           = formContent.widget as { fields?: FormFieldItem[]; contentKey?: string; widgetId?: string };
                const fwWidgetId   = fw?.widgetId ?? '';
                const fwFields     = fw?.fields ?? [];
                const fwContentKey = fw?.contentKey || undefined;
                const { values: fwValues, existingFileIds: fwIds, sourceData: sd } = await fetchAndMapFieldValues(
                    formConnectedSlug,
                    editId ?? null,
                    fwFields,
                    initialValues,
                    fwContentKey,
                );
                formValuesAccum[fwWidgetId] = fwValues;
                fileIdsAccum[fwWidgetId]    = fwIds;
                allFields.push(...fwFields);
                sourceData = sd;
            }
            setPopupFormValuesMap(formValuesAccum);

            /* SubList rows 복원 — sourceData에서 contentKey 기준으로 추출 */
            const sublistContents = cfg.widgetItems.flatMap(item => item.contents).filter(c => c.widget?.type === 'sublist');
            if (sublistContents.length > 0) {
                const initSubListRows: Record<string, import('./SubListRenderer').SubListRow[]> = {};
                sublistContents.forEach(c => {
                    const sw = c.widget as { widgetId?: string; contentKey?: string };
                    const wid = sw.widgetId ?? '';
                    const section = sw.contentKey
                        ? (sourceData[sw.contentKey] as Record<string, unknown> | undefined)
                        : sourceData;
                    const rawRows = ((section?.rows ?? []) as Record<string, unknown>[]);
                    initSubListRows[wid] = rawRows.map((r, i) => ({ _rowId: `row-${i}`, ...r }));
                });
                setPopupSubListRowsMap(initSubListRows);
            }

            /* 기존 파일 메타데이터 조회 — widgetId별 구조로 저장 */
            const allIds = Object.values(fileIdsAccum).flatMap(widgetIds => Object.values(widgetIds).flat());
            if (allIds.length > 0) {
                const metaRes  = await api.get('/page-files/meta', { params: { ids: allIds.join(',') } });
                const metaData = metaRes.data as { id: number; origName: string; fileSize: number }[];

                const metaAccum: Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>> = {};
                for (const [widgetId, widgetFileIds] of Object.entries(fileIdsAccum)) {
                    metaAccum[widgetId] = {};
                    for (const [fieldId, ids] of Object.entries(widgetFileIds)) {
                        metaAccum[widgetId][fieldId] = metaData.filter(m => ids.includes(m.id));
                    }
                }
                setPopupExistingMetaMap(metaAccum);

                /* 이미지 필드 blob URL 미리 로딩 */
                const imgFieldIds = new Set(allFields.filter(f => f.type === 'image').map(f => f.id));
                const imgIds = Object.values(fileIdsAccum)
                    .flatMap(widgetIds => Object.entries(widgetIds))
                    .filter(([fid]) => imgFieldIds.has(fid))
                    .flatMap(([, ids]) => ids);
                if (imgIds.length > 0) {
                    const blobMap: Record<number, string> = {};
                    await Promise.all(imgIds.map(async id => {
                        try {
                            const blobRes = await api.get(`/page-files/${id}`, { responseType: 'blob' });
                            blobMap[id] = URL.createObjectURL(blobRes.data);
                        } catch { /* 개별 이미지 로드 실패 무시 */ }
                    }));
                    setPopupImgBlobUrls(blobMap);
                }
            }

            setPopupCfg(cfg);
            setPopupOpen(true);
        } catch {
            toast.error('팝업 설정을 불러오는 중 오류가 발생했습니다.');
        }
    }, [mode, router, dataSlug]);

    /* ── 외부 팝업 트리거 감지 (LIST 버튼바 등 WidgetRenderer 외부에서 팝업 오픈 시) ── */
    useEffect(() => {
        if (externalPopupTrigger) {
            handleInternalPopupOpen(
                externalPopupTrigger.slug,
                externalPopupTrigger.editId ?? null,
                externalPopupTrigger.listSlug || dataSlug,
            );
        }
        // externalPopupTrigger.ts가 변경될 때마다 실행
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalPopupTrigger?.ts]);

    /**
     * 팝업 내 저장·삭제 핸들러
     * SpaceRenderer의 connType='content' 버튼이 팝업 WidgetRenderer를 통해 호출
     * widgetIds 배열의 첫 번째 Form 위젯을 기준으로 동작 (팝업 내부 단순화)
     */
    const handlePopupContentAction = useCallback(async (
        _widgetIds: string[],
        action: 'save' | 'delete',
        _goBackAfterAction?: boolean,
    ) => {
        if (!popupListSlug) return;

        /* 삭제 */
        if (action === 'delete') {
            if (!popupEditId) { toast.info('삭제할 데이터가 없습니다.'); return; }
            if (!confirm('삭제하시겠습니까?')) return;
            try {
                await api.delete(`/page-data/${popupListSlug}/${popupEditId}`);
                toast.success('삭제되었습니다.');
                onRefresh?.();
                handlePopupClose();
            } catch {
                toast.error('삭제 중 오류가 발생했습니다.');
            }
            return;
        }

        /* 저장 — form/sublist 위젯 추출 */
        const saveFormContents    = (popupCfg?.widgetItems ?? []).flatMap(item => item.contents).filter(c => c.widget?.type === 'form');
        const saveSublistContents = (popupCfg?.widgetItems ?? []).flatMap(item => item.contents).filter(c => c.widget?.type === 'sublist');

        /* 유효성 검사 — form 위젯별로 수행 (page 모드와 동일) */
        for (const fc of saveFormContents) {
            const fw     = fc.widget as { fields?: FormFieldItem[]; widgetId?: string };
            const fwId   = (fw as { widgetId?: string })?.widgetId ?? '';
            const fwFields = fw?.fields as FormFieldItem[] ?? [];
            if (!validateFormFields(
                fwFields,
                popupFormValuesMap[fwId] ?? {},
                popupFileValuesMap[fwId] ?? {},
                popupExistingMetaMap[fwId] ?? {},
            )) return;
        }

        setPopupSaving(true);
        try {
            const newIds: number[] = [];

            /* 1단계: Form 파일 업로드 — widgetId별 순회 (page 모드와 동일 패턴) */
            const formFileIdsMap: Record<string, Record<string, number[]>> = {};
            for (const fc of saveFormContents) {
                const fw       = fc.widget as { fields?: FormFieldItem[]; widgetId?: string };
                const fwId     = (fw as { widgetId?: string })?.widgetId ?? '';
                const fwFields = fw?.fields as FormFieldItem[] ?? [];
                formFileIdsMap[fwId] = {};
                for (const f of fwFields) {
                    if (f.type !== 'file' && f.type !== 'image') continue;
                    const existing = (popupExistingMetaMap[fwId]?.[f.id] ?? []).map(m => m.id);
                    const newFiles = popupFileValuesMap[fwId]?.[f.id] ?? [];
                    const allIds   = [...existing];
                    for (const file of newFiles) {
                        const fd = new FormData();
                        fd.append('file', file);
                        fd.append('templateSlug', popupListSlug);
                        fd.append('fieldKey', f.fieldKey || f.label || '');
                        const uploadRes = await api.post('/page-files/upload', fd, {
                            transformRequest: (data, headers) => { if (headers) headers.delete('Content-Type'); return data; },
                        });
                        allIds.push(uploadRes.data.id);
                        newIds.push(uploadRes.data.id);
                    }
                    formFileIdsMap[fwId][f.id] = allIds;
                }
            }

            /* 2단계: SubList rows 처리 — 파일 업로드 후 processedRows 확정 */
            const processedSubListRowsMap: Record<string, Record<string, unknown>[]> = {};
            for (const sc of saveSublistContents) {
                const sw  = sc.widget as { widgetId?: string; contentKey?: string; columns?: { id: string; key: string; type: string }[] };
                const wid = sw.widgetId ?? '';
                const processedRows: Record<string, unknown>[] = [];
                for (const row of (popupSubListRowsMap[wid] ?? [])) {
                    const { _rowId, ...rest } = row;
                    const processedRow: Record<string, unknown> = { ...rest };
                    for (const col of (sw.columns ?? [])) {
                        if (!['file', 'image'].includes(col.type)) continue;
                        const existingIds = Array.isArray(processedRow[col.key]) ? (processedRow[col.key] as number[]) : [];
                        const newFiles    = popupSubListFileMap[wid]?.[_rowId]?.[col.id] ?? [];
                        const allIds      = [...existingIds];
                        for (const file of newFiles) {
                            const fd = new FormData();
                            fd.append('file', file);
                            fd.append('templateSlug', popupListSlug);
                            fd.append('fieldKey', col.key);
                            const uploadRes = await api.post('/page-files/upload', fd, {
                                transformRequest: (data, headers) => { if (headers) headers.delete('Content-Type'); return data; },
                            });
                            allIds.push(uploadRes.data.id);
                            newIds.push(uploadRes.data.id);
                        }
                        processedRow[col.key] = allIds;
                    }
                    processedRows.push(processedRow);
                }
                processedSubListRowsMap[wid] = processedRows;
            }

            /* 3단계: dataJson 구성 — 공통 함수 사용 (page 모드와 동일) */
            const allSaveWidgets = [
                ...saveFormContents.map(c => c.widget),
                ...saveSublistContents.map(c => c.widget),
            ] as Parameters<typeof buildDataJson>[0];
            const { dataJson } = buildDataJson(
                allSaveWidgets,
                popupFormValuesMap,
                formFileIdsMap,
                processedSubListRowsMap,
                {},
            );

            /* 4단계: page_data 저장 (신규 POST / 수정 PUT) */
            let savedId: number | null = null;
            if (popupEditId) {
                await api.put(`/page-data/${popupListSlug}/${popupEditId}`, { dataJson });
                savedId = popupEditId;
                toast.success('수정되었습니다.');
            } else {
                const saveRes = await api.post(`/page-data/${popupListSlug}`, { dataJson });
                savedId = saveRes.data.id;
                toast.success('저장되었습니다.');
            }

            /* 5단계: 신규 업로드 파일 dataId 연결 */
            if (newIds.length > 0 && savedId) {
                await api.patch('/page-files/link', { fileIds: newIds, dataId: savedId });
            }

            onRefresh?.();
            setCategoryRefreshTick(t => t + 1);
            handlePopupClose();
        } catch (err) {
            console.error('[WidgetRenderer] 팝업 저장 실패:', err);
            toast.error('저장 중 오류가 발생했습니다.');
        } finally {
            setPopupSaving(false);
        }
    }, [popupListSlug, popupEditId, popupCfg, popupFormValuesMap, popupFileValuesMap, popupExistingMetaMap, popupSubListRowsMap, popupSubListFileMap, handlePopupClose, onRefresh]);

    /* ══════════════════════════════════════════ */
    /*  팝업 오버레이 — live 모드 전용, 단 한 번만  */
    /* ══════════════════════════════════════════ */

    /* 팝업 내부 본문 — PageGridRenderer로 빌더와 동일한 그리드 렌더링 */
    const _popupBody = popupCfg ? (
        <>
            {/* 여백 wrapper — grid 자체에 padding 주면 셀 크기 계산이 틀어지므로 분리 */}
            <div className="px-4 pb-4">
                <PageGridContainer>
                    <PageGridRenderer
                        mode="live"
                        widgetItems={popupCfg.widgetItems as unknown as import('./PageGridRenderer').PageWidgetItem[]}
                        codeGroups={codeGroups}
                        /* 폼 — widgetId별 구조 직접 전달 (page 모드와 동일) */
                        formValuesMap={popupFormValuesMap}
                        onFormValuesChange={(wid, fieldId, value) =>
                            setPopupFormValuesMap(prev => ({
                                ...prev,
                                [wid]: { ...(prev[wid] ?? {}), [fieldId]: value },
                            }))
                        }
                        onContentAction={popupSaving ? undefined : handlePopupContentAction}
                        onClose={handlePopupClose}
                        /* 팝업 내 SubList rows */
                        subListRowsMap={popupSubListRowsMap}
                        onSubListRowsChange={(wid, rows) =>
                            setPopupSubListRowsMap(prev => ({ ...prev, [wid]: rows }))
                        }
                        /* 파일 업로드 — widgetId별 구조 직접 전달 (page 모드와 동일) */
                        fileValuesMap={popupFileValuesMap}
                        existingFileMetaMap={popupExistingMetaMap}
                        imgBlobUrls={popupImgBlobUrls}
                        onFileChange={(wid, fieldId, files, rowId?) => {
                            if (rowId !== undefined) {
                                /* SubList 파일 변경 — widgetId → rowId → colId → File[] */
                                setPopupSubListFileMap(prev => ({
                                    ...prev,
                                    [wid]: {
                                        ...(prev[wid] ?? {}),
                                        [rowId]: {
                                            ...(prev[wid]?.[rowId] ?? {}),
                                            [fieldId]: files,
                                        },
                                    },
                                }));
                            } else {
                                /* Form 파일 변경 — widgetId별 구조 */
                                setPopupFileValuesMap(prev => ({
                                    ...prev,
                                    [wid]: { ...(prev[wid] ?? {}), [fieldId]: files },
                                }));
                            }
                        }}
                        onRemoveExisting={(wid, fieldId, fileId) => {
                            setPopupExistingMetaMap(prev => ({
                                ...prev,
                                [wid]: {
                                    ...(prev[wid] ?? {}),
                                    [fieldId]: (prev[wid]?.[fieldId] ?? []).filter(m => m.id !== fileId),
                                },
                            }));
                        }}
                    />
                </PageGridContainer>
                {/* 저장 중 표시 */}
                {popupSaving && (
                    <div className="flex items-center justify-center gap-2 py-2 text-slate-400 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />저장 중...
                    </div>
                )}
            </div>
        </>
    ) : null;

    /* layerType에 따라 레이아웃 선택 */
    const popupOverlay = mode === 'live' ? (
        popupCfg?.layerType === 'right' ? (
            <RightDrawerLayout
                open={popupOpen}
                onClose={handlePopupClose}
                title={popupCfg.layerTitleMsgKey ? t(popupCfg.layerTitleMsgKey) : (popupCfg.layerTitle || '')}
            >
                {_popupBody}
            </RightDrawerLayout>
        ) : (
            <CenterPopupLayout
                open={popupOpen}
                onClose={handlePopupClose}
                title={popupCfg?.layerTitleMsgKey ? t(popupCfg.layerTitleMsgKey) : (popupCfg?.layerTitle || '')}
                layerWidth={popupCfg?.layerWidth || 'md'}
            >
                {_popupBody}
            </CenterPopupLayout>
        )
    ) : null;

    /* ══════════════════════════════════════════ */
    /*  위젯 타입별 분기                           */
    /* ══════════════════════════════════════════ */

    /* widget이 없어도 외부 트리거 팝업은 렌더링해야 하므로 Fragment로 반환 */
    if (!widget) return (
        <>
            <div className="h-full w-full" />
            {popupOverlay}
        </>
    );

    /* ── Search ── */
    if (widget.type === 'search') {
        return (
            <SearchRenderer
                mode={mode}
                rows={widget.rows ?? []}
                displayStyle={widget.displayStyle}
                values={searchValues}
                onChangeValues={onSearchChange}
                onSearch={onSearch}
                onReset={onReset}
                collapsible={collapsible}
                codeGroups={codeGroups}
            />
        );
    }

    /* ── Table ── */
    if (widget.type === 'table') {
        /* edit/detail/delete/fileClick 핸들러 — handlers 없어도 팝업·기본삭제 동작 */
        const connectedSlug = widget.connectedSlug;
        const wrappedHandlers: TableActionHandlers = {
            onEdit: (row) => {
                const actionsCol = widget.columns.find(c => c.cellType === 'actions');
                const slug = actionsCol?.editPopupSlug;
                /* _groupId: 다중 slug 저장 row — group_id 파라미터로 page 이동 */
                if (slug) { handleInternalPopupOpen(slug, row._id as number, dataSlug, undefined, row._groupId as string | null); return; }
                handlers?.onEdit?.(row);
            },
            onDetail: (row) => {
                const actionsCol = widget.columns.find(c => c.cellType === 'actions');
                const slug = actionsCol?.detailPopupSlug;
                if (slug) { handleInternalPopupOpen(slug, row._id as number, dataSlug); return; }
                handlers?.onDetail?.(row);
            },
            /* 외부 핸들러 우선, 없으면 connectedSlug로 직접 삭제 */
            onDelete: handlers?.onDelete ?? (mode === 'live' && connectedSlug
                ? async (id: number) => {
                    if (!confirm('삭제하시겠습니까?')) return;
                    try {
                        await api.delete(`/page-data/${connectedSlug}/${id}`);
                        toast.success('삭제되었습니다.');
                        onRefresh?.();
                    } catch {
                        toast.error('삭제 중 오류가 발생했습니다.');
                    }
                }
                : undefined
            ),
            onFileClick: (col, row) => {
                if (col.fileLayerSlug) {
                    handleInternalPopupOpen(col.fileLayerSlug, row._id as number, dataSlug);
                    return;
                }
                handlers?.onFileClick?.(col, row);
            },
        };

        return (
            <>
                <TableRenderer
                    mode={mode}
                    columns={widget.columns}
                    codeGroups={codeGroups}
                    handlers={wrappedHandlers}
                    pageSize={widget.pageSize}
                    displayMode={widget.displayMode}
                    data={tableData}
                    isLoading={tableLoading}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    totalElements={totalElements}
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={onPageChange}
                    onLoadMore={onLoadMore}
                    appendLoading={appendLoading}
                    hasMore={hasMore}
                />
                {/* 팝업 오버레이 (live 모드 & open 상태일 때만 렌더링) */}
                {popupOverlay}
            </>
        );
    }

    /* ── Form ── */
    if (widget.type === 'form') {
        return (
            <FormRenderer
                mode={mode}
                fields={widget.fields}
                title={widget.title}
                titleMsgKey={widget.titleMsgKey}
                description={widget.description}
                descriptionMsgKey={widget.descriptionMsgKey}
                showBorder={widget.showBorder}
                bgColor={widget.bgColor}
                contentColSpan={contentColSpan}
                codeGroups={codeGroups}
                values={formValues}
                onChangeValues={onFormValuesChange}
                allFormValues={allFormValues}
                allFieldKeyToId={allFieldKeyToId}
                fileValues={fileValues}
                existingFileMeta={existingFileMeta}
                imgBlobUrls={imgBlobUrls}
                onFileChange={onFileChange}
                onRemoveExisting={onRemoveExisting}
            />
        );
    }

    /* ── Space ── */
    if (widget.type === 'space') {
        return (
            <>
                <SpaceRenderer
                    mode={mode}
                    items={widget.items}
                    align={widget.align}
                    contentColSpan={contentColSpan}
                    showBorder={widget.showBorder}
                    bgColor={widget.bgColor}
                    onContentAction={onContentAction}
                    onClose={onClose}
                    onPopupOpen={(slug) => handleInternalPopupOpen(slug, null, dataSlug)}
                />
                {/* 팝업 오버레이 (live 모드 & open 상태일 때만 렌더링) */}
                {popupOverlay}
            </>
        );
    }

    /* ── Category ── */
    if (widget.type === 'category') {
        /* 상위 위젯의 선택값 — parentWidgetId가 있으면 categorySelections에서 조회 */
        const selectedParentId = widget.parentWidgetId
            ? (categorySelections?.[widget.parentWidgetId] ?? null)
            : null;
        return (
            <>
                <CategoryRenderer
                    mode={mode}
                    widget={widget}
                    selectedParentId={selectedParentId}
                    onSelect={onCategorySelect}
                    onPopupOpen={(slug, editId, listSlug, initialValues) =>
                        handleInternalPopupOpen(slug, editId ?? null, listSlug, initialValues)
                    }
                    refreshTick={categoryRefreshTick}
                />
                {/* 팝업 오버레이 (live 모드 & open 상태일 때만 렌더링) */}
                {popupOverlay}
            </>
        );
    }

    /* ── SubList ── */
    if (widget.type === 'sublist') {
        const subWid = (widget as { widgetId?: string }).widgetId ?? '';
        return (
            <SubListRenderer
                mode={mode}
                widget={widget}
                rows={subListRowsMap?.[subWid]}
                onChange={rows => onSubListRowsChange?.(subWid, rows)}
                onFileChange={onFileChange}
            />
        );
    }

    if (widget.type === 'multiselect') {
        const msWid = widget.widgetId;
        return (
            <MultiSelectRenderer
                mode={mode}
                widget={widget}
                selectedIds={multiSelectValuesMap?.[msWid] ?? []}
                onChange={ids => onMultiSelectChange?.(msWid, ids)}
            />
        );
    }

    if (widget.type === 'tab') {
        return <TabRenderer mode={mode} widget={widget} />;
    }

    return <div className={BASE_CLS} />;
}
