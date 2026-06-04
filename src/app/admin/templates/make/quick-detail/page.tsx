'use client';

/**
 * ============================================================
 *  [페이지 메이커] Quick-Page(Detail) — 상세/등록 페이지 빌더
 * ============================================================
 *  - Widget 빌더와 동일한 UI 구조 유지
 *  - 고정 구조: Form(상단) + 공간영역(하단) — 추가/삭제/재정렬 불가
 *  - 공간영역 내 필드: ActionButton만 허용
 * ============================================================
 */

import { useState, useEffect } from 'react';
import { Save, Wand2 } from 'lucide-react';
import api from '@/lib/api';
import { CommonBuilderDispatcher } from '../_shared/components/builder/CommonBuilderDispatcher';
import { SizeSettingPanel } from '../_shared/components/builder/SizeSettingPanel';

import { ContentRowHeader } from '../_shared/components/builder/ContentRowHeader';
import { OutputModePanel } from '../_shared/components/builder/OutputModePanel';
import { PreviewWrapper } from '../_shared/components/builder/PreviewWrapper';
import { TemplateLoader } from '../_shared/components/builder/TemplateLoader';
import { WidgetRenderer, PageGridRenderer } from '../_shared/components/renderer';
import type { SpaceWidget, PageContentItem } from '../_shared/components/renderer';
import type { FormWidget } from '../_shared/components/builder/FormBuilder';
import { toSlug } from '../_shared/utils';
import { SaveModal } from '../_shared/components/TemplateModals';
import { TemplateItem } from '../_shared/types';
import { useOutputMode } from '../_shared/hooks/useOutputMode';
import { useTemplateManagement } from '../_shared/hooks/useTemplateManagement';
import PageLayout from '@/components/layout/page-layout';
import { ROW_HEIGHT } from '@/components/layout/grid-cell';

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

/** 고정 컨텐츠 아이템 (Widget 빌더의 PageContentItem과 동일 구조) */
interface FixedContentItem {
    id: string;
    colSpan: number;
    rowSpan: number;
    widget: FormWidget | SpaceWidget;
}

/* ══════════════════════════════════════════ */
/*  상수                                      */
/* ══════════════════════════════════════════ */

/** 초기 Form 컨텐츠 생성 */
const createFormContent = (): FixedContentItem => ({
    id: 'fixed-form',
    colSpan: 12,
    rowSpan: 3,
    widget: {
        type: 'form',
        widgetId: `qw-form-${Date.now()}`,
        contentKey: '',
        connectedSlug: '',
        fields: [],
    } as unknown as FormWidget,
});

/** 초기 Space 컨텐츠 생성 */
const createSpaceContent = (): FixedContentItem => ({
    id: 'fixed-space',
    colSpan: 12,
    rowSpan: 1,
    widget: {
        type: 'space',
        widgetId: `qw-space-${Date.now()}`,
        items: [],
        align: 'left',
    } as SpaceWidget,
});

/* ══════════════════════════════════════════ */
/*  메인 컴포넌트                               */
/* ══════════════════════════════════════════ */
export default function QuickDetailBuilderPage() {

    /* ── 출력 모드 (page / layerpopup) — 공통 훅 사용 ── */
    const om = useOutputMode();

    /* ── 공통 템플릿 관리 훅 (불러오기 + 저장 상태/핸들러) ── */
    const tm = useTemplateManagement('PAGE');

    /* ── 고정 컨텐츠 (Form + Space) ── */
    const [formContent, setFormContent] = useState<FixedContentItem>(createFormContent);
    const [spaceContent, setSpaceContent] = useState<FixedContentItem>(createSpaceContent);

    /* ── 편집 상태 (Widget 빌더와 동일 패턴) ── */
    const [editingContentId, setEditingContentId] = useState<string | null>(null);

    /* ── 전체 템플릿 목록 — Space ActionButton / 페이지 연결용 (모든 타입 포함) ── */
    const [mainLayerTemplates, setMainLayerTemplates] = useState<TemplateItem[]>([]);
    useEffect(() => {
        api.get('/page-templates')
            .then(res => setMainLayerTemplates(res.data as TemplateItem[]))
            .catch(() => { });
    }, []);

    /* ── Slug 레지스트리 — Form connectedSlug용 ── */
    const [slugOptions, setSlugOptions] = useState<{ id: number; slug: string; name: string }[]>([]);
    useEffect(() => {
        api.get('/slug-registry/active')
            .then(res => setSlugOptions((res.data || []).filter((s: { type: string }) => s.type === 'PAGE_DATA')))
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
                    const fi = contents.find(c => c.widget?.type === 'form')  as FixedContentItem | undefined;
                    const si = contents.find(c => c.widget?.type === 'space') as FixedContentItem | undefined;
                    setFormContent(fi  || createFormContent());
                    setSpaceContent(si || createSpaceContent());
                } else {
                    /* 구버전 구조: 2개 separate outer items (하위 호환) */
                    const [fi, si] = config.widgetItems;
                    setFormContent(fi?.contents?.[0]  || createFormContent());
                    setSpaceContent(si?.contents?.[0] || createSpaceContent());
                }
            } else {
                /* 구버전 하위 호환 */
                setFormContent(config.formContent || createFormContent());
                setSpaceContent(config.spaceContent || createSpaceContent());
            }
            om.restore(config);
            setEditingContentId(null);
            tm.onLoadSuccess(tpl); /* 공통: currentTemplateId/Name 업데이트 + 드롭다운 닫기 + toast */
        } catch {
            import('sonner').then(({ toast }) => toast.error('설정 파일 파싱에 실패했습니다.'));
        }
    };

    /* ── 컨텐츠 크기 수정 ── */
    const maxCol = om.isRightDrawer ? 2 : 12;

    const updateFormSize = (colSpan: number, rowSpan: number) =>
        setFormContent(prev => ({ ...prev, colSpan: Math.max(1, Math.min(maxCol, colSpan)), rowSpan: Math.max(1, rowSpan) }));

    const updateSpaceSize = (colSpan: number, rowSpan: number) =>
        setSpaceContent(prev => ({ ...prev, colSpan: Math.max(1, Math.min(maxCol, colSpan)), rowSpan: Math.max(1, rowSpan) }));

    /* layerType이 'right'로 변경될 때 초과된 colSpan 자동 클램핑 */
    useEffect(() => {
        if (om.outputMode === 'layerpopup' && om.layerType === 'right') {
            setFormContent(prev => ({
                ...prev,
                colSpan: Math.min(prev.colSpan, 2),
                widget: {
                    ...prev.widget,
                    fields: (prev.widget as FormWidget).fields.map(f => ({ ...f, colSpan: Math.min(f.colSpan, 2) })),
                },
            }));
            setSpaceContent(prev => ({
                ...prev,
                colSpan: Math.min(prev.colSpan, 2),
                widget: {
                    ...prev.widget,
                    items: (prev.widget as SpaceWidget).items.map(i => ({ ...i, colSpan: Math.min(i.colSpan ?? 1, 2) as 1|2|3|4|5 })),
                },
            }));
        }
    }, [om.layerType, om.outputMode]);

    /* ── Form 위젯 참조 (SpaceBuilder formWidgets prop용) ── */
    const formWidgetRef = formContent.widget as FormWidget;

    /* ── widgetItems 조립 (저장 시 호출) ── */
    const buildWidgetItems = () => [{
        id: 'wi-all',
        colSpan: 12,
        rowSpan: formContent.rowSpan + spaceContent.rowSpan,
        contents: [
            { id: formContent.id,  colSpan: formContent.colSpan,  rowSpan: formContent.rowSpan,  widget: formContent.widget  as unknown as Record<string, unknown> },
            { id: spaceContent.id, colSpan: spaceContent.colSpan, rowSpan: spaceContent.rowSpan, widget: spaceContent.widget as unknown as Record<string, unknown> },
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
                    페이지 메이커 — Quick-Page(Detail)
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    상세/등록 페이지 레이아웃을 구성합니다.
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

                    {/* 출력 모드 탭 + LayerPopup 설정 — 공통 컴포넌트 */}
                    <OutputModePanel
                        outputMode={om.outputMode}
                        pageTitle={om.pageTitle}
                        pageTitleMsgKey={om.pageTitleMsgKey}
                        layerType={om.layerType}
                        layerTitle={om.layerTitle}
                        layerTitleMsgKey={om.layerTitleMsgKey}
                        layerWidth={om.layerWidth}
                        onOutputModeChange={om.setOutputMode}
                        onPageTitleChange={om.setPageTitle}
                        onPageTitleMsgKeyChange={om.setPageTitleMsgKey}
                        onLayerTypeChange={om.setLayerType}
                        onLayerTitleChange={om.setLayerTitle}
                        onLayerTitleMsgKeyChange={om.setLayerTitleMsgKey}
                        onLayerWidthChange={om.setLayerWidth}
                    />

                    {/* 위젯 셀 영역 — Widget 빌더와 동일한 구조 */}
                    <div className="p-3 space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto">
                        <div className="border border-slate-200 rounded-lg overflow-hidden">

                            {/* 위젯 헤더 */}
                            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 select-none">
                                <span className="text-[10px] font-bold w-4 text-center text-slate-400">1</span>
                                <span className="text-[10px] font-semibold flex-1 truncate text-slate-300">
                                    위젯 1
                                    <span className="ml-1 font-normal text-[9px] text-slate-500">고정 구조</span>
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-400">2개</span>
                            </div>

                            {/* ── Form 컨텐츠 행 ── */}
                            <div className="border-t border-slate-100">
                                <ContentRowHeader
                                    widgetType="form"
                                    label={`Form${formWidgetRef.contentKey ? ` — ${formWidgetRef.contentKey}` : ''}`}
                                    colSpan={formContent.colSpan}
                                    rowSpan={formContent.rowSpan}
                                    isEditing={editingContentId === 'fixed-form'}
                                    isFixed
                                    onToggle={() => setEditingContentId(editingContentId === 'fixed-form' ? null : 'fixed-form')}
                                />
                                {editingContentId === 'fixed-form' && (

                                        <div className="border-t border-slate-100 bg-slate-50/50">
                                            <SizeSettingPanel
                                                colSpan={formContent.colSpan}
                                                rowSpan={formContent.rowSpan}
                                                maxColSpan={om.isRightDrawer ? 2 : 12}
                                                onColSpanChange={v => updateFormSize(v, formContent.rowSpan)}
                                                onRowSpanChange={v => updateFormSize(formContent.colSpan, v)}
                                            />
                                            <div className="px-3 pb-2 pt-1">
                                                <CommonBuilderDispatcher
                                                    widget={formContent.widget}
                                                    onChange={w => setFormContent(prev => ({ ...prev, widget: w as FormWidget }))}
                                                    context={{ slugOptions, pageTemplates: mainLayerTemplates, maxColSpan: om.isRightDrawer ? 2 : 12 }}
                                                />
                                            </div>
                                        </div>

                                )}
                            </div>

                            {/* ── Space 컨텐츠 행 ── */}
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
                                                maxColSpan={om.isRightDrawer ? 2 : 12}
                                                onColSpanChange={v => updateSpaceSize(v, spaceContent.rowSpan)}
                                                onRowSpanChange={v => updateSpaceSize(spaceContent.colSpan, v)}
                                            />
                                            <div className="px-3 pb-2 pt-1">
                                                <CommonBuilderDispatcher
                                                    widget={spaceContent.widget}
                                                    onChange={w => setSpaceContent(prev => ({ ...prev, widget: w as SpaceWidget }))}
                                                    context={{
                                                        slugOptions,
                                                        pageTemplates: mainLayerTemplates,
                                                        contentWidgets: [{
                                                            type: 'form' as const,
                                                            widgetId: formWidgetRef.widgetId,
                                                            contentKey: formWidgetRef.contentKey,
                                                            connectedSlug: formWidgetRef.connectedSlug,
                                                        }],
                                                        actionButtonOnly: true,
                                                        maxColSpan: om.isRightDrawer ? 2 : 12,
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
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700">미리보기</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${om.outputMode === 'page' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
                                {om.outputMode === 'page' ? '상세페이지' : 'LayerPopup'}
                            </span>
                        </div>
                        <button
                            onClick={tm.openSaveModal}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-all"
                            title={tm.currentTemplateId ? '템플릿 수정 저장' : '새 템플릿 저장'}
                        >
                            <Save className="w-3.5 h-3.5" />
                            {tm.currentTemplateId ? '수정' : '저장'}
                        </button>
                    </div>

                    {/* 미리보기 영역 — PreviewWrapper가 outputMode에 따라 팝업 레이아웃 적용 */}
                    <div className={`bg-slate-100 rounded-xl min-h-[500px] overflow-hidden flex flex-col ${om.outputMode !== 'layerpopup' ? 'p-6' : ''}`}>
                        <PreviewWrapper
                            outputMode={om.outputMode}
                            layerType={om.layerType}
                            layerTitle={om.layerTitle}
                            layerWidth={om.layerWidth}
                        >
                            {om.isRightDrawer ? (
                                <div
                                    className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
                                    style={{
                                        backgroundImage: `
                                            linear-gradient(to right,  #e2e8f0 1px, transparent 1px),
                                            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
                                        `,
                                        backgroundSize: `50% 80px`,
                                    }}
                                >
                                    <div
                                        style={{ width: formContent.colSpan === 1 ? '50%' : '100%', minHeight: `${formContent.rowSpan * ROW_HEIGHT}px` }}
                                        className="border-b border-slate-200"
                                    >
                                        <WidgetRenderer mode="preview" widget={formContent.widget} contentColSpan={formContent.colSpan} />
                                    </div>
                                    <div style={{ width: spaceContent.colSpan === 1 ? '50%' : '100%', minHeight: `${spaceContent.rowSpan * ROW_HEIGHT}px` }}>
                                        <WidgetRenderer mode="preview" widget={spaceContent.widget} contentColSpan={spaceContent.colSpan} />
                                    </div>
                                </div>
                            ) : (
                                <PageLayout mode="preview">
                                    <PageGridRenderer
                                        mode="preview"
                                        widgetItems={[{
                                            id: 'preview-all',
                                            colSpan: 12,
                                            rowSpan: formContent.rowSpan + spaceContent.rowSpan,
                                            contents: [formContent, spaceContent] as PageContentItem[],
                                        }]}
                                    />
                                </PageLayout>
                            )}
                        </PreviewWrapper>
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
                onConfirm={() => tm.handleSaveConfirm(buildWidgetItems(), {
                    outputMode: om.outputMode,
                    pageTitle:  om.pageTitle,
                    layerType:  om.layerType,
                    layerTitle: om.layerTitle,
                    layerWidth: om.layerWidth,
                })}
                toSlug={toSlug}
            />
        </div>
    );
}
