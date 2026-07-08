'use client';

/**
 * PageGridRenderer — widgetItems 배열을 outer+inner 그리드로 렌더링하는 공통 컴포넌트
 *
 * 빌더 미리보기(preview)와 실제 서비스 페이지(live) 모두 이 하나의 컴포넌트로 렌더링.
 * PageLayout 안에서 자식으로 사용한다.
 *
 * 사용법:
 *   // 미리보기 (빌더)
 *   <PageLayout mode="preview">
 *     <PageGridRenderer mode="preview" widgetItems={previewItems} />
 *   </PageLayout>
 *
 *   // 운영 페이지
 *   <PageLayout mode="live">
 *     <PageGridRenderer mode="live" widgetItems={widgetItems} {...liveHandlers} />
 *   </PageLayout>
 */

import { useMemo, useCallback } from 'react';
import { getSpaceGridColumn } from '../../utils';
import { GridCell, ROW_HEIGHT, GAP_SIZE } from '@/components/layout/grid-cell';
import { WidgetRenderer } from './WidgetRenderer';
import type { AnyWidget, RendererMode } from './types';
import type { TableWidget } from '../builder/TableBuilder';
import type { CodeGroupDef } from '../../types';
import type { FormWidget } from '../builder/FormBuilder';

/* ── 공유 타입 (generated/[slug], widget/[slug], 빌더 미리보기 모두 사용) ── */

/** PageLayout 내부의 개별 컨텐츠 아이템 (위젯 + 그리드 크기) */
export interface PageContentItem {
    id: string;
    colSpan: number;
    rowSpan: number;
    widget: AnyWidget;
}

/** PageLayout 외부 셀 (colSpan×rowSpan을 차지하며, 내부에 복수 컨텐츠 보유) */
export interface PageWidgetItem {
    id: string;
    colSpan: number;
    rowSpan: number;
    contents: PageContentItem[];
}

/** 테이블 위젯별 데이터 상태 */
export interface PageTableData {
    rows: Record<string, unknown>[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    loading: boolean;
    appendLoading: boolean;
    hasMore: boolean;
    nextPage: number;
}

interface PageGridRendererProps {
    widgetItems: PageWidgetItem[];
    mode: RendererMode;

    /* 빌더 미리보기 전용 — 위젯 선택 인터랙션 */
    /** 위젯 클릭 시 호출 — 빌더에서 선택 상태 업데이트에 사용 */
    onItemClick?: (itemId: string) => void;
    /** 현재 선택된 위젯 ID — ring UI 표시에 사용 */
    selectedItemId?: string | null;

    /* live 모드 전용 — 검색 */
    searchValues?: Record<string, string>;
    onSearchChange?: (fieldId: string, value: string) => void;
    /** widgetId를 인자로 받아 해당 위젯의 검색 실행 */
    onSearch?: (widgetId: string) => void;
    /** widgetId를 인자로 받아 해당 위젯의 초기화 실행 */
    onReset?: (widgetId: string) => void;
    codeGroups?: CodeGroupDef[];

    /* live 모드 전용 — 폼 */
    /** widgetId → 필드값 맵 */
    formValuesMap?: Record<string, Record<string, string>>;
    /** (widgetId, fieldId, value) 형태로 호출 */
    onFormValuesChange?: (widgetId: string, fieldId: string, value: string) => void;
    onContentAction?: (connectedContentWidgetIds: string[], action: 'save' | 'delete', goBackAfterAction?: boolean, resolvedFormValuesMap?: Record<string, Record<string, string>>, contentValidationRuleIds?: Record<string, number[]>) => void;
    onDataSave?: (connectedContentWidgetIds: string[], dataSaveSlug: string, goBackAfterAction?: boolean, paramSave?: string, validationRuleIds?: number[]) => void;

    /* live 모드 전용 — 테이블 */
    tableDataMap?: Record<string, PageTableData>;
    sortKeyMap?: Record<string, string | null>;
    sortDirMap?: Record<string, 'asc' | 'desc'>;
    /** (widgetId, accessor, dir) 형태로 호출 */
    onSort?: (widgetId: string, accessor: string, dir: 'asc' | 'desc' | null) => void;
    /** (widgetId, page) 형태로 호출 */
    onPageChange?: (widgetId: string, page: number) => void;
    /** (widgetId) 형태로 호출 */
    onLoadMore?: (widgetId: string) => void;
    /** 테이블 행 선택 상태 — widgetId → 선택된 행 ID 배열 */
    tableSelectedRowsMap?: Record<string, number[]>;
    /** 테이블 행 선택 변경 콜백 — (widgetId, ids) */
    onTableRowsSelect?: (widgetId: string, ids: number[]) => void;

    /* live 모드 전용 — 카테고리 */
    /** 카테고리 위젯별 선택 ID (widgetId → selectedId) */
    categorySelections?: Record<string, number | null>;
    /** 카테고리 항목 선택 시 호출 */
    onCategorySelect?: (widgetId: string, selectedId: number | null) => void;

    /* live 모드 전용 — 팝업 */
    dataSlug?: string;
    onRefresh?: () => void;
    /** 현재 페이지의 slug — 팝업 저장 시 templateSlug로 전달 */
    pageSlug?: string;

    /* live 모드 전용 — 파일 업로드 (팝업 내 form 위젯용) */
    /** widgetId → fieldId → File[] */
    fileValuesMap?: Record<string, Record<string, File[]>>;
    /** widgetId → fieldId → 파일 메타 배열 */
    existingFileMetaMap?: Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>;
    /** fileId → blob URL 캐시 */
    imgBlobUrls?: Record<number, string>;
    /** (widgetId, fieldId, files, rowId?) 형태로 호출 — SubList 파일 변경 시 rowId 포함 */
    onFileChange?: (widgetId: string, fieldId: string, files: File[], rowId?: string) => void;
    /** (widgetId, fieldId, fileId) 형태로 호출 */
    onRemoveExisting?: (widgetId: string, fieldId: string, fileId: number) => void;
    /** Space 위젯 닫기 버튼 핸들러 (팝업 닫기용) */
    onClose?: () => void;

    /* live 모드 전용 — sublist */
    /** widgetId → SubListRow[] */
    subListRowsMap?: Record<string, import('./SubListRenderer').SubListRow[]>;
    /** SubList 행 변경 콜백 — (widgetId, rows) */
    onSubListRowsChange?: (widgetId: string, rows: import('./SubListRenderer').SubListRow[]) => void;

    /* live 모드 전용 — multiselect */
    /** widgetId → 선택된 ID 배열 */
    multiSelectValuesMap?: Record<string, number[]>;
    /** 선택 변경 콜백 — (widgetId, ids) */
    onMultiSelectChange?: (widgetId: string, ids: number[]) => void;
    /** widgetId → itemId → fieldKey → value */
    multiSelectExtraFieldValuesMap?: Record<string, Record<number, Record<string, string>>>;
    /** extraField 값 변경 콜백 — (widgetId, itemId, fieldKey, value) */
    onMultiSelectExtraFieldChange?: (widgetId: string, itemId: number, fieldKey: string, value: string) => void;

    /* live 모드 전용 — 엑셀 다운로드 */
    /**
     * 현재 검색 조건 — fieldKey(paramKey) 기준 키/값 맵
     * Space 버튼의 엑셀 다운로드 시 동일 필터 조건으로 전체 데이터 추출에 사용
     */
    currentSearchParams?: Record<string, string>;
    /** URL 쿼리 파라미터 — hideCondition/disableCondition에서 URL 파라미터 참조용 (key → value) */
    urlParams?: Record<string, string>;
    /** cross-tab 데이터생성 공유값 — TabRenderer가 관리, 다른 탭 폼 필드 실시간 반영용 (fieldId → value) */
    crossTabFormValues?: Record<string, string>;
    /** cross-tab 데이터생성 자동입력 콜백 — 현재 탭에서 못 찾은 fieldId를 TabRenderer로 에스컬레이션 */
    onCrossTabFormChange?: (fieldId: string, value: string) => void;
    /** 진입 페이지의 메인 연결 slug — TabRenderer에 전달하여 탭 내부 저장 시 우선 적용 */
    mainConnectedSlug?: string;
    /** 이탈체크 활성 여부 — TabRenderer에 전달하여 탭 내부 폼 변경 감지 */
    leaveCheck?: boolean;
    /** widgetId → _fetchedRel{id} 원본 데이터 맵 — FormRenderer rowData 확장용 */
    formFetchRelMap?: Record<string, Record<string, unknown>>;
}

/**
 * widgetItems 배열 → outer div(span) + inner sub-grid(80px 행) 구조로 렌더링.
 * preview/live 모두 동일 함수 사용 — mode에 따라 WidgetRenderer가 자동 분기.
 */
export function PageGridRenderer({
    widgetItems,
    mode,
    onItemClick,
    selectedItemId,
    searchValues,
    onSearchChange,
    onSearch,
    onReset,
    codeGroups,
    formValuesMap,
    onFormValuesChange,
    onContentAction,
    onDataSave,
    tableDataMap,
    sortKeyMap,
    sortDirMap,
    onSort,
    onPageChange,
    onLoadMore,
    tableSelectedRowsMap,
    onTableRowsSelect,
    categorySelections,
    onCategorySelect,
    dataSlug,
    onRefresh,
    pageSlug,
    fileValuesMap,
    existingFileMetaMap,
    imgBlobUrls,
    onFileChange,
    onRemoveExisting,
    onClose,
    subListRowsMap,
    onSubListRowsChange,
    multiSelectValuesMap,
    onMultiSelectChange,
    multiSelectExtraFieldValuesMap,
    onMultiSelectExtraFieldChange,
    currentSearchParams,
    urlParams,
    crossTabFormValues,
    onCrossTabFormChange,
    mainConnectedSlug,
    leaveCheck,
    formFetchRelMap,
}: PageGridRendererProps) {
    /* ── 엑셀 다운로드용 테이블 위젯 맵 — widgetId → TableWidget ──
     * widgetItems에서 table 타입 위젯을 수집하여 WidgetRenderer에 전달 */
    const tableWidgetsMap = useMemo<Record<string, TableWidget>>(() => {
        const map: Record<string, TableWidget> = {};
        widgetItems.flatMap(item => item.contents.map(c => c.widget))
            .filter((w): w is TableWidget => w.type === 'table')
            .forEach(w => { map[w.widgetId] = w; });
        return map;
    }, [widgetItems]);

    /* ── cross-form hideCondition 평가용 통합 맵 ──
     * 페이지 내 모든 Form 위젯의 fieldKey → fieldId, values를 하나로 합산 */
    const allFieldKeyToId = useMemo(() => {
        const map: Record<string, string> = {};
        widgetItems.flatMap(item => item.contents.map(c => c.widget))
            .filter((w): w is FormWidget => w.type === 'form')
            .forEach(w => w.fields?.forEach(f => {
                if (!f.fieldKey) return;
                map[f.fieldKey] = f.id;
                /* contentKey.fieldKey 형식 추가 — cross-form 명시 참조용 (예: "form1.status=Y") */
                if (w.contentKey) map[`${w.contentKey}.${f.fieldKey}`] = f.id;
            }));
        return map;
    }, [widgetItems]);

    /* fieldId → widgetId 역매핑 — cross-form 데이터생성 실시간 자동입력용 */
    const fieldIdToWidgetId = useMemo(() => {
        const map: Record<string, string> = {};
        widgetItems.flatMap(item => item.contents.map(c => c.widget))
            .filter((w): w is FormWidget => w.type === 'form')
            .forEach(w => w.fields?.forEach(f => {
                if (w.widgetId) map[f.id] = w.widgetId;
            }));
        return map;
    }, [widgetItems]);

    /* crossTabFormValues를 formValuesMap에 병합 — 다른 탭에서 생성된 값을 현재 탭 폼에 주입
     * crossTabFormValues 키는 fieldKey("form3.title" 등) 형태
     * → allFieldKeyToId로 fieldId로 변환 후 fieldIdToWidgetId로 widgetId 매핑
     *
     * 병합 규칙:
     * 1. formValuesMap에 없는 widgetId라도 crossTab 값이 있으면 merged에 포함
     * 2. formValuesMap 값이 비어있으면("") crossTab 자동생성 값 우선 사용
     * 3. formValuesMap 값이 실제로 입력된 경우(비어있지 않음)만 vals 우선
     */
    const mergedFormValuesMap = useMemo(() => {
        if (!crossTabFormValues || Object.keys(crossTabFormValues).length === 0) return formValuesMap;

        /* formValuesMap 기반으로 시작 (기존 widgetId 모두 포함) */
        const merged: Record<string, Record<string, string>> = { ...(formValuesMap ?? {}) };

        /* crossTabFormValues 전체 순회 — widgetId가 merged에 없어도 추가 */
        Object.entries(crossTabFormValues).forEach(([fieldKey, crossVal]) => {
            const targetFieldId = allFieldKeyToId[fieldKey];
            if (!targetFieldId) return;
            const widgetId = fieldIdToWidgetId[targetFieldId];
            if (!widgetId) return;

            const currentVals = merged[widgetId] ?? {};
            const existingVal = currentVals[targetFieldId];

            /* formValuesMap에 실제 입력 값이 있으면 보호, 없거나 빈값이면 crossTab 값 사용 */
            if (!existingVal || existingVal === '') {
                merged[widgetId] = { ...currentVals, [targetFieldId]: crossVal };
            }
        });

        return merged;
    }, [formValuesMap, crossTabFormValues, allFieldKeyToId, fieldIdToWidgetId]);

    /* mergedFormValuesMap 기반 통합 allFormValues — cross-tab 값 포함 */
    const allFormValues = useMemo(() => {
        return Object.assign({}, ...Object.values(mergedFormValuesMap ?? {})) as Record<string, string>;
    }, [mergedFormValuesMap]);

    /* cross-form/cross-tab 데이터생성 자동입력 콜백
     * - 현재 탭 내 폼 소속이면 → onFormValuesChange로 업데이트
     * - 못 찾으면 → onCrossTabFormChange로 TabRenderer에 에스컬레이션 */
    const handleChangeAllFormValues = useCallback((fieldId: string, value: string) => {
        const widgetId = fieldIdToWidgetId[fieldId];
        if (widgetId) {
            onFormValuesChange?.(widgetId, fieldId, value);
        } else {
            onCrossTabFormChange?.(fieldId, value);
        }
    }, [fieldIdToWidgetId, onFormValuesChange, onCrossTabFormChange]);

    /* ── 카테고리 dbSlug 상속 맵 ──
     * depth 2+ 위젯은 dbSlug가 없으므로 parentWidgetId 체인을 타고 올라가 상위 dbSlug 상속.
     * widgetId → resolvedDbSlug */
    const categoryDbSlugMap = (() => {
        const allWidgets = widgetItems.flatMap(item => item.contents.map(c => c.widget));
        const catWidgets = allWidgets.filter(w => w.type === 'category') as { widgetId: string; dbSlug?: string; parentWidgetId?: string }[];
        const slugMap: Record<string, string> = {};

        /* 1차: dbSlug가 있는 위젯 먼저 등록 */
        catWidgets.forEach(w => { if (w.dbSlug) slugMap[w.widgetId] = w.dbSlug; });

        /* 2차: dbSlug 없는 위젯은 parentWidgetId 체인 탐색 (최대 5 depth) */
        catWidgets.filter(w => !w.dbSlug).forEach(w => {
            let cur = w;
            for (let i = 0; i < 5; i++) {
                if (!cur.parentWidgetId) break;
                const parent = catWidgets.find(p => p.widgetId === cur.parentWidgetId);
                if (!parent) break;
                if (parent.dbSlug) { slugMap[w.widgetId] = parent.dbSlug; break; }
                cur = parent;
            }
        });

        return slugMap;
    })();

    return (
        <>
            {widgetItems.map(item => (
                /* outer 셀 — GridCell 로 colSpan/rowSpan/height 일괄 관리 */
                <GridCell
                    key={item.id}
                    colSpan={item.colSpan}
                    rowSpan={item.rowSpan}
                    onClick={onItemClick ? () => onItemClick(item.id) : undefined}
                    className={onItemClick ? `cursor-pointer transition-all ${selectedItemId === item.id ? 'ring-2 ring-inset ring-slate-900' : 'hover:ring-1 hover:ring-inset hover:ring-slate-300'}` : undefined}
                >
                    {/* inner sub-grid — track = ROW_HEIGHT - GAP_SIZE, rowGap = GAP_SIZE → 합계 ROW_HEIGHT 유지 */}
                    <div
                        className="w-full"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${item.colSpan}, 1fr)`,
                            gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                            gridAutoFlow: 'row dense',
                            rowGap: `${GAP_SIZE}px`,
                            columnGap: 0,
                        }}
                    >
                        {item.contents.map(c => {
                            const wid = (c.widget as { widgetId?: string }).widgetId ?? '';
                            const td = tableDataMap?.[wid];
                            /* category 위젯 dbSlug 상속 — depth 2+ 위젯에 상위 slug 주입 */
                            const resolvedWidget = (c.widget.type === 'category' && wid && categoryDbSlugMap[wid] && !(c.widget as { dbSlug?: string }).dbSlug)
                                ? { ...c.widget, dbSlug: categoryDbSlugMap[wid] }
                                : c.widget;
                            return (
                                <div
                                    key={c.id}
                                    style={{
                                        /* space 위젯: align 기반 그리드 열 위치 계산 (정렬 보장) */
                                        gridColumn: c.widget.type === 'space'
                                            ? getSpaceGridColumn(c.widget.align, Math.min(c.colSpan, item.colSpan), item.colSpan)
                                            : `span ${Math.min(c.colSpan, item.colSpan)}`,
                                        gridRow: `span ${c.rowSpan}`,
                                        /* height = rowSpan × ROW_HEIGHT - GAP_SIZE (track + gap 합계 맞춤) */
                                        height: `${c.rowSpan * ROW_HEIGHT - GAP_SIZE}px`,
                                    }}
                                >
                                    <WidgetRenderer
                                        mode={mode}
                                        widget={resolvedWidget}
                                        contentColSpan={c.colSpan}
                                        /* 검색 */
                                        searchValues={searchValues}
                                        onSearchChange={onSearchChange}
                                        onSearch={wid ? () => onSearch?.(wid) : undefined}
                                        onReset={wid ? () => onReset?.(wid) : undefined}
                                        codeGroups={codeGroups}
                                        /* 폼 */
                                        formValues={mergedFormValuesMap?.[wid] ?? {}}
                                        onFormValuesChange={(fieldId, value) => onFormValuesChange?.(wid, fieldId, value)}
                                        onChangeAllFormValues={handleChangeAllFormValues}
                                        allFormValues={allFormValues}
                                        allFieldKeyToId={allFieldKeyToId}
                                        urlParams={urlParams}
                                        crossTabFormValues={crossTabFormValues}
                                        onContentAction={(widgetIds, action, goBack, contentValidationRuleIds?: Record<string, number[]>) => onContentAction?.(widgetIds, action, goBack, mergedFormValuesMap, contentValidationRuleIds)}
                                        onDataSave={onDataSave}
                                        onClose={onClose}
                                        /* SubList */
                                        subListRowsMap={subListRowsMap}
                                        onSubListRowsChange={onSubListRowsChange}
                                        /* 파일 업로드 — SubList 파일 변경 시 rowId도 함께 전달 */
                                        fileValues={fileValuesMap?.[wid]}
                                        existingFileMeta={existingFileMetaMap?.[wid]}
                                        imgBlobUrls={imgBlobUrls}
                                        onFileChange={onFileChange ? (fieldId, files, rowId?) => onFileChange(wid, fieldId, files, rowId) : undefined}
                                        onRemoveExisting={onRemoveExisting ? (fieldId, fileId) => onRemoveExisting(wid, fieldId, fileId) : undefined}
                                        /* 테이블 */
                                        tableData={td?.rows}
                                        tableLoading={td?.loading}
                                        sortKey={sortKeyMap?.[wid] ?? null}
                                        sortDir={sortDirMap?.[wid] ?? 'asc'}
                                        onSort={(accessor, dir) => onSort?.(wid, accessor, dir)}
                                        totalElements={td?.totalElements}
                                        totalPages={td?.totalPages}
                                        currentPage={td?.currentPage}
                                        onPageChange={(page) => onPageChange?.(wid, page)}
                                        onLoadMore={() => onLoadMore?.(wid)}
                                        appendLoading={td?.appendLoading}
                                        hasMore={td?.hasMore ?? true}
                                        selectedRowIds={tableSelectedRowsMap?.[wid] ?? []}
                                        onRowsSelect={ids => onTableRowsSelect?.(wid, ids)}
                                        /* 카테고리 */
                                        categorySelections={categorySelections}
                                        onCategorySelect={onCategorySelect}
                                        /* multiselect */
                                        multiSelectValuesMap={multiSelectValuesMap}
                                        onMultiSelectChange={onMultiSelectChange}
                                        multiSelectExtraFieldValuesMap={multiSelectExtraFieldValuesMap}
                                        onMultiSelectExtraFieldChange={onMultiSelectExtraFieldChange}
                                        /* 팝업 */
                                        dataSlug={dataSlug}
                                        onRefresh={onRefresh}
                                        pageSlug={pageSlug}
                                        mainConnectedSlug={mainConnectedSlug}
                                        leaveCheck={leaveCheck}
                                        /* 엑셀 다운로드 */
                                        tableWidgetsMap={tableWidgetsMap}
                                        currentSearchParams={currentSearchParams}
                                        /* _fetchedRel{id} 데이터 — Form 위젯 relationSlugId 연결 데이터 표시용 */
                                        fetchRelData={formFetchRelMap?.[wid]}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </GridCell>
            ))}
        </>
    );
}
