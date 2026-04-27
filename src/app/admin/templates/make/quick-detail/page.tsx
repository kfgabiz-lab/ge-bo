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

import { useState, useEffect, useCallback } from 'react';
import {
    ChevronDown, Save, Loader2, Wand2,
    FileText, FolderOpen, Copy, Trash2,
    PanelRight, LayoutTemplate,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { CommonBuilderDispatcher } from '../_shared/components/builder/CommonBuilderDispatcher';
import { SpaceBuilder } from '../_shared/components/builder/SpaceBuilder';
import { SizeSettingPanel } from '../_shared/components/builder/SizeSettingPanel';
import { ContentRowHeader } from '../_shared/components/builder/ContentRowHeader';
import { WidgetRenderer, PageGridRenderer } from '../_shared/components/renderer';
import type { SpaceWidget, PageContentItem } from '../_shared/components/renderer';
import type { FormWidget } from '../_shared/components/builder/FormBuilder';
import { toSlug } from '../_shared/utils';
import { saveTemplate } from '../_shared/templateApi';
import { SaveModal } from '../_shared/components/TemplateModals';
import { TemplateItem, LayerType, LayerWidth } from '../_shared/types';
import { selectCls, inputCls } from '../_shared/styles';
import { SelectArrow } from '../_shared/components/SelectArrow';
import PageLayout from '@/components/layout/PageLayout';
import CenterPopupLayout from '@/components/layout/popup/CenterPopupLayout';
import RightDrawerLayout from '@/components/layout/popup/RightDrawerLayout';

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

type OutputMode = 'page' | 'layerpopup';

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

const LAYER_WIDTH_OPTIONS: { value: LayerWidth; label: string }[] = [
    { value: 'sm', label: 'Small — 380px' },
    { value: 'md', label: 'Medium — 672px' },
    { value: 'lg', label: 'Large — 768px' },
    { value: 'xl', label: 'XLarge — 896px' },
];


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
/*  미리보기 컴포넌트 — Widget 빌더와 동일      */
/* ══════════════════════════════════════════ */


/* ══════════════════════════════════════════ */
/*  메인 컴포넌트                               */
/* ══════════════════════════════════════════ */
export default function QuickDetailBuilderPage() {

    /* ── 출력 모드 ── */
    const [outputMode, setOutputMode] = useState<OutputMode>('page');

    /* ── LayerPopup 설정 ── */
    const [layerType, setLayerType] = useState<LayerType>('center');
    const [layerTitle, setLayerTitle] = useState('');
    const [layerWidth, setLayerWidth] = useState<LayerWidth>('md');

    /* 우측 드로어 여부 — 빌더/미리보기 전체에서 공통 사용 */
    const isRightDrawer = outputMode === 'layerpopup' && layerType === 'right';

    /* ── 고정 컨텐츠 (Form + Space) ── */
    const [formContent, setFormContent] = useState<FixedContentItem>(createFormContent);
    const [spaceContent, setSpaceContent] = useState<FixedContentItem>(createSpaceContent);

    /* ── 편집 상태 (Widget 빌더와 동일 패턴) ── */
    const [editingContentId, setEditingContentId] = useState<string | null>(null);

    /* ── 저장 모달 상태 ── */
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
    const [currentTemplateName, setCurrentTemplateName] = useState('');
    const [saveModalName, setSaveModalName] = useState('');
    const [saveModalSlug, setSaveModalSlug] = useState('');
    const [saveModalDesc, setSaveModalDesc] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    /* ── 불러오기 상태 ── */
    const [templateList, setTemplateList] = useState<TemplateItem[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [showLoadDropdown, setShowLoadDropdown] = useState(false);
    const [loadSearch, setLoadSearch] = useState('');
    const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
    const [isDuplicatingId, setIsDuplicatingId] = useState<number | null>(null);

    /* ── Quick-Detail 템플릿 목록 — Space ActionButton 페이지 연결용 ── */
    const [mainLayerTemplates, setMainLayerTemplates] = useState<TemplateItem[]>([]);
    useEffect(() => {
        api.get('/page-templates')
            .then(res => setMainLayerTemplates((res.data as TemplateItem[]).filter(t => t.templateType === 'QUICK_DETAIL')))
            .catch(() => { });
    }, []);

    /* ── Slug 레지스트리 — Form connectedSlug용 ── */
    const [slugOptions, setSlugOptions] = useState<{ id: number; slug: string; name: string }[]>([]);
    useEffect(() => {
        api.get('/slug-registry/active')
            .then(res => setSlugOptions((res.data || []).filter((s: { type: string }) => s.type === 'PAGE_DATA')))
            .catch(() => { });
    }, []);

    /* ── 템플릿 목록 불러오기 ── */
    const loadTemplateList = useCallback(async () => {
        setIsLoadingList(true);
        try {
            const res = await api.get('/page-templates');
            setTemplateList((res.data || []).filter((t: TemplateItem) => t.templateType === 'QUICK_DETAIL'));
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
            setOutputMode(config.outputMode || 'page');
            setLayerType(config.layerType || 'center');
            setLayerTitle(config.layerTitle || '');
            setLayerWidth(config.layerWidth || 'md');
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
                description: tpl.description, configJson: tpl.configJson, templateType: 'QUICK_DETAIL',
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
                rowSpan: formContent.rowSpan + spaceContent.rowSpan,
                contents: [
                    { id: formContent.id,  colSpan: formContent.colSpan,  rowSpan: formContent.rowSpan,  widget: formContent.widget  as unknown as Record<string, unknown> },
                    { id: spaceContent.id, colSpan: spaceContent.colSpan, rowSpan: spaceContent.rowSpan, widget: spaceContent.widget as unknown as Record<string, unknown> },
                ],
            }];
            /* outputMode, layerType 등 팝업 메타는 extra로 병합 */
            const result = await saveTemplate({
                id: currentTemplateId,
                name: saveModalName,
                slug: saveModalSlug,
                description: saveModalDesc,
                templateType: 'QUICK_DETAIL',
                widgetItems,
                extra: { outputMode, layerType, layerTitle, layerWidth },
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
    const maxCol = outputMode === 'layerpopup' && layerType === 'right' ? 2 : 12;

    const updateFormSize = (colSpan: number, rowSpan: number) =>
        setFormContent(prev => ({ ...prev, colSpan: Math.max(1, Math.min(maxCol, colSpan)), rowSpan: Math.max(1, rowSpan) }));

    const updateSpaceSize = (colSpan: number, rowSpan: number) =>
        setSpaceContent(prev => ({ ...prev, colSpan: Math.max(1, Math.min(maxCol, colSpan)), rowSpan: Math.max(1, rowSpan) }));

    /* layerType이 'right'로 변경될 때 초과된 colSpan 자동 클램핑 */
    useEffect(() => {
        if (outputMode === 'layerpopup' && layerType === 'right') {
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
    }, [layerType, outputMode]);

    /* ── 필터된 템플릿 목록 ── */
    const filteredTemplates = templateList.filter(t =>
        t.name.toLowerCase().includes(loadSearch.toLowerCase()) ||
        t.slug.toLowerCase().includes(loadSearch.toLowerCase())
    );

    /* ── Form 위젯 참조 (SpaceBuilder formWidgets prop용) ── */
    const formWidgetRef = formContent.widget as FormWidget;

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

                    {/* 출력 모드 탭 — Widget 빌더의 dataSource 탭과 동일한 스타일 */}
                    <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/30 flex items-center gap-1">
                        <button
                            onClick={() => setOutputMode('page')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md border transition-all ${outputMode === 'page'
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'}`}
                        >
                            <FileText className="w-3 h-3" />상세페이지
                        </button>
                        <button
                            onClick={() => setOutputMode('layerpopup')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md border transition-all ${outputMode === 'layerpopup'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600'}`}
                        >
                            <LayoutTemplate className="w-3 h-3" />LayerPopup
                        </button>
                    </div>

                    {/* LayerPopup 설정 */}
                    {outputMode === 'layerpopup' && (
                        <div className="border-b border-slate-100 bg-blue-50/30 px-3 py-3 space-y-3">
                            <div>
                                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block">팝업 유형</label>
                                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                                    <button onClick={() => setLayerType('center')} className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all flex-1 justify-center ${layerType === 'center' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                        <LayoutTemplate className="w-3 h-3" />중앙 팝업
                                    </button>
                                    <button onClick={() => setLayerType('right')} className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all flex-1 justify-center ${layerType === 'right' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                        <PanelRight className="w-3 h-3" />우측 드로어
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-slate-500 mb-1 block">팝업 제목</label>
                                <input type="text" value={layerTitle} onChange={e => setLayerTitle(e.target.value)} placeholder="팝업 제목 입력" className={inputCls} />
                            </div>
                            {layerType === 'center' && (
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block">팝업 너비</label>
                                    <div className="relative">
                                        <select value={layerWidth} onChange={e => setLayerWidth(e.target.value as LayerWidth)} className={selectCls}>
                                            {LAYER_WIDTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                        <SelectArrow />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 위젯 셀 영역 — Widget 빌더와 동일한 구조 */}
                    <div className="p-3 space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto">
                        <div className="border border-slate-200 rounded-lg overflow-hidden">

                            {/* 위젯 헤더 — Widget 빌더와 동일한 다크 스타일 (드래그/삭제 제거) */}
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
                                            maxColSpan={isRightDrawer ? 2 : 12}
                                            onColSpanChange={v => updateFormSize(v, formContent.rowSpan)}
                                            onRowSpanChange={v => updateFormSize(formContent.colSpan, v)}
                                        />
                                        <div className="px-3 pb-2 pt-1">
                                            <CommonBuilderDispatcher
                                                widget={formContent.widget}
                                                onChange={w => setFormContent(prev => ({ ...prev, widget: w as FormWidget }))}
                                                context={{ slugOptions, pageTemplates: mainLayerTemplates, maxColSpan: isRightDrawer ? 2 : 12 }}
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
                                            maxColSpan={isRightDrawer ? 2 : 12}
                                            onColSpanChange={v => updateSpaceSize(v, spaceContent.rowSpan)}
                                            onRowSpanChange={v => updateSpaceSize(spaceContent.colSpan, v)}
                                        />
                                        <div className="px-3 pb-2 pt-1">
                                            <SpaceBuilder
                                                widget={spaceContent.widget as SpaceWidget}
                                                onChange={w => setSpaceContent(prev => ({ ...prev, widget: w }))}
                                                pageTemplates={mainLayerTemplates}
                                                formWidgets={[{
                                                    widgetId: formWidgetRef.widgetId,
                                                    contentKey: formWidgetRef.contentKey,
                                                    connectedSlug: formWidgetRef.connectedSlug,
                                                }]}
                                                actionButtonOnly={true}
                                                maxColSpan={isRightDrawer ? 2 : 12}
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

                    {/* 상단 툴바 — Widget 빌더와 동일 */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700">미리보기</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${outputMode === 'page' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
                                {outputMode === 'page' ? '상세페이지' : 'LayerPopup'}
                            </span>
                        </div>
                        <button
                            onClick={() => { setSaveModalName(currentTemplateName || ''); setShowSaveModal(true); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-all"
                            title={currentTemplateId ? '템플릿 수정 저장' : '새 템플릿 저장'}
                        >
                            <Save className="w-3.5 h-3.5" />
                            {currentTemplateId ? '수정' : '저장'}
                        </button>
                    </div>

                    {/* 미리보기 영역 — outputMode에 따라 레이아웃 컴포넌트 적용 */}
                    <div className={`bg-slate-100 rounded-xl min-h-[500px] overflow-hidden flex flex-col ${outputMode === 'layerpopup' ? '' : 'p-6'}`}>

                        {/* 그리드 본문 — outputMode/layerType에 따라 컬럼 수 분기 */}
                        {(() => {
                            /* ── 우측 드로어: flex-col + 명시적 너비 (col=1→50%, col=2→100%)
                               CSS grid auto-placement 예측 불가 문제 회피
                               행 높이 = rowSpan * 80px 최솟값 ── */
                            if (isRightDrawer) {
                                const drawerContent = (
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
                                            style={{
                                                width: formContent.colSpan === 1 ? '50%' : '100%',
                                                minHeight: `${formContent.rowSpan * 80}px`,
                                            }}
                                            className="border-b border-slate-200"
                                        >
                                            <WidgetRenderer mode="preview" widget={formContent.widget} contentColSpan={formContent.colSpan} />
                                        </div>
                                        <div
                                            style={{
                                                width: spaceContent.colSpan === 1 ? '50%' : '100%',
                                                minHeight: `${spaceContent.rowSpan * 80}px`,
                                            }}
                                        >
                                            <WidgetRenderer mode="preview" widget={spaceContent.widget} contentColSpan={spaceContent.colSpan} />
                                        </div>
                                    </div>
                                );
                                return (
                                    <RightDrawerLayout preview open onClose={() => {}} title={layerTitle || '드로어 미리보기'}>
                                        <div className="px-6 py-5">{drawerContent}</div>
                                    </RightDrawerLayout>
                                );
                            }

                            /* ── 페이지/중앙팝업: PageLayout + PageGridRenderer로 운영화면과 동일한 함수 사용 ── */
                            const grid = (
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
                            );

                            /* LayerPopup 모드(중앙팝업): 팝업 레이아웃 컴포넌트로 감싸서 표시 */
                            if (outputMode === 'layerpopup') {
                                return (
                                    <CenterPopupLayout preview open onClose={() => {}} title={layerTitle || '팝업 미리보기'} layerWidth={layerWidth}>
                                        <div className="px-6 py-5">{grid}</div>
                                    </CenterPopupLayout>
                                );
                            }

                            /* Page 모드: 그대로 표시 (PageLayout이 내부에 포함됨) */
                            return (
                                <div className="p-6">
                                    {grid}
                                </div>
                            );
                        })()}
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
