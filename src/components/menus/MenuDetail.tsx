'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Save, Trash2, Settings2, FolderOpen, Folder, FileText, Plus, X, Wand2, ChevronDown, Loader2 } from 'lucide-react';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';
import { useQueryClient } from '@tanstack/react-query';
import { MenuRoleMatrix } from './MenuRoleMatrix';
import { toast } from 'sonner';
import { NAME_REGEX, URL_REGEX, XSS_CHARS, ERROR_MESSAGES } from './constants';
import { IconPicker } from './IconPicker';
import api from '@/lib/api';

/* ── 페이지 템플릿 연동 버튼 ── */
/* 템플릿 타입별 뱃지 표시 설정 */
const TEMPLATE_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
    LIST:  { label: 'List',   cls: 'bg-blue-50 text-blue-600 border border-blue-200' },
    PAGE:  { label: 'Widget', cls: 'bg-violet-50 text-violet-600 border border-violet-200' },
};

function TemplateUrlPicker({ onSelect }: { onSelect: (url: string, name: string) => void }) {
    const [open, setOpen] = useState(false);
    const [list, setList] = useState<{ id: number; name: string; slug: string; pageUrl: string; templateType?: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    /* 드롭다운 열기 시 목록 조회 */
    const handleOpen = async () => {
        setOpen(v => !v);
        if (list.length > 0) return;
        setLoading(true);
        try {
            const res = await api.get('/page-templates');
            /* LAYER(팝업)는 메뉴 URL로 부적합하므로 제외, LIST·PAGE(Widget) 표시 */
            setList(res.data.filter((t: { templateType?: string }) => t.templateType !== 'LAYER'));
        } catch {
            toast.error('페이지 템플릿 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    /* 외부 클릭 시 닫기 */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={handleOpen}
                className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 transition-colors"
            >
                <Wand2 className="w-3 h-3" />
                페이지 메이커 연동
                <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-72 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-medium text-slate-500 bg-slate-50">
                        저장된 페이지 템플릿 선택
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />로딩 중...
                        </div>
                    ) : list.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400">저장된 템플릿이 없습니다.</div>
                    ) : (
                        <ul className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                            {list.map(tpl => {
                                const badge = TEMPLATE_TYPE_BADGE[tpl.templateType || ''];
                                /* PAGE/QUICK_LIST/QUICK_DETAIL 타입은 위젯 렌더러 경로, LIST는 기존 pageUrl 사용 */
                                const isWidgetType = tpl.templateType === 'PAGE' || tpl.templateType === 'QUICK_LIST' || tpl.templateType === 'QUICK_DETAIL';
                                const menuUrl = isWidgetType
                                    ? `/admin/widget/${tpl.slug}`
                                    : tpl.pageUrl;
                                return (
                                    <li key={tpl.id}>
                                        <button
                                            type="button"
                                            onClick={() => { onSelect(menuUrl, tpl.name); setOpen(false); }}
                                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-medium text-slate-700 flex-1 truncate">{tpl.name}</p>
                                                {badge && (
                                                    <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{menuUrl}</p>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── validation 함수 ── */
const validateName = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return '메뉴명을 입력해주세요.';
    if (XSS_CHARS.test(trimmed)) return '메뉴명에 <, >, ", \' 문자는 사용할 수 없습니다.';
    if (!NAME_REGEX.test(trimmed)) return '메뉴명은 한글, 영문, 숫자, 공백, -, _, (), &만 사용 가능합니다.';
    return '';
};

const validateUrl = (value: string): string => {
    if (!value) return '';
    if (XSS_CHARS.test(value)) return 'URL에 <, >, ", \' 문자는 사용할 수 없습니다.';
    if (!value.startsWith('/')) return 'URL은 /로 시작해야 합니다.';
    if (value.includes('//')) return 'URL에 연속 슬래시(//)는 사용할 수 없습니다.';
    if (!URL_REGEX.test(value)) return 'URL은 영문, 숫자, -, _, /만 사용 가능합니다.';
    return '';
};

const validateSortOrder = (value: number | string): string => {
    const num = Number(value);
    if (!value && value !== 0) return '정렬 순서를 입력해주세요.';
    if (!Number.isInteger(num)) return '정렬 순서는 정수만 입력 가능합니다.';
    if (num < 1) return '정렬 순서는 1 이상이어야 합니다.';
    if (num > 999) return '정렬 순서는 999 이하여야 합니다.';
    return '';
};

/* ── 에러 입력 스타일 ── */
const inputCls = (error: string) =>
    `w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all ${
        error
            ? 'border-red-400 focus:ring-red-200 focus:border-red-500'
            : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-900'
    }`;

/* ══════════════════════════════════════════════════════════════ */
/*  공통 폼 컴포넌트                                                */
/*  추가 모드 / 상세 모드 모두 이 컴포넌트를 사용하여 UI를 동일하게 유지   */
/* ══════════════════════════════════════════════════════════════ */
interface MenuFormProps {
    /* 폼 값 */
    name: string;
    description: string;
    url: string;
    icon: string;
    sortOrder: number | string;
    visible: boolean;
    linkedTemplateName: string;
    /* 에러 */
    nameError: string;
    urlError: string;
    sortOrderError?: string;
    /* 변경 핸들러 */
    onNameChange: (v: string) => void;
    onDescriptionChange: (v: string) => void;
    onUrlChange: (v: string) => void;
    onIconChange: (v: string) => void;
    onSortOrderChange: (v: string) => void;
    onVisibleChange: (v: boolean) => void;
    onTemplateSelect: (url: string, name: string) => void;
    onLinkedTemplateNameChange: (v: string) => void;
    /* blur 핸들러 (상세 모드에서 사용, 추가 모드는 undefined 가능) */
    onNameBlur?: () => void;
    onUrlBlur?: () => void;
    onSortBlur?: () => void;
    /* refs */
    nameRef: React.RefObject<HTMLInputElement>;
    urlRef: React.RefObject<HTMLInputElement>;
    sortRef?: React.RefObject<HTMLInputElement>;
    /* 타입 전환 관련 — 추가/상세 모드 차이가 있어 외부에서 주입 */
    isFolderActive: boolean;
    isProgramActive: boolean;
    canSwitchToProgram: boolean; /* 하위 메뉴 없어야 함 */
    hasChildren: boolean;
    onFolderClick: () => void;
    onProgramClick: () => void;
    /* Enter 키로 제출 */
    onEnterSubmit: () => void;
    /* 외부에서 wrapper 클래스 주입 — 기본값: flex-1 overflow-y-auto (단독 사용 시) */
    wrapperClassName?: string;
}

function MenuForm({
    name, description, url, icon, sortOrder, visible, linkedTemplateName,
    nameError, urlError, sortOrderError = '',
    onNameChange, onDescriptionChange, onUrlChange, onIconChange, onSortOrderChange, onVisibleChange,
    onTemplateSelect, onLinkedTemplateNameChange,
    onNameBlur, onUrlBlur, onSortBlur,
    nameRef, urlRef, sortRef,
    isFolderActive, isProgramActive, canSwitchToProgram, hasChildren,
    onFolderClick, onProgramClick,
    onEnterSubmit,
    wrapperClassName = 'flex-1 overflow-y-auto p-5 space-y-5',
}: MenuFormProps) {
    return (
        <div className={wrapperClassName}>
            {/* 메뉴 타입 (폴더 ↔ 프로그램) */}
            <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">메뉴 타입</label>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onFolderClick}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition-all ${
                            isFolderActive
                                ? 'border-amber-300 bg-amber-50 text-amber-700'
                                : 'border-slate-200 bg-white text-slate-400 hover:border-amber-200'
                        }`}
                    >
                        <Folder className="w-4 h-4" />폴더
                    </button>
                    <button
                        type="button"
                        onClick={onProgramClick}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition-all ${
                            isProgramActive
                                ? 'border-blue-300 bg-blue-50 text-blue-700'
                                : hasChildren
                                    ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                    : 'border-slate-200 bg-white text-slate-400 hover:border-blue-200'
                        }`}
                    >
                        <FileText className="w-4 h-4" />프로그램
                    </button>
                </div>
                {hasChildren && isFolderActive && (
                    <p className="text-[11px] text-amber-500 mt-1">하위 메뉴가 있어 프로그램으로 변경할 수 없습니다</p>
                )}
            </div>

            {/* 메뉴명 + URL — 2컬럼 */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">메뉴명 <span className="text-red-500">*</span></label>
                    <input
                        ref={nameRef}
                        type="text"
                        value={name}
                        onChange={e => onNameChange(e.target.value)}
                        onBlur={onNameBlur}
                        onKeyDown={e => { if (e.key === 'Enter') onEnterSubmit(); }}
                        className={inputCls(nameError)}
                        placeholder="메뉴명을 입력하세요"
                        maxLength={50}
                    />
                    {nameError && <p className="text-[11px] text-red-500 mt-1">{nameError}</p>}
                </div>
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-600">URL</label>
                        <TemplateUrlPicker onSelect={onTemplateSelect} />
                    </div>
                    <input
                        ref={urlRef}
                        type="text"
                        value={url}
                        onChange={e => { onUrlChange(e.target.value); onLinkedTemplateNameChange(''); }}
                        onBlur={onUrlBlur}
                        onKeyDown={e => { if (e.key === 'Enter') onEnterSubmit(); }}
                        className={`${inputCls(urlError)} font-mono`}
                        placeholder="폴더는 비워두세요. 프로그램은 /admin/..."
                    />
                    {/* 연결된 템플릿명 표시 */}
                    {linkedTemplateName && (
                        <p className="flex items-center gap-1 text-[11px] text-blue-600 mt-1">
                            <Wand2 className="w-3 h-3" />
                            연결된 템플릿: <span className="font-semibold">{linkedTemplateName}</span>
                        </p>
                    )}
                    {urlError && <p className="text-[11px] text-red-500 mt-1">{urlError}</p>}
                </div>
            </div>

            {/* 메뉴 설명 */}
            <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                    메뉴 설명
                    <span className="ml-1.5 text-[10px] text-slate-400 font-normal">페이지 타이틀 아래에 표시됩니다 (선택)</span>
                </label>
                <textarea
                    value={description}
                    onChange={e => onDescriptionChange(e.target.value)}
                    rows={2}
                    maxLength={500}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 resize-none transition-all"
                    placeholder="페이지에 대한 간략한 설명을 입력하세요"
                />
                <p className="text-right text-[10px] text-slate-300 mt-0.5">{description.length}/500</p>
            </div>

            {/* 아이콘 + 정렬 순서 + 노출 여부 — 3컬럼 */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">아이콘</label>
                    <IconPicker value={icon} onChange={onIconChange} />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">정렬 순서</label>
                    <input
                        ref={sortRef}
                        type="number"
                        value={sortOrder}
                        onChange={e => onSortOrderChange(e.target.value)}
                        onBlur={onSortBlur}
                        min={1}
                        max={999}
                        className={inputCls(sortOrderError)}
                    />
                    {sortOrderError && <p className="text-[11px] text-red-500 mt-1">{sortOrderError}</p>}
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">노출 여부</label>
                    <button
                        type="button"
                        onClick={() => onVisibleChange(!visible)}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-all ${
                            visible
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${visible ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {visible ? '노출' : '숨김'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════ */
/*  생성 모드 폼                            */
/* ══════════════════════════════════════ */
function CreateMenuForm({ parentId, parentDepth, menuType, onCancel, onCreated, addMenu }: {
    parentId: number | null;
    parentDepth: number;
    menuType: 'BO' | 'FO';
    onCancel: () => void;
    onCreated: (menu: MenuItem) => Promise<void>;
    addMenu: (menu: Omit<MenuItem, 'id' | 'children'>) => Promise<MenuItem>;
}) {
    const queryClient = useQueryClient();
    /* URL 유무로 폴더/프로그램 판단 (상세 모드와 동일한 방식) */
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('');
    const [sortOrder, setSortOrder] = useState<number | string>(1);
    const [visible, setVisible] = useState(true);
    const [nameError, setNameError] = useState('');
    const [urlError, setUrlError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [linkedTemplateName, setLinkedTemplateName] = useState('');
    const nameRef = useRef<HTMLInputElement>(null);
    const urlRef = useRef<HTMLInputElement>(null);

    const canSelectFolder = parentDepth < 2;
    const depthLabel = parentId === null ? '1depth' : parentDepth === 1 ? '2depth' : '3depth';

    /* 자동 포커싱 */
    useEffect(() => { setTimeout(() => nameRef.current?.focus(), 100); }, []);

    /* 폴더 활성 여부: URL이 비어있으면 폴더 */
    const isFolderActive = !url || !url.trim();
    const isProgramActive = !isFolderActive;

    const handleSubmit = async () => {
        if (isSubmitting) return;
        const ne = validateName(name);
        const ue = isProgramActive ? validateUrl(url) || (!url.trim() ? '프로그램은 URL을 입력해야 합니다.' : '') : '';
        setNameError(ne);
        setUrlError(ue);
        if (ne || ue) { if (ne) nameRef.current?.focus(); else urlRef.current?.focus(); return; }

        setIsSubmitting(true);
        try {
            const createdMenu = await addMenu({
                name: name.trim(),
                description: description.trim() || undefined,
                url: url.trim(),
                icon,
                parentId,
                menuType,
                sortOrder: Number(sortOrder),
                visible,
            });
            toast.success(`'${name.trim()}' 메뉴가 추가되었습니다.`);
            await queryClient.invalidateQueries({ queryKey: ['menus', menuType] });
            await onCreated(createdMenu);
        } catch {
            /* store에서 에러 토스트 처리 */
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFolderClick = () => {
        if (url && url.trim()) {
            if (confirm('폴더로 변경하면 URL이 제거됩니다. 계속하시겠습니까?')) {
                setUrl('');
                setUrlError('');
            }
        }
    };

    const handleProgramClick = () => {
        if (!url || !url.trim()) {
            setUrl('/');
            urlRef.current?.focus();
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full flex flex-col">
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-bold text-slate-800">메뉴 추가</h2>
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-mono">{depthLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCancel}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-md hover:bg-slate-100 transition-all"
                    >
                        <X className="w-3.5 h-3.5" />취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !name.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        <Plus className="w-3.5 h-3.5" />{isSubmitting ? '추가 중...' : '메뉴 추가'}
                    </button>
                </div>
            </div>

            {/* 공통 폼 */}
            <MenuForm
                name={name}
                description={description}
                url={url}
                icon={icon}
                sortOrder={sortOrder}
                visible={visible}
                linkedTemplateName={linkedTemplateName}
                nameError={nameError}
                urlError={urlError}
                onNameChange={v => { setName(v); if (nameError) setNameError(''); }}
                onDescriptionChange={setDescription}
                onUrlChange={v => { setUrl(v); if (urlError) setUrlError(''); }}
                onIconChange={setIcon}
                onSortOrderChange={v => { const n = parseInt(v, 10); if (!isNaN(n)) setSortOrder(n); }}
                onVisibleChange={setVisible}
                onTemplateSelect={(v, n) => { setUrl(v); setUrlError(''); setLinkedTemplateName(n); }}
                onLinkedTemplateNameChange={setLinkedTemplateName}
                nameRef={nameRef}
                urlRef={urlRef}
                isFolderActive={isFolderActive}
                isProgramActive={isProgramActive}
                canSwitchToProgram={true}
                hasChildren={false}
                onFolderClick={handleFolderClick}
                onProgramClick={handleProgramClick}
                onEnterSubmit={handleSubmit}
            />
        </div>
    );
}

/* ══════════════════════════════════════ */
/*  메뉴 상세 편집 패널                      */
/* ══════════════════════════════════════ */
export function MenuDetail() {
    const { selectedMenu, updateMenu, deleteMenu, setIsDirty: setStoreDirty, isCreating, createParentId, createMaxDepth, cancelCreate, addMenu, activeTab, selectMenu } = useMenuStore();
    const queryClient = useQueryClient();

    /* 로컬 편집 상태 */
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('');
    const [sortOrder, setSortOrder] = useState<number | string>(1);
    const [visible, setVisible] = useState(true);
    const [linkedTemplateName, setLinkedTemplateName] = useState('');
    const templatesCache = useRef<{ pageUrl: string; name: string }[]>([]);

    /* 에러 상태 */
    const [nameError, setNameError] = useState('');
    const [urlError, setUrlError] = useState('');
    const [sortOrderError, setSortOrderError] = useState('');

    /* 변경사항 추적 */
    const [isDirty, setIsDirty] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);
    const urlRef = useRef<HTMLInputElement>(null);
    const sortRef = useRef<HTMLInputElement>(null);

    /* 선택 메뉴 변경 시 로컬 상태 동기화 */
    useEffect(() => {
        if (selectedMenu) {
            setName(selectedMenu.name);
            setDescription(selectedMenu.description || '');
            setUrl(selectedMenu.url || '');
            setIcon(selectedMenu.icon);
            setSortOrder(selectedMenu.sortOrder);
            setVisible(selectedMenu.visible);
            setNameError('');
            setUrlError('');
            setSortOrderError('');
            setIsDirty(false);

            /* URL이 있으면 연결된 템플릿명 조회 */
            const currentUrl = selectedMenu.url || '';
            if (currentUrl) {
                const fetchAndMatch = async () => {
                    try {
                        if (templatesCache.current.length === 0) {
                            const res = await api.get('/page-templates');
                            const isWidget = (type?: string) => type === 'PAGE' || type === 'QUICK_LIST' || type === 'QUICK_DETAIL';
                            templatesCache.current = (res.data as { pageUrl: string; name: string; slug: string; templateType?: string }[])
                                .filter((t) => t.templateType === 'LIST' || isWidget(t.templateType))
                                .map((t) => ({
                                    pageUrl: isWidget(t.templateType) ? `/admin/widget/${t.slug}` : t.pageUrl,
                                    name: t.name,
                                }));
                        }
                        const matched = templatesCache.current.find(t => t.pageUrl === currentUrl);
                        setLinkedTemplateName(matched ? matched.name : '');
                    } catch {
                        setLinkedTemplateName('');
                    }
                };
                fetchAndMatch();
            } else {
                setLinkedTemplateName('');
            }
        }
    }, [selectedMenu]);

    /* beforeunload — 미저장 데이터 보호 */
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => { if (isDirty) { e.preventDefault(); } };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    /* isDirty 체크 */
    useEffect(() => {
        if (selectedMenu) {
            const dirty =
                name !== selectedMenu.name ||
                description !== (selectedMenu.description || '') ||
                url !== (selectedMenu.url || '') ||
                icon !== selectedMenu.icon ||
                Number(sortOrder) !== selectedMenu.sortOrder ||
                visible !== selectedMenu.visible;
            setIsDirty(dirty);
            setStoreDirty(dirty);
        }
    }, [name, description, url, icon, sortOrder, visible, selectedMenu, setStoreDirty]);

    /* ── 생성 모드 ── */
    if (!selectedMenu && isCreating) {
        return <CreateMenuForm
            parentId={createParentId}
            parentDepth={createMaxDepth}
            menuType={activeTab}
            onCancel={cancelCreate}
            onCreated={async (createdMenu) => {
                cancelCreate();
                selectMenu(createdMenu);
            }}
            addMenu={addMenu}
        />;
    }

    if (!selectedMenu) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl h-full flex flex-col items-center justify-center text-slate-400 gap-3 p-8">
                <FolderOpen className="w-12 h-12 text-slate-200" />
                <p className="text-sm font-medium">왼쪽에서 메뉴를 선택하거나</p>
                <p className="text-xs text-slate-300">상단 "메뉴 추가" 버튼을 눌러 새 메뉴를 생성하세요</p>
            </div>
        );
    }

    const isParent = !selectedMenu.parentId;
    const hasChildren = !!(selectedMenu.children && selectedMenu.children.length > 0);
    /* URL 유무로 폴더/프로그램 판단 */
    const isFolderActive = !url || !url.trim();
    const isProgramActive = !isFolderActive;

    /* onChange 핸들러 */
    const handleNameChange = (v: string) => {
        if (v.length > 50) return;
        setName(v);
        if (nameError) setNameError(validateName(v));
    };
    const handleUrlChange = (v: string) => {
        setUrl(v);
        setLinkedTemplateName('');
        if (urlError) setUrlError(validateUrl(v));
    };
    const handleSortChange = (v: string) => {
        const num = parseInt(v, 10);
        if (v === '') { setSortOrder(''); setSortOrderError('정렬 순서를 입력해주세요.'); return; }
        if (isNaN(num) || num < 0) return;
        setSortOrder(num);
        if (sortOrderError) setSortOrderError(validateSortOrder(num));
    };

    /* onBlur 핸들러 */
    const handleNameBlur = () => setNameError(validateName(name));
    const handleUrlBlur = () => {
        let cleaned = url;
        if (cleaned.length > 1 && cleaned.endsWith('/')) cleaned = cleaned.replace(/\/+$/, '');
        setUrl(cleaned);
        setUrlError(validateUrl(cleaned));
    };
    const handleSortBlur = () => setSortOrderError(validateSortOrder(sortOrder));

    /* 폴더/프로그램 전환 핸들러 */
    const handleFolderClick = () => {
        if (url && url.trim()) {
            if (confirm('프로그램에서 폴더로 변경하면 URL이 제거됩니다. 계속하시겠습니까?')) {
                setUrl('');
                setUrlError('');
            }
        }
    };
    const handleProgramClick = () => {
        if (hasChildren) {
            toast.error('하위 메뉴가 있는 폴더는 프로그램으로 변경할 수 없습니다. 하위 메뉴를 먼저 삭제해주세요.');
            return;
        }
        if (!url || !url.trim()) {
            setUrl('/');
            urlRef.current?.focus();
        }
    };

    /* 저장 */
    const handleSave = async () => {
        if (isSubmitting) return;
        const ne = validateName(name);
        const ue = validateUrl(url);
        const se = validateSortOrder(sortOrder);
        setNameError(ne);
        setUrlError(ue);
        setSortOrderError(se);
        if (ne || ue || se) {
            if (ne) nameRef.current?.focus();
            else if (ue) urlRef.current?.focus();
            return;
        }
        if (!isDirty) { toast.success('저장되었습니다.'); return; }

        setIsSubmitting(true);
        try {
            await updateMenu(selectedMenu.id, {
                name: name.trim(),
                description: description.trim() || undefined,
                url: (url || '').endsWith('/') && (url || '').length > 1 ? (url || '').replace(/\/+$/, '') : (url || ''),
                icon,
                sortOrder: Number(sortOrder),
                visible,
            });
            toast.success('메뉴가 저장되었습니다.');
            setIsDirty(false);
            await queryClient.invalidateQueries({ queryKey: ['menus', activeTab] });
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '저장 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* 삭제 */
    const handleDelete = async () => {
        if (isSubmitting) return;
        const msg = `'${selectedMenu.name}' 메뉴를 삭제하시겠습니까?${isParent ? '\n하위 메뉴도 함께 삭제됩니다.' : ''}`;
        if (!confirm(msg)) return;

        setIsSubmitting(true);
        try {
            await deleteMenu(selectedMenu.id);
            toast.success('메뉴가 삭제되었습니다.');
            await queryClient.invalidateQueries({ queryKey: ['menus', activeTab] });
        } catch (err: unknown) {
            const msg2 = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg2 || '삭제 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full flex flex-col">
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-bold text-slate-800">메뉴 상세</h2>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-mono">
                        {isParent ? '대메뉴' : '하위메뉴'}
                    </span>
                    {isDirty && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">수정됨</span>}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-all disabled:opacity-40"
                    >
                        <Trash2 className="w-3.5 h-3.5" />삭제
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-all disabled:opacity-40"
                    >
                        <Save className="w-3.5 h-3.5" />{isSubmitting ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>

            {/* 폼 + 역할별 접근 권한을 하나의 스크롤 영역으로 통합 */}
            <div className="flex-1 overflow-y-auto">
                {/* 공통 폼 — overflow 없이 내용만 */}
                <MenuForm
                    name={name}
                    description={description}
                    url={url}
                    icon={icon}
                    sortOrder={sortOrder}
                    visible={visible}
                    linkedTemplateName={linkedTemplateName}
                    nameError={nameError}
                    urlError={urlError}
                    sortOrderError={sortOrderError}
                    onNameChange={handleNameChange}
                    onDescriptionChange={setDescription}
                    onUrlChange={handleUrlChange}
                    onIconChange={setIcon}
                    onSortOrderChange={handleSortChange}
                    onVisibleChange={setVisible}
                    onTemplateSelect={(v, n) => { handleUrlChange(v); setLinkedTemplateName(n); }}
                    onLinkedTemplateNameChange={setLinkedTemplateName}
                    onNameBlur={handleNameBlur}
                    onUrlBlur={handleUrlBlur}
                    onSortBlur={handleSortBlur}
                    nameRef={nameRef}
                    urlRef={urlRef}
                    sortRef={sortRef}
                    isFolderActive={isFolderActive}
                    isProgramActive={isProgramActive}
                    canSwitchToProgram={!hasChildren}
                    hasChildren={hasChildren}
                    onFolderClick={handleFolderClick}
                    onProgramClick={handleProgramClick}
                    onEnterSubmit={handleSave}
                    wrapperClassName="p-5 space-y-5"
                />

                {/* 역할별 접근 권한 */}
                <div className="px-5 pb-5">
                    <div className="border-t border-slate-100 mb-5" />
                    <MenuRoleMatrix />
                </div>
            </div>
        </div>
    );
}
