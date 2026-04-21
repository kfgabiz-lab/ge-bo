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
 *   - outputMode='page'       → router.push('/admin/generated/{slug}?id={id}')
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
 *     onPopupSaved={() => fetchData(0)}
 *     codeGroups={codeGroups}
 *     handlers={tableHandlers}
 *     ...
 *   />
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { CodeGroupDef } from '../../types';
import { SearchRenderer } from './SearchRenderer';
import { TableRenderer } from './TableRenderer';
import { FormRenderer } from './FormRenderer';
import { SpaceRenderer } from './SpaceRenderer';
import CenterPopupLayout from '@/components/layout/popup/CenterPopupLayout';
import RightDrawerLayout from '@/components/layout/popup/RightDrawerLayout';
import type { AnyWidget, RendererMode, TableActionHandlers, SpaceWidget } from './types';
import type { FormWidget, FormFieldItem } from '../builder/FormBuilder';

/** 위젯 컨테이너 기본 클래스 (text / 빈 위젯 등에 사용) */
const BASE_CLS =
    'h-full w-full rounded border bg-white border-slate-300 shadow-sm overflow-hidden p-2';

/** QUICK_DETAIL 팝업 configJson 타입 (내부 처리용) */
interface PopupConfig {
    formContent:  { id: string; colSpan: number; rowSpan: number; widget: FormWidget };
    spaceContent: { id: string; colSpan: number; rowSpan: number; widget: SpaceWidget };
    outputMode:   'page' | 'layerpopup';
    layerType?:   'center' | 'right';
    layerTitle?:  string;
    layerWidth?:  'sm' | 'md' | 'lg' | 'xl';
}

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
    /** Space 위젯 버튼 클릭 시 Form 저장/삭제 동작 */
    onFormAction?: (connectedFormWidgetId: string, action: 'save' | 'delete') => void;
    /** Space 위젯 닫기 버튼 — 없으면 router.back() */
    onClose?: () => void;

    /* ── live 모드 전용 — form 파일 업로드 ── */
    /** 새로 선택한 파일 목록 (fieldId → File[]) */
    fileValues?: Record<string, File[]>;
    /** 기존 파일 메타 (fieldId → 메타 배열) */
    existingFileMeta?: Record<string, { id: number; origName: string; fileSize: number }[]>;
    /** 이미지 blob URL 캐시 (fileId → blob URL) */
    imgBlobUrls?: Record<number, string>;
    /** 파일 변경 핸들러 */
    onFileChange?: (fieldId: string, files: File[]) => void;
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

    /* ── live 모드 전용 — 팝업 컨텍스트 ── */
    /**
     * 팝업 내 저장·수정·삭제 API 호출에 사용할 page-data slug.
     * SpaceRenderer(connType='popup') 또는 TableRenderer(edit/detail) 팝업 오픈 시 참조.
     */
    dataSlug?: string;
    /** 팝업 저장·삭제 완료 후 콜백 (목록 새로고침 등) */
    onPopupSaved?: () => void;
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
    onFormAction,
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
    /* 팝업 컨텍스트 */
    dataSlug,
    onPopupSaved,
    externalPopupTrigger,
}: WidgetRendererProps) {
    const router = useRouter();

    /* ══════════════════════════════════════════ */
    /*  내부 팝업 상태                             */
    /* ══════════════════════════════════════════ */

    const [popupOpen,            setPopupOpen]            = useState(false);
    const [popupCfg,             setPopupCfg]             = useState<PopupConfig | null>(null);
    const [popupSaving,          setPopupSaving]          = useState(false);
    const [popupEditId,          setPopupEditId]          = useState<number | null>(null);
    const [popupListSlug,        setPopupListSlug]        = useState('');
    /* 팝업 폼 필드값 */
    const [popupValues,          setPopupValues]          = useState<Record<string, string>>({});
    const [popupFileValues,      setPopupFileValues]      = useState<Record<string, File[]>>({});
    const [popupExistingFileIds, setPopupExistingFileIds] = useState<Record<string, number[]>>({});
    const [popupExistingMeta,    setPopupExistingMeta]    = useState<
        Record<string, { id: number; origName: string; fileSize: number }[]>
    >({});
    const [popupImgBlobUrls,     setPopupImgBlobUrls]     = useState<Record<number, string>>({});

    /* ── 팝업 닫기 ── */
    const handlePopupClose = useCallback(() => {
        setPopupOpen(false);
        setPopupCfg(null);
        setPopupEditId(null);
    }, []);

    /**
     * 팝업 오픈 핸들러 (live 모드 전용)
     * @param slug      QUICK_DETAIL 템플릿 slug
     * @param editId    수정 대상 데이터 ID (신규 등록이면 null)
     * @param listSlug  저장·삭제에 사용할 page-data slug (없으면 dataSlug prop 사용)
     */
    const handleInternalPopupOpen = useCallback(async (
        slug: string,
        editId?: number | null,
        listSlug?: string,
    ) => {
        if (mode !== 'live') return;

        /* 상태 초기화 */
        setPopupCfg(null);
        setPopupSaving(false);
        setPopupEditId(editId ?? null);
        setPopupListSlug(listSlug || dataSlug || '');
        setPopupValues({});
        setPopupFileValues({});
        setPopupExistingFileIds({});
        setPopupExistingMeta({});
        setPopupImgBlobUrls({});

        try {
            const res = await api.get(`/page-templates/by-slug/${slug}`);
            const cfg = JSON.parse(res.data.configJson) as PopupConfig;

            /* outputMode='page': 팝업 없이 상세 페이지로 이동 */
            if (cfg.outputMode === 'page') {
                const query = editId != null ? `?id=${editId}` : '';
                router.push(`/admin/generated/${slug}${query}`);
                return;
            }

            /* outputMode='layerpopup': 기존 데이터 로드 후 팝업 오픈 */
            const fields: FormFieldItem[] = cfg.formContent?.widget?.fields ?? [];
            const resolvedSlug = listSlug || dataSlug || '';

            /* 수정 모드: 기존 데이터 조회 */
            let sourceData: Record<string, unknown> = {};
            if (editId != null && resolvedSlug) {
                try {
                    const editRes = await api.get(`/page-data/${resolvedSlug}/${editId}`);
                    sourceData = typeof editRes.data.dataJson === 'string'
                        ? JSON.parse(editRes.data.dataJson)
                        : (editRes.data.dataJson ?? {});
                } catch { /* 개별 조회 실패 무시 */ }
            }

            /* 필드별 초기값 설정 */
            const init: Record<string, string>          = {};
            const existingIds: Record<string, number[]> = {};
            fields.forEach(f => {
                const key = f.fieldKey || f.label;
                if (f.type === 'file' || f.type === 'image') {
                    const ids = sourceData[key];
                    if (Array.isArray(ids)) existingIds[f.id] = ids.map(Number);
                } else if (sourceData[key] !== undefined) {
                    init[f.id] = String(sourceData[key]);
                }
            });
            setPopupValues(init);
            setPopupExistingFileIds(existingIds);

            /* 기존 파일 메타데이터 조회 */
            const allIds = Object.values(existingIds).flat();
            if (allIds.length > 0) {
                const metaRes = await api.get('/page-files/meta', {
                    params: { ids: allIds.join(',') },
                });
                const metaMap: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
                Object.entries(existingIds).forEach(([fid, ids]) => {
                    metaMap[fid] = metaRes.data.filter(
                        (m: { id: number; origName: string; fileSize: number }) => ids.includes(m.id),
                    );
                });
                setPopupExistingMeta(metaMap);

                /* 이미지 필드 blob URL 미리 로딩 */
                const imgFieldIds = new Set(fields.filter(f => f.type === 'image').map(f => f.id));
                const imgIds = Object.entries(existingIds)
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
     * SpaceRenderer의 connType='form' 버튼이 팝업 WidgetRenderer를 통해 호출
     */
    const handlePopupFormAction = useCallback(async (
        _widgetId: string,
        action: 'save' | 'delete',
    ) => {
        if (!popupListSlug) return;

        /* 삭제 */
        if (action === 'delete') {
            if (!popupEditId) { toast.info('삭제할 데이터가 없습니다.'); return; }
            if (!confirm('삭제하시겠습니까?')) return;
            try {
                await api.delete(`/page-data/${popupListSlug}/${popupEditId}`);
                toast.success('삭제되었습니다.');
                onPopupSaved?.();
                handlePopupClose();
            } catch {
                toast.error('삭제 중 오류가 발생했습니다.');
            }
            return;
        }

        /* 저장 */
        const fields = popupCfg?.formContent?.widget?.fields ?? [];

        /* 유효성 검사 */
        for (const f of fields) {
            const label     = f.label || f.fieldKey || f.id;
            const val       = (popupValues[f.id] || '').trim();
            const fileCount = (popupExistingFileIds[f.id]?.length || 0) + (popupFileValues[f.id]?.length || 0);

            if (f.required) {
                const empty = (f.type === 'file' || f.type === 'image') ? fileCount === 0 : !val;
                if (empty) { toast.warning(`'${label}' 항목은 필수 입력입니다.`); return; }
            }
            if (val && f.type !== 'file' && f.type !== 'image' && f.type !== 'video') {
                if (f.minLength && val.length < f.minLength) {
                    toast.warning(`'${label}' 항목은 최소 ${f.minLength}자 이상 입력해야 합니다.`); return;
                }
                if (f.maxLength && val.length > f.maxLength) {
                    toast.warning(`'${label}' 항목은 최대 ${f.maxLength}자까지 입력 가능합니다.`); return;
                }
            }
            if (val && f.pattern) {
                try {
                    if (!new RegExp(f.pattern).test(val)) {
                        toast.warning(`'${label}' 형식이 올바르지 않습니다.${f.patternDesc ? ` (${f.patternDesc})` : ''}`);
                        return;
                    }
                } catch { /* 잘못된 패턴 무시 */ }
            }
            if ((f.type === 'file' || f.type === 'image') && f.maxFileCount && fileCount > f.maxFileCount) {
                toast.warning(`'${label}' 항목은 최대 ${f.maxFileCount}개까지 첨부 가능합니다.`); return;
            }
            if ((f.type === 'file' || f.type === 'image') && f.maxFileSizeMB) {
                const over = (popupFileValues[f.id] || []).find(file => file.size > f.maxFileSizeMB! * 1024 * 1024);
                if (over) { toast.warning(`'${label}' 파일은 개당 최대 ${f.maxFileSizeMB}MB까지 허용됩니다.`); return; }
            }
            if ((f.type === 'file' || f.type === 'image') && f.maxTotalSizeMB) {
                const total = (popupFileValues[f.id] || []).reduce((s, file) => s + file.size, 0);
                if (total > f.maxTotalSizeMB * 1024 * 1024) {
                    toast.warning(`'${label}' 전체 파일 용량이 ${f.maxTotalSizeMB}MB를 초과합니다.`); return;
                }
            }
        }

        setPopupSaving(true);
        try {
            /* 1단계: 파일/이미지 업로드 */
            const fileFields   = fields.filter(f => f.type === 'file' || f.type === 'image');
            const uploadedMap: Record<string, number[]> = {};
            const newIds: number[] = [];

            for (const f of fileFields) {
                const key      = f.fieldKey || f.label || '';
                const existing = popupExistingFileIds[f.id] || [];
                const newFiles = popupFileValues[f.id] || [];
                const allIds   = [...existing];
                for (const file of newFiles) {
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('templateSlug', popupListSlug);
                    fd.append('fieldKey', key);
                    const uploadRes = await api.post('/page-files/upload', fd, {
                        transformRequest: (data, headers) => {
                            if (headers) headers.delete('Content-Type');
                            return data;
                        },
                    });
                    allIds.push(uploadRes.data.id);
                    newIds.push(uploadRes.data.id);
                }
                uploadedMap[key] = allIds;
            }

            /* 2단계: dataJson 구성 */
            const dataJson: Record<string, unknown> = {};
            fields.forEach(f => {
                const key = f.fieldKey || f.label || '';
                dataJson[key] = (f.type === 'file' || f.type === 'image')
                    ? (uploadedMap[key] ?? popupExistingFileIds[f.id] ?? [])
                    : (popupValues[f.id] ?? '');
            });

            /* 3단계: page_data 저장 (신규 POST / 수정 PUT) */
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

            /* 4단계: 신규 업로드 파일 dataId 연결 */
            if (newIds.length > 0 && savedId) {
                await api.patch('/page-files/link', { fileIds: newIds, dataId: savedId });
            }

            onPopupSaved?.();
            handlePopupClose();
        } catch (err) {
            console.error('[WidgetRenderer] 팝업 저장 실패:', err);
            toast.error('저장 중 오류가 발생했습니다.');
        } finally {
            setPopupSaving(false);
        }
    }, [popupListSlug, popupEditId, popupCfg, popupValues, popupFileValues, popupExistingFileIds, handlePopupClose, onPopupSaved]);

    /* ══════════════════════════════════════════ */
    /*  팝업 오버레이 렌더링 함수                  */
    /* ══════════════════════════════════════════ */

    const renderPopupOverlay = () => {
        /* 팝업 내부 본문 */
        const body = (
            <div className="px-6 py-5 space-y-4">
                {popupCfg ? (
                    <>
                        {/* 폼 위젯 */}
                        {popupCfg.formContent?.widget && (
                            <WidgetRenderer
                                mode="live"
                                widget={popupCfg.formContent.widget}
                                codeGroups={codeGroups}
                                formValues={popupValues}
                                onFormValuesChange={(id, v) =>
                                    setPopupValues(prev => ({ ...prev, [id]: v }))
                                }
                                fileValues={popupFileValues}
                                existingFileMeta={popupExistingMeta}
                                imgBlobUrls={popupImgBlobUrls}
                                onFileChange={(fieldId, files) =>
                                    setPopupFileValues(prev => ({ ...prev, [fieldId]: files }))
                                }
                                onRemoveExisting={(fieldId, fileId) => {
                                    setPopupExistingFileIds(prev => ({
                                        ...prev,
                                        [fieldId]: (prev[fieldId] || []).filter(id => id !== fileId),
                                    }));
                                    setPopupExistingMeta(prev => ({
                                        ...prev,
                                        [fieldId]: (prev[fieldId] || []).filter(m => m.id !== fileId),
                                    }));
                                }}
                            />
                        )}
                        {/* 공간영역 (저장/삭제/닫기 버튼) */}
                        {popupCfg.spaceContent?.widget && (
                            <WidgetRenderer
                                mode="live"
                                widget={popupCfg.spaceContent.widget}
                                onFormAction={popupSaving ? undefined : handlePopupFormAction}
                                onClose={handlePopupClose}
                            />
                        )}
                        {/* 저장 중 표시 */}
                        {popupSaving && (
                            <div className="flex items-center justify-center gap-2 py-2 text-slate-400 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />저장 중...
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        );

        /* layerType에 따라 레이아웃 선택 */
        if (popupCfg?.layerType === 'right') {
            return (
                <RightDrawerLayout
                    open={popupOpen}
                    onClose={handlePopupClose}
                    title={popupCfg.layerTitle || ''}
                >
                    {body}
                </RightDrawerLayout>
            );
        }
        return (
            <CenterPopupLayout
                open={popupOpen}
                onClose={handlePopupClose}
                title={popupCfg?.layerTitle || ''}
                layerWidth={popupCfg?.layerWidth || 'md'}
            >
                {body}
            </CenterPopupLayout>
        );
    };

    /* ══════════════════════════════════════════ */
    /*  위젯 타입별 분기                           */
    /* ══════════════════════════════════════════ */

    /* widget이 없어도 외부 트리거 팝업은 렌더링해야 하므로 Fragment로 반환 */
    if (!widget) return (
        <>
            <div className="h-full w-full" />
            {mode === 'live' && renderPopupOverlay()}
        </>
    );

    /* ── Text ── */
    if (widget.type === 'text') {
        return (
            <div className={BASE_CLS}>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {widget.content || (
                        <span className="text-slate-300 italic">텍스트 없음</span>
                    )}
                </p>
            </div>
        );
    }

    /* ── Search ── */
    if (widget.type === 'search') {
        return (
            <SearchRenderer
                mode={mode}
                rows={widget.rows ?? []}
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
        /* edit/detail/fileClick 팝업을 내부적으로 처리하는 핸들러 래핑 */
        const wrappedHandlers: TableActionHandlers | undefined = handlers
            ? {
                onEdit: (row) => {
                    const actionsCol = widget.columns.find(c => c.cellType === 'actions');
                    const slug = actionsCol?.editPopupSlug;
                    if (slug) { handleInternalPopupOpen(slug, row._id as number, dataSlug); return; }
                    handlers.onEdit?.(row);
                },
                onDetail: (row) => {
                    const actionsCol = widget.columns.find(c => c.cellType === 'actions');
                    const slug = actionsCol?.detailPopupSlug;
                    if (slug) { handleInternalPopupOpen(slug, row._id as number, dataSlug); return; }
                    handlers.onDetail?.(row);
                },
                onDelete: handlers.onDelete,
                onFileClick: (col, row) => {
                    if (col.fileLayerSlug) {
                        handleInternalPopupOpen(col.fileLayerSlug, row._id as number, dataSlug);
                        return;
                    }
                    handlers.onFileClick?.(col, row);
                },
            }
            : undefined;

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
                {mode === 'live' && renderPopupOverlay()}
            </>
        );
    }

    /* ── Form ── */
    if (widget.type === 'form') {
        return (
            <FormRenderer
                mode={mode}
                fields={widget.fields}
                contentColSpan={contentColSpan}
                codeGroups={codeGroups}
                values={formValues}
                onChangeValues={onFormValuesChange}
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
                    onFormAction={onFormAction}
                    onClose={onClose}
                    onPopupOpen={(slug) => handleInternalPopupOpen(slug, null, dataSlug)}
                />
                {/* 팝업 오버레이 (live 모드 & open 상태일 때만 렌더링) */}
                {mode === 'live' && renderPopupOverlay()}
            </>
        );
    }

    return <div className={BASE_CLS} />;
}
