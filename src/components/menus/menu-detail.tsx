'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Save, Trash2, Settings2, FolderOpen, Folder, FileText, Plus, X, Wand2, ChevronDown, Loader2 } from 'lucide-react';
import { useMenuStore, MenuItem } from '@/store/use-menu-store';
import { useQueryClient } from '@tanstack/react-query';
import { MenuRoleMatrix } from './menu-role-matrix';
import { toast } from 'sonner';
import { URL_REGEX, XSS_CHARS } from './constants';
import { IconPicker } from './icon-picker';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import api from '@/lib/api';
import { useI18n } from '@/hooks/use-i18n';

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
    const { t } = useI18n();

    /* 드롭다운 열기 시 목록 조회 */
    const handleOpen = async () => {
        setOpen(v => !v);
        if (list.length > 0) return;
        setLoading(true);
        try {
            const res = await api.get('/page-templates');
            /* LAYER(팝업)는 메뉴 URL로 부적합하므로 제외, LIST·PAGE(Widget) 표시 */
            setList(res.data.filter((tpl: { templateType?: string }) => tpl.templateType !== 'LAYER'));
        } catch {
            toast.error(t('menu.template.error'));
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
                {t('menu.template.title')}
                <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-72 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-medium text-slate-500 bg-slate-50">
                        {t('menu.template.dropdown_title')}
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />{t('common.loading')}
                        </div>
                    ) : list.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400">{t('menu.template.empty')}</div>
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

/* ── validation 함수 (t 파라미터 주입으로 다국어 처리) ── */
const validateUrl = (value: string, t: (key: string) => string): string => {
    if (!value) return '';
    if (XSS_CHARS.test(value)) return t('validation.url.xss');
    if (!value.startsWith('/')) return t('validation.url.slash');
    if (value.includes('//')) return t('validation.url.double_slash');
    if (!URL_REGEX.test(value)) return t('validation.url.pattern');
    return '';
};

const validateSortOrder = (value: number | string, t: (key: string) => string): string => {
    const num = Number(value);
    if (!value && value !== 0) return t('validation.sort.required');
    if (!Number.isInteger(num)) return t('validation.sort.integer');
    if (num < 1) return t('validation.sort.min');
    if (num > 999) return t('validation.sort.max');
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
    nameMsgKey: string;
    descriptionMsgKey: string;
    url: string;
    icon: string;
    sortOrder: number | string;
    visible: boolean;
    linkedTemplateName: string;
    /* 에러 */
    nameMsgKeyError: string;
    urlError: string;
    sortOrderError?: string;
    /* 변경 핸들러 */
    onNameMsgKeyChange: (v: string) => void;
    onDescriptionMsgKeyChange: (v: string) => void;
    onUrlChange: (v: string) => void;
    onIconChange: (v: string) => void;
    onSortOrderChange: (v: string) => void;
    onVisibleChange: (v: boolean) => void;
    onTemplateSelect: (url: string, name: string) => void;
    onLinkedTemplateNameChange: (v: string) => void;
    /* blur 핸들러 */
    onUrlBlur?: () => void;
    onSortBlur?: () => void;
    /* refs */
    urlRef: React.RefObject<HTMLInputElement | null>;
    sortRef?: React.RefObject<HTMLInputElement | null>;
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
    nameMsgKey, descriptionMsgKey,
    url, icon, sortOrder, visible, linkedTemplateName,
    nameMsgKeyError, urlError, sortOrderError = '',
    onNameMsgKeyChange, onDescriptionMsgKeyChange,
    onUrlChange, onIconChange, onSortOrderChange, onVisibleChange,
    onTemplateSelect, onLinkedTemplateNameChange,
    onUrlBlur, onSortBlur,
    urlRef, sortRef,
    isFolderActive, isProgramActive, canSwitchToProgram, hasChildren,
    onFolderClick, onProgramClick,
    onEnterSubmit,
    wrapperClassName = 'flex-1 overflow-y-auto p-5 space-y-5',
}: MenuFormProps) {
    const { t } = useI18n();

    return (
        <div className={wrapperClassName}>
            {/* 메뉴 타입 (폴더 ↔ 프로그램) */}
            <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">{t('common.label.type')}</label>
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
                        <Folder className="w-4 h-4" />{t('common.type.folder')}
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
                        <FileText className="w-4 h-4" />{t('common.type.program')}
                    </button>
                </div>
                {hasChildren && isFolderActive && (
                    <p className="text-[11px] text-amber-500 mt-1">{t('menu.notice.folder_type')}</p>
                )}
            </div>

            {/* 메뉴명 다국어 키 선택 */}
            <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                    {t('menu.label.name')}
                    <span className="text-red-500">*</span>
                </label>
                <MessageKeySelector
                    value={nameMsgKey}
                    onChange={onNameMsgKeyChange}
                    resourceType="WORD"
                />
                {nameMsgKeyError && <p className="text-[11px] text-red-500 mt-1">{nameMsgKeyError}</p>}
            </div>

            {/* URL */}
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
                    placeholder={t('menu.placeholder.url')}
                />
                {linkedTemplateName && (
                    <p className="flex items-center gap-1 text-[11px] text-blue-600 mt-1">
                        <Wand2 className="w-3 h-3" />
                        {t('menu.template.linked', { name: linkedTemplateName })}
                    </p>
                )}
                {urlError && <p className="text-[11px] text-red-500 mt-1">{urlError}</p>}
            </div>

            {/* 메뉴 설명 다국어 키 선택 (WORD+SENTENCE 전체) */}
            <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                    {t('common.label.description')}
                    <span className="ml-1.5 text-[10px] text-slate-400 font-normal">{t('common.field.optional')}</span>
                </label>
                <MessageKeySelector
                    value={descriptionMsgKey}
                    onChange={onDescriptionMsgKeyChange}
                />
            </div>

            {/* 아이콘 + 정렬 순서 + 노출 여부 — 3컬럼 */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">{t('common.label.icon')}</label>
                    <IconPicker value={icon} onChange={onIconChange} />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">{t('common.label.sortOrder')}</label>
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
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">{t('common.label.visible')}</label>
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
                        {visible ? t('common.visible.show') : t('common.visible.hide')}
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
    const { t } = useI18n();
    /* URL 유무로 폴더/프로그램 판단 (상세 모드와 동일한 방식) */
    const [nameMsgKey, setNameMsgKey] = useState('');
    const [descriptionMsgKey, setDescriptionMsgKey] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('');
    const [sortOrder, setSortOrder] = useState<number | string>(1);
    const [visible, setVisible] = useState(true);
    const [nameMsgKeyError, setNameMsgKeyError] = useState('');
    const [urlError, setUrlError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [linkedTemplateName, setLinkedTemplateName] = useState('');
    const urlRef = useRef<HTMLInputElement>(null);

    const canSelectFolder = parentDepth < 2;
    const depthLabel = parentId === null ? '1depth' : parentDepth === 1 ? '2depth' : '3depth';

    /* 자동 포커싱 */
    useEffect(() => { setTimeout(() => urlRef.current?.focus(), 100); }, []);

    /* 폴더 활성 여부: URL이 비어있으면 폴더 */
    const isFolderActive = !url || !url.trim();
    const isProgramActive = !isFolderActive;

    const handleSubmit = async () => {
        if (isSubmitting) return;
        const ne = !nameMsgKey ? t('validation.name.required') : '';
        const ue = isProgramActive ? validateUrl(url, t) || (!url.trim() ? t('validation.url.required') : '') : '';
        setNameMsgKeyError(ne);
        setUrlError(ue);
        if (ne || ue) { if (ue) urlRef.current?.focus(); return; }

        setIsSubmitting(true);
        try {
            const createdMenu = await addMenu({
                name: '',
                nameMsgKey,
                descriptionMsgKey: descriptionMsgKey || undefined,
                url: url.trim(),
                icon,
                parentId,
                menuType,
                sortOrder: Number(sortOrder),
                visible,
            });
            toast.success(t('menu.created', { name: nameMsgKey }));
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
            if (confirm(t('menu.confirm.folder_type'))) {
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
                    <h2 className="text-sm font-bold text-slate-800">{t('menu.btn.add')}</h2>
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-mono">{depthLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCancel}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-md hover:bg-slate-100 transition-all"
                    >
                        <X className="w-3.5 h-3.5" />{t('common.btn.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !nameMsgKey}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        <Plus className="w-3.5 h-3.5" />{isSubmitting ? t('common.btn.saving') : t('menu.btn.add')}
                    </button>
                </div>
            </div>

            {/* 공통 폼 */}
            <MenuForm
                nameMsgKey={nameMsgKey}
                descriptionMsgKey={descriptionMsgKey}
                url={url}
                icon={icon}
                sortOrder={sortOrder}
                visible={visible}
                linkedTemplateName={linkedTemplateName}
                nameMsgKeyError={nameMsgKeyError}
                urlError={urlError}
                onNameMsgKeyChange={v => { setNameMsgKey(v); if (nameMsgKeyError) setNameMsgKeyError(''); }}
                onDescriptionMsgKeyChange={setDescriptionMsgKey}
                onUrlChange={v => { setUrl(v); if (urlError) setUrlError(''); }}
                onIconChange={setIcon}
                onSortOrderChange={v => { const n = parseInt(v, 10); if (!isNaN(n)) setSortOrder(n); }}
                onVisibleChange={setVisible}
                onTemplateSelect={(v, n) => { setUrl(v); setUrlError(''); setLinkedTemplateName(n); }}
                onLinkedTemplateNameChange={setLinkedTemplateName}
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
    const { t } = useI18n();

    /* 로컬 편집 상태 */
    const [nameMsgKey, setNameMsgKey] = useState('');
    const [descriptionMsgKey, setDescriptionMsgKey] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('');
    const [sortOrder, setSortOrder] = useState<number | string>(1);
    const [visible, setVisible] = useState(true);
    const [linkedTemplateName, setLinkedTemplateName] = useState('');
    const templatesCache = useRef<{ pageUrl: string; name: string }[]>([]);

    /* 에러 상태 */
    const [nameMsgKeyError, setNameMsgKeyError] = useState('');
    const [urlError, setUrlError] = useState('');
    const [sortOrderError, setSortOrderError] = useState('');

    /* 변경사항 추적 */
    const [isDirty, setIsDirty] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const urlRef = useRef<HTMLInputElement>(null);
    const sortRef = useRef<HTMLInputElement>(null);

    /* 선택 메뉴 변경 시 로컬 상태 동기화 */
    useEffect(() => {
        if (selectedMenu) {
            setNameMsgKey(selectedMenu.nameMsgKey ?? '');
            setDescriptionMsgKey(selectedMenu.descriptionMsgKey ?? '');
            setUrl(selectedMenu.url || '');
            setIcon(selectedMenu.icon);
            setSortOrder(selectedMenu.sortOrder);
            setVisible(selectedMenu.visible);
            setNameMsgKeyError('');
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
                nameMsgKey !== (selectedMenu.nameMsgKey ?? '') ||
                descriptionMsgKey !== (selectedMenu.descriptionMsgKey ?? '') ||
                url !== (selectedMenu.url || '') ||
                icon !== selectedMenu.icon ||
                Number(sortOrder) !== selectedMenu.sortOrder ||
                visible !== selectedMenu.visible;
            setIsDirty(dirty);
            setStoreDirty(dirty);
        }
    }, [nameMsgKey, descriptionMsgKey, url, icon, sortOrder, visible, selectedMenu, setStoreDirty]);

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
                <p className="text-sm font-medium">{t('menu.empty.title')}</p>
                <p className="text-xs text-slate-300">{t('menu.empty.description')}</p>
            </div>
        );
    }

    const isParent = !selectedMenu.parentId;
    const hasChildren = !!(selectedMenu.children && selectedMenu.children.length > 0);
    /* URL 유무로 폴더/프로그램 판단 */
    const isFolderActive = !url || !url.trim();
    const isProgramActive = !isFolderActive;

    /* onChange 핸들러 */
    const handleUrlChange = (v: string) => {
        setUrl(v);
        setLinkedTemplateName('');
        if (urlError) setUrlError(validateUrl(v, t));
    };
    const handleSortChange = (v: string) => {
        const num = parseInt(v, 10);
        if (v === '') { setSortOrder(''); setSortOrderError(t('validation.sort.required')); return; }
        if (isNaN(num) || num < 0) return;
        setSortOrder(num);
        if (sortOrderError) setSortOrderError(validateSortOrder(num, t));
    };

    /* onBlur 핸들러 */
    const handleUrlBlur = () => {
        let cleaned = url;
        if (cleaned.length > 1 && cleaned.endsWith('/')) cleaned = cleaned.replace(/\/+$/, '');
        setUrl(cleaned);
        setUrlError(validateUrl(cleaned, t));
    };
    const handleSortBlur = () => setSortOrderError(validateSortOrder(sortOrder, t));

    /* 폴더/프로그램 전환 핸들러 */
    const handleFolderClick = () => {
        if (url && url.trim()) {
            if (confirm(t('menu.confirm.folder_type'))) {
                setUrl('');
                setUrlError('');
            }
        }
    };
    const handleProgramClick = () => {
        if (hasChildren) {
            toast.error(t('menu.error.has_children'));
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
        const ne = !nameMsgKey ? t('validation.name.required') : '';
        const ue = validateUrl(url, t);
        const se = validateSortOrder(sortOrder, t);
        setNameMsgKeyError(ne);
        setUrlError(ue);
        setSortOrderError(se);
        if (ne || ue || se) {
            if (ue) urlRef.current?.focus();
            return;
        }
        if (!isDirty) { toast.success(t('menu.no_change')); return; }

        setIsSubmitting(true);
        try {
            await updateMenu(selectedMenu.id, {
                nameMsgKey,
                descriptionMsgKey: descriptionMsgKey || undefined,
                url: (url || '').endsWith('/') && (url || '').length > 1 ? (url || '').replace(/\/+$/, '') : (url || ''),
                icon,
                sortOrder: Number(sortOrder),
                visible,
            });
            toast.success(t('menu.updated'));
            setIsDirty(false);
            await queryClient.invalidateQueries({ queryKey: ['menus', activeTab] });
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || t('menu.save_error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    /* 삭제 */
    const handleDelete = async () => {
        if (isSubmitting) return;
        const confirmMsg = t('menu.confirm.delete', { name: selectedMenu.name })
            + (isParent ? '\n' + t('menu.confirm.delete_children') : '');
        if (!confirm(confirmMsg)) return;

        setIsSubmitting(true);
        try {
            await deleteMenu(selectedMenu.id);
            toast.success(t('common.deleted'));
            await queryClient.invalidateQueries({ queryKey: ['menus', activeTab] });
        } catch (err: unknown) {
            const msg2 = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg2 || t('menu.delete_error'));
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
                    <h2 className="text-sm font-bold text-slate-800">{t('menu.title')}</h2>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-mono">
                        {isParent ? t('common.badge.parent') : t('common.badge.child')}
                    </span>
                    {isDirty && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">{t('common.status.dirty')}</span>}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-all disabled:opacity-40"
                    >
                        <Trash2 className="w-3.5 h-3.5" />{t('common.btn.delete')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-all disabled:opacity-40"
                    >
                        <Save className="w-3.5 h-3.5" />{isSubmitting ? t('common.btn.saving') : t('common.btn.save')}
                    </button>
                </div>
            </div>

            {/* 폼 + 역할별 접근 권한을 하나의 스크롤 영역으로 통합 */}
            <div className="flex-1 overflow-y-auto">
                {/* 공통 폼 — overflow 없이 내용만 */}
                <MenuForm
                    nameMsgKey={nameMsgKey}
                    descriptionMsgKey={descriptionMsgKey}
                    url={url}
                    icon={icon}
                    sortOrder={sortOrder}
                    visible={visible}
                    linkedTemplateName={linkedTemplateName}
                    nameMsgKeyError={nameMsgKeyError}
                    urlError={urlError}
                    sortOrderError={sortOrderError}
                    onNameMsgKeyChange={v => { setNameMsgKey(v); if (nameMsgKeyError) setNameMsgKeyError(''); }}
                    onDescriptionMsgKeyChange={setDescriptionMsgKey}
                    onUrlChange={handleUrlChange}
                    onIconChange={setIcon}
                    onSortOrderChange={handleSortChange}
                    onVisibleChange={setVisible}
                    onTemplateSelect={(v, n) => { handleUrlChange(v); setLinkedTemplateName(n); }}
                    onLinkedTemplateNameChange={setLinkedTemplateName}
                    onUrlBlur={handleUrlBlur}
                    onSortBlur={handleSortBlur}
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
