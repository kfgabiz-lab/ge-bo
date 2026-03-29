'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Save, Trash2, Settings2, FolderOpen, Folder, FileText, Plus, X, Wand2, ChevronDown, Loader2 } from 'lucide-react';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';
import { MenuRoleMatrix } from './MenuRoleMatrix';
import { toast } from 'sonner';
import { NAME_REGEX, URL_REGEX, XSS_CHARS, ERROR_MESSAGES } from './constants';
import { IconPicker } from './IconPicker';
import api from '@/lib/api';

/* ── 페이지 템플릿 연동 버튼 ── */
function TemplateUrlPicker({ onSelect }: { onSelect: (url: string) => void }) {
    const [open, setOpen] = useState(false);
    const [list, setList] = useState<{ id: number; name: string; slug: string; pageUrl: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    /* 드롭다운 열기 시 목록 조회 */
    const handleOpen = async () => {
        setOpen(v => !v);
        if (list.length > 0) return;
        setLoading(true);
        try {
            const res = await api.get('/page-templates');
            /* 메뉴 URL 연동은 LIST 타입만 표시 (LAYER 팝업은 제외) */
            setList(res.data.filter((t: { templateType?: string }) => t.templateType === 'LIST'));
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
                            {list.map(tpl => (
                                <li key={tpl.id}>
                                    <button
                                        type="button"
                                        onClick={() => { onSelect(tpl.pageUrl); setOpen(false); }}
                                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors"
                                    >
                                        <p className="text-xs font-medium text-slate-700">{tpl.name}</p>
                                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{tpl.pageUrl}</p>
                                    </button>
                                </li>
                            ))}
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
    const [menuKind, setMenuKind] = useState<'folder' | 'program'>(parentDepth >= 2 ? 'program' : 'folder');
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('Folder');
    const [sortOrder, setSortOrder] = useState(1);
    const [nameError, setNameError] = useState('');
    const [urlError, setUrlError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    /* 자동 포커싱 */
    useEffect(() => { setTimeout(() => nameRef.current?.focus(), 100); }, []);

    /* 폴더/프로그램 전환 시 아이콘 자동 변경 */
    useEffect(() => { setIcon(menuKind === 'folder' ? 'Folder' : 'FileText'); }, [menuKind]);

    const canSelectFolder = parentDepth < 2;
    const depthLabel = parentId === null ? '1depth' : parentDepth === 1 ? '2depth' : '3depth';

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

        if (!valid) { if (nameError || !trimmed) nameRef.current?.focus(); return; }

        setIsSubmitting(true);
        try {
            await addMenu({
                name: trimmed,
                url: menuKind === 'program' ? url.trim() : '',
                icon,
                parentId,
                menuType,
                sortOrder,
                visible: true,
                isCategory: false,
            });
            toast.success(`'${trimmed}' 메뉴가 추가되었습니다.`);
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
                            <TemplateUrlPicker onSelect={v => { setUrl(v); setUrlError(''); }} />
                        </div>
                        <input
                            type="text"
                            value={url}
                            onChange={e => { setUrl(e.target.value); if (urlError) setUrlError(''); }}
                            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                            className={`w-full border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 transition-all ${urlError ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-slate-900/10 focus:border-slate-900'}`}
                            placeholder="/admin/..."
                        />
                        {urlError && <p className="text-[11px] text-red-500 mt-1">{urlError}</p>}
                    </div>
                )}

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
    const { selectedMenu, updateMenu, deleteMenu, setIsDirty: setStoreDirty, isCreating, createParentId, createMaxDepth, cancelCreate, addMenu, activeTab, fetchMenus } = useMenuStore();

    /* 로컬 편집 상태 */
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('');
    const [sortOrder, setSortOrder] = useState<number | string>(1);
    const [visible, setVisible] = useState(true);

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
            setUrl(selectedMenu.url || '');
            setIcon(selectedMenu.icon);
            setSortOrder(selectedMenu.sortOrder);
            setVisible(selectedMenu.visible);
            setNameError('');
            setUrlError('');
            setSortOrderError('');
            setIsDirty(false);
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
                url !== selectedMenu.url ||
                icon !== selectedMenu.icon ||
                Number(sortOrder) !== selectedMenu.sortOrder ||
                visible !== selectedMenu.visible;
            setIsDirty(dirty);
            setStoreDirty(dirty);
        }
    }, [name, url, icon, sortOrder, visible, selectedMenu, setStoreDirty]);

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

    /* 저장 */
    const handleSave = async () => {
        if (isSubmitting) return;
        // validation
        const ne = validateName(name);
        const ue = validateUrl(url, isParent);
        const se = validateSortOrder(sortOrder);
        setNameError(ne);
        setUrlError(ue);
        setSortOrderError(se);
        if (ne || ue || se) {
            // 첫 에러 필드 포커싱
            if (ne) nameRef.current?.focus();
            else if (ue) urlRef.current?.focus();
            else if (se) sortRef.current?.focus();
            return;
        }
        if (!isDirty) { toast.info('변경사항이 없습니다.'); return; }

        setIsSubmitting(true);
        try {
            await updateMenu(selectedMenu.id, {
                name: name.trim(),
                url: (url || '').endsWith('/') && (url || '').length > 1 ? (url || '').replace(/\/+$/, '') : (url || ''),
                icon,
                sortOrder: Number(sortOrder),
                visible,
            });
            toast.success('메뉴가 저장되었습니다.');
            setIsDirty(false);
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
                                <TemplateUrlPicker onSelect={v => { handleUrlChange(v); }} />
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
                        {urlError && <p className="text-[11px] text-red-500 mt-1">{urlError}</p>}
                    </div>
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
