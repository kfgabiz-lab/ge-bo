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

import React, { useState, useEffect, useCallback } from 'react';
import {
    ChevronDown, Save, Loader2, Wand2,
    FolderOpen, Copy, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { SearchWidgetBuilder } from '../_shared/components/builder/SearchWidgetBuilder';
import { SpaceBuilder } from '../_shared/components/builder/SpaceBuilder';
import { TableBuilder, TableWidget } from '../_shared/components/builder/TableBuilder';
import { SizeSettingPanel } from '../_shared/components/builder/SizeSettingPanel';
import { ContentRowHeader } from '../_shared/components/builder/ContentRowHeader';
import { PageGridRenderer } from '../_shared/components/renderer';
import type { SpaceWidget, SearchWidget, PageContentItem } from '../_shared/components/renderer';
import { toSlug } from '../_shared/utils';
import { saveTemplate } from '../_shared/templateApi';
import { SaveModal } from '../_shared/components/TemplateModals';
import { TemplateItem } from '../_shared/types';
import PageLayout from '@/components/layout/PageLayout';

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

    /* ── 고정 컨텐츠 ── */
    const [searchContent, setSearchContent] = useState<FixedContentItem<SearchWidget>>(createSearchContent);
    const [spaceContent,  setSpaceContent]  = useState<FixedContentItem<SpaceWidget>>(createSpaceContent);
    const [tableContent,  setTableContent]  = useState<FixedContentItem<TableWidget>>(createTableContent);

    /* ── 편집 상태 ── */
    const [editingContentId, setEditingContentId] = useState<string | null>(null);

    /* ── 저장 모달 상태 ── */
    const [showSaveModal,      setShowSaveModal]      = useState(false);
    const [currentTemplateId,  setCurrentTemplateId]  = useState<number | null>(null);
    const [currentTemplateName, setCurrentTemplateName] = useState('');
    const [saveModalName,      setSaveModalName]      = useState('');
    const [saveModalSlug,      setSaveModalSlug]      = useState('');
    const [saveModalDesc,      setSaveModalDesc]      = useState('');
    const [isSaving,           setIsSaving]           = useState(false);

    /* ── 불러오기 상태 ── */
    const [templateList,    setTemplateList]    = useState<TemplateItem[]>([]);
    const [isLoadingList,   setIsLoadingList]   = useState(false);
    const [showLoadDropdown, setShowLoadDropdown] = useState(false);
    const [loadSearch,      setLoadSearch]      = useState('');
    const [isDeletingId,    setIsDeletingId]    = useState<number | null>(null);
    const [isDuplicatingId, setIsDuplicatingId] = useState<number | null>(null);

    /* ── Slug 레지스트리 — TableBuilder DB Slug 드롭다운용 ── */
    const [slugOptions, setSlugOptions] = useState<{ id: number; slug: string; name: string }[]>([]);
    useEffect(() => {
        api.get('/slug-registry/active')
            .then(res => setSlugOptions((res.data || []).filter((s: { type: string }) => s.type === 'PAGE_DATA')))
            .catch(() => { });
    }, []);

    /* ── Quick-Detail 템플릿 목록 — Space ActionButton 페이지 연결용 ── */
    const [pageTemplates, setPageTemplates] = useState<TemplateItem[]>([]);
    useEffect(() => {
        api.get('/page-templates')
            .then(res => setPageTemplates((res.data as TemplateItem[]).filter(t => t.templateType === 'QUICK_DETAIL')))
            .catch(() => { });
    }, []);

    /* ── 템플릿 목록 불러오기 ── */
    const loadTemplateList = useCallback(async () => {
        setIsLoadingList(true);
        try {
            const res = await api.get('/page-templates');
            setTemplateList((res.data || []).filter((t: TemplateItem) => t.templateType === 'QUICK_LIST'));
        } catch { /* 조용히 처리 */ } finally {
            setIsLoadingList(false);
        }
    }, []);

    /* ── 템플릿 불러오기 ── */
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
            setCurrentTemplateId(tpl.id);
            setCurrentTemplateName(tpl.name);
            setSaveModalSlug(tpl.slug);
            setShowLoadDropdown(false);
            setEditingContentId(null);
            toast.success(`"${tpl.name}" 불러왔습니다.`);
        } catch {
            toast.error('설정 파일 파싱에 실패했습니다.');
        }
    };

    /* ── 템플릿 삭제 ── */
    const handleDeleteTemplate = async (id: number) => {
        if (!window.confirm('템플릿을 삭제하시겠습니까?')) return;
        setIsDeletingId(id);
        try {
            await api.delete(`/page-templates/${id}`);
            setTemplateList(prev => prev.filter(t => t.id !== id));
            if (currentTemplateId === id) { setCurrentTemplateId(null); setCurrentTemplateName(''); }
            toast.success('템플릿이 삭제되었습니다.');
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        } finally { setIsDeletingId(null); }
    };

    /* ── 템플릿 복사 ── */
    const handleDuplicateTemplate = async (tpl: TemplateItem) => {
        setIsDuplicatingId(tpl.id);
        try {
            const newName = `${tpl.name} (복사)`;
            const res = await api.post('/page-templates', {
                name: newName, slug: `${tpl.slug}-copy`,
                description: tpl.description, configJson: tpl.configJson, templateType: 'QUICK_LIST',
            });
            setTemplateList(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
            toast.success(`"${newName}" 으로 복사되었습니다.`);
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || '복사 중 오류가 발생했습니다.');
        } finally { setIsDuplicatingId(null); }
    };

    /* ── 저장 처리 ── */
    const handleSaveConfirm = async () => {
        setIsSaving(true);
        try {
            /* 미리보기와 동일한 1개 outer item 구조로 저장 → 운영 페이지와 완전 일치 */
            const widgetItems = [{
                id: 'wi-all',
                colSpan: 12,
                rowSpan: searchContent.rowSpan + spaceContent.rowSpan + tableContent.rowSpan,
                contents: [
                    { id: searchContent.id, colSpan: searchContent.colSpan, rowSpan: searchContent.rowSpan, widget: searchContent.widget as unknown as Record<string, unknown> },
                    { id: spaceContent.id,  colSpan: spaceContent.colSpan,  rowSpan: spaceContent.rowSpan,  widget: spaceContent.widget  as unknown as Record<string, unknown> },
                    { id: tableContent.id,  colSpan: tableContent.colSpan,  rowSpan: tableContent.rowSpan,  widget: tableContent.widget  as unknown as Record<string, unknown> },
                ],
            }];
            const result = await saveTemplate({
                id: currentTemplateId,
                name: saveModalName,
                slug: saveModalSlug,
                description: saveModalDesc,
                templateType: 'QUICK_LIST',
                widgetItems,
            });
            setCurrentTemplateId(result.id);
            setCurrentTemplateName(result.name);
            setSaveModalSlug(result.slug);
            setShowSaveModal(false);
            toast.success(currentTemplateId ? '템플릿이 수정되었습니다.' : '템플릿이 저장되었습니다.');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '저장 중 오류가 발생했습니다.');
        } finally { setIsSaving(false); }
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

    /* ── 필터된 템플릿 목록 ── */
    const filteredTemplates = templateList.filter(t =>
        t.name.toLowerCase().includes(loadSearch.toLowerCase()) ||
        t.slug.toLowerCase().includes(loadSearch.toLowerCase())
    );

    /* ── 공통: 컨텐츠 행 헤더 렌더 ── */

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
                    {currentTemplateName && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                            <Save className="w-3 h-3" />{currentTemplateName}
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
                    <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 bg-slate-50/30">
                        <div className="relative">
                            <button
                                onClick={() => { setShowLoadDropdown(v => !v); if (!showLoadDropdown) loadTemplateList(); }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 border rounded-md text-xs transition-all ${showLoadDropdown ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white hover:border-slate-400'}`}
                            >
                                <span className="text-slate-400 flex items-center gap-1.5">
                                    <FolderOpen className="w-3 h-3" />불러오기...
                                </span>
                                {isLoadingList
                                    ? <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                                    : <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showLoadDropdown ? 'rotate-180' : ''}`} />
                                }
                            </button>
                            {showLoadDropdown && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                                    <div className="p-2 border-b border-slate-100">
                                        <input
                                            type="text" value={loadSearch}
                                            onChange={e => setLoadSearch(e.target.value)}
                                            placeholder="템플릿 검색..."
                                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-slate-900"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                                        {filteredTemplates.length === 0 ? (
                                            <div className="py-4 text-center text-xs text-slate-400">
                                                {isLoadingList ? '불러오는 중...' : '저장된 템플릿이 없습니다.'}
                                            </div>
                                        ) : filteredTemplates.map(tpl => (
                                            <div key={tpl.id} className="group flex items-center px-3 py-2 hover:bg-slate-50 transition-all">
                                                <button onClick={() => handleLoadSelect(tpl)} className="flex-1 min-w-0 text-left">
                                                    <p className="text-[11px] font-medium text-slate-800 truncate">{tpl.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono truncate">{tpl.slug}</p>
                                                </button>
                                                {currentTemplateId === tpl.id && (
                                                    <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1 py-0.5 rounded shrink-0 mr-1">현재</span>
                                                )}
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                    <button onClick={e => { e.stopPropagation(); handleDuplicateTemplate(tpl); }} disabled={isDuplicatingId === tpl.id} className="p-1 rounded text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all disabled:opacity-50" title="복사">
                                                        {isDuplicatingId === tpl.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                    <button onClick={e => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }} disabled={isDeletingId === tpl.id} className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50" title="삭제">
                                                        {isDeletingId === tpl.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

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
                                            <SearchWidgetBuilder
                                                widget={searchContent.widget}
                                                onChange={w => setSearchContent(prev => ({ ...prev, widget: w }))}
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
                                            <SpaceBuilder
                                                widget={spaceContent.widget}
                                                onChange={w => setSpaceContent(prev => ({ ...prev, widget: w }))}
                                                pageTemplates={pageTemplates}
                                                actionButtonOnly={true}
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
                                            <TableBuilder
                                                widget={tableContent.widget}
                                                searchWidgets={[{
                                                    widgetId: searchContent.widget.widgetId,
                                                    contentKey: searchContent.widget.contentKey,
                                                }]}
                                                slugOptions={slugOptions}
                                                onChange={w => setTableContent(prev => ({ ...prev, widget: w }))}
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
                            onClick={() => { setSaveModalName(currentTemplateName || ''); setShowSaveModal(true); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-all"
                            title={currentTemplateId ? '템플릿 수정 저장' : '새 템플릿 저장'}
                        >
                            <Save className="w-3.5 h-3.5" />
                            {currentTemplateId ? '수정' : '저장'}
                        </button>
                    </div>

                    {/* 미리보기 영역 — PageLayout + PageGridRenderer로 운영화면과 동일한 함수 사용 */}
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
                show={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                isEdit={!!currentTemplateId}
                name={saveModalName}
                slug={saveModalSlug}
                desc={saveModalDesc}
                isSaving={isSaving}
                onNameChange={setSaveModalName}
                onSlugChange={setSaveModalSlug}
                onDescChange={setSaveModalDesc}
                onConfirm={handleSaveConfirm}
                toSlug={toSlug}
            />
        </div>
    );
}
