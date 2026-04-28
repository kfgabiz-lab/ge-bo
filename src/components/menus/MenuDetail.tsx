'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Save, Trash2, Settings2, FolderOpen, Folder, FileText, Plus, X, Wand2, ChevronDown, Loader2, Pencil, AlertTriangle } from 'lucide-react';
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
                                /* PAGE(Widget) 타입은 위젯 렌더러 경로, LIST는 기존 pageUrl 사용 */
                                const menuUrl = tpl.templateType === 'PAGE'
                                    ? `/admin/templates/widget/${tpl.slug}`
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

/* ══════════════════════════════════════ */
/*  생성 모드 폼                            */
/* ══════════════════════════════════════ */
function CreateMenuForm({ parentId, parentDepth, menuType, onCancel, onCreated, addMenu }: {
    parentId: number | null;
    parentDepth: number;
    menuType: 'BO' | 'FO';
    onCancel: () => void;
    onCreated: () => Promise<void>;
    addMenu: (menu: Omit<MenuItem, 'id' | 'children'>) => Promise<void>;
}) {
    const queryClient = useQueryClient();
    const [menuKind, setMenuKind] = useState<'folder' | 'program'>(parentDepth >= 2 ? 'program' : 'folder');
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [slug, setSlug] = useState('');
    const [icon, setIcon] = useState('Folder');
    const [sortOrder, setSortOrder] = useState(1);
    const [nameError, setNameError] = useState('');
    const [urlError, setUrlError] = useState('');
    const [slugError, setSlugError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [linkedTemplateName, setLinkedTemplateName] = useState(''); // 연결된 페이지 템플릿명
    const nameRef = useRef<HTMLInputElement>(null);

    /* 자동 포커싱 */
    useEffect(() => { setTimeout(() => nameRef.current?.focus(), 100); }, []);

    /* 폴더/프로그램 전환 시 아이콘 자동 변경 */
    useEffect(() => { setIcon(menuKind === 'folder' ? 'Folder' : 'FileText'); }, [menuKind]);

    const canSelectFolder = parentDepth < 2;
    const depthLabel = parentId === null ? '1depth' : parentDepth === 1 ? '2depth' : '3depth';

    /* slug 유효성 검사 (CreateMenuForm용) */
    const validateSlugLocal = (value: string): string => {
        if (!value) return '';
        if (!/^[a-zA-Z0-9\-_]+$/.test(value)) return '슬러그는 영문, 숫자, -, _만 사용 가능합니다.';
        if (value.length > 100) return '슬러그는 100자 이하로 입력해주세요.';
        return '';
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        /* validation */
        let valid = true;
        const trimmed = name.trim();
        if (!trimmed) { setNameError('메뉴명을 입력해주세요.'); valid = false; }
        else if (XSS_CHARS.test(trimmed)) { setNameError('허용되지 않는 문자가 포함되어 있습니다.'); valid = false; }
        else if (!NAME_REGEX.test(trimmed)) { setNameError('메뉴명은 한글, 영문, 숫자만 사용 가능합니다.'); valid = false; }
        else setNameError('');

        if (menuKind === 'program') {
            if (!url.trim()) { setUrlError('프로그램은 URL을 입력해야 합니다.'); valid = false; }
            else if (!url.startsWith('/')) { setUrlError('URL은 /로 시작해야 합니다.'); valid = false; }
            else if (XSS_CHARS.test(url)) { setUrlError('허용되지 않는 문자가 포함되어 있습니다.'); valid = false; }
            else if (!URL_REGEX.test(url)) { setUrlError('URL은 영문, 숫자, -, _, /만 가능합니다.'); valid = false; }
            else setUrlError('');
        } else {
            setUrlError('');
        }

        const sle = validateSlugLocal(slug);
        if (sle) { setSlugError(sle); valid = false; } else setSlugError('');

        if (!valid) { if (nameError || !trimmed) nameRef.current?.focus(); return; }

        setIsSubmitting(true);
        try {
            await addMenu({
                name: trimmed,
                url: menuKind === 'program' ? url.trim() : '',
                slug: slug.trim() || undefined,
                icon,
                parentId,
                menuType,
                sortOrder,
                visible: true,
                isCategory: false,
            });
            toast.success(`'${trimmed}' 메뉴가 추가되었습니다.`);
            // React Query 캐시 무효화 → 메뉴 트리 자동 갱신
            await queryClient.invalidateQueries({ queryKey: ['menus', menuType] });
            await onCreated();
        } catch {
            /* store에서 에러 토스트 처리 */
        } finally {
            setIsSubmitting(false);
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
                <button onClick={onCancel} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* 폼 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* 메뉴 타입 (폴더/프로그램) */}
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">메뉴 타입</label>
                    <div className="flex items-center gap-2">
                        {canSelectFolder && (
                            <button type="button" onClick={() => setMenuKind('folder')}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition-all ${
                                    menuKind === 'folder' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-400 hover:border-amber-200'
                                }`}>
                                <Folder className="w-4 h-4" />폴더
                            </button>
                        )}
                        <button type="button" onClick={() => setMenuKind('program')}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition-all ${
                                menuKind === 'program' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400 hover:border-blue-200'
                            }`}>
                            <FileText className="w-4 h-4" />프로그램
                        </button>
                    </div>
                </div>

                {/* 메뉴명 */}
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">메뉴명 <span className="text-red-500">*</span></label>
                    <input
                        ref={nameRef}
                        type="text"
                        value={name}
                        onChange={e => { setName(e.target.value); if (nameError) setNameError(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all ${nameError ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-900'}`}
                        placeholder="메뉴명을 입력하세요"
                        maxLength={50}
                    />
                    {nameError && <p className="text-[11px] text-red-500 mt-1">{nameError}</p>}
                </div>

                {/* URL (프로그램만) */}
                {menuKind === 'program' && (
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-slate-600">URL <span className="text-red-500">*</span></label>
                            <TemplateUrlPicker onSelect={(v, n) => { setUrl(v); setUrlError(''); setLinkedTemplateName(n); }} />
                        </div>
                        <input
                            type="text"
                            value={url}
                            onChange={e => { setUrl(e.target.value); setLinkedTemplateName(''); if (urlError) setUrlError(''); }}
                            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                            className={`w-full border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 transition-all ${urlError ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-900'}`}
                            placeholder="/admin/..."
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
                )}

                {/* SLUG — page-data API 식별자 */}
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                        SLUG
                        <span className="ml-1.5 text-[10px] text-slate-400 font-normal">데이터 저장/조회 식별자</span>
                    </label>
                    <input
                        type="text"
                        value={slug}
                        onChange={e => { setSlug(e.target.value); if (slugError) setSlugError(validateSlugLocal(e.target.value)); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                        className={`w-full border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 transition-all ${slugError ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-900'}`}
                        placeholder="예) user-list"
                        maxLength={100}
                    />
                    {slugError && <p className="text-[11px] text-red-500 mt-1">{slugError}</p>}
                </div>

                {/* 아이콘 */}
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">아이콘</label>
                    <IconPicker value={icon} onChange={setIcon} />
                </div>

                {/* 정렬 순서 */}
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">정렬 순서</label>
                    <input
                        type="number"
                        value={sortOrder}
                        onChange={e => setSortOrder(Number(e.target.value) || 1)}
                        min={1} max={999}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-white transition-all">취소</button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !name.trim()}
                    className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    {isSubmitting ? '추가 중...' : '메뉴 추가'}
                </button>
            </div>
        </div>
    );
}

const validateName = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return '메뉴명을 입력해주세요.';
    if (XSS_CHARS.test(trimmed)) return '메뉴명에 <, >, ", \' 문자는 사용할 수 없습니다.';
    if (!NAME_REGEX.test(trimmed)) return '메뉴명은 한글, 영문, 숫자, 공백, -, _, ()만 사용 가능합니다.';
    return '';
};

const validateUrl = (value: string, _isParent: boolean): string => {
    if (!value) return ''; // 폴더(URL 없음)는 항상 허용
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

/* ── 메뉴 상세 편집 패널 ── */
export function MenuDetail() {
    const { selectedMenu, updateMenu, deleteMenu, setIsDirty: setStoreDirty, isCreating, createParentId, createMaxDepth, cancelCreate, addMenu, activeTab } = useMenuStore();
    const queryClient = useQueryClient();

    /* 로컬 편집 상태 */
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [slug, setSlug] = useState('');
    const [slugLocked, setSlugLocked] = useState(false); // slug 값이 있으면 잠금 상태
    const [icon, setIcon] = useState('');
    const [sortOrder, setSortOrder] = useState<number | string>(1);
    const [visible, setVisible] = useState(true);
    const [linkedTemplateName, setLinkedTemplateName] = useState(''); // 연결된 페이지 템플릿명
    const templatesCache = useRef<{ pageUrl: string; name: string }[]>([]); // 템플릿 목록 캐시

    /* 에러 상태 */
    const [nameError, setNameError] = useState('');
    const [urlError, setUrlError] = useState('');
    const [slugError, setSlugError] = useState('');
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
            setSlug(selectedMenu.slug || '');
            setSlugLocked(!!selectedMenu.slug); // slug 값이 있으면 잠금
            setIcon(selectedMenu.icon);
            setSortOrder(selectedMenu.sortOrder);
            setVisible(selectedMenu.visible);
            setNameError('');
            setUrlError('');
            setSlugError('');
            setSortOrderError('');
            setIsDirty(false);

            /* URL이 있으면 연결된 템플릿명 조회 */
            const currentUrl = selectedMenu.url || '';
            if (currentUrl) {
                const fetchAndMatch = async () => {
                    try {
                        /* 캐시 없으면 API 조회 */
                        if (templatesCache.current.length === 0) {
                            const res = await api.get('/page-templates');
                            templatesCache.current = (res.data as { pageUrl: string; name: string }[]).filter(
                                (t: { templateType?: string }) => t.templateType === 'LIST'
                            );
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
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty) { e.preventDefault(); }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    /* isDirty 체크 공개 (MenuTree에서 사용) */
    useEffect(() => {
        if (selectedMenu) {
            const dirty =
                name !== selectedMenu.name ||
                description !== (selectedMenu.description || '') ||
                url !== selectedMenu.url ||
                slug !== (selectedMenu.slug || '') ||
                icon !== selectedMenu.icon ||
                Number(sortOrder) !== selectedMenu.sortOrder ||
                visible !== selectedMenu.visible;
            setIsDirty(dirty);
            setStoreDirty(dirty);
        }
    }, [name, description, url, slug, icon, sortOrder, visible, selectedMenu, setStoreDirty]);

    /* ── 생성 모드 ── */
    if (!selectedMenu && isCreating) {
        return <CreateMenuForm parentId={createParentId} parentDepth={createMaxDepth} menuType={activeTab} onCancel={cancelCreate} onCreated={async () => { cancelCreate(); await fetchMenus(); }} addMenu={addMenu} />;
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

    /* onChange 핸들러 */
    const handleNameChange = (v: string) => {
        if (v.length > 50) return; // maxLength 차단
        setName(v);
        if (nameError) setNameError(validateName(v));
    };
    const handleUrlChange = (v: string) => {
        setUrl(v);
        setLinkedTemplateName(''); // 직접 수정 시 연결 표시 초기화
        if (urlError) setUrlError(validateUrl(v, isParent));
    };
    const handleSortChange = (v: string) => {
        // 소수점/음수 입력 차단
        const num = parseInt(v, 10);
        if (v === '') { setSortOrder(''); setSortOrderError('정렬 순서를 입력해주세요.'); return; }
        if (isNaN(num) || num < 0) return;
        setSortOrder(num);
        if (sortOrderError) setSortOrderError(validateSortOrder(num));
    };

    /* onBlur 핸들러 */
    const handleNameBlur = () => setNameError(validateName(name));
    const handleUrlBlur = () => {
        // trailing slash 제거
        let cleaned = url;
        if (cleaned.length > 1 && cleaned.endsWith('/')) cleaned = cleaned.replace(/\/+$/, '');
        setUrl(cleaned);
        setUrlError(validateUrl(cleaned, isParent));
    };
    const handleSortBlur = () => setSortOrderError(validateSortOrder(sortOrder));

    /* slug 유효성 검사 */
    const validateSlug = (value: string): string => {
        if (!value) return ''; // 선택 항목
        if (!/^[a-zA-Z0-9\-_]+$/.test(value)) return '슬러그는 영문, 숫자, -, _만 사용 가능합니다.';
        if (value.length > 100) return '슬러그는 100자 이하로 입력해주세요.';
        return '';
    };

    /* 저장 */
    const handleSave = async () => {
        if (isSubmitting) return;
        // validation
        const ne = validateName(name);
        const ue = validateUrl(url, isParent);
        const sle = validateSlug(slug);
        const se = validateSortOrder(sortOrder);
        setNameError(ne);
        setUrlError(ue);
        setSlugError(sle);
        setSortOrderError(se);
        if (ne || ue || sle || se) {
            // 첫 에러 필드 포커싱
            if (ne) nameRef.current?.focus();
            else if (ue) urlRef.current?.focus();
            return;
        }
        if (!isDirty) { toast.info('변경사항이 없습니다.'); return; }

        setIsSubmitting(true);
        try {
            await updateMenu(selectedMenu.id, {
                name: name.trim(),
                description: description.trim() || undefined,
                url: (url || '').endsWith('/') && (url || '').length > 1 ? (url || '').replace(/\/+$/, '') : (url || ''),
                slug: slug.trim() || undefined,
                icon,
                sortOrder: Number(sortOrder),
                visible,
            });
            toast.success('메뉴가 저장되었습니다.');
            setIsDirty(false);
            // React Query 캐시 무효화 → 메뉴 트리 자동 갱신
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
            // React Query 캐시 무효화 → 메뉴 트리 자동 갱신
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
                        {selectedMenu.isCategory ? '카테고리' : isParent ? '대메뉴' : '하위메뉴'}
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

            {/* 편집 폼 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* 메뉴 타입 전환 (폴더 ↔ 프로그램) */}
                {!selectedMenu.isCategory && (
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">메뉴 타입</label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (url && url.trim()) {
                                        /* 프로그램 → 폴더: URL 제거 */
                                        if (confirm('프로그램에서 폴더로 변경하면 URL이 제거됩니다. 계속하시겠습니까?')) {
                                            setUrl('');
                                            setUrlError('');
                                        }
                                    }
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-all ${
                                    !url || !url.trim()
                                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                                        : 'border-slate-200 bg-white text-slate-400 hover:border-amber-200'
                                }`}
                            >
                                <Folder className="w-4 h-4" />폴더
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedMenu.children && selectedMenu.children.length > 0) {
                                        toast.error('하위 메뉴가 있는 폴더는 프로그램으로 변경할 수 없습니다. 하위 메뉴를 먼저 삭제해주세요.');
                                        return;
                                    }
                                    if (!url || !url.trim()) {
                                        setUrl('/');
                                        urlRef.current?.focus();
                                    }
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-all ${
                                    url && url.trim()
                                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                                        : selectedMenu.children && selectedMenu.children.length > 0
                                            ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                            : 'border-slate-200 bg-white text-slate-400 hover:border-blue-200'
                                }`}
                            >
                                <FileText className="w-4 h-4" />프로그램
                            </button>
                        </div>
                        {selectedMenu.children && selectedMenu.children.length > 0 && (!url || !url.trim()) && (
                            <p className="text-[11px] text-amber-500 mt-1">하위 메뉴가 있어 프로그램으로 변경할 수 없습니다</p>
                        )}
                    </div>
                )}

                {/* 기본 정보 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">메뉴명 <span className="text-red-500">*</span></label>
                        <input
                            ref={nameRef}
                            type="text"
                            value={name}
                            onChange={e => handleNameChange(e.target.value)}
                            onBlur={handleNameBlur}
                            className={inputCls(nameError)}
                            placeholder="메뉴명을 입력하세요"
                            maxLength={50}
                        />
                        {nameError && <p className="text-[11px] text-red-500 mt-1">{nameError}</p>}
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-slate-600">URL</label>
                            {!selectedMenu.isCategory && (
                                <TemplateUrlPicker onSelect={(v, n) => { handleUrlChange(v); setLinkedTemplateName(n); }} />
                            )}
                        </div>
                        <input
                            ref={urlRef}
                            type="text"
                            value={url}
                            onChange={e => handleUrlChange(e.target.value)}
                            onBlur={handleUrlBlur}
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

                {/* SLUG — page-data API 식별자 */}
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                        SLUG
                        <span className="ml-1.5 text-[10px] text-slate-400 font-normal">페이지 진입 시 데이터 저장/조회에 사용되는 식별자</span>
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={slug}
                            disabled={slugLocked}
                            onChange={e => { setSlug(e.target.value); if (slugError) setSlugError(validateSlug(e.target.value)); }}
                            onBlur={() => setSlugError(validateSlug(slug))}
                            className={`flex-1 ${slugLocked ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200 rounded-md px-3 py-2 text-sm font-mono' : `${inputCls(slugError)} font-mono`}`}
                            placeholder="예) user-list  (영문, 숫자, -, _ 만 입력)"
                            maxLength={100}
                        />
                        {slugLocked && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm('⚠️ SLUG를 변경하면 이 메뉴에 저장된 데이터 조회/등록에 영향을 줄 수 있습니다.\n\n기존 SLUG로 저장된 데이터는 새 SLUG로 이관되지 않으므로 데이터가 보이지 않을 수 있습니다.\n\n그래도 수정하시겠습니까?')) {
                                        setSlugLocked(false);
                                    }
                                }}
                                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-amber-600 border border-amber-300 rounded-md hover:bg-amber-50 transition-all whitespace-nowrap"
                            >
                                <Pencil className="w-3 h-3" />수정
                            </button>
                        )}
                    </div>
                    {slugLocked && (
                        <p className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            SLUG가 설정되어 있습니다. 수정 버튼을 눌러야 변경할 수 있습니다.
                        </p>
                    )}
                    {slugError && <p className="text-[11px] text-red-500 mt-1">{slugError}</p>}
                </div>

                {/* 메뉴 설명 — 페이지 상단에 표시 */}
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                        메뉴 설명
                        <span className="ml-1.5 text-[10px] text-slate-400 font-normal">페이지 타이틀 아래에 표시됩니다 (선택)</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={2}
                        maxLength={500}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 resize-none transition-all"
                        placeholder="페이지에 대한 간략한 설명을 입력하세요"
                    />
                    <p className="text-right text-[10px] text-slate-300 mt-0.5">{description.length}/500</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">아이콘</label>
                        <IconPicker value={icon} onChange={setIcon} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">정렬 순서</label>
                        <input
                            ref={sortRef}
                            type="number"
                            value={sortOrder}
                            onChange={e => handleSortChange(e.target.value)}
                            onBlur={handleSortBlur}
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
                            onClick={() => setVisible(!visible)}
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

                <div className="border-t border-slate-100" />

                <MenuRoleMatrix />
            </div>
        </div>
    );
}
