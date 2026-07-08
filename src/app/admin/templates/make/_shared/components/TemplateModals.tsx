'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Save, FolderOpen, Zap, Loader2, Pencil, ChevronDown, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TemplateItem, ValidationRule } from '../types';
import { btnSecondary, inputCls, selectCls } from '../styles';
import api from '@/lib/api';

/* ══════════════════════════════════════════ */
/*  저장 모달                                  */
/* ══════════════════════════════════════════ */

interface SaveModalProps {
    show: boolean;
    onClose: () => void;
    /** 수정 모드 여부 (true = 수정, false = 신규 저장) */
    isEdit: boolean;
    name: string;
    slug: string;
    desc: string;
    isSaving: boolean;
    onNameChange: (v: string) => void;
    onSlugChange: (v: string) => void;
    onDescChange: (v: string) => void;
    onConfirm: () => void;
    /** 이름 입력 시 자동 slug 생성 함수 (선택) */
    toSlug?: (name: string) => string;
    /** 저장 버튼 disabled 여부 (기본: name 또는 slug 미입력 시) */
    disabledExtra?: boolean;
}

/**
 * 템플릿 저장 모달
 * @example
 * <SaveModal show={showSaveModal} onClose={() => setShowSaveModal(false)}
 *   isEdit={!!currentTemplateId} name={saveModalName} slug={saveModalSlug} desc={saveModalDesc}
 *   isSaving={isSaving} onNameChange={setSaveModalName} onSlugChange={setSaveModalSlug}
 *   onDescChange={setSaveModalDesc} onConfirm={handleSaveConfirm}
 *   toSlug={toSlug} />
 */
export const SaveModal = ({
    show, onClose, isEdit, name, slug, desc, isSaving,
    onNameChange, onSlugChange, onDescChange, onConfirm, toSlug, disabledExtra,
}: SaveModalProps) => {
    /* 수정 모드에서 slug 편집 활성화 여부 */
    const [slugEditEnabled, setSlugEditEnabled] = useState(false);
    /* 신규 모드에서 slug를 수동으로 입력했는지 여부 (자동 갱신 방지용) */
    const slugManuallyEdited = useRef(false);

    /* 자동완성 — slug-registry PAGE_TEMPLATE 목록 */
    const [slugOptions, setSlugOptions] = useState<{ id: number; slug: string; name: string }[]>([]);
    const [slugSearch, setSlugSearch] = useState('');
    const [showSlugDrop, setShowSlugDrop] = useState(false);

    /* 모달이 열릴 때마다 초기화 + slug-registry 목록 로드 */
    useEffect(() => {
        if (!show) return;
        setSlugEditEnabled(false);
        setSlugSearch('');
        setShowSlugDrop(false);
        slugManuallyEdited.current = false;
        api.get('/slug-registry', { params: { type: 'PAGE_TEMPLATE', size: '200', sort: 'slug,asc' } })
            .then(res => setSlugOptions(res.data?.content || []))
            .catch(() => { });
    }, [show]);

    /* 검색어로 필터링 */
    const filteredSlugOptions = slugOptions.filter(o =>
        o.slug.toLowerCase().includes(slugSearch.toLowerCase()) ||
        o.name.toLowerCase().includes(slugSearch.toLowerCase())
    );

    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Save className="w-4 h-4 text-slate-500" />템플릿 저장
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-all">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* 입력 필드 */}
                <div className="px-6 py-5 space-y-4">
                    {/* Slug — 먼저 선택, 선택 시 템플릿 이름 자동 입력 */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                            Slug <span className="text-red-500">*</span>
                        </label>
                        {isEdit ? (
                            /* 수정 모드: 기본 읽기 전용, 편집 버튼 클릭 시 자동완성 드롭다운 활성화 */
                            <div className="flex items-center gap-1.5">
                                {slugEditEnabled ? (
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={showSlugDrop ? slugSearch : slug}
                                            onChange={e => {
                                                setSlugSearch(e.target.value);
                                                setShowSlugDrop(true);
                                                onSlugChange('');
                                            }}
                                            onFocus={() => { setSlugSearch(''); setShowSlugDrop(true); }}
                                            placeholder="slug 검색 후 선택..."
                                            className="w-full border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                                        />
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                        {showSlugDrop && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setShowSlugDrop(false)} />
                                                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-44 overflow-y-auto">
                                                    {filteredSlugOptions.length === 0 ? (
                                                        <div className="py-3 text-center text-xs text-slate-400">
                                                            {slugOptions.length === 0 ? '목록 로딩 중...' : '검색 결과 없음'}
                                                        </div>
                                                    ) : filteredSlugOptions.map(o => (
                                                        <button
                                                            key={o.id}
                                                            type="button"
                                                            onClick={() => {
                                                                onSlugChange(o.slug);
                                                                /* slug 선택 시 별칭을 템플릿 이름에 자동 입력 */
                                                                onNameChange(o.name);
                                                                setSlugSearch('');
                                                                setShowSlugDrop(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                                        >
                                                            <p className="text-xs font-mono font-medium text-slate-800">{o.slug}</p>
                                                            <p className="text-[10px] text-slate-400 mt-0.5">{o.name}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={slug}
                                        readOnly
                                        className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm font-mono bg-slate-50 text-slate-400 cursor-not-allowed transition-all"
                                    />
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSlugEditEnabled(v => !v);
                                        setShowSlugDrop(false);
                                    }}
                                    title={slugEditEnabled ? 'slug 편집 잠금' : 'slug 편집 활성화'}
                                    className={`p-2 rounded-md border transition-all shrink-0 ${slugEditEnabled ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'}`}
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            /* 신규 저장: slug 선택 시 별칭을 템플릿 이름에 자동 입력 */
                            <div className="relative">
                                <input
                                    type="text"
                                    value={showSlugDrop ? slugSearch : slug}
                                    onChange={e => {
                                        setSlugSearch(e.target.value);
                                        setShowSlugDrop(true);
                                        onSlugChange('');
                                    }}
                                    onFocus={() => { setSlugSearch(''); setShowSlugDrop(true); }}
                                    placeholder="slug 검색 후 선택..."
                                    autoFocus
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                                />
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                {showSlugDrop && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowSlugDrop(false)} />
                                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-44 overflow-y-auto">
                                            {filteredSlugOptions.length === 0 ? (
                                                <div className="py-3 text-center text-xs text-slate-400">
                                                    {slugOptions.length === 0 ? '목록 로딩 중...' : '검색 결과 없음'}
                                                </div>
                                            ) : filteredSlugOptions.map(o => (
                                                <button
                                                    key={o.id}
                                                    type="button"
                                                    onClick={() => {
                                                        onSlugChange(o.slug);
                                                        /* slug 선택 시 별칭을 템플릿 이름에 자동 입력 */
                                                        onNameChange(o.name);
                                                        setSlugSearch('');
                                                        setShowSlugDrop(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                                >
                                                    <p className="text-xs font-mono font-medium text-slate-800">{o.slug}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{o.name}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 템플릿 이름 — slug 선택 후 별칭이 자동 입력됨, 수정 가능 */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                            템플릿 이름 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => onNameChange(e.target.value)}
                            placeholder="예: 회원 등록 팝업"
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                            설명 <span className="text-slate-400 font-normal">(선택)</span>
                        </label>
                        <input
                            type="text"
                            value={desc}
                            onChange={e => onDescChange(e.target.value)}
                            placeholder="템플릿 설명을 입력하세요"
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                        />
                    </div>
                </div>

                {/* 푸터 버튼 */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-xl">
                    <button onClick={onClose} className={btnSecondary}>취소</button>
                    <button
                        onClick={onConfirm}
                        disabled={isSaving || !name.trim() || !slug.trim() || disabledExtra}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold rounded-md shadow-sm transition-all"
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {isSaving ? '저장 중...' : isEdit ? '수정' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════ */
/*  불러오기 모달                              */
/* ══════════════════════════════════════════ */

interface LoadModalProps {
    show: boolean;
    onClose: () => void;
    currentTemplateId: number | null;
    templateList: TemplateItem[];
    isLoadingList: boolean;
    onSelect: (tpl: TemplateItem) => void;
}

/**
 * 템플릿 불러오기 모달
 * @example
 * <LoadModal show={showLoadModal} onClose={() => setShowLoadModal(false)}
 *   currentTemplateId={currentTemplateId} templateList={templateList}
 *   isLoadingList={isLoadingList} onSelect={handleLoadSelect} />
 */
export const LoadModal = ({
    show, onClose, currentTemplateId, templateList, isLoadingList, onSelect,
}: LoadModalProps) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-slate-500" />템플릿 불러오기
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-all">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* 목록 */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {isLoadingList ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            <span className="ml-2 text-sm text-slate-500">목록 불러오는 중...</span>
                        </div>
                    ) : templateList.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <p className="text-sm">저장된 템플릿이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {templateList.map(tpl => (
                                <button
                                    key={tpl.id}
                                    onClick={() => onSelect(tpl)}
                                    className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:border-slate-900 hover:bg-slate-50 transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                                            {tpl.name}
                                        </span>
                                        {currentTemplateId === tpl.id && (
                                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                현재
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{tpl.slug}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-xl">
                    <button onClick={onClose} className={btnSecondary}>닫기</button>
                </div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════ */
/*  생성 모달                                  */
/* ══════════════════════════════════════════ */

interface GenerateModalProps {
    show: boolean;
    onClose: () => void;
    /** 이력 식별 이름 */
    name: string;
    /** 폴더명 (generated/ 하위 경로) */
    slug: string;
    /** 파일명 (확장자 제외, 예: page, ListPage) */
    fileName: string;
    isGenerating: boolean;
    onNameChange: (v: string) => void;
    onSlugChange: (v: string) => void;
    onFileNameChange: (v: string) => void;
    onConfirm: () => void;
}

/**
 * TSX 파일 생성 모달 — 폴더명 + 파일명 분리 입력
 * @example
 * <GenerateModal show={showGenerateModal} onClose={() => setShowGenerateModal(false)}
 *   slug={generateSlug} fileName={generateFileName} isGenerating={isGenerating}
 *   onSlugChange={setGenerateSlug} onFileNameChange={setGenerateFileName}
 *   onConfirm={handleGenerateConfirm} />
 */
export const GenerateModal = ({
    show, onClose, name, slug, fileName, isGenerating, onNameChange, onSlugChange, onFileNameChange, onConfirm,
}: GenerateModalProps) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-slate-500" />TSX 파일 생성
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-all">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* 내용 */}
                <div className="px-6 py-5 space-y-4">
                    {/* 이름 입력 */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                            이름 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => onNameChange(e.target.value)}
                            placeholder="예: 게시판 목록"
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            autoFocus
                        />
                    </div>
                    {/* 폴더명 + 파일명 한 줄 입력 */}
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                폴더명 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={slug}
                                onChange={e => onSlugChange(e.target.value)}
                                placeholder="예: board"
                                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            />
                        </div>
                        <span className="text-slate-400 pb-2 text-sm">/</span>
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                                파일명 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center border border-slate-200 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-900 transition-all">
                                <input
                                    type="text"
                                    value={fileName}
                                    onChange={e => onFileNameChange(e.target.value)}
                                    placeholder="예: page"
                                    className="flex-1 px-3 py-2 text-sm font-mono focus:outline-none bg-white"
                                />
                                <span className="px-2 py-2 text-xs text-slate-400 bg-slate-50 border-l border-slate-200 select-none">.tsx</span>
                            </div>
                        </div>
                    </div>
                    {/* 생성 경로 미리보기 */}
                    {(slug || fileName) && (
                        <p className="text-[10px] text-slate-400">
                            생성 경로: generated/
                            <span className="text-slate-600 font-medium">{slug || '폴더명'}</span>
                            /
                            <span className="text-slate-600 font-medium">{fileName || 'page'}</span>
                            .tsx
                        </p>
                    )}
                </div>

                {/* 푸터 버튼 */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-xl">
                    <button onClick={onClose} className={btnSecondary}>취소</button>
                    <button
                        onClick={onConfirm}
                        disabled={isGenerating || !name.trim() || !slug.trim() || !fileName.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold rounded-md shadow-sm transition-all"
                    >
                        {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        {isGenerating ? '생성 중...' : '생성'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════ */
/*  검증 규칙 생성 모달                        */
/* ══════════════════════════════════════════ */

interface RuleCreateModalProps {
    show: boolean;
    onClose: () => void;
    /** 연결 Slug 드롭다운 옵션 */
    slugOptions: { id: number; slug: string; name: string }[];
}

/**
 * 검증 규칙 생성 모달 — BE ValidationRule API 직접 연동(자기완결형)
 * - 연결 Slug 1개를 선택하면 해당 slug의 검증 규칙(unique/maxCount) 목록을 서버에서 조회
 * - "규칙추가"로 저장 안 된 새 행을 만들고, 행별 저장 버튼으로 개별 등록/수정
 * - 삭제 버튼은 저장된 규칙이면 즉시 API 호출, 저장 전 임시 행이면 로컬에서만 제거
 * @example
 * <RuleCreateModal show={showRuleModal} onClose={() => setShowRuleModal(false)} slugOptions={slugOptions} />
 */
export const RuleCreateModal = ({ show, onClose, slugOptions }: RuleCreateModalProps) => {
    /* 선택된 연결 Slug — slug_registry PK */
    const [slugRegistryId, setSlugRegistryId] = useState<number | null>(null);
    /* 조회된 규칙 목록 — id=0인 행은 아직 저장 안 된 새 행 */
    const [rules, setRules] = useState<ValidationRule[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    /* 저장 진행 중인 행의 배열 index (동시에 하나만 저장 가능) */
    const [savingIndex, setSavingIndex] = useState<number | null>(null);

    /* 모달이 열릴 때마다 선택값 초기화 */
    useEffect(() => {
        if (!show) return;
        setSlugRegistryId(null);
        setRules([]);
    }, [show]);

    /* 연결 Slug 변경 시 해당 slug의 검증 규칙 목록 재조회 */
    useEffect(() => {
        if (!slugRegistryId) { setRules([]); return; }
        setIsLoading(true);
        api.get('/validation-rules', { params: { slugRegistryId } })
            .then(res => setRules(res.data ?? []))
            .catch(() => setRules([]))
            .finally(() => setIsLoading(false));
    }, [slugRegistryId]);

    if (!show) return null;

    /* "규칙추가" — 저장 안 된 새 행을 로컬 목록 끝에 추가 (id=0으로 신규 표시) */
    const addRule = () => {
        if (!slugRegistryId) return;
        setRules(prev => [...prev, { id: 0, slugRegistryId, type: 'unique', fields: '', condition: '' }]);
    };

    /* 특정 행 값 변경 (로컬 상태만 — 저장 버튼을 눌러야 서버에 반영) */
    const updateRule = (idx: number, patch: Partial<ValidationRule>) => {
        setRules(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
    };

    /* 특정 행 저장 — id=0(신규)이면 POST, 있으면 PUT */
    const saveRule = async (idx: number) => {
        if (!slugRegistryId) return;
        const rule = rules[idx];

        /* 필수값 검증 — 타입별 필수 입력 누락 시 저장 중단 */
        if (rule.type === 'unique' && !rule.fields?.trim()) {
            toast.error('중복방지 규칙은 필드 조합을 입력해주세요.');
            return;
        }
        if (rule.type === 'maxCount' && !rule.maxCount) {
            toast.error('최대건수 규칙은 최대 건수를 입력해주세요.');
            return;
        }

        setSavingIndex(idx);
        try {
            const body = {
                slugRegistryId,
                type: rule.type,
                fields: rule.type === 'unique' ? (rule.fields ?? '') : undefined,
                condition: rule.condition || undefined,
                maxCount: rule.type === 'maxCount' ? rule.maxCount : undefined,
            };
            if (rule.id) {
                const res = await api.put(`/validation-rules/${rule.id}`, body);
                setRules(prev => prev.map((r, i) => i === idx ? res.data : r));
                toast.success('검증 규칙이 수정되었습니다.');
            } else {
                const res = await api.post('/validation-rules', body);
                setRules(prev => prev.map((r, i) => i === idx ? res.data : r));
                toast.success('검증 규칙이 등록되었습니다.');
            }
        } catch {
            toast.error('검증 규칙 저장에 실패했습니다.');
        } finally {
            setSavingIndex(null);
        }
    };

    /* 특정 행 삭제 — 저장된 행(id 있음)은 확인 후 API 호출, 신규 행은 로컬에서만 제거 */
    const removeRule = async (idx: number) => {
        const rule = rules[idx];
        if (rule.id) {
            if (!confirm('삭제하시겠습니까?')) return;
            try {
                await api.delete(`/validation-rules/${rule.id}`);
                toast.success('삭제되었습니다.');
            } catch {
                toast.error('삭제에 실패했습니다.');
                return;
            }
        }
        setRules(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-slate-500" />검증 규칙 생성
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-all">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">

                    {/* 연결 Slug 선택 */}
                    <div className="space-y-0.5">
                        <label className="text-[11px] font-medium text-slate-500 block">연결 Slug</label>
                        <select
                            value={slugRegistryId ?? ''}
                            onChange={e => setSlugRegistryId(e.target.value ? Number(e.target.value) : null)}
                            className={selectCls}
                        >
                            <option value="">선택하세요</option>
                            {slugOptions.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>
                            ))}
                        </select>
                    </div>

                    {/* 연결 Slug 선택 후에만 규칙 목록 노출 */}
                    {slugRegistryId && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                </div>
                            ) : rules.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">등록된 검증 규칙이 없습니다.</p>
                            ) : null}

                            {rules.map((rule, idx) => (
                                <div key={rule.id || `new-${idx}`} className="border border-slate-200 rounded-md p-2 space-y-1.5 bg-slate-50/50">
                                    <div className="flex items-center gap-1.5">
                                        <select
                                            value={rule.type}
                                            onChange={e => updateRule(idx, { type: e.target.value as ValidationRule['type'] })}
                                            className={`${selectCls} !py-1.5 !text-xs`}
                                        >
                                            <option value="unique">중복 방지(unique)</option>
                                            <option value="maxCount">최대 건수 제한(maxCount)</option>
                                        </select>
                                        {/* 행 저장 */}
                                        <button
                                            onClick={() => saveRule(idx)}
                                            disabled={savingIndex === idx}
                                            title="저장"
                                            className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all flex-shrink-0 disabled:opacity-50"
                                        >
                                            {savingIndex === idx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        </button>
                                        {/* 행 삭제 */}
                                        <button
                                            onClick={() => removeRule(idx)}
                                            title="삭제"
                                            className="p-1.5 text-slate-400 hover:text-red-500 transition-all flex-shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* type='unique' 전용 — 복합키 필드 조합 (콤마 구분) + 조건식(콤마 구분 key=value, 암묵적 AND) */}
                                    {rule.type === 'unique' && (
                                        <>
                                            <input
                                                type="text"
                                                placeholder="필드 조합 (예: title 또는 form1.title — 컨텐츠 위젯 내부 필드는 contentKey.fieldKey)"
                                                value={rule.fields ?? ''}
                                                onChange={e => updateRule(idx, { fields: e.target.value })}
                                                className={`${inputCls} !py-1.5 !text-xs`}
                                            />
                                            <input
                                                type="text"
                                                placeholder="예: status='active' 또는 form1.status='active'"
                                                value={rule.condition ?? ''}
                                                onChange={e => updateRule(idx, { condition: e.target.value })}
                                                className={`${inputCls} !py-1.5 !text-xs`}
                                            />
                                        </>
                                    )}

                                    {/* type='maxCount' 전용 — 조건식(콤마 구분 key=value, 암묵적 AND) + 최대 건수 */}
                                    {rule.type === 'maxCount' && (
                                        <>
                                            <input
                                                type="text"
                                                placeholder="예: status='active' 또는 form1.status='active'"
                                                value={rule.condition ?? ''}
                                                onChange={e => updateRule(idx, { condition: e.target.value })}
                                                className={`${inputCls} !py-1.5 !text-xs`}
                                            />
                                            <input
                                                type="number"
                                                min={1}
                                                placeholder="최대 건수"
                                                value={rule.maxCount ?? ''}
                                                onChange={e => updateRule(idx, { maxCount: Number(e.target.value) || undefined })}
                                                className={`${inputCls} !py-1.5 !text-xs`}
                                            />
                                        </>
                                    )}
                                </div>
                            ))}

                            {/* 규칙 추가 버튼 */}
                            <button
                                onClick={addRule}
                                className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-slate-200 rounded text-[10px] font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
                            >
                                <Plus className="w-3 h-3" />규칙추가
                            </button>
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-xl">
                    <button onClick={onClose} className={btnSecondary}>닫기</button>
                </div>
            </div>
        </div>
    );
};
