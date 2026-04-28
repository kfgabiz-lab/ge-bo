'use client';

/**
 * ============================================================
 *  [위젯 만들기] — 위젯 기반 페이지 레이아웃 구성 도구
 * ============================================================
 *  - 위젯 추가 시 Row(높이) × Col(12칸 기준 너비) 지정
 *  - 위젯 타입: Text / Search / Table / Form / Button
 *  - 전체 12칸 그리드에 위젯이 순서대로 배치됨
 * ============================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Trash2, ChevronDown, X, Save, Loader2, Wand2,
    Search as SearchIcon, Table2, FileText,
    AlignLeft, FolderOpen, Copy, Layers,
    GripVertical,
} from 'lucide-react';
import {
    DndContext, closestCenter, PointerSensor,
    useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';
import api from '@/lib/api';
import { CommonBuilderDispatcher } from '../_shared/components/builder/CommonBuilderDispatcher';
import { SizeSettingPanel } from '../_shared/components/builder/SizeSettingPanel';
import { ContentRowHeader } from '../_shared/components/builder/ContentRowHeader';
import { WidgetRenderer } from '../_shared/components/renderer';
import type { SearchWidget, SpaceWidget, TextWidget, CategoryWidget } from '../_shared/components/renderer';
import type { TableWidget } from '../_shared/components/builder/TableBuilder';
import type { FormWidget } from '../_shared/components/builder/FormBuilder';
import { createIdGenerator, toSlug, getSpaceGridColumn } from '../_shared/utils';
import PageLayout from '@/components/layout/PageLayout';
import { GridCell, ROW_HEIGHT } from '@/components/layout/GridCell';
import { SaveModal } from '../_shared/components/TemplateModals';
import { SortableRowWrapper } from '../_shared/components/DndWrappers';
import { TemplateItem } from '../_shared/types';

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

/** 페이지 위젯 타입 */
type PageWidgetType = 'search' | 'table' | 'form' | 'space' | 'category';

/* TextWidget, SearchWidget, SpaceItem, SpaceWidget → renderer/types에서 import */
/* FormFieldItem, FormWidget → FormBuilder에서 import */

/** 위젯 합집합 타입 */
type PageWidget = TextWidget | SearchWidget | TableWidget | FormWidget | SpaceWidget | CategoryWidget;

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
};

/** 위젯 타입별 아이콘 컴포넌트 */
const WIDGET_ICON: Record<PageWidgetType, React.ReactNode> = {
    search:   <SearchIcon className="w-3.5 h-3.5" />,
    table:    <Table2 className="w-3.5 h-3.5" />,
    form:     <FileText className="w-3.5 h-3.5" />,
    space:    <AlignLeft className="w-3.5 h-3.5" />,
    category: <Layers className="w-3.5 h-3.5" />,
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

/**
 * 위젯 셀 미리보기
 * — 부모 위젯 colSpan 기준 서브 그리드로 컨텐츠 배치
 * — 각 컨텐츠는 content.colSpan / content.rowSpan으로 크기 결정
 */
const WidgetCellPreview = ({ contents, colSpan }: { contents: PageContentItem[]; colSpan: number }) => {
    if (contents.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <span className="text-[10px] text-slate-300 italic">컨텐츠 없음</span>
            </div>
        );
    }
    return (
        /* 부모 위젯 col 수를 기준으로 서브 그리드 구성 — ROW_HEIGHT 단위 행 고정 */
        <div
            className="w-full p-0.5"
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${colSpan}, 1fr)`,
                gridAutoRows: `${ROW_HEIGHT}px`,
                gridAutoFlow: 'row dense',
            }}
        >
            {contents.map(c => {
                /* SpaceWidget의 align에 따라 외부 그리드 시작 위치 계산 */
                const gridCol = c.widget.type === 'space'
                    ? getSpaceGridColumn(c.widget.align, Math.min(c.colSpan, colSpan), colSpan)
                    : `span ${Math.min(c.colSpan, colSpan)}`;
                return (
                    <div
                        key={c.id}
                        style={{
                            gridColumn: gridCol,
                            gridRow: `span ${c.rowSpan}`,
                        }}
                    >
                        <WidgetRenderer mode="preview" widget={c.widget} contentColSpan={c.colSpan} />
                    </div>
                );
            })}
        </div>
    );
};

/* ══════════════════════════════════════════ */
/*  메인 컴포넌트                               */
/* ══════════════════════════════════════════ */

export default function PageBuilderPage() {

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

    /* ── 저장 관련 상태 ── */
    const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
    const [currentTemplateName, setCurrentTemplateName] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
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

    /* ── Slug 레지스트리 — connectedSlug 드롭다운 용도 ── */
    const [slugOptions, setSlugOptions] = useState<{ id: number; slug: string; name: string }[]>([]);
    useEffect(() => {
        api.get('/slug-registry/active')
            .then(res => setSlugOptions((res.data || []).filter((s: { type: string }) => s.type === 'PAGE_DATA')))
            .catch(() => { /* 조회 실패 시 빈 배열 유지 */ });
    }, []);

    /* ── Quick-Detail 템플릿 목록 — Space ActionButton 페이지 연결용 ── */
    const [mainLayerTemplates, setMainLayerTemplates] = useState<TemplateItem[]>([]);
    useEffect(() => {
        api.get('/page-templates')
            .then(res => setMainLayerTemplates((res.data as TemplateItem[]).filter(t => t.templateType === 'QUICK_DETAIL')))
            .catch(() => { });
    }, []);

    /* ── 페이지 템플릿 목록 불러오기 (PAGE 타입만) ── */
    const loadTemplateList = useCallback(async () => {
        setIsLoadingList(true);
        try {
            const res = await api.get('/page-templates');
            /* BE 파라미터 필터가 동작하지 않는 경우를 대비해 FE에서도 PAGE 타입만 필터 */
            setTemplateList((res.data || []).filter((t: TemplateItem) => t.templateType === 'PAGE'));
        } catch {
            /* 목록 조회 실패는 조용히 처리 */
        } finally {
            setIsLoadingList(false);
        }
    }, []);

    /* ── 템플릿 삭제 ── */
    const handleDeleteTemplate = async (id: number) => {
        if (!window.confirm('템플릿을 삭제하시겠습니까?')) return;
        setIsDeletingId(id);
        try {
            await api.delete(`/page-templates/${id}`);
            setTemplateList(prev => prev.filter(t => t.id !== id));
            if (currentTemplateId === id) {
                setCurrentTemplateId(null);
                setCurrentTemplateName('');
            }
            toast.success('템플릿이 삭제되었습니다.');
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        } finally {
            setIsDeletingId(null);
        }
    };

    /* ── 템플릿 복사 ── */
    const handleDuplicateTemplate = async (tpl: TemplateItem) => {
        setIsDuplicatingId(tpl.id);
        try {
            const newName = `${tpl.name} (복사)`;
            const newSlug = `${tpl.slug}-copy`;
            const res = await api.post('/page-templates', {
                name: newName,
                slug: newSlug,
                description: tpl.description,
                configJson: tpl.configJson,
                templateType: 'PAGE',
            });
            setTemplateList(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
            toast.success(`"${newName}" 으로 복사되었습니다.`);
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || '복사 중 오류가 발생했습니다.');
        } finally {
            setIsDuplicatingId(null);
        }
    };

    /* ── 템플릿 불러오기 ── */
    const handleLoadSelect = (tpl: TemplateItem) => {
        try {
            const config = JSON.parse(tpl.configJson);
            setWidgetItems(config.widgetItems || []);
            setCurrentTemplateId(tpl.id);
            setCurrentTemplateName(tpl.name);
            setSaveModalSlug(tpl.slug);
            setShowLoadDropdown(false);
            setEditingItemId(null);
            setEditingContentId(null);
            setShowAddWidget(false);
            setAddingContentToItemId(null);
            toast.success(`"${tpl.name}" 불러왔습니다.`);
        } catch {
            toast.error('설정 파일 파싱에 실패했습니다.');
        }
    };

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
                case 'form':     return { type: 'form', widgetId: id, contentKey: '', fields: [] } as FormWidget;
                case 'space':    return { type: 'space', widgetId: id, items: [] } as SpaceWidget;
                case 'category': return { type: 'category', widgetId: id, contentKey: '', dbSlug: '', depth: 1, allowCreate: true, allowEdit: true, allowDelete: true, showBorder: true } as CategoryWidget;
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
                    if (!f.label?.trim()) errors.push(`[Search:${label}] 필드 라벨 미입력`);
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
                if (!f.label?.trim()) errors.push(`[Form:${label}] 필드 라벨 미입력`);
                if (!f.fieldKey?.trim()) {
                    errors.push(`[Form:${label}] 필드 Key 미입력`);
                } else {
                    fieldKeys.push(f.fieldKey.trim());
                }
            });
            /* 내부 fieldKey 중복 */
            const dupFieldKeys = fieldKeys.filter((k, i) => fieldKeys.indexOf(k) !== i);
            if (dupFieldKeys.length > 0)
                errors.push(`[Form:${label}] 중복 필드 Key: ${[...new Set(dupFieldKeys)].join(', ')}`);
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
        setSaveModalName(currentTemplateName || '');
        if (!currentTemplateId) { setSaveModalSlug(''); setSaveModalDesc(''); }
        setShowSaveModal(true);
    };

    /* ── 저장 확인 (모달 내 버튼) — 동일 validation 재실행 후 API 호출 ── */
    const handleSaveConfirm = async () => {
        if (!saveModalName.trim() || !saveModalSlug.trim()) return;
        if (!validateBeforeSave()) return;

        setIsSaving(true);
        const configJson = JSON.stringify({ widgetItems });
        try {
            if (currentTemplateId) {
                const res = await api.put(`/page-templates/${currentTemplateId}`, {
                    name: saveModalName, slug: saveModalSlug, description: saveModalDesc,
                    configJson, templateType: 'PAGE',
                });
                setCurrentTemplateName(res.data.name);
                toast.success('템플릿이 수정되었습니다.');
            } else {
                const res = await api.post('/page-templates', {
                    name: saveModalName, slug: saveModalSlug, description: saveModalDesc,
                    configJson, templateType: 'PAGE',
                });
                setCurrentTemplateId(res.data.id);
                setCurrentTemplateName(res.data.name);
                setSaveModalSlug(res.data.slug);
                toast.success('템플릿이 저장되었습니다.');
            }
            setShowSaveModal(false);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    /* ── 필터된 템플릿 목록 ── */
    const filteredTemplates = templateList.filter(t =>
        t.name.toLowerCase().includes(loadSearch.toLowerCase()) ||
        t.slug.toLowerCase().includes(loadSearch.toLowerCase())
    );

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
                        {currentTemplateName && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                                <Save className="w-3 h-3" />{currentTemplateName}
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

                    {/* 템플릿 불러오기 드롭다운 */}
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
                                            type="text"
                                            value={loadSearch}
                                            onChange={e => setLoadSearch(e.target.value)}
                                            placeholder="검색..."
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
                                                {/* 이름 클릭 시 불러오기 */}
                                                <button
                                                    onClick={() => handleLoadSelect(tpl)}
                                                    className="flex-1 min-w-0 text-left"
                                                >
                                                    <p className="text-[11px] font-medium text-slate-800 truncate">{tpl.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono truncate">{tpl.slug}</p>
                                                </button>
                                                {/* 현재 템플릿 뱃지 */}
                                                {currentTemplateId === tpl.id && (
                                                    <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1 py-0.5 rounded shrink-0 mr-1">현재</span>
                                                )}
                                                {/* 복사/삭제 버튼 — hover 시 표시 */}
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleDuplicateTemplate(tpl); }}
                                                        disabled={isDuplicatingId === tpl.id}
                                                        className="p-1 rounded text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all disabled:opacity-50"
                                                        title="복사"
                                                    >
                                                        {isDuplicatingId === tpl.id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Copy className="w-3 h-3" />}
                                                    </button>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                                                        disabled={isDeletingId === tpl.id}
                                                        className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                                                        title="삭제"
                                                    >
                                                        {isDeletingId === tpl.id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <Trash2 className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

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
                                                                                                    formWidgets: (collectWidgets(widgetItems, 'form') as FormWidget[]).map(w => ({ widgetId: w.widgetId, contentKey: w.contentKey, connectedSlug: w.connectedSlug })),
                                                                                                    categoryWidgets: (collectWidgets(widgetItems, 'category') as CategoryWidget[]).map(w => ({ widgetId: w.widgetId, label: w.label, depth: w.depth })),
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
                                        )}
                                    </SortableRowWrapper>
                                ))}
                            </SortableContext>
                        </DndContext>

                        {/* ── 위젯 추가 플로우 (row/col 입력만) ── */}
                        {showAddWidget ? (
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
                        )}
                    </div>
                </div>

                {/* ════════════════════════════════ */}
                {/* 우측: 미리보기 패널               */}
                {/* ════════════════════════════════ */}
                <div className="space-y-4">

                    {/* 상단 툴바 — Layer 빌더와 동일한 패턴 */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700">미리보기</span>
                            <span className="text-xs text-slate-400">{widgetItems.length}개 위젯</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleSaveOpen}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-all"
                                title={currentTemplateId ? '템플릿 수정 저장' : '새 템플릿 저장'}
                            >
                                <Save className="w-3.5 h-3.5" />
                                {currentTemplateId ? '수정' : '저장'}
                            </button>
                        </div>
                    </div>

                    {/* 미리보기 영역 */}
                    <div className="bg-slate-100 rounded-xl min-h-[500px] overflow-y-auto p-6">
                        {widgetItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <AlignLeft className="w-12 h-12 text-slate-200 mb-3" />
                                <p className="text-sm font-medium text-slate-400">페이지 구성을 시작하세요</p>
                                <p className="text-xs text-slate-300 mt-1">좌측 패널에서 위젯을 추가하세요</p>
                            </div>
                        ) : (
                            /* PageLayout — 12칸 그리드 + ctrl+g 격자 토글 공통 처리 */
                            <PageLayout mode="preview">
                                {widgetItems.map((item) => (
                                    /* GridCell — colSpan/rowSpan/height/overflow 일괄 관리 */
                                    <GridCell
                                        key={item.id}
                                        colSpan={item.colSpan}
                                        rowSpan={item.rowSpan}
                                        onClick={() => {
                                            setShowAddWidget(false);
                                            setAddingContentToItemId(null);
                                            setEditingItemId(editingItemId === item.id ? null : item.id);
                                            setEditingContentId(null);
                                        }}
                                        className={`cursor-pointer transition-all ${editingItemId === item.id ? 'ring-2 ring-inset ring-slate-900' : 'hover:ring-1 hover:ring-inset hover:ring-slate-300'}`}
                                    >
                                        <WidgetCellPreview contents={item.contents} colSpan={item.colSpan} />
                                    </GridCell>
                                ))}
                            </PageLayout>
                        )}
                    </div>
                </div>
            </div>{/* 메인 레이아웃 끝 */}

            {/* ── 저장 모달 ── */}
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
