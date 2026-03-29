'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Save, FolderOpen, Zap, Loader2, Pencil } from 'lucide-react';
import { TemplateItem } from '../types';
import { btnSecondary } from '../styles';

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
    /* 사용자가 slug 입력란을 직접 수정했는지 추적 — true면 이름 입력 시 자동 갱신 중단 */
    const slugManuallyEdited = useRef(false);
    /* 수정 모드에서 slug 편집 활성화 여부 */
    const [slugEditEnabled, setSlugEditEnabled] = useState(false);
    /* 모달이 열릴 때마다 편집 상태 초기화 */
    useEffect(() => {
        if (show) {
            slugManuallyEdited.current = false;
            setSlugEditEnabled(false);
        }
    }, [show]);

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
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                            템플릿 이름 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => {
                                onNameChange(e.target.value);
                                /* toSlug 제공 시, 사용자가 slug를 직접 수정하지 않은 경우에만 자동 갱신 */
                                if (toSlug && !slugManuallyEdited.current) onSlugChange(toSlug(e.target.value));
                            }}
                            placeholder="예: 회원 등록 팝업"
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                            Slug <span className="text-red-500">*</span>
                        </label>
                        {/* 수정 모드: 기본 읽기 전용, 편집 버튼 클릭 시 활성화 */}
                        <div className="flex items-center gap-1.5">
                            <input
                                type="text"
                                value={slug}
                                readOnly={isEdit && !slugEditEnabled}
                                onChange={e => { slugManuallyEdited.current = true; onSlugChange(e.target.value); }}
                                placeholder="예: member-register-popup"
                                className={`flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm font-mono transition-all ${isEdit && !slugEditEnabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900'}`}
                            />
                            {/* 수정 모드에서만 편집 활성화 버튼 표시 */}
                            {isEdit && (
                                <button
                                    type="button"
                                    onClick={() => setSlugEditEnabled(v => !v)}
                                    title={slugEditEnabled ? 'slug 편집 잠금' : 'slug 편집 활성화'}
                                    className={`p-2 rounded-md border transition-all shrink-0 ${slugEditEnabled ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'}`}
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        {slug && (
                            <p className="text-[10px] text-slate-400 mt-1">
                                URL: /admin/templates/generated/{slug}
                            </p>
                        )}
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
    slug: string;
    isGenerating: boolean;
    onSlugChange: (v: string) => void;
    onConfirm: () => void;
    /** 생성 파일명 힌트 (예: "LayerPopup.tsx") */
    fileHint?: string;
}

/**
 * TSX 파일 생성 모달
 * @example
 * <GenerateModal show={showGenerateModal} onClose={() => setShowGenerateModal(false)}
 *   slug={generateSlug} isGenerating={isGenerating}
 *   onSlugChange={setGenerateSlug} onConfirm={handleGenerateConfirm}
 *   fileHint="LayerPopup.tsx" />
 */
export const GenerateModal = ({
    show, onClose, slug, isGenerating, onSlugChange, onConfirm, fileHint,
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
                    <p className="text-sm text-slate-600">
                        입력한 Slug로{' '}
                        {fileHint && (
                            <code className="text-xs bg-slate-100 rounded px-1 py-0.5">{fileHint}</code>
                        )}{' '}
                        파일을 생성합니다.
                    </p>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                            Slug <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={e => onSlugChange(e.target.value)}
                            placeholder="예: member-register-popup"
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                {/* 푸터 버튼 */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-xl">
                    <button onClick={onClose} className={btnSecondary}>취소</button>
                    <button
                        onClick={onConfirm}
                        disabled={isGenerating || !slug.trim()}
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
