'use client';

/**
 * ============================================================
 *  [위젯 만들기] — 위젯 기반 페이지 레이아웃 구성 도구
 * ============================================================
 *  - 위젯 추가 시 Row(높이) × Col(12칸 기준 너비) 지정
 *  - 위젯 타입: Search / Table / Form / Space / Category / SubList / MultiSelect / Tab
 *  - 전체 12칸 그리드에 위젯이 순서대로 배치됨
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import {
    Plus, Trash2, X, Save, Wand2,
    Search as SearchIcon, Table2, FileText,
    AlignLeft, Layers, List, CheckSquare,
    GripVertical, PanelTop, ShieldCheck,
} from 'lucide-react';

import {
    DndContext, closestCenter, PointerSensor,
    useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import api from '@/lib/api';
import { CommonBuilderDispatcher } from '../_shared/components/builder/CommonBuilderDispatcher';
import { SizeSettingPanel } from '../_shared/components/builder/SizeSettingPanel';
import { BuilderI18nModeProvider } from '../_shared/contexts/BuilderI18nModeContext';
import { ContentRowHeader } from '../_shared/components/builder/ContentRowHeader';
import { OutputModePanel } from '../_shared/components/builder/OutputModePanel';
import { PreviewWrapper } from '../_shared/components/builder/PreviewWrapper';
import { TemplateLoader } from '../_shared/components/builder/TemplateLoader';
import { PageGridRenderer } from '../_shared/components/renderer';
import { useOutputMode } from '../_shared/hooks/useOutputMode';
import { useTemplateManagement } from '../_shared/hooks/useTemplateManagement';
import type { SearchWidget, SpaceWidget, CategoryWidget, SubListWidget, MultiSelectWidget, TabWidget } from '../_shared/components/renderer';
import type { TableWidget } from '../_shared/components/builder/TableBuilder';
import type { FormWidget, FormFieldItem } from '../_shared/components/builder/FormBuilder';
import { createIdGenerator, toSlug, resolveConnectedSlug } from '../_shared/utils';
import { stampFormConnectedSlug } from '../_shared/hooks/useWidgetPageState';
import type { SlugEntityFieldItem } from '@/components/slug-entity/EntityList';
import type { SearchFieldType } from '../_shared/types';
import PageLayout from '@/components/layout/page-layout';
import { SaveModal, RuleCreateModal } from '../_shared/components/TemplateModals';
import { SortableRowWrapper } from '../_shared/components/DndWrappers';
import { TemplateItem } from '../_shared/types';
import { toast } from 'sonner';

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

/** 페이지 위젯 타입 */
type PageWidgetType = 'search' | 'table' | 'form' | 'space' | 'category' | 'sublist' | 'multiselect' | 'tab';

/* SearchWidget, SpaceItem, SpaceWidget → renderer/types에서 import */
/* FormFieldItem, FormWidget → FormBuilder에서 import */

/** 위젯 합집합 타입 */
type PageWidget = SearchWidget | TableWidget | FormWidget | SpaceWidget | CategoryWidget | SubListWidget | MultiSelectWidget | TabWidget;

/**
 * 위젯 셀 안에 배치되는 컨텐츠 아이템
 * — colSpan: 부모 위젯 colSpan 기준 (1 ~ 부모 위젯 colSpan)
 * — rowSpan: 높이 배수 (1 = 80px 단위)
 */
interface PageContentItem {
    id: string;
    colSpan: number;    // 부모 위젯 col 기준 너비
    rowSpan: number;    // 높이 배수
    widget: PageWidget;
}

/**
 * 그리드에 배치되는 위젯 셀
 * — row/col로 크기를 정하고, 내부에 여러 컨텐츠(PageContentItem)를 가짐
 */
interface PageWidgetItem {
    id: string;
    colSpan: number;        // 가로 점유 칸 수 (1~12, 12칸 기준)
    rowSpan: number;        // 세로 높이 배수 (1 = 80px)
    contents: PageContentItem[];  // 셀 내 컨텐츠 목록
    i18nMode?: boolean;     // 다국어 모드 저장값 (토글 시 기록)
}

/* ══════════════════════════════════════════ */
/*  상수 정의                                  */
/* ══════════════════════════════════════════ */

/* ID 생성기 */
const uid = createIdGenerator('pg');   // 범용 (row / col / field / button)
const wuid = createIdGenerator('w');   // 위젯 widgetId 전용

/** 위젯 타입별 시각 메타 */
const WIDGET_META: Record<PageWidgetType, {
    label: string;
    color: string;
    bg: string;
    border: string;
    previewBg: string;
    desc: string;
}> = {
    search:   { label: 'Search',   color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   previewBg: 'bg-blue-50/50',   desc: '검색폼 영역' },
    table:    { label: 'Table',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', previewBg: 'bg-emerald-50/50', desc: '데이터 테이블' },
    form:     { label: 'Form',     color: 'text-violet-700', bg: 'bg-violet-50',  border: 'border-violet-200',  previewBg: 'bg-violet-50/50',  desc: '폼 입력 영역' },
    space:    { label: '공간영역', color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200',   previewBg: 'bg-amber-50/50',   desc: 'Text/Button 배치 영역' },
    category: { label: '카테고리', color: 'text-cyan-700',   bg: 'bg-cyan-50',    border: 'border-cyan-200',    previewBg: 'bg-cyan-50/50',    desc: '카테고리 계층 관리' },
    sublist:     { label: '서브리스트', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', previewBg: 'bg-indigo-50/50', desc: '다건 행 입력 목록' },
    multiselect: { label: '다중선택',   color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200',   previewBg: 'bg-teal-50/50',   desc: '체크박스 드롭다운 다중 선택' },
    tab:         { label: '탭',         color: 'text-pink-700',   bg: 'bg-pink-50',   border: 'border-pink-200',   previewBg: 'bg-pink-50/50',   desc: '탭 컨텐츠 영역' },
};

/** 위젯 타입별 아이콘 컴포넌트 */
const WIDGET_ICON: Record<PageWidgetType, React.ReactNode> = {
    search:   <SearchIcon className="w-3.5 h-3.5" />,
    table:    <Table2 className="w-3.5 h-3.5" />,
    form:     <FileText className="w-3.5 h-3.5" />,
    space:    <AlignLeft className="w-3.5 h-3.5" />,
    category:    <Layers      className="w-3.5 h-3.5" />,
    sublist:     <List        className="w-3.5 h-3.5" />,
    multiselect: <CheckSquare className="w-3.5 h-3.5" />,
    tab:         <PanelTop    className="w-3.5 h-3.5" />,
};

/** 공간영역 버튼 색상 옵션 */

/* ══════════════════════════════════════════ */
/*  헬퍼 함수                                  */
/* ══════════════════════════════════════════ */

/**
 * 전체 위젯 아이템의 모든 컨텐츠에서 특정 타입의 위젯만 수집
 * (Table 연결 드롭다운, Button 타겟 드롭다운에서 사용)
 */
const collectWidgets = (items: PageWidgetItem[], type: PageWidgetType): PageWidget[] =>
    items.flatMap(i => i.contents.map(c => c.widget)).filter((w): w is PageWidget => w.type === type);

/* ══════════════════════════════════════════ */
/*  위젯 설정 패널 컴포넌트                     */
/* ══════════════════════════════════════════ */

/* 위젯 설정 패널은 이제 CommonBuilderDispatcher에서 공통으로 처리합니다. */


/* ══════════════════════════════════════════ */
/*  위젯 타입 선택 피커                         */
/* ══════════════════════════════════════════ */
const WidgetTypePicker = ({ onSelect, onCancel, title = '위젯 타입 선택' }: { onSelect: (t: PageWidgetType) => void; onCancel: () => void; title?: string }) => (
    <div className="p-2 space-y-1.5">
        <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-slate-500">{title}</span>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="grid grid-cols-1 gap-1">
            {(Object.entries(WIDGET_META) as [PageWidgetType, typeof WIDGET_META[PageWidgetType]][]).map(([type, meta]) => (
                <button
                    key={type}
                    onClick={() => onSelect(type)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md border ${meta.bg} ${meta.border} hover:opacity-80 transition-all text-left`}
                >
                    <span className={meta.color}>{WIDGET_ICON[type]}</span>
                    <div>
                        <p className={`text-[11px] font-semibold ${meta.color}`}>{meta.label}</p>
                        <p className="text-[10px] text-slate-400">{meta.desc}</p>
                    </div>
                </button>
            ))}
        </div>
    </div>
);


/* ══════════════════════════════════════════ */
/*  메인 컴포넌트                               */
/* ══════════════════════════════════════════ */

export default function PageBuilderPage() {

    /* ── 출력 모드 (page / layerpopup) — 공통 훅 사용 ── */
    const om = useOutputMode();

    /* ── 위젯 셀 목록 (flat 구조) ── */
    const [widgetItems, setWidgetItems] = useState<PageWidgetItem[]>([]);

    /* ── 위젯 셀 편집 상태 ── */
    const [editingItemId, setEditingItemId] = useState<string | null>(null); // 펼쳐진 위젯 셀 ID
    const [editingContentId, setEditingContentId] = useState<string | null>(null); // 펼쳐진 컨텐츠 ID

    /* ── 위젯 추가 플로우 (row/col 입력만) ── */
    const [showAddWidget, setShowAddWidget] = useState(false);  // 위젯 추가 입력창 표시
    const [addRowSpan, setAddRowSpan] = useState(1);       // 추가할 위젯 row 수
    const [addColSpan, setAddColSpan] = useState(12);      // 추가할 위젯 col 수 (max 12)

    /* ── 컨텐츠 추가 플로우 (타입 선택 → 생성, col/row는 생성 후 패널에서 수정) ── */
    const [addingContentToItemId, setAddingContentToItemId] = useState<string | null>(null);

    /* ── 레거시 다중위젯 템플릿 여부 — 불러왔을 때 이미 위젯이 2개 이상이었던 템플릿만 true.
       신규 템플릿(기본값 false)과 원래 1개였던 템플릿은 위젯 셀 1개 제한이 계속 적용된다. ── */
    const [isLegacyMultiWidget, setIsLegacyMultiWidget] = useState(false);

    /* ── 검증 규칙 생성 — BE ValidationRule API와 직접 연동하는 RuleCreateModal(자기완결형)을 여닫는 상태만 관리 ── */
    const [showRuleModal, setShowRuleModal] = useState(false); // 검증 규칙 생성 모달 표시 여부

    /* ── 공통 템플릿 관리 훅 (불러오기 + 저장 상태/핸들러) ── */
    const tm = useTemplateManagement('PAGE');

    /* ── Slug 레지스트리 — connectedSlug 드롭다운 용도 (entityId 포함) ── */
    const [slugOptions, setSlugOptions] = useState<{ id: number; slug: string; name: string; entityId?: number }[]>([]);
    useEffect(() => {
        api.get('/slug-registry/active')
            .then(res => setSlugOptions((res.data || []).filter((s: { type: string }) => s.type === 'PAGE_DATA')))
            .catch(() => { /* 조회 실패 시 빈 배열 유지 */ });
    }, []);

    /* ── Slug Entity 목록 — 페이지 연결용 ── */
    const [slugEntityOptions, setSlugEntityOptions] = useState<{ id: number; slug: string; name: string }[]>([]);
    useEffect(() => {
        api.get('/slug-entity/active')
            .then(res => setSlugEntityOptions(res.data || []))
            .catch(() => { /* 조회 실패 시 빈 배열 유지 */ });
    }, []);

    /* ── 선택된 Slug Entity 필드 목록 — fieldKey selectbox 및 빌드용 ── */
    const [slugEntityFields, setSlugEntityFields] = useState<SlugEntityFieldItem[]>([]);
    useEffect(() => {
        if (!om.slugEntityId) { setSlugEntityFields([]); return; }
        api.get(`/slug-entity/${om.slugEntityId}`)
            .then(res => setSlugEntityFields(res.data.fields ?? []))
            .catch(() => setSlugEntityFields([]));
    }, [om.slugEntityId]);

    /* ── 전체 템플릿 목록 — Space ActionButton / 페이지 연결용 (모든 타입 포함) ── */
    const [mainLayerTemplates, setMainLayerTemplates] = useState<TemplateItem[]>([]);
    useEffect(() => {
        api.get('/page-templates')
            .then(res => setMainLayerTemplates(res.data as TemplateItem[]))
            .catch(() => { });
    }, []);

    /* ── 템플릿 불러오기 (페이지 고유 파싱 로직) ── */
    const handleLoadSelect = (tpl: TemplateItem) => {
        try {
            const config = JSON.parse(tpl.configJson);
            const loadedWidgetItems = config.widgetItems || [];
            setWidgetItems(loadedWidgetItems);
            /* 불러왔을 때 이미 위젯이 2개 이상이었던 템플릿만 레거시로 인정 → 계속 자유롭게 추가/삭제 허용 */
            setIsLegacyMultiWidget(loadedWidgetItems.length >= 2);
            om.restore(config);
            setEditingItemId(null);
            setEditingContentId(null);
            setShowAddWidget(false);
            setAddingContentToItemId(null);
            setShowRuleModal(false);
            tm.onLoadSuccess(tpl); /* 공통: currentTemplateId/Name 업데이트 + 드롭다운 닫기 + toast */
        } catch {
            import('sonner').then(({ toast }) => toast.error('설정 파일 파싱에 실패했습니다.'));
        }
    };

    /* layerType이 'right'로 변경될 때 위젯/컨텐츠/내부필드 colSpan 초과분 자동 클램핑 */
    useEffect(() => {
        if (om.outputMode === 'layerpopup' && om.layerType === 'right') {
            setWidgetItems(prev => prev.map(item => ({
                ...item,
                colSpan: Math.min(item.colSpan, 2),
                contents: item.contents.map(c => ({
                    ...c,
                    colSpan: Math.min(c.colSpan, 2),
                    widget: c.widget.type === 'form'
                        ? { ...c.widget, fields: (c.widget as FormWidget).fields.map(f => ({ ...f, colSpan: Math.min(f.colSpan, 2) })) }
                        : c.widget.type === 'space'
                        ? { ...c.widget, items: (c.widget as SpaceWidget).items.map(i => ({ ...i, colSpan: Math.min(i.colSpan ?? 1, 2) as 1|2|3|4|5 })) }
                        : c.widget,
                })),
            })));
        }
    }, [om.layerType, om.outputMode]);

    /* ── 위젯 셀 추가 확정 (row/col만 입력 → 빈 셀 생성) ── */
    const confirmAddWidget = () => {
        const newItem: PageWidgetItem = {
            id: uid(),
            colSpan: Math.max(1, Math.min(12, addColSpan)),
            rowSpan: Math.max(1, addRowSpan),
            contents: [],
        };
        setWidgetItems(prev => [...prev, newItem]);
        setEditingItemId(newItem.id);   // 생성 후 바로 펼치기
        setEditingContentId(null);
        setShowAddWidget(false);
        setAddRowSpan(1);
        setAddColSpan(12);
    };

    /* ── 위젯 셀 삭제 ── */
    const removeWidgetItem = (itemId: string) => {
        setWidgetItems(prev => prev.filter(i => i.id !== itemId));
        if (editingItemId === itemId) { setEditingItemId(null); setEditingContentId(null); }
    };

    /* ── 위젯 목록 DnD 센서 (List 빌더와 동일 설정) ── */
    const widgetSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    /* ── 위젯 드래그 재정렬 ── */
    const handleWidgetDragEnd = (event: import('@dnd-kit/core').DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setWidgetItems(prev => {
            const oldIdx = prev.findIndex(i => i.id === active.id);
            const newIdx = prev.findIndex(i => i.id === over.id);
            if (oldIdx === -1 || newIdx === -1) return prev;
            return arrayMove(prev, oldIdx, newIdx);
        });
    };

    /* ── 컨텐츠 추가: 타입 선택 → 즉시 생성 (기본 col=부모 전체, row=1) ── */
    const addContent = (itemId: string, type: PageWidgetType) => {
        const id = wuid();
        const newWidget: PageWidget = (() => {
            switch (type) {
                case 'search':   return { type: 'search', widgetId: id, contentKey: '', rows: [] } as SearchWidget;
                case 'table':    return { type: 'table', widgetId: id, contentKey: '', columns: [], connectedSearchIds: [], pageSize: 10, displayMode: 'pagination' } as TableWidget;
                case 'form':     return { type: 'form', widgetId: id, contentKey: '', fields: [], ...(om.mainConnectedSlug ? { connectedSlug: om.mainConnectedSlug } : {}) } as FormWidget;
                case 'space':    return { type: 'space', widgetId: id, items: [] } as SpaceWidget;
                case 'category': return { type: 'category', widgetId: id, contentKey: '', dbSlug: '', depth: 1, allowCreate: true, allowEdit: true, allowDelete: true, showBorder: true } as CategoryWidget;
                case 'sublist':     return { type: 'sublist',     widgetId: id, contentKey: '', columns: [], showBorder: true, ...(om.mainConnectedSlug ? { connectedSlug: om.mainConnectedSlug } : {}) } as SubListWidget;
                case 'multiselect': return { type: 'multiselect', widgetId: id, contentKey: '', sourceSlug: '', connectedSlug: '', labelFields: 'name' } as MultiSelectWidget;
                case 'tab':         return { type: 'tab', widgetId: id, tabs: [{ id: `tab-${Date.now()}-0`, label: '탭 1', pageSlug: '' }] } as TabWidget;
            }
        })();
        const parent = widgetItems.find(i => i.id === itemId);
        const newContent: PageContentItem = {
            id: uid(),
            colSpan: parent?.colSpan ?? 1,  // 기본값: 부모 위젯 전체 너비
            rowSpan: 1,
            widget: newWidget,
        };
        setWidgetItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, contents: [...item.contents, newContent] }
                : item
        ));
        setEditingContentId(newContent.id);
        setAddingContentToItemId(null);
    };

    /* ── 위젯 col/row 수정 ── */
    const updateWidgetSize = (itemId: string, colSpan: number, rowSpan: number) => {
        const newCol = Math.max(1, Math.min(12, colSpan));
        setWidgetItems(prev => prev.map(item =>
            item.id === itemId
                ? {
                    ...item,
                    colSpan: newCol,
                    rowSpan: Math.max(1, rowSpan),
                    /* 컨텐츠 colSpan이 새 위젯 colSpan 초과 시 클램핑 */
                    contents: item.contents.map(c => ({
                        ...c,
                        colSpan: Math.min(c.colSpan, newCol),
                    })),
                }
                : item
        ));
    };

    /* ── 컨텐츠 col/row 수정 ── */
    const updateContentSize = (itemId: string, contentId: string, colSpan: number, rowSpan: number) => {
        const parent = widgetItems.find(i => i.id === itemId);
        const maxCol = parent?.colSpan ?? 12;
        setWidgetItems(prev => prev.map(item =>
            item.id === itemId
                ? {
                    ...item,
                    contents: item.contents.map(c =>
                        c.id === contentId
                            ? { ...c, colSpan: Math.max(1, Math.min(maxCol, colSpan)), rowSpan: Math.max(1, rowSpan) }
                            : c
                    ),
                }
                : item
        ));
    };

    /* ── 컨텐츠 삭제 ── */
    const removeContent = (itemId: string, contentId: string) => {
        setWidgetItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, contents: item.contents.filter(c => c.id !== contentId) }
                : item
        ));
        if (editingContentId === contentId) setEditingContentId(null);
    };

    /* ── 컨텐츠 순서 재정렬 (드래그) ── */
    const reorderContent = (itemId: string, activeId: string, overId: string) => {
        setWidgetItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            const oldIdx = item.contents.findIndex(c => c.id === activeId);
            const newIdx = item.contents.findIndex(c => c.id === overId);
            if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return item;
            return { ...item, contents: arrayMove(item.contents, oldIdx, newIdx) };
        }));
    };

    /* ── 컨텐츠 내부 위젯 데이터 업데이트 ── */
    const updateContent = (itemId: string, contentId: string, widget: PageWidget) => {
        setWidgetItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, contents: item.contents.map(c => c.id === contentId ? { ...c, widget } : c) }
                : item
        ));
    };

    /* ── 메인 연결 slug 변경 — form/sublist connectedSlug 자동 동기화 ── */
    const handleMainConnectedSlugChange = (slug: string) => {
        om.setMainConnectedSlug(slug);
        /* slug 모드는 form+sublist 모두 stamp (기존 동작 유지 — includeSublist=true) */
        setWidgetItems(prev => stampFormConnectedSlug(prev, slug || undefined, true));
    };

    /* ── Slug Entity 변경 — entity와 연결된 data slug를 form connectedSlug에 자동 설정 ── */
    const handleSlugEntityIdChange = (id: number | undefined) => {
        om.setSlugEntityId(id);
        const connectedSlug = resolveConnectedSlug(id, slugOptions);
        /* entity 모드는 form만 stamp (기본값 includeSublist=false) */
        setWidgetItems(prev => stampFormConnectedSlug(prev, connectedSlug));
    };

    /* snake_case → camelCase 변환 */
    const toCamelCase = (str: string): string =>
        str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

    /* dateRange suffix 제거 — 빌더는 fieldKey만 저장하므로 entity key(_from/_to)와 비교 시 suffix 제거 */
    const stripRangeSuffix = (key: string): string | null => {
        if (key.endsWith('_from')) return key.slice(0, -5);
        if (key.endsWith('_to'))   return key.slice(0, -3);
        return null;
    };

    /* entity key → 비교 가능한 모든 변형 반환 (원본·camelCase·suffix제거·suffix제거+camelCase) */
    const getKeyVariants = (key: string): string[] => {
        const variants = new Set<string>();
        variants.add(key);
        variants.add(toCamelCase(key));
        const base = stripRangeSuffix(key);
        if (base) {
            variants.add(base);
            variants.add(toCamelCase(base));
        }
        return [...variants];
    };

    /** columnType → Form 필드 타입 매핑 (widget 빌더 전용) */
    const mapColumnTypeToFieldType = (columnType: string): SearchFieldType => {
        switch (columnType.toUpperCase()) {
            case 'VARCHAR':                  return 'input';
            case 'BIGINT': case 'INT':       return 'input';
            case 'DATE': case 'TIMESTAMPTZ': return 'date';
            case 'BOOLEAN':                  return 'checkbox';
            default:                         return 'textarea';
        }
    };

    /* ── entity field → FormFieldItem 생성 헬퍼 ──
       1순위: entity에 직접 지정된 fieldType 사용
       2순위: fieldType 없으면 DB 타입(columnType)으로 자동 매핑 */
    const buildFieldItem = (f: SlugEntityFieldItem): FormFieldItem => {
        const type = (f.fieldType as SearchFieldType | undefined) ?? mapColumnTypeToFieldType(f.columnType);
        const wideTypes = ['textarea', 'dateRange', 'yearMonthRange'];
        return {
            id: uid(),
            type,
            label: f.label,
            fieldKey: f.key!,
            colSpan: wideTypes.includes(type) ? 2 : 1,
            rowSpan: 1,
            required: f.isNullable === false,
            ...(type === 'date' && { dateSubType: 'date' as const }),
            ...(f.codeGroupCode ? { codeGroupCode: f.codeGroupCode } : {}),
        } as FormFieldItem;
    };

    /* ── 빌드 버튼 — Slug Entity fields 기반 Form 필드 자동 구성 ── */
    const handleBuildFromEntity = () => {
        if (!om.slugEntityId || slugEntityFields.length === 0) return;

        /* entity field를 key 기준으로 맵 생성 — 원본·camelCase·_from/_to suffix 제거 등 모든 변형 등록 */
        const entityFieldMap = new Map<string, SlugEntityFieldItem>();
        slugEntityFields.filter(f => f.key).forEach(f => {
            getKeyVariants(f.key!).forEach(v => entityFieldMap.set(v, f));
        });

        const hasFormContent = widgetItems.some(item =>
            item.contents.some(c => c.widget.type === 'form')
        );

        if (hasFormContent) {
            /* ── 케이스 1: form 위젯이 이미 있는 경우 ── */
            setWidgetItems(prev => {
                /* 1단계: entity field 기준 라벨/required 갱신 + 누락 필드 추가 */
                const fieldMerged = prev.map(item => ({
                    ...item,
                    contents: item.contents.map(c => {
                        if (c.widget.type !== 'form') return c;
                        const formWidget = c.widget as FormWidget;

                        /* 1-1. key가 같은 기존 필드 → 라벨/required 업데이트만 */
                        const updatedFields = formWidget.fields.map(f => {
                            const entityField = f.fieldKey ? entityFieldMap.get(f.fieldKey) : undefined;
                            if (!entityField) return f;
                            return {
                                ...f,
                                /* 라벨이 없는 경우에만 entity 라벨 적용 */
                                label: f.label || entityField.label,
                                /* entity not null → required 반영 */
                                required: entityField.isNullable === false ? true : f.required,
                            };
                        });

                        /* 1-2. 기존 form에 없는 entity field → 하단에 추가
                           원본·camelCase·_from/_to suffix 제거 등 모든 변형이 existingKeys에 없는 경우에만 추가 */
                        const existingKeys = new Set(
                            formWidget.fields.map(f => f.fieldKey).filter(Boolean) as string[]
                        );
                        const appendFields = slugEntityFields
                            .filter(f => f.key && getKeyVariants(f.key!).every(v => !existingKeys.has(v)))
                            .map(buildFieldItem);

                        return { ...c, widget: { ...formWidget, fields: [...updatedFields, ...appendFields] } };
                    }),
                }));

                /* 2단계: 이미 존재하는 form을 entity로 재빌드할 때도 connectedSlug가 비어있을 수 있으므로 재확인 stamp
                 * — resolveConnectedSlug가 undefined면(레지스트리 미로딩 등) 기존 connectedSlug를 덮어쓰지 않고 스킵 */
                const resolvedSlug = resolveConnectedSlug(om.slugEntityId, slugOptions);
                return resolvedSlug !== undefined ? stampFormConnectedSlug(fieldMerged, resolvedSlug) : fieldMerged;
            });
        } else {
            /* ── 케이스 2: form 위젯이 없는 경우 — 위젯 + 컨텐츠 + 필드 모두 신규 생성 ── */
            const newFields = slugEntityFields.filter(f => f.key).map(buildFieldItem);
            const connectedSlug = resolveConnectedSlug(om.slugEntityId, slugOptions);

            const newFormWidget: FormWidget = {
                type: 'form',
                widgetId: wuid(),
                contentKey: '',
                fields: newFields,
                ...(connectedSlug ? { connectedSlug } : {}),
            };

            const newContent: PageContentItem = {
                id: uid(),
                colSpan: 12,
                rowSpan: 1,
                widget: newFormWidget,
            };

            const newWidgetItem: PageWidgetItem = {
                id: wuid(),
                colSpan: 12,
                rowSpan: 1,
                contents: [newContent],
            };

            setWidgetItems(prev => [...prev, newWidgetItem]);
        }
    };

    /**
     * 저장 전 공통 validation — 저장 버튼(상단)과 모달 확인 버튼 양쪽에서 동일하게 사용
     * @returns 오류가 없으면 true
     */
    const validateBeforeSave = (): boolean => {
        const errors: string[] = [];
        const allContents = widgetItems.flatMap(item => item.contents);

        /* 1) contentKey 필수 + 중복 검사 */
        const allKeys = allContents
            .map(c => ('contentKey' in c.widget ? (c.widget as { contentKey: string }).contentKey.trim() : null))
            .filter((k): k is string => k !== null);

        allKeys.forEach((key, idx) => {
            if (!key) errors.push(`컨텐츠 ${idx + 1}: Key를 입력해주세요`);
        });
        const duplicates = allKeys.filter((k, i) => k && allKeys.indexOf(k) !== i);
        if (duplicates.length > 0)
            errors.push(`중복 Key: ${[...new Set(duplicates)].join(', ')}`);

        /* 2) Search 필드 라벨/Key 필수 + 내부 중복 검사 */
        allContents.forEach(c => {
            if (c.widget.type !== 'search') return;
            const sw = c.widget as SearchWidget;
            const label = sw.contentKey || '?';
            const fieldKeys: string[] = [];
            sw.rows.forEach(row => {
                row.fields.forEach(f => {
                    if (!f.label?.trim() && !f.labelMsgKey?.trim()) errors.push(`[Search:${label}] 필드 라벨 미입력`);
                    if (!f.fieldKey?.trim()) {
                        errors.push(`[Search:${label}] 필드 Key 미입력`);
                    } else {
                        fieldKeys.push(f.fieldKey.trim());
                    }
                });
            });
            /* 내부 fieldKey 중복 */
            const dupFieldKeys = fieldKeys.filter((k, i) => fieldKeys.indexOf(k) !== i);
            if (dupFieldKeys.length > 0)
                errors.push(`[Search:${label}] 중복 필드 Key: ${[...new Set(dupFieldKeys)].join(', ')}`);
        });

        /* 3) Form 필드 라벨/Key 필수 + 내부 중복 검사 */
        allContents.forEach(c => {
            if (c.widget.type !== 'form') return;
            const fw = c.widget as FormWidget;
            const label = fw.contentKey || '?';
            const fieldKeys: string[] = [];
            fw.fields.forEach(f => {
                /* editor/hidden 타입은 라벨 불필요 — 나머지 타입만 필수 검사 */
                if (f.type !== 'editor' && f.type !== 'hidden' && !f.label?.trim() && !f.labelMsgKey?.trim()) errors.push(`[Form:${label}] 필드 라벨 미입력`);
                if (!f.fieldKey?.trim()) {
                    errors.push(`[Form:${label}] 필드 Key 미입력`);
                } else {
                    fieldKeys.push(f.fieldKey.trim());
                }
                /* 글자수 표시 ON + 최대 글자 미설정 검사 */
                if ((f.type === 'input' || f.type === 'textarea') && f.showCharCount && !f.maxLength) {
                    const fieldLabel = f.label || f.fieldKey || '?';
                    errors.push(`[Form:${label}] '${fieldLabel}' 필드: 글자수 표시 사용 시 최대 글자를 설정해주세요`);
                }
            });
            /* 내부 fieldKey 중복 */
            const dupFieldKeys = fieldKeys.filter((k, i) => fieldKeys.indexOf(k) !== i);
            if (dupFieldKeys.length > 0)
                errors.push(`[Form:${label}] 중복 필드 Key: ${[...new Set(dupFieldKeys)].join(', ')}`);
        });

        /* 4) Tab 위젯 탭별 contentKey 필수 검사 */
        allContents.forEach(c => {
            if (c.widget.type !== 'tab') return;
            const tw = c.widget as import('../_shared/components/renderer/types').TabWidget;
            tw.tabs.forEach((tab, idx) => {
                if (!tab.contentKey?.trim())
                    errors.push(`[Tab] 탭 ${idx + 1}: Key를 입력해주세요`);
            });
        });

        if (errors.length > 0) {
            toast.error(`저장 오류 (${errors.length}건): ${errors[0]}${errors.length > 1 ? ` 외 ${errors.length - 1}건` : ''}`);
            return false;
        }
        return true;
    };

    /* ── 저장 열기 — validation 통과 시에만 모달 오픈 ── */
    const handleSaveOpen = () => {
        if (!validateBeforeSave()) return;
        tm.openSaveModal();
    };

    /* ── 저장 확인 — validation 재실행 후 훅의 handleSaveConfirm 호출 ── */
    const handleSaveConfirm = async () => {
        if (!tm.saveModalName.trim() || !tm.saveModalSlug.trim()) return;
        if (!validateBeforeSave()) return;

        /* entity 연결 모드(connectedType==='entity')일 때 Form 위젯 connectedSlug를 저장 직전 재확인 stamp
         * — entity 모드에서는 slugEntityId가 우선이므로 slug 모드 값(mainConnectedSlug)은 이 분기에서 건드리지 않음
         * — resolveConnectedSlug가 undefined면(레지스트리 미로딩 등) 기존 connectedSlug를 덮어쓰지 않고 스킵 */
        let itemsToSave = widgetItems;
        if (om.connectedType === 'entity') {
            const resolvedSlug = resolveConnectedSlug(om.slugEntityId, slugOptions);
            if (resolvedSlug !== undefined) {
                itemsToSave = stampFormConnectedSlug(widgetItems, resolvedSlug);
            }
        }

        await tm.handleSaveConfirm(
            itemsToSave as unknown as import('../_shared/templateApi').PageWidgetItem[],
            {
                outputMode:          om.outputMode,
                pageTitle:           om.pageTitle,
                pageTitleMsgKey:     om.pageTitleMsgKey || undefined,
                layerType:           om.layerType,
                layerTitle:          om.layerTitle,
                layerTitleMsgKey:    om.layerTitleMsgKey || undefined,
                layerWidth:          om.layerWidth,
                mainConnectedSlug:   om.mainConnectedSlug || undefined,
                leaveCheck:          om.leaveCheck || undefined,
                singlePage:          om.singlePage || undefined,
                slugEntityId:        om.slugEntityId || undefined,
            },
        );
    };

    /* ═══════════════════════════════════════ */
    /*  렌더                                    */
    /* ═══════════════════════════════════════ */
    return (
        <div className="space-y-5">

            {/* ── 페이지 헤더 ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-slate-400" />
                        페이지 메이커 — Widget
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        위젯 셀을 배치하여 페이지 레이아웃을 구성합니다.
                        {tm.currentTemplateName && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                                <Save className="w-3 h-3" />{tm.currentTemplateName}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* ── 메인 레이아웃 ── */}
            <div className="grid grid-cols-[340px_1fr] gap-5 items-start">

                {/* ════════════════════════════════ */}
                {/* 좌측: 설정 패널                   */}
                {/* ════════════════════════════════ */}
                <div className="bg-white border border-slate-200 rounded-xl sticky top-4">

                    {/* 검증 규칙 생성 — 버튼 클릭 시 RuleCreateModal(자기완결형, BE API 직접 연동)이 열린다. */}
                    <div className="px-3 pt-3 pb-1">
                        <button
                            onClick={() => setShowRuleModal(true)}
                            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-500 bg-white hover:border-slate-400 hover:text-slate-700 transition-all"
                        >
                            <ShieldCheck className="w-3.5 h-3.5" />규칙생성
                        </button>
                    </div>

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
                        mainConnectedSlug={om.mainConnectedSlug}
                        onMainConnectedSlugChange={handleMainConnectedSlugChange}
                        slugOptions={slugOptions}
                        slugEntityOptions={slugEntityOptions}
                        slugEntityId={om.slugEntityId}
                        onSlugEntityIdChange={handleSlugEntityIdChange}
                        onBuildFromEntity={handleBuildFromEntity}
                        leaveCheck={om.leaveCheck}
                        onLeaveCheckChange={om.setLeaveCheck}
                        singlePage={om.singlePage}
                        onSinglePageChange={om.setSinglePage}
                        connectedType={om.connectedType}
                        onConnectedTypeChange={om.setConnectedType}
                        onOutputModeChange={om.setOutputMode}
                        onPageTitleChange={om.setPageTitle}
                        onPageTitleMsgKeyChange={om.setPageTitleMsgKey}
                        onLayerTypeChange={om.setLayerType}
                        onLayerTitleChange={om.setLayerTitle}
                        onLayerTitleMsgKeyChange={om.setLayerTitleMsgKey}
                        onLayerWidthChange={om.setLayerWidth}
                    />

                    {/* 위젯 셀 목록 */}
                    <div className="p-3 space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">

                        {/* 위젯이 없을 때 안내 */}
                        {widgetItems.length === 0 && !showAddWidget && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <AlignLeft className="w-8 h-8 text-slate-200 mb-2" />
                                <p className="text-xs font-medium text-slate-400">위젯이 없습니다</p>
                                <p className="text-[10px] text-slate-300 mt-0.5">아래 버튼으로 위젯을 추가하세요</p>
                            </div>
                        )}

                        {/* 위젯 셀 목록 — DnD 드래그 재정렬 (List 빌더 동일 패턴) */}
                        <DndContext sensors={widgetSensors} collisionDetection={closestCenter} onDragEnd={handleWidgetDragEnd}>
                            <SortableContext items={widgetItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                {widgetItems.map((item, idx) => (
                                    <SortableRowWrapper key={item.id} id={item.id}>
                                        {(handleProps) => (
                                            <BuilderI18nModeProvider
                                                defaultMode={item.i18nMode ?? /"labelMsgKey"\s*:\s*"[^"]/.test(JSON.stringify(item.contents))}
                                                onToggle={(newMode) => setWidgetItems(prev => prev.map(w => w.id === item.id ? { ...w, i18nMode: newMode } : w))}
                                            >
                                            <div className="border border-slate-200 rounded-lg overflow-hidden">

                                                {/* ── 위젯 셀 헤더 ── */}
                                                <div
                                                    className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-all select-none ${editingItemId === item.id ? 'bg-slate-900' : 'bg-slate-50 hover:bg-slate-100'}`}
                                                    onClick={() => {
                                                        setShowAddWidget(false);
                                                        setAddingContentToItemId(null);
                                                        if (editingItemId === item.id) {
                                                            setEditingItemId(null);
                                                            setEditingContentId(null);
                                                        } else {
                                                            setEditingItemId(item.id);
                                                            setEditingContentId(null);
                                                        }
                                                    }}
                                                >
                                                    {/* 그립 핸들 — 드래그 활성화 전용 (클릭 이벤트 차단) */}
                                                    <span
                                                        {...handleProps}
                                                        onClick={e => e.stopPropagation()}
                                                        className={`cursor-grab flex-shrink-0 ${editingItemId === item.id ? 'text-slate-500 hover:text-slate-300' : 'text-slate-300 hover:text-slate-500'}`}
                                                    >
                                                        <GripVertical className="w-3 h-3" />
                                                    </span>
                                                    {/* 순서 번호 */}
                                                    <span className={`text-[10px] font-bold w-4 text-center flex-shrink-0 ${editingItemId === item.id ? 'text-slate-400' : 'text-slate-400'}`}>
                                                        {idx + 1}
                                                    </span>
                                                    {/* 위젯 크기 배지 */}
                                                    <span className={`text-[10px] font-semibold flex-1 truncate ${editingItemId === item.id ? 'text-slate-300' : 'text-slate-600'}`}>
                                                        위젯 {idx + 1}
                                                        <span className={`ml-1 font-normal text-[9px] ${editingItemId === item.id ? 'text-slate-500' : 'text-slate-400'}`}>
                                                            col {item.colSpan} × row {item.rowSpan}
                                                        </span>
                                                    </span>
                                                    {/* 컨텐츠 수 배지 */}
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${editingItemId === item.id ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                                                        {item.contents.length}개
                                                    </span>
                                                    {/* 삭제 */}
                                                    <button onClick={e => { e.stopPropagation(); removeWidgetItem(item.id); }}
                                                        className={`p-0.5 rounded flex-shrink-0 transition-all ${editingItemId === item.id ? 'text-slate-400 hover:bg-white/10' : 'text-slate-400 hover:bg-red-50 hover:text-red-500'}`}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {/* ── 위젯 셀 편집 영역 ── */}
                                                {editingItemId === item.id && (
                                                    <div className="bg-white">

                                                        {/* 위젯 크기 설정 — showI18nToggle로 🌐 버튼 표시 */}
                                                        <SizeSettingPanel
                                                            colSpan={item.colSpan}
                                                            rowSpan={item.rowSpan}
                                                            maxColSpan={om.isRightDrawer ? 2 : 12}
                                                            showI18nToggle
                                                            onColSpanChange={v => updateWidgetSize(item.id, v, item.rowSpan)}
                                                            onRowSpanChange={v => updateWidgetSize(item.id, item.colSpan, v)}
                                                        />

                                                        {/* 컨텐츠 목록 — DnD 드래그 재정렬 (위젯 목록과 동일 패턴) */}
                                                        <DndContext
                                                            sensors={widgetSensors}
                                                            collisionDetection={closestCenter}
                                                            onDragEnd={e => {
                                                                const { active, over } = e;
                                                                if (over && active.id !== over.id)
                                                                    reorderContent(item.id, active.id as string, over.id as string);
                                                            }}
                                                        >
                                                            <SortableContext items={item.contents.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                                                {item.contents.map((content) => (
                                                                    <SortableRowWrapper key={content.id} id={content.id}>
                                                                        {(handleProps) => (
                                                                            <div className="border-t border-slate-100">

                                                                                {/* 컨텐츠 헤더 */}
                                                                                <ContentRowHeader
                                                                                    widgetType={content.widget.type}
                                                                                    label={`${WIDGET_META[content.widget.type as PageWidgetType]?.label ?? content.widget.type}${'contentKey' in content.widget && (content.widget as { contentKey: string }).contentKey ? ` — ${(content.widget as { contentKey: string }).contentKey}` : ''}`}
                                                                                    colSpan={content.colSpan}
                                                                                    rowSpan={content.rowSpan}
                                                                                    isEditing={editingContentId === content.id}
                                                                                    onToggle={() => setEditingContentId(editingContentId === content.id ? null : content.id)}
                                                                                    onRemove={() => removeContent(item.id, content.id)}
                                                                                    dragHandleProps={handleProps}
                                                                                />

                                                                                {/* 컨텐츠 설정 패널 */}
                                                                                {editingContentId === content.id && (
                                                                                    <div className="border-t border-slate-100 bg-slate-50/50">
                                                                                        <SizeSettingPanel
                                                                                            colSpan={content.colSpan}
                                                                                            rowSpan={content.rowSpan}
                                                                                            maxColSpan={item.colSpan}
                                                                                            onColSpanChange={v => updateContentSize(item.id, content.id, v, content.rowSpan)}
                                                                                            onRowSpanChange={v => updateContentSize(item.id, content.id, content.colSpan, v)}
                                                                                            {...(content.widget.type === 'sublist' || content.widget.type === 'multiselect' ? {
                                                                                                required: (content.widget as SubListWidget | MultiSelectWidget).required ?? false,
                                                                                                onRequiredChange: (v: boolean) => updateContent(item.id, content.id, { ...content.widget, required: v } as Parameters<typeof updateContent>[2]),
                                                                                            } : {})}
                                                                                        />
                                                                                        {/* 위젯 설정 (통합 디스패처 적용) */}
                                                                                        <div className="px-3 pb-2 pt-1">
                                                                                            <CommonBuilderDispatcher
                                                                                                widget={content.widget}
                                                                                                onChange={w => updateContent(item.id, content.id, w)}
                                                                                                context={{
                                                                                                    slugOptions,
                                                                                                    pageTemplates: mainLayerTemplates,
                                                                                                    searchWidgets: (collectWidgets(widgetItems, 'search') as SearchWidget[]).map(w => ({ widgetId: w.widgetId, contentKey: w.contentKey })),
                                                                                                    contentWidgets: [
                                                                                                        ...(collectWidgets(widgetItems, 'form') as FormWidget[]).map(w => ({ type: 'form' as const, widgetId: w.widgetId, contentKey: w.contentKey, connectedSlug: w.connectedSlug })),
                                                                                                        ...(collectWidgets(widgetItems, 'sublist') as SubListWidget[]).map(w => ({ type: 'sublist' as const, widgetId: w.widgetId, contentKey: w.contentKey, title: w.title })),
                                                                                                        ...(collectWidgets(widgetItems, 'multiselect') as MultiSelectWidget[]).map(w => ({ type: 'multiselect' as const, widgetId: w.widgetId, contentKey: w.contentKey, title: w.title })),
                                                                                                        /* 엑셀 다운로드 연결용 — table 위젯도 포함 */
                                                                                                        ...(collectWidgets(widgetItems, 'table') as TableWidget[]).map(w => ({ type: 'table' as const, widgetId: w.widgetId, contentKey: w.contentKey, title: w.contentKey, connectedSlug: w.connectedSlug })),
                                                                                                    ],
                                                                                                    categoryWidgets: (collectWidgets(widgetItems, 'category') as CategoryWidget[]).map(w => ({ widgetId: w.widgetId, label: w.label, depth: w.depth })),
                                                                                                    maxColSpan: om.isRightDrawer ? 2 : 12,
                                                                                                    slugEntityFields,
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </SortableRowWrapper>
                                                                ))}
                                                            </SortableContext>
                                                        </DndContext>

                                                        {/* 컨텐츠 추가 영역 */}
                                                        <div className="border-t border-slate-100 p-2">
                                                            {addingContentToItemId === item.id ? (
                                                                /* 컨텐츠 타입 선택 → 바로 생성 */
                                                                <WidgetTypePicker
                                                                    title="컨텐츠 타입 선택"
                                                                    onSelect={t => addContent(item.id, t)}
                                                                    onCancel={() => setAddingContentToItemId(null)}
                                                                />
                                                            ) : (
                                                                <button
                                                                    onClick={() => setAddingContentToItemId(item.id)}
                                                                    className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-slate-200 rounded text-[10px] text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all"
                                                                >
                                                                    <Plus className="w-3 h-3" />컨텐츠 추가
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            </BuilderI18nModeProvider>
                                        )}
                                    </SortableRowWrapper>
                                ))}
                            </SortableContext>
                        </DndContext>

                        {/* ── 위젯 추가 플로우 (row/col 입력만) ──
                             위젯이 하나도 없을 때는 항상 노출, 1개 이상 생긴 후에는
                             레거시 다중위젯 템플릿(불러왔을 때 이미 2개 이상)일 때만 계속 노출 */}
                        {(widgetItems.length === 0 || isLegacyMultiWidget) && (
                            showAddWidget ? (
                                <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2.5">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">위젯 크기 설정</p>
                                    <div className="flex items-center gap-2">
                                        <label className="text-[11px] font-medium text-slate-500 w-12 flex-shrink-0">Row 수</label>
                                        <input
                                            type="number" min={1} max={20} value={addRowSpan}
                                            onChange={e => setAddRowSpan(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:border-slate-900"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-[11px] font-medium text-slate-500 w-12 flex-shrink-0">Col 수</label>
                                        <input
                                            type="number" min={1} max={12} value={addColSpan}
                                            onChange={e => setAddColSpan(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:border-slate-900"
                                        />
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => { setShowAddWidget(false); setAddRowSpan(1); setAddColSpan(12); }}
                                            className="flex-1 py-1.5 text-xs border border-slate-200 rounded text-slate-500 hover:bg-slate-50 transition-all"
                                        >취소</button>
                                        <button
                                            onClick={confirmAddWidget}
                                            className="flex-1 py-1.5 text-xs bg-slate-900 text-white rounded hover:bg-slate-700 transition-all font-medium"
                                        >추가</button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setEditingItemId(null); setEditingContentId(null); setShowAddWidget(true); }}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-xs font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" />위젯 추가
                                </button>
                            )
                        )}

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
                            <span className="text-xs text-slate-400">{widgetItems.length}개 위젯</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${om.outputMode === 'page' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
                                {om.outputMode === 'page' ? '상세페이지' : 'LayerPopup'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleSaveOpen}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-all"
                                title={tm.currentTemplateId ? '템플릿 수정 저장' : '새 템플릿 저장'}
                            >
                                <Save className="w-3.5 h-3.5" />
                                {tm.currentTemplateId ? '수정' : '저장'}
                            </button>
                        </div>
                    </div>

                    {/* 미리보기 영역 — PreviewWrapper가 outputMode에 따라 팝업 레이아웃 적용 */}
                    <div className={`bg-slate-100 rounded-xl min-h-[500px] overflow-hidden ${om.outputMode !== 'layerpopup' ? 'p-6 overflow-y-auto' : 'flex flex-col'}`}>
                        <PreviewWrapper
                            outputMode={om.outputMode}
                            layerType={om.layerType}
                            layerTitle={om.layerTitle}
                            layerTitleMsgKey={om.layerTitleMsgKey}
                            layerWidth={om.layerWidth}
                        >
                            {widgetItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <AlignLeft className="w-12 h-12 text-slate-200 mb-3" />
                                    <p className="text-sm font-medium text-slate-400">페이지 구성을 시작하세요</p>
                                    <p className="text-xs text-slate-300 mt-1">좌측 패널에서 위젯을 추가하세요</p>
                                </div>
                            ) : (
                                /* PageLayout — 12칸 그리드 + ctrl+g 격자 토글 공통 처리 */
                                <PageLayout mode="preview">
                                    <PageGridRenderer
                                        mode="preview"
                                        widgetItems={widgetItems}
                                        onItemClick={(itemId) => {
                                            setShowAddWidget(false);
                                            setAddingContentToItemId(null);
                                            setEditingItemId(editingItemId === itemId ? null : itemId);
                                            setEditingContentId(null);
                                        }}
                                        selectedItemId={editingItemId}
                                    />
                                </PageLayout>
                            )}
                        </PreviewWrapper>
                    </div>
                </div>
            </div>{/* 메인 레이아웃 끝 */}

            {/* ── 저장 모달 ── */}
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
                onConfirm={handleSaveConfirm}
                toSlug={toSlug}
            />

            {/* ── 검증 규칙 생성 모달 ── */}
            <RuleCreateModal
                show={showRuleModal}
                onClose={() => setShowRuleModal(false)}
                slugOptions={slugOptions}
            />
        </div>
    );
}
