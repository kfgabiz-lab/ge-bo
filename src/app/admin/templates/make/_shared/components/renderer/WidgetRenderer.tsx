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
import type { TableWidget } from '../builder/TableBuilder';
import type { FormFieldItem } from '../builder/FormBuilder';
import { fetchTemplateConfig } from '../../templateApi';
import type { TemplatePopupConfig } from '../../templateApi';
import { PageGridRenderer } from './PageGridRenderer';
import type { PageTableData } from './PageGridRenderer';
import { PrivacyReasonModal } from '@/components/ui/privacy-reason-modal';
import { validateFormFields, validateSubListRows, buildDataJson, uploadFiles, flattenPageDataItem, parseActionParams, saveTableRows, validateDataSaveWidgets, processFormFilesAndSubList, codeDetailToLabel } from '../../utils';

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
        if (initialValues && key) {
            /* contentKey.fieldKey 형태 우선 매칭, 없으면 fieldKey 단독 매칭 */
            const fullKey      = contentKey ? `${contentKey}.${key}` : key;
            const matchedValue = initialValues[fullKey] ?? initialValues[key];
            if (matchedValue !== undefined) values[f.id] = matchedValue;
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
    /** cross-form 데이터생성 실시간 자동입력 콜백 — 어느 폼이든 fieldId로 값 업데이트 */
    onChangeAllFormValues?: (fieldId: string, value: string) => void;
    /** 페이지 내 모든 Form 위젯 통합 values — cross-form hideCondition 평가용 */
    allFormValues?: Record<string, string>;
    /** 페이지 내 모든 Form 위젯 fieldKey → fieldId 역매핑 — cross-form hideCondition 평가용 */
    allFieldKeyToId?: Record<string, string>;
    /** URL 쿼리 파라미터 — hideCondition/disableCondition에서 URL 파라미터 참조용 (key → value) */
    urlParams?: Record<string, string>;
    /** cross-tab 공유 폼 값 — TabRenderer가 관리, 다른 탭 필드 hide/disable 조건 평가용 (fieldKey → value) */
    crossTabFormValues?: Record<string, string>;
    /** Space 위젯 버튼 클릭 시 컨텐츠(Form+SubList) 저장/삭제 동작 */
    onContentAction?: (connectedContentWidgetIds: string[], action: 'save' | 'delete', goBackAfterAction?: boolean) => void;
    /** Space 위젯 버튼 클릭 시 데이터저장 동작 — connType='datasave' 전용 */
    onDataSave?: (connectedContentWidgetIds: string[], dataSaveSlug: string, goBackAfterAction?: boolean) => void;
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
    /** 행 다중선택 체크박스 활성화 여부 */
    enableRowSelection?: boolean;
    /** 현재 선택된 행 ID 배열 */
    selectedRowIds?: number[];
    /** 행 선택 변경 콜백 */
    onRowsSelect?: (selectedIds: number[]) => void;
    /** 테이블 실데이터 rows */
    tableData?: Record<string, unknown>[];
    /** 초기/검색 로딩 여부 */
    tableLoading?: boolean;
    sortKey?: string | null;
    sortDir?: 'asc' | 'desc';
    onSort?: (accessor: string, dir: 'asc' | 'desc' | null) => void;
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
    /** widgetId → itemId → fieldKey → value */
    multiSelectExtraFieldValuesMap?: Record<string, Record<number, Record<string, string>>>;
    /** extraField 값 변경 콜백 — (widgetId, itemId, fieldKey, value) */
    onMultiSelectExtraFieldChange?: (widgetId: string, itemId: number, fieldKey: string, value: string) => void;

    /* ── live 모드 전용 — category ── */
    /** 카테고리 위젯별 선택된 항목 ID (widgetId → selectedId) */
    categorySelections?: Record<string, number | null>;
    /** 카테고리 항목 선택 시 호출 — (widgetId, selectedId) */
    onCategorySelect?: (widgetId: string, selectedId: number | null) => void;

    /* ── live 모드 전용 — 엑셀 다운로드 ── */
    /**
     * widgetId → TableWidget 맵 — Space 위젯의 엑셀 다운로드 버튼이 참조할 테이블 위젯 정보
     * 페이지에 배치된 모든 TableWidget을 widgetId 기준으로 구성하여 전달
     */
    tableWidgetsMap?: Record<string, TableWidget>;
    /**
     * 현재 검색 파라미터 — 엑셀 다운로드 시 동일한 필터 조건으로 전체 데이터 추출
     * page.tsx에서 관리 중인 searchParams 상태를 그대로 전달
     */
    currentSearchParams?: Record<string, string>;
    /**
     * preview 모드 전용 — 엑셀 다운로드 버튼 클릭 시 호출 (builder-contents-layout 팝업 UI 미리보기용)
     */
    onExcelDownloadPreview?: () => void;

    /* ── live 모드 전용 — 팝업 컨텍스트 ── */
    /**
     * 팝업 내 저장·수정·삭제 API 호출에 사용할 page-data slug.
     * SpaceRenderer(connType='popup') 또는 TableRenderer(edit/detail) 팝업 오픈 시 참조.
     */
    dataSlug?: string;
    /** 팝업 저장·삭제 완료 후 콜백 — 테이블 목록 새로고침 등에 사용 */
    onRefresh?: () => void;
    /** 현재 페이지 slug — 팝업 저장 시 templateSlug로 전달 */
    pageSlug?: string;
    /** 진입 페이지의 메인 연결 slug — TabRenderer에 전달하여 탭 내부 저장 시 우선 적용 */
    mainConnectedSlug?: string;
    /** 이탈체크 활성 여부 — TabRenderer에 전달하여 탭 내부 폼 변경 감지 */
    leaveCheck?: boolean;
    /** _fetchedRel{id} 원본 데이터 — FormRenderer rowData dot-notation 확장용 */
    fetchRelData?: Record<string, unknown>;
    /**
     * 외부에서 팝업을 직접 트리거할 때 사용 (LIST 버튼바, test 페이지 등).
     * ts가 변경될 때마다 팝업을 오픈한다.
     */
    externalPopupTrigger?: {
        slug: string;
        ts: number;
        editId?: number | null;
        listSlug?: string;
        /** Actions 파라미터 파싱 결과 — listGenerator가 setTablePopup 시 전달 */
        initialValues?: Record<string, string>;
    } | null;
}

/** 외부 URL 정규화 — 프로토콜(http/https)이 없으면 https:// 를 붙여준다 (버튼 셀 외부 URL 연결용) */
function normalizeExternalUrl(url: string): string {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** dot notation으로 중첩 필드 값 업데이트 (inlineEdit 낙관적 업데이트용) */
function applyDotField(obj: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
    const idx = key.indexOf('.');
    if (idx === -1) return { ...obj, [key]: value };
    const head = key.slice(0, idx);
    const tail = key.slice(idx + 1);
    return { ...obj, [head]: applyDotField((obj[head] as Record<string, unknown>) ?? {}, tail, value) };
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
    onChangeAllFormValues,
    allFormValues,
    allFieldKeyToId,
    urlParams,
    crossTabFormValues,
    onContentAction,
    onDataSave,
    onClose,
    /* file */
    fileValues,
    existingFileMeta,
    imgBlobUrls,
    onFileChange,
    onRemoveExisting,
    /* table */
    handlers,
    enableRowSelection,
    selectedRowIds,
    onRowsSelect,
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
    multiSelectExtraFieldValuesMap,
    onMultiSelectExtraFieldChange,
    /* category */
    categorySelections,
    onCategorySelect,
    /* 엑셀 다운로드 */
    tableWidgetsMap,
    currentSearchParams,
    onExcelDownloadPreview,
    /* 팝업 컨텍스트 */
    dataSlug,
    onRefresh,
    pageSlug,
    mainConnectedSlug,
    leaveCheck,
    externalPopupTrigger,
    fetchRelData,
}: WidgetRendererProps) {
    const router  = useRouter();
    const { t }   = useI18n();

    /* ══════════════════════════════════════════ */
    /*  내부 팝업 상태                             */
    /* ══════════════════════════════════════════ */

    /* 개인정보 사유 팝업 */
    const [showPrivacyModal,     setShowPrivacyModal]     = useState(false);
    const [pendingTableWidgetId, setPendingTableWidgetId] = useState<string | null>(null);

    const [popupOpen,            setPopupOpen]            = useState(false);
    const [popupCfg,             setPopupCfg]             = useState<TemplatePopupConfig | null>(null);
    const [popupSaving,          setPopupSaving]          = useState(false);
    const [popupEditId,          setPopupEditId]          = useState<number | null>(null);
    const [popupListSlug,        setPopupListSlug]        = useState('');
    /* 카테고리 팝업 저장 후 목록 재조회용 — 증가할 때마다 CategoryRenderer가 fetchItems 호출 */
    const [categoryRefreshTick,  setCategoryRefreshTick]  = useState(0);

    /* inlineEdit 낙관적 업데이트 — tableData prop 동기화 + 즉시 반영 */
    const [localTableData, setLocalTableData] = useState<Record<string, unknown>[] | undefined>(tableData);
    useEffect(() => { setLocalTableData(tableData); }, [tableData]);

    /* 팝업 폼 필드값 — widgetId → { fieldId: 값 } (page 모드 formValuesMap과 동일 구조) */
    const [popupFormValuesMap,   setPopupFormValuesMap]   = useState<Record<string, Record<string, string>>>({});
    /* 팝업 폼 새 파일 — widgetId → { fieldId: File[] } */
    const [popupFileValuesMap,   setPopupFileValuesMap]   = useState<Record<string, Record<string, File[]>>>({});
    /* 팝업 내 SubList rows 상태 — widgetId → SubListRow[] */
    const [popupSubListRowsMap,  setPopupSubListRowsMap]  = useState<Record<string, import('./SubListRenderer').SubListRow[]>>({});
    /* 팝업 내 SubList 파일 맵 — widgetId → rowId → colId → File[] */
    const [popupSubListFileMap,  setPopupSubListFileMap]  = useState<Record<string, Record<string, Record<string, File[]>>>>({});
    /* 팝업 내 MultiSelect 선택 ID — widgetId → number[] */
    const [popupMultiSelectValuesMap, setPopupMultiSelectValuesMap] = useState<Record<string, number[]>>({});
    /* 팝업 기존 파일 메타 — widgetId → { fieldId: meta[] } (page 모드 existingFileMetaMap과 동일 구조) */
    const [popupExistingMetaMap, setPopupExistingMetaMap] = useState<
        Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>
    >({});
    const [popupImgBlobUrls,     setPopupImgBlobUrls]     = useState<Record<number, string>>({});
    /* 팝업 내 테이블 데이터 — widgetId → PageTableData */
    const [popupTableDataMap,       setPopupTableDataMap]       = useState<Record<string, PageTableData>>({});
    const [popupSortKeyMap,         setPopupSortKeyMap]         = useState<Record<string, string | null>>({});
    const [popupSortDirMap,         setPopupSortDirMap]         = useState<Record<string, 'asc' | 'desc'>>({});
    /* 팝업 내 테이블 행 선택 — widgetId → 선택된 행 ID 배열 */
    const [popupTableSelectedRowsMap, setPopupTableSelectedRowsMap] = useState<Record<string, number[]>>({});
    /* paramSave extras — 폼에 없는 파라미터 임시 보관 (저장 버튼 클릭 시 dataJson에 병합) */
    const [popupParamSaveExtras, setPopupParamSaveExtras] = useState<Record<string, unknown>>({});
    /* 카테고리 등록(datasave) 팝업 컨텍스트 — relationSlugId 설정된 depth2+ 위젯의 등록 팝업일 때만 값 존재.
     * 팝업 내 테이블 행선택 저장 성공 직후 { depth, parentId, refId } 경량 row를 카테고리 dbSlug에 추가 저장할 때 사용 */
    const [popupCategoryLinkCtx, setPopupCategoryLinkCtx] = useState<{
        relationSlugId: number; dbSlug: string; depth: number; parentId: number | null;
    } | null>(null);

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

    /**
     * 실제 엑셀 다운로드 실행 — reason이 있으면 API에 함께 전송 (개인정보 사유 로깅)
     */
    const doExcelDownload = useCallback(async (tableWidgetId: string, reason?: string) => {
        const tableWidget = tableWidgetsMap?.[tableWidgetId];
        if (!tableWidget?.connectedSlug) {
            toast.error('다운로드할 테이블 정보가 없습니다.');
            return;
        }
        try {
            /* actions 타입 컬럼 제외 — 데이터 컬럼만 추출 */
            const validCols = tableWidget.columns.filter(c => c.cellType !== 'actions');
            /* headerMsgKey가 있으면 번역 텍스트 사용 — header가 빈 문자열일 때 Java split trailing 제거 방지 */
            const headers     = validCols.map(c => c.headerMsgKey ? t(c.headerMsgKey) : c.header).join(',');
            const keys        = validCols.map(c => c.accessor).join(',');
            /* 날짜 포맷 — 포맷 없는 컬럼은 빈 문자열, keys 순서와 일치 */
            const dateFormats = validCols.map(c => c.dateFormat ?? '').join(',');

            /* 공통코드 연동 컬럼 → 엑셀 export용 코드값→라벨 딕셔너리 구성
               (accessor를 key로, 해당 공통코드 그룹의 details 전체를 code→label 사전으로 매핑 —
                화면(TableCellRenderer/FieldRenderer)과 동일한 라벨 산출 규칙(codeDetailToLabel)을 그대로 재사용) */
            const codeMaps: Record<string, Record<string, string>> = {};
            validCols.forEach(c => {
                if (!c.codeGroupCode || c.displayAs === 'value') return;
                const details = codeGroups.find(g => g.groupCode === c.codeGroupCode)?.details ?? [];
                if (details.length === 0) return;
                codeMaps[c.accessor] = Object.fromEntries(details.map(d => [d.code, codeDetailToLabel(d, t)]));
            });

            /* 현재 검색 조건 포함 — page/size 제외 (export는 전체 데이터) */
            const searchQuery = { ...currentSearchParams };
            delete searchQuery['page'];
            delete searchQuery['size'];

            const res = await api.get(`/page-data/${tableWidget.connectedSlug}/export`, {
                params: {
                    format: 'xlsx', headers, keys, dateFormats,
                    ...(reason ? { reason } : {}),
                    /* 공통코드 매핑이 있는 컬럼이 하나도 없으면 파라미터 자체를 생략 */
                    ...(Object.keys(codeMaps).length ? { codeMaps: JSON.stringify(codeMaps) } : {}),
                    ...searchQuery,
                },
                responseType: 'blob',
            });

            /* 브라우저 다운로드 트리거 */
            const url = URL.createObjectURL(res.data);
            const a   = document.createElement('a');
            a.href    = url;
            a.download = `${tableWidget.connectedSlug}_export.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            toast.error('엑셀 다운로드 중 오류가 발생했습니다.');
        }
    }, [tableWidgetsMap, currentSearchParams, codeGroups, t]);

    /**
     * 엑셀 다운로드 핸들러 (live 모드 전용)
     * - privacyPopup=true 시 개인정보 사유 입력 팝업 표시 후 확인 시 다운로드
     * - privacyPopup=false/undefined 시 바로 다운로드
     */
    const handleExcelDownload = useCallback((tableWidgetId: string, privacyPopup?: boolean) => {
        if (privacyPopup) {
            setPendingTableWidgetId(tableWidgetId);
            setShowPrivacyModal(true);
            return;
        }
        doExcelDownload(tableWidgetId);
    }, [doExcelDownload]);

    /** 개인정보 사유 입력 팝업 확인 — reason과 함께 다운로드 실행 */
    const handlePrivacyConfirm = useCallback(async (reason: string) => {
        setShowPrivacyModal(false);
        if (pendingTableWidgetId) {
            await doExcelDownload(pendingTableWidgetId, reason);
            setPendingTableWidgetId(null);
        }
    }, [pendingTableWidgetId, doExcelDownload]);

    /* ── 팝업 닫기 ── */
    const handlePopupClose = useCallback(() => {
        setPopupOpen(false);
        setPopupCfg(null);
        setPopupEditId(null);
        setPopupSubListRowsMap({});
        setPopupMultiSelectValuesMap({});
        setPopupTableSelectedRowsMap({});
        setPopupParamSaveExtras({});
        setPopupCategoryLinkCtx(null);
    }, []);

    /**
     * 팝업 오픈 핸들러 (live 모드 전용)
     * @param slug          QUICK_DETAIL 템플릿 slug
     * @param editId        수정 대상 데이터 ID (신규 등록이면 null)
     * @param _listSlug     미사용 (각자 slug 독립 정책 — 팝업 폼의 connectedSlug 직접 사용)
     * @param initialValues 초기값 맵 — fieldKey 기준으로 폼 필드에 매핑 (파라미터 전달용)
     * @param groupId       다중 slug 저장 그룹 ID — page 이동 시 ?group_id=uuid 파라미터로 전달
     * @param categoryLinkCtx 카테고리 등록(datasave) 팝업 컨텍스트 — relationSlugId 설정된 depth2+ 카테고리 위젯의
     *                        등록 팝업일 때만 전달. 팝업 내 테이블 저장 성공 직후 연결 row 추가 저장에 사용
     */
    const handleInternalPopupOpen = useCallback(async (
        slug: string,
        editId?: number | null,
        _listSlug?: string,
        initialValues?: Record<string, string>,
        groupId?: string | null,
        paramSave?: boolean,
        categoryLinkCtx?: { relationSlugId: number; dbSlug: string; depth: number; parentId: number | null } | null,
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
        setPopupMultiSelectValuesMap({});
        setPopupCategoryLinkCtx(categoryLinkCtx ?? null);
        setPopupTableSelectedRowsMap({});
        setPopupTableDataMap({});
        setPopupSortKeyMap({});
        setPopupSortDirMap({});
        setPopupTableSelectedRowsMap({});

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
                if (paramSave) params.set('_paramSave', 'true');
                const qs = params.toString() ? `?${params.toString()}` : '';
                router.push(`/admin/widgetSub/${slug}${qs}`);
                return;
            }

            /* widgetItems(PageWidgetItem[]) → contents에서 form 위젯 추출 */
            const formContents = cfg.widgetItems.flatMap(item => item.contents).filter(c => c.widget?.type === 'form');

            /* 팝업 저장에 사용할 slug: 첫 번째 폼 위젯의 connectedSlug */
            const formConnectedSlug = (formContents[0]?.widget?.connectedSlug as string | undefined) || '';
            setPopupListSlug(formConnectedSlug);

            /* table 위젯 초기 데이터 fetch — connectedSlug가 있는 테이블만 처리 */
            const tableContents = cfg.widgetItems.flatMap(item => item.contents).filter(c => c.widget?.type === 'table');
            if (tableContents.length > 0) {
                const tableDataAccum: Record<string, PageTableData> = {};
                await Promise.all(tableContents.map(async tc => {
                    const tw = tc.widget as unknown as TableWidget & { connectedSlug?: string };
                    if (!tw.widgetId || !tw.connectedSlug) return;
                    try {
                        const pageSize = tw.pageSize || 10;
                        const res = await api.get(`/page-data/${tw.connectedSlug}`, {
                            params: { page: '0', size: String(pageSize) },
                        });
                        const rows = (res.data.content as Parameters<typeof flattenPageDataItem>[0][]).map(flattenPageDataItem);
                        tableDataAccum[tw.widgetId] = {
                            rows,
                            totalElements: res.data.totalElements ?? 0,
                            totalPages:    res.data.totalPages    ?? 0,
                            currentPage:   0,
                            loading:       false,
                            appendLoading: false,
                            hasMore:       res.data.last === false,
                            nextPage:      res.data.last === false ? 1 : 0,
                        };
                    } catch { /* 개별 테이블 조회 실패 무시 */ }
                }));
                setPopupTableDataMap(tableDataAccum);
            }

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

            /* paramSave 처리 — 폼에 없는 initialValues를 extras에 보관 (저장 버튼 클릭 시 dataJson에 병합) */
            if (paramSave && initialValues && Object.keys(initialValues).length > 0) {
                type FormFieldMeta = { field: FormFieldItem; contentKey: string | undefined };
                const allFormFieldMeta: FormFieldMeta[] = formContents.flatMap(c => {
                    const fw = c.widget as { fields?: FormFieldItem[]; contentKey?: string };
                    return (fw.fields ?? []).map(f => ({ field: f, contentKey: fw.contentKey || undefined }));
                });

                const extras: Record<string, unknown> = {};

                Object.entries(initialValues).forEach(([key, value]) => {
                    const dotIdx = key.indexOf('.');
                    if (dotIdx !== -1) {
                        /* contentKey.fieldKey 형식 */
                        const contentKey = key.slice(0, dotIdx);
                        const fieldKey   = key.slice(dotIdx + 1);
                        const hasForm    = formContents.some(c => (c.widget as { contentKey?: string }).contentKey === contentKey);
                        const hasTable   = tableContents.some(c => (c.widget as { contentKey?: string }).contentKey === contentKey);
                        if (!hasForm && !hasTable) return; /* contentKey 매칭 위젯 없음 → 무시 */

                        if (hasTable && !hasForm) {
                            /* 데이터테이블 contentKey → 필드 체크 없이 바로 extras에 저장 */
                            if (!extras[contentKey]) extras[contentKey] = {};
                            (extras[contentKey] as Record<string, string>)[fieldKey] = value;
                            return;
                        }

                        /* 폼 contentKey → 폼 필드에 없는 것만 extras에 저장 */
                        const hasField   = allFormFieldMeta.some(
                            m => m.contentKey === contentKey && (m.field.fieldKey || m.field.label) === fieldKey
                        );
                        if (!hasField) {
                            if (!extras[contentKey]) extras[contentKey] = {};
                            (extras[contentKey] as Record<string, string>)[fieldKey] = value;
                        }
                    } else {
                        /* 단순 fieldKey */
                        const hasField = allFormFieldMeta.some(m => (m.field.fieldKey || m.field.label) === key);
                        if (!hasField) extras[key] = value;
                    }
                });

                if (Object.keys(extras).length > 0) setPopupParamSaveExtras(extras);
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
                externalPopupTrigger.initialValues,
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
    /* 팝업 내 테이블 페이지 변경 핸들러 */
    const handlePopupPageChange = useCallback(async (widgetId: string, page: number) => {
        const tw = popupCfg?.widgetItems.flatMap(item => item.contents)
            .find(c => (c.widget as { widgetId?: string })?.widgetId === widgetId && c.widget?.type === 'table')
            ?.widget as (TableWidget & { connectedSlug?: string }) | undefined;
        if (!tw?.connectedSlug) return;
        const pageSize = tw.pageSize || 10;
        const sk = popupSortKeyMap[widgetId];
        const sd = popupSortDirMap[widgetId] ?? 'asc';
        setPopupTableDataMap(prev => ({ ...prev, [widgetId]: { ...(prev[widgetId] ?? { rows: [], totalElements: 0, totalPages: 0, currentPage: 0, loading: false, appendLoading: false, hasMore: false, nextPage: 0 }), loading: true } }));
        try {
            const reqParams: Record<string, string> = { page: String(page), size: String(pageSize) };
            if (sk) reqParams.sort = `${sk},${sd}`;
            const res = await api.get(`/page-data/${tw.connectedSlug}`, { params: reqParams });
            const rows = (res.data.content as Parameters<typeof flattenPageDataItem>[0][]).map(flattenPageDataItem);
            setPopupTableDataMap(prev => ({
                ...prev,
                [widgetId]: { rows, totalElements: res.data.totalElements ?? 0, totalPages: res.data.totalPages ?? 0, currentPage: page, loading: false, appendLoading: false, hasMore: res.data.last === false, nextPage: res.data.last === false ? page + 1 : page },
            }));
        } catch { setPopupTableDataMap(prev => ({ ...prev, [widgetId]: { ...(prev[widgetId] ?? { rows: [], totalElements: 0, totalPages: 0, currentPage: 0, appendLoading: false, hasMore: false, nextPage: 0 }), loading: false } })); }
    }, [popupCfg, popupSortKeyMap, popupSortDirMap]);

    /* 팝업 내 테이블 정렬 변경 핸들러 */
    const handlePopupSortChange = useCallback(async (widgetId: string, accessor: string, dir: 'asc' | 'desc' | null) => {
        setPopupSortKeyMap(prev => ({ ...prev, [widgetId]: dir === null ? null : accessor }));
        if (dir) setPopupSortDirMap(prev => ({ ...prev, [widgetId]: dir }));
        const tw = popupCfg?.widgetItems.flatMap(item => item.contents)
            .find(c => (c.widget as { widgetId?: string })?.widgetId === widgetId && c.widget?.type === 'table')
            ?.widget as (TableWidget & { connectedSlug?: string }) | undefined;
        if (!tw?.connectedSlug) return;
        const pageSize = tw.pageSize || 10;
        setPopupTableDataMap(prev => ({ ...prev, [widgetId]: { ...(prev[widgetId] ?? { rows: [], totalElements: 0, totalPages: 0, currentPage: 0, loading: false, appendLoading: false, hasMore: false, nextPage: 0 }), loading: true } }));
        try {
            const reqParams: Record<string, string> = { page: '0', size: String(pageSize) };
            if (dir && accessor) reqParams.sort = `${accessor},${dir}`;
            const res = await api.get(`/page-data/${tw.connectedSlug}`, { params: reqParams });
            const rows = (res.data.content as Parameters<typeof flattenPageDataItem>[0][]).map(flattenPageDataItem);
            setPopupTableDataMap(prev => ({
                ...prev,
                [widgetId]: { rows, totalElements: res.data.totalElements ?? 0, totalPages: res.data.totalPages ?? 0, currentPage: 0, loading: false, appendLoading: false, hasMore: res.data.last === false, nextPage: res.data.last === false ? 1 : 0 },
            }));
        } catch { setPopupTableDataMap(prev => ({ ...prev, [widgetId]: { ...(prev[widgetId] ?? { rows: [], totalElements: 0, totalPages: 0, currentPage: 0, appendLoading: false, hasMore: false, nextPage: 0 }), loading: false } })); }
    }, [popupCfg]);

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

        /* 유효성 검사 — cross-form hideCondition 평가를 위해 팝업 내 통합 values/keyToId 구성 */
        const popupAllFormValues = Object.assign({}, ...Object.values(popupFormValuesMap)) as Record<string, string>;
        const popupAllKeyToId: Record<string, string> = {};
        saveFormContents.forEach(fc => {
            const fw = fc.widget as unknown as import('../builder/FormBuilder').FormWidget;
            (fw?.fields ?? []).forEach(f => {
                if (!f.fieldKey) return;
                popupAllKeyToId[f.fieldKey] = f.id;
                /* contentKey.fieldKey 형식 추가 — cross-form 명시 참조용 */
                if (fw.contentKey) popupAllKeyToId[`${fw.contentKey}.${f.fieldKey}`] = f.id;
            });
        });

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
                popupAllFormValues,
                popupAllKeyToId,
                t,
            )) return;
        }

        /* 유효성 검사 — sublist 위젯별로 수행 */
        const subWidgetsForValidation = saveSublistContents.map(c => c.widget) as Array<{ type: string; widgetId?: string; required?: boolean; title?: string; columns?: import('./types').SubListColumn[] }>;
        if (!validateSubListRows(subWidgetsForValidation, popupSubListRowsMap, popupSubListFileMap, t)) return;

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
                    if (f.type !== 'file' && f.type !== 'image' && f.type !== 'media') continue;
                    const existing    = (popupExistingMetaMap[fwId]?.[f.id] ?? []).map(m => m.id);
                    const newFiles    = popupFileValuesMap[fwId]?.[f.id] ?? [];
                    const uploadedIds = newFiles.length ? await uploadFiles(newFiles, popupListSlug, f.fieldKey || f.label || '') : [];
                    newIds.push(...uploadedIds);
                    formFileIdsMap[fwId][f.id] = [...existing, ...uploadedIds];
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
                        const uploadedIds = newFiles.length ? await uploadFiles(newFiles, popupListSlug, col.key) : [];
                        newIds.push(...uploadedIds);
                        processedRow[col.key] = [...existingIds, ...uploadedIds];
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
            const popupAllFormValues = Object.assign({}, ...Object.values(popupFormValuesMap)) as Record<string, string>;
            const { dataJson } = buildDataJson(
                allSaveWidgets,
                popupFormValuesMap,
                formFileIdsMap,
                processedSubListRowsMap,
                {},
                undefined,
                undefined,
                popupAllFormValues,
            );

            /* paramSave extras 병합 — 저장 시 폼에 없던 파라미터를 dataJson에 추가 */
            if (Object.keys(popupParamSaveExtras).length > 0) {
                Object.entries(popupParamSaveExtras).forEach(([key, val]) => {
                    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                        /* contentKey 섹션 — 기존 섹션에 병합 */
                        dataJson[key] = { ...(dataJson[key] as Record<string, unknown> ?? {}), ...(val as Record<string, unknown>) };
                    } else {
                        dataJson[key] = val;
                    }
                });
            }

            /* 4단계: page_data 저장 (신규 POST / 수정 PUT) */
            let savedId: number | null = null;
            if (popupEditId) {
                await api.put(`/page-data/${popupListSlug}/${popupEditId}`, { dataJson, ...(pageSlug && { templateSlug: pageSlug }) });
                savedId = popupEditId;
                toast.success('수정되었습니다.');
            } else {
                const saveRes = await api.post(`/page-data/${popupListSlug}`, { dataJson, ...(pageSlug && { templateSlug: pageSlug }) });
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
    }, [popupListSlug, popupEditId, popupCfg, popupFormValuesMap, popupFileValuesMap, popupExistingMetaMap, popupSubListRowsMap, popupSubListFileMap, popupParamSaveExtras, handlePopupClose, onRefresh]);

    /**
     * 팝업 내 datasave 버튼 핸들러 — connType='datasave' 전용
     * connectedContentWidgetIds에 해당하는 form/sublist 위젯 데이터를 dataSaveSlug에 POST
     * paramSave: 데이터테이블 datasave 버튼의 field.params 문자열 (e.g. "board-data-table.depth=3,board-data-table.id")
     */
    const handlePopupDataSave = useCallback(async (
        connectedContentWidgetIds: string[],
        dataSaveSlug: string,
        goBackAfterAction?: boolean,
        paramSave?: string,
    ) => {
        if (!dataSaveSlug || !popupCfg) return;

        const allContents = popupCfg.widgetItems.flatMap(item => item.contents);

        /* 대상 위젯 수집 — form / sublist / multiselect / table */
        const targetWidgets = connectedContentWidgetIds
            .map(wid => {
                const found = allContents.find(c => {
                    const w = c.widget as { widgetId?: string; type?: string };
                    const type = w?.type ?? '';
                    return w?.widgetId === wid &&
                        (type === 'form' || type === 'sublist' || type === 'multiselect' || type === 'table');
                });
                return found?.widget ?? null;
            })
            .filter((w): w is NonNullable<typeof w> => w !== null);

        if (targetWidgets.length === 0) {
            toast.warning('연결된 컨텐츠 위젯이 없습니다.');
            return;
        }

        /* 유효성 검사 — 공통함수로 처리 */
        const typedTargets = targetWidgets as Array<{
            type?: string; widgetId?: string;
            fields?: FormFieldItem[];
            contentKey?: string; required?: boolean; title?: string;
            enableRowSelection?: boolean;
            columns?: import('./types').SubListColumn[];
        }>;
        if (!validateDataSaveWidgets({
            targetWidgets: typedTargets,
            formValuesMap: popupFormValuesMap,
            fileValuesMap: popupFileValuesMap,
            existingFileMetaMap: popupExistingMetaMap,
            subListRowsMap: popupSubListRowsMap,
            subListFileMap: popupSubListFileMap,
            multiSelectValuesMap: popupMultiSelectValuesMap,
            tableSelectedRowsMap: popupTableSelectedRowsMap,
            t,
        })) return;

        setPopupSaving(true);
        try {
            /* 파일 업로드 + SubList 처리 — 공통함수 */
            const { formFileIdsMap, processedSubListRowsMap, allNewIds } = await processFormFilesAndSubList({
                targetWidgets: typedTargets,
                fileValuesMap: popupFileValuesMap,
                existingFileMetaMap: popupExistingMetaMap,
                subListRowsMap: popupSubListRowsMap,
                subListFileMap: popupSubListFileMap,
                dataSaveSlug,
            });

            /* multiselect map 구성 */
            const multiSelectMap: Record<string, number[]> = {};
            for (const w of typedTargets) {
                if (w.type !== 'multiselect') continue;
                multiSelectMap[w.widgetId ?? ''] = popupMultiSelectValuesMap[w.widgetId ?? ''] ?? [];
            }

            /* 비 테이블 / 데이터테이블 위젯 분리 */
            const nonTableWidgets = typedTargets.filter(w => w.type !== 'table');
            const tableWidgets    = typedTargets.filter(w => w.type === 'table');

            let anySaved = false;

            /* form/sublist/multiselect → dataJson 구성 및 POST */
            if (nonTableWidgets.length > 0) {
                const datasaveAllFormValues = Object.assign({}, ...Object.values(popupFormValuesMap)) as Record<string, string>;
                const { dataJson, pkKeys } = buildDataJson(
                    nonTableWidgets as Parameters<typeof buildDataJson>[0],
                    popupFormValuesMap,
                    formFileIdsMap,
                    processedSubListRowsMap,
                    multiSelectMap,
                    undefined,
                    undefined,
                    datasaveAllFormValues,
                );

                const saveRes = await api.post(`/page-data/${dataSaveSlug}`, {
                    dataJson,
                    ...(pkKeys.length > 0 && { pkKeys }),
                    ...(pageSlug && { templateSlug: pageSlug }),
                });

                if (allNewIds.length > 0 && saveRes.data.id) {
                    await api.patch('/page-files/link', { fileIds: allNewIds, dataId: saveRes.data.id });
                }
                anySaved = true;
            }

            /* 데이터테이블 컨텐츠 — 선택된 행마다 별도 POST (paramSave 기준 값 추출) */
            for (const tw of tableWidgets) {
                const tableW      = tw as unknown as import('../builder/TableBuilder').TableWidget;
                const allRows     = popupTableDataMap[tableW.widgetId]?.rows ?? [];
                const selectedIds = popupTableSelectedRowsMap[tableW.widgetId] ?? [];
                /* enableRowSelection=true → 선택된 행만, false → 전체 행 */
                const rowsToSave  = tableW.enableRowSelection
                    ? allRows.filter(r => selectedIds.includes(Number(r['_id'])))
                    : allRows;

                if (rowsToSave.length === 0) {
                    toast.warning('저장할 데이터가 없습니다.');
                    return;
                }

                /* datasave 버튼 paramSave 유무와 관계없이 popupParamSaveExtras 항상 포함 */
                const tableExtras = (popupParamSaveExtras[tableW.contentKey ?? ''] ?? {}) as Record<string, unknown>;
                const saved = await saveTableRows({
                    contentKey:   tableW.contentKey,
                    columns:      tableW.columns,
                    rows:         rowsToSave,
                    extras:       tableExtras,
                    dataSaveSlug,
                    templateSlug: pageSlug,
                    paramSave,
                });
                if (saved > 0) {
                    anySaved = true;
                    /* 카테고리 연결 컨텍스트가 있으면 — 저장된(선택된) 행마다 원본 id(refId)만 뽑아
                       { depth, parentId, refId } 경량 row를 카테고리 dbSlug에 추가 저장 (순차 처리 + 부분 실패 피드백) */
                    if (popupCategoryLinkCtx) {
                        let linkFailCount = 0;
                        for (const row of rowsToSave) {
                            const refId = Number(row['_id']);
                            if (!refId) continue;
                            try {
                                await api.post(`/page-data/${popupCategoryLinkCtx.dbSlug}`, {
                                    dataJson: {
                                        depth: popupCategoryLinkCtx.depth,
                                        parentId: popupCategoryLinkCtx.parentId,
                                        refId,
                                    },
                                });
                            } catch {
                                linkFailCount++;
                            }
                        }
                        if (linkFailCount > 0) {
                            toast.warning(`${linkFailCount}건의 카테고리 연결 저장에 실패했습니다.`);
                        }
                    }
                }
            }

            if (anySaved) {
                toast.success('저장되었습니다.');
                onRefresh?.();
                handlePopupClose();
            }
        } catch {
            toast.error('저장 중 오류가 발생했습니다.');
        } finally {
            setPopupSaving(false);
        }
    }, [popupCfg, popupFormValuesMap, popupFileValuesMap, popupExistingMetaMap, popupSubListRowsMap, popupSubListFileMap, popupMultiSelectValuesMap, popupTableSelectedRowsMap, popupTableDataMap, popupParamSaveExtras, popupCategoryLinkCtx, pageSlug, onRefresh, handlePopupClose]);

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
                        onDataSave={popupSaving ? undefined : handlePopupDataSave}
                        onClose={handlePopupClose}
                        /* 팝업 내 SubList rows */
                        subListRowsMap={popupSubListRowsMap}
                        onSubListRowsChange={(wid, rows) =>
                            setPopupSubListRowsMap(prev => ({ ...prev, [wid]: rows }))
                        }
                        /* 팝업 내 MultiSelect 선택 ID */
                        multiSelectValuesMap={popupMultiSelectValuesMap}
                        onMultiSelectChange={(wId, ids) =>
                            setPopupMultiSelectValuesMap(prev => ({ ...prev, [wId]: ids }))
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
                        /* 팝업 내 테이블 */
                        tableDataMap={popupTableDataMap}
                        sortKeyMap={popupSortKeyMap}
                        sortDirMap={popupSortDirMap}
                        onSort={handlePopupSortChange}
                        onPageChange={handlePopupPageChange}
                        tableSelectedRowsMap={popupTableSelectedRowsMap}
                        onTableRowsSelect={(wId, ids) => setPopupTableSelectedRowsMap(prev => ({ ...prev, [wId]: ids }))}
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

                /* editPageRules 방식 — 조건 매칭 후 connType에 따라 page 이동 or 팝업 오픈 */
                if (actionsCol?.editPageRules?.length) {
                    /* 1단계: conditionParam 있는 규칙 중 매칭 탐색
                     * 2단계: 매칭 없으면 conditionParam 없는 규칙(기본 경로)으로 폴백 */
                    const matched =
                        actionsCol.editPageRules.find(rule => {
                            if (!rule.conditionParam) return false;
                            const eqIdx = rule.conditionParam.indexOf('=');
                            if (eqIdx === -1) return false;
                            const key = rule.conditionParam.slice(0, eqIdx);
                            const val = rule.conditionParam.slice(eqIdx + 1);
                            return String(row[key] ?? '') === val;
                        })
                        ?? actionsCol.editPageRules.find(rule => !rule.conditionParam);
                    if (matched?.pageSlug) {
                        if ((matched.connType ?? 'popup') === 'popup') {
                            /* popup: handleInternalPopupOpen — outputMode에 따라 자동 분기 */
                            const initialValues = matched.passParam
                                ? parseActionParams(matched.passParam, row)
                                : undefined;
                            handleInternalPopupOpen(matched.pageSlug, row._id as number, dataSlug, initialValues, row._groupId as string | null);
                        } else {
                            /* page: 직접 router.push — handleInternalPopupOpen 미경유 */
                            const params = new URLSearchParams();
                            if (row._id != null) params.set('id', String(row._id));
                            if (matched.passParam) {
                                Object.entries(parseActionParams(matched.passParam, row))
                                    .forEach(([k, v]) => params.set(k, v));
                            }
                            const qs = params.toString() ? `?${params.toString()}` : '';
                            router.push(`/admin/widgetSub/${matched.pageSlug}${qs}`);
                        }
                        return;
                    }
                }

                /* 기존 editPopupSlug 방식 — 하위 호환 */
                const slug = actionsCol?.editPopupSlug;
                if (slug) {
                    const initialValues = actionsCol?.editParams
                        ? parseActionParams(actionsCol.editParams, row)
                        : undefined;
                    handleInternalPopupOpen(slug, row._id as number, dataSlug, initialValues, row._groupId as string | null);
                    return;
                }
                handlers?.onEdit?.(row);
            },
            onDetail: (row) => {
                const actionsCol = widget.columns.find(c => c.cellType === 'actions');
                const slug = actionsCol?.detailPopupSlug;
                if (slug) {
                    const initialValues = actionsCol?.detailParams
                        ? parseActionParams(actionsCol.detailParams, row)
                        : undefined;
                    handleInternalPopupOpen(slug, row._id as number, dataSlug, initialValues);
                    return;
                }
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
            /* button 셀 클릭 — connType(page/popup/windowPopup)에 따라 이동/오픈 방식 분기
             * preview 모드에서는 아무 동작도 하지 않음 (버튼은 TableCellRenderer가 preview에서 클릭 불가 처리하지만 방어적으로 한 번 더 가드) */
            onButtonClick: (col, row) => {
                if (mode !== 'live') return;

                const btnConnType = col.connType ?? 'page';

                /* 레이어팝업 — 기존 handleInternalPopupOpen 재사용 (outputMode 자동 분기), 항상 내부 slug (외부 URL 미지원) */
                if (btnConnType === 'popup') {
                    if (!col.targetSlug) return;
                    const initialValues = col.passParam ? parseActionParams(col.passParam, row) : undefined;
                    handleInternalPopupOpen(col.targetSlug, row._id as number, dataSlug, initialValues, row._groupId as string | null);
                    return;
                }

                /* 외부 URL 이동 — page/windowPopup 공통, targetType='url'일 때만 동작 */
                if ((col.targetType ?? 'slug') === 'url' && col.externalUrl) {
                    const normalizedUrl = normalizeExternalUrl(col.externalUrl);
                    /* URL 객체로 파싱해 기존 쿼리스트링과 병합 (문자열 결합 시 '?' 중복 방지) */
                    const urlObj = new URL(normalizedUrl);
                    if (col.passParam) {
                        Object.entries(parseActionParams(col.passParam, row)).forEach(([k, v]) => urlObj.searchParams.set(k, v));
                    }
                    const fullUrl = urlObj.toString();

                    /* 윈도우팝업 — 새 창으로 오픈. noopener,noreferrer로 opener 참조 차단 */
                    if (btnConnType === 'windowPopup') {
                        const width  = col.windowPopupOption?.width  ?? 800;
                        const height = col.windowPopupOption?.height ?? 600;
                        window.open(fullUrl, '_blank', `width=${width},height=${height},noopener,noreferrer`);
                        return;
                    }

                    /* page(기본) — 현재 탭에서 외부 URL로 이동 */
                    window.location.href = fullUrl;
                    return;
                }

                /* 내부 slug 기반 이동 — 기존 로직 그대로 */
                if (!col.targetSlug) return;

                /* page / windowPopup 공통 URL 구성 — id + passParam 파라미터 병합 (editPageRules 'page' 분기와 동일 방식) */
                const params = new URLSearchParams();
                if (row._id != null) params.set('id', String(row._id));
                if (col.passParam) {
                    Object.entries(parseActionParams(col.passParam, row)).forEach(([k, v]) => params.set(k, v));
                }
                const qs  = params.toString() ? `?${params.toString()}` : '';
                const url = `/admin/widgetSub/${col.targetSlug}${qs}`;

                /* 윈도우팝업 — 새 창으로 오픈 (신규 로직). noopener,noreferrer로 opener 참조 차단 */
                if (btnConnType === 'windowPopup') {
                    const width  = col.windowPopupOption?.width  ?? 800;
                    const height = col.windowPopupOption?.height ?? 600;
                    window.open(url, '_blank', `width=${width},height=${height},noopener,noreferrer`);
                    return;
                }

                /* page(기본) — 직접 페이지 이동 */
                router.push(url);
            },
            /* inlineEdit 셀 즉시 수정 — PATCH /{id}/field API 호출 */
            onInlineEdit: handlers?.onInlineEdit ?? (mode === 'live' && connectedSlug
                ? async (id: number, fieldKey: string, value: unknown) => {
                    try {
                        await api.patch(`/page-data/${connectedSlug}/${id}/field`, { fieldKey, value });
                        /* 낙관적 업데이트 — 서버 재조회 전 즉시 UI 반영
                         * flattenPageDataItem이 root에 flat 병합한 값도 함께 업데이트 (accessor 읽기 일치) */
                        const lastKey = fieldKey.includes('.') ? fieldKey.split('.').pop()! : fieldKey;
                        setLocalTableData(prev => prev?.map(row => {
                            if ((row as { _id?: number })._id !== id) return row;
                            const updated = applyDotField(row as Record<string, unknown>, fieldKey, value);
                            return { ...updated, [lastKey]: value };
                        }));
                        onRefresh?.();
                    } catch (e) {
                        console.error('[inlineEdit] 오류:', e);
                        toast.error('수정 중 오류가 발생했습니다.');
                    }
                }
                : undefined
            ),
        };

        return (
            <>
                <TableRenderer
                    mode={mode}
                    columns={widget.columns}
                    codeGroups={codeGroups}
                    handlers={wrappedHandlers}
                    enableRowSelection={widget.enableRowSelection}
                    selectedRowIds={selectedRowIds}
                    onRowsSelect={onRowsSelect}
                    pageSize={widget.pageSize}
                    displayMode={widget.displayMode}
                    data={localTableData}
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
                onChangeAllFormValues={onChangeAllFormValues}
                allFormValues={allFormValues}
                allFieldKeyToId={allFieldKeyToId}
                urlParams={urlParams}
                crossTabFormValues={crossTabFormValues}
                contentKey={widget.contentKey}
                fileValues={fileValues}
                existingFileMeta={existingFileMeta}
                imgBlobUrls={imgBlobUrls}
                onFileChange={onFileChange}
                onRemoveExisting={onRemoveExisting}
                fetchRelData={fetchRelData}
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
                    onDataSave={mode === 'live' ? onDataSave : undefined}
                    onClose={onClose}
                    onPopupOpen={(slug, params) => handleInternalPopupOpen(slug, null, dataSlug, params ? parseActionParams(params, {}) : undefined)}
                    onExcelDownload={
                        mode === 'live'
                            ? handleExcelDownload
                            : onExcelDownloadPreview
                                ? (_tableWidgetId: string, _privacyPopup?: boolean) => onExcelDownloadPreview()
                                : undefined
                    }
                />
                {/* 팝업 오버레이 (live 모드 & open 상태일 때만 렌더링) */}
                {popupOverlay}
                {/* 개인정보 사유 입력 팝업 (live 모드 — excelPrivacyPopup=true 버튼 클릭 시) */}
                {showPrivacyModal && (
                    <PrivacyReasonModal
                        onConfirm={handlePrivacyConfirm}
                        onCancel={() => {
                            setShowPrivacyModal(false);
                            setPendingTableWidgetId(null);
                        }}
                    />
                )}
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
                    onPopupOpen={(slug, editId, listSlug, initialValues, paramSave) =>
                        handleInternalPopupOpen(
                            slug, editId ?? null, listSlug, initialValues, null, paramSave,
                            /* 등록(editId==null)이고 depth2+이고 relationSlugId 설정된 경우에만 연결 컨텍스트 전달 */
                            (editId == null && widget.depth > 1 && widget.relationSlugId)
                                ? { relationSlugId: widget.relationSlugId, dbSlug: widget.dbSlug, depth: widget.depth, parentId: selectedParentId }
                                : null,
                        )
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
                extraFieldValues={multiSelectExtraFieldValuesMap?.[msWid]}
                onExtraFieldChange={(itemId, fieldKey, value) => onMultiSelectExtraFieldChange?.(msWid, itemId, fieldKey, value)}
            />
        );
    }

    if (widget.type === 'tab') {
        return <TabRenderer mode={mode} widget={widget} pageSlug={pageSlug} parentMainConnectedSlug={mainConnectedSlug} leaveCheck={leaveCheck} />;
    }

    return <div className={BASE_CLS} />;
}
