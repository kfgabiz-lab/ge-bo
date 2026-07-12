'use client';

/**
 * ============================================================
 *  [페이지 메이커] Quick-Page(List) — 검색+목록 페이지 빌더
 * ============================================================
 *  - Quick-Detail 빌더와 동일한 UI 구조 유지
 *  - 고정 구조: 검색(Search) + 공간영역(Space, ActionButton only) + 데이터테이블(Table)
 *  - 추가/삭제/재정렬 불가
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import { Save, Wand2 } from 'lucide-react';
import api from '@/lib/api';
import { CommonBuilderDispatcher } from '../_shared/components/builder/CommonBuilderDispatcher';
import type { TableWidget } from '../_shared/components/builder/TableBuilder';
import { SizeSettingPanel } from '../_shared/components/builder/SizeSettingPanel';

import { ContentRowHeader } from '../_shared/components/builder/ContentRowHeader';
import { TemplateLoader } from '../_shared/components/builder/TemplateLoader';
import { PageGridRenderer } from '../_shared/components/renderer';
import type { SpaceWidget, SearchWidget, PageContentItem } from '../_shared/components/renderer';
import { toSlug } from '../_shared/utils';
import { SaveModal } from '../_shared/components/TemplateModals';
import { TemplateItem } from '../_shared/types';
import { useTemplateManagement } from '../_shared/hooks/useTemplateManagement';
import PageLayout from '@/components/layout/page-layout';

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

/** 고정 컨텐츠 아이템 */
interface FixedContentItem<W> {
    id: string;
    colSpan: number;
    rowSpan: number;
    widget: W;
}

/* ══════════════════════════════════════════ */
/*  초기 컨텐츠 생성                           */
/* ══════════════════════════════════════════ */

const createSearchContent = (): FixedContentItem<SearchWidget> => ({
    id: 'fixed-search',
    colSpan: 12,
    rowSpan: 2,
    widget: {
        type: 'search',
        widgetId: `ql-search-${Date.now()}`,
        contentKey: '',
        rows: [],
    },
});

const createSpaceContent = (): FixedContentItem<SpaceWidget> => ({
    id: 'fixed-space',
    colSpan: 12,
    rowSpan: 1,
    widget: {
        type: 'space',
        widgetId: `ql-space-${Date.now()}`,
        items: [],
        align: 'right',
    },
});

const createTableContent = (): FixedContentItem<TableWidget> => ({
    id: 'fixed-table',
    colSpan: 12,
    rowSpan: 5,
    widget: {
        type: 'table',
        widgetId: `ql-table-${Date.now()}`,
        contentKey: '',
        columns: [],
        connectedSearchIds: [],
        displayMode: 'pagination',
        pageSize: 10,
    },
});

/* ══════════════════════════════════════════ */
/*  메인 컴포넌트                               */
/* ══════════════════════════════════════════ */
export default function QuickListBuilderPage() {

    /* ── 공통 템플릿 관리 훅 (불러오기 + 저장 상태/핸들러) ── */
    const tm = useTemplateManagement('PAGE');

    /* ── 고정 컨텐츠 ── */
    const [searchContent, setSearchContent] = useState<FixedContentItem<SearchWidget>>(createSearchContent);
    const [spaceContent,  setSpaceContent]  = useState<FixedContentItem<SpaceWidget>>(createSpaceContent);
    const [tableContent,  setTableContent]  = useState<FixedContentItem<TableWidget>>(createTableContent);

    /* ── 편집 상태 ── */
    const [editingContentId, setEditingContentId] = useState<string | null>(null);

    /* ── Slug 레지스트리 — TableBuilder DB Slug 드롭다운용 ── */
    const [slugOptions, setSlugOptions] = useState<{ id: number; slug: string; name: string }[]>([]);
    useEffect(() => {
        api.get('/slug-registry/active')
            .then(res => setSlugOptions((res.data || []).filter((s: { type: string }) => s.type === 'PAGE_DATA')))
            .catch(() => { });
    }, []);

    /* ── API 정보 — Space ActionButton API 연동 연결용 ── */
    const [apiInfoOptions, setApiInfoOptions] = useState<{ id: number; name: string; method: string; urlPattern: string }[]>([]);
    useEffect(() => {
        api.get('/api-infos/active')
            .then(res => setApiInfoOptions(res.data || []))
            .catch(() => { /* 조회 실패 시 빈 배열 유지 */ });
    }, []);

    /* ── 전체 페이지 템플릿 목록 — Space ActionButton 페이지 연결용 ── */
    const [pageTemplates, setPageTemplates] = useState<TemplateItem[]>([]);
    useEffect(() => {
        api.get('/page-templates')
            .then(res => setPageTemplates(res.data as TemplateItem[]))
            .catch(() => { });
    }, []);

    /* ── 템플릿 불러오기 (페이지 고유 파싱 로직) ── */
    const handleLoadSelect = (tpl: TemplateItem) => {
        try {
            const config = JSON.parse(tpl.configJson);
            if (config.widgetItems) {
                type C = { widget?: { type?: string } };
                if (config.widgetItems.length === 1) {
                    /* 신규 구조: 1개 outer item, contents 배열에서 위젯 타입으로 탐색 */
                    const contents = (config.widgetItems[0]?.contents ?? []) as C[];
                    const si = contents.find(c => c.widget?.type === 'search') as FixedContentItem<SearchWidget> | undefined;
                    const pi = contents.find(c => c.widget?.type === 'space')  as FixedContentItem<SpaceWidget>  | undefined;
                    const ti = contents.find(c => c.widget?.type === 'table')  as FixedContentItem<TableWidget>  | undefined;
                    setSearchContent(si || createSearchContent());
                    setSpaceContent(pi  || createSpaceContent());
                    setTableContent(ti  || createTableContent());
                } else {
                    /* 구버전 구조: 3개 separate outer items (하위 호환) */
                    const [si, pi, ti] = config.widgetItems;
                    setSearchContent(si?.contents?.[0] || createSearchContent());
                    setSpaceContent(pi?.contents?.[0]  || createSpaceContent());
                    setTableContent(ti?.contents?.[0]  || createTableContent());
                }
            } else {
                /* 구버전 하위 호환 */
                setSearchContent(config.searchContent || createSearchContent());
                setSpaceContent(config.spaceContent   || createSpaceContent());
                setTableContent(config.tableContent   || createTableContent());
            }
            setEditingContentId(null);
            tm.onLoadSuccess(tpl); /* 공통: currentTemplateId/Name 업데이트 + 드롭다운 닫기 + toast */
        } catch {
            import('sonner').then(({ toast }) => toast.error('설정 파일 파싱에 실패했습니다.'));
        }
    };

    /* ── 컨텐츠 크기 수정 ── */
    const updateSize = <W,>(
        setter: React.Dispatch<React.SetStateAction<FixedContentItem<W>>>,
        colSpan: number,
        rowSpan: number,
    ) => setter(prev => ({
        ...prev,
        colSpan: Math.max(1, Math.min(12, colSpan)),
        rowSpan: Math.max(1, rowSpan),
    }));

    /* ── widgetItems 조립 (저장 시 호출) ── */
    const buildWidgetItems = () => [{
        id: 'wi-all',
        colSpan: 12,
        rowSpan: searchContent.rowSpan + spaceContent.rowSpan + tableContent.rowSpan,
        contents: [
            { id: searchContent.id, colSpan: searchContent.colSpan, rowSpan: searchContent.rowSpan, widget: searchContent.widget as unknown as Record<string, unknown> },
            { id: spaceContent.id,  colSpan: spaceContent.colSpan,  rowSpan: spaceContent.rowSpan,  widget: spaceContent.widget  as unknown as Record<string, unknown> },
            { id: tableContent.id,  colSpan: tableContent.colSpan,  rowSpan: tableContent.rowSpan,  widget: tableContent.widget  as unknown as Record<string, unknown> },
        ],
    }];

    /* ═══════════════════════════════════════ */
    /*  렌더                                    */
    /* ═══════════════════════════════════════ */
    return (
        <div className="space-y-5">

            {/* ── 페이지 헤더 ── */}
            <div>
                <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-slate-400" />
                    페이지 메이커 — Quick-Page(List)
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    검색+목록 페이지 레이아웃을 구성합니다.
                    {tm.currentTemplateName && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                            <Save className="w-3 h-3" />{tm.currentTemplateName}
                        </span>
                    )}
                </p>
            </div>

            {/* ── 메인 레이아웃 ── */}
            <div className="grid grid-cols-[340px_1fr] gap-5 items-start">

                {/* ════════════════════════════════ */}
                {/* 좌측: 설정 패널                   */}
                {/* ════════════════════════════════ */}
                <div className="bg-white border border-slate-200 rounded-xl sticky top-4">

                    {/* 불러오기 드롭다운 */}
                    <TemplateLoader
                        {...tm}
                        onToggle={() => { tm.setShowLoadDropdown(v => !v); if (!tm.showLoadDropdown) tm.loadTemplateList(); }}
                        onSearchChange={tm.setLoadSearch}
                        onSelect={handleLoadSelect}
                        onDelete={tm.handleDeleteTemplate}
                        onDuplicate={tm.handleDuplicateTemplate}
                    />

                    {/* 위젯 셀 영역 */}
                    <div className="p-3 space-y-1.5 max-h-[calc(100vh-240px)] overflow-y-auto">
                        <div className="border border-slate-200 rounded-lg overflow-hidden">

                            {/* 위젯 헤더 */}
                            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 select-none">
                                <span className="text-[10px] font-bold w-4 text-center text-slate-400">1</span>
                                <span className="text-[10px] font-semibold flex-1 truncate text-slate-300">
                                    위젯 1
                                    <span className="ml-1 font-normal text-[9px] text-slate-500">고정 구조</span>
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-400">3개</span>
                            </div>

                            {/* ── 검색 컨텐츠 행 ── */}
                            <div className="border-t border-slate-100">
                                <ContentRowHeader
                                    widgetType="search"
                                    label={`검색${searchContent.widget.contentKey ? ` — ${searchContent.widget.contentKey}` : ''}`}
                                    colSpan={searchContent.colSpan}
                                    rowSpan={searchContent.rowSpan}
                                    isEditing={editingContentId === 'fixed-search'}
                                    isFixed
                                    onToggle={() => setEditingContentId(editingContentId === 'fixed-search' ? null : 'fixed-search')}
                                />
                                {editingContentId === 'fixed-search' && (

                                        <div className="border-t border-slate-100 bg-slate-50/50">
                                            <SizeSettingPanel
                                                colSpan={searchContent.colSpan}
                                                rowSpan={searchContent.rowSpan}
                                                onColSpanChange={(v: number) => updateSize(setSearchContent, v, searchContent.rowSpan)}
                                                onRowSpanChange={(v: number) => updateSize(setSearchContent, searchContent.colSpan, v)}
                                            />
                                            <div className="px-3 pb-2 pt-1">
                                                <CommonBuilderDispatcher
                                                    widget={searchContent.widget}
                                                    onChange={w => setSearchContent(prev => ({ ...prev, widget: w as typeof searchContent.widget }))}
                                                    context={{ slugOptions, pageTemplates }}
                                                />
                                            </div>
                                        </div>

                                )}
                            </div>

                            {/* ── 공간영역 컨텐츠 행 ── */}
                            <div className="border-t border-slate-100">
                                <ContentRowHeader
                                    widgetType="space"
                                    label="공간영역"
                                    colSpan={spaceContent.colSpan}
                                    rowSpan={spaceContent.rowSpan}
                                    isEditing={editingContentId === 'fixed-space'}
                                    isFixed
                                    onToggle={() => setEditingContentId(editingContentId === 'fixed-space' ? null : 'fixed-space')}
                                />
                                {editingContentId === 'fixed-space' && (

                                        <div className="border-t border-slate-100 bg-slate-50/50">
                                            <SizeSettingPanel
                                                colSpan={spaceContent.colSpan}
                                                rowSpan={spaceContent.rowSpan}
                                                onColSpanChange={(v: number) => updateSize(setSpaceContent, v, spaceContent.rowSpan)}
                                                onRowSpanChange={(v: number) => updateSize(setSpaceContent, spaceContent.colSpan, v)}
                                            />
                                            <div className="px-3 pb-2 pt-1">
                                                <CommonBuilderDispatcher
                                                    widget={spaceContent.widget}
                                                    onChange={w => setSpaceContent(prev => ({ ...prev, widget: w as typeof spaceContent.widget }))}
                                                    context={{ slugOptions, apiInfoOptions, pageTemplates, actionButtonOnly: true }}
                                                />
                                            </div>
                                        </div>

                                )}
                            </div>

                            {/* ── 데이터테이블 컨텐츠 행 ── */}
                            <div className="border-t border-slate-100">
                                <ContentRowHeader
                                    widgetType="table"
                                    label={`데이터테이블${tableContent.widget.contentKey ? ` — ${tableContent.widget.contentKey}` : ''}`}
                                    colSpan={tableContent.colSpan}
                                    rowSpan={tableContent.rowSpan}
                                    isEditing={editingContentId === 'fixed-table'}
                                    isFixed
                                    onToggle={() => setEditingContentId(editingContentId === 'fixed-table' ? null : 'fixed-table')}
                                />
                                {editingContentId === 'fixed-table' && (

                                        <div className="border-t border-slate-100 bg-slate-50/50">
                                            <SizeSettingPanel
                                                colSpan={tableContent.colSpan}
                                                rowSpan={tableContent.rowSpan}
                                                onColSpanChange={(v: number) => updateSize(setTableContent, v, tableContent.rowSpan)}
                                                onRowSpanChange={(v: number) => updateSize(setTableContent, tableContent.colSpan, v)}
                                            />
                                            <div className="px-3 pb-2 pt-1">
                                                <CommonBuilderDispatcher
                                                    widget={tableContent.widget}
                                                    onChange={w => setTableContent(prev => ({ ...prev, widget: w as typeof tableContent.widget }))}
                                                    context={{
                                                        slugOptions,
                                                        pageTemplates,
                                                        searchWidgets: [{
                                                            widgetId: searchContent.widget.widgetId,
                                                            contentKey: searchContent.widget.contentKey,
                                                        }],
                                                    }}
                                                />
                                            </div>
                                        </div>

                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ════════════════════════════════ */}
                {/* 우측: 미리보기 패널               */}
                {/* ════════════════════════════════ */}
                <div className="space-y-4">

                    {/* 상단 툴바 */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">미리보기</span>
                        <button
                            onClick={tm.openSaveModal}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-all"
                            title={tm.currentTemplateId ? '템플릿 수정 저장' : '새 템플릿 저장'}
                        >
                            <Save className="w-3.5 h-3.5" />
                            {tm.currentTemplateId ? '수정' : '저장'}
                        </button>
                    </div>

                    {/* 미리보기 영역 */}
                    <div className="bg-slate-100 rounded-xl min-h-[500px] overflow-y-auto p-6">
                        <PageLayout mode="preview">
                            <PageGridRenderer
                                mode="preview"
                                widgetItems={[{
                                    id: 'preview-all',
                                    colSpan: 12,
                                    rowSpan: searchContent.rowSpan + spaceContent.rowSpan + tableContent.rowSpan,
                                    contents: [searchContent, spaceContent, tableContent] as PageContentItem[],
                                }]}
                            />
                        </PageLayout>
                    </div>
                </div>
            </div>

            {/* 저장 모달 */}
            <SaveModal
                show={tm.showSaveModal}
                onClose={() => tm.setShowSaveModal(false)}
                isEdit={!!tm.currentTemplateId}
                name={tm.saveModalName}
                slug={tm.saveModalSlug}
                desc={tm.saveModalDesc}
                isSaving={tm.isSaving}
                onNameChange={tm.setSaveModalName}
                onSlugChange={tm.setSaveModalSlug}
                onDescChange={tm.setSaveModalDesc}
                onConfirm={() => tm.handleSaveConfirm(buildWidgetItems(), { outputMode: 'page' })}
                toSlug={toSlug}
            />
        </div>
    );
}
