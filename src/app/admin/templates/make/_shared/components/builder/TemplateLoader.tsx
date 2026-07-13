'use client';

import { useRef } from 'react';
import { ChevronDown, Loader2, FolderOpen, Copy, Trash2 } from 'lucide-react';
import { TemplateItem } from '../../types';
import { PortalDropdown } from '@/components/ui/portal-dropdown';

interface TemplateLoaderProps {
    isLoadingList: boolean;
    showLoadDropdown: boolean;
    loadSearch: string;
    filteredTemplates: TemplateItem[];
    isDeletingId: number | null;
    isDuplicatingId: number | null;
    currentTemplateId: number | null;
    onToggle: () => void;
    onSearchChange: (v: string) => void;
    onSelect: (tpl: TemplateItem) => void;
    onDelete: (id: number) => void;
    onDuplicate: (tpl: TemplateItem) => void;
}

/**
 * 빌더 페이지 공통 템플릿 불러오기 드롭다운 컴포넌트
 * - 좌측 패널 상단에 고정 배치
 * - useTemplateManagement 훅과 함께 사용
 *
 * 사용 예시:
 *   const tm = useTemplateManagement('QUICK_LIST');
 *   <TemplateLoader
 *       {...tm}
 *       onToggle={() => { tm.setShowLoadDropdown(v => !v); if (!tm.showLoadDropdown) tm.loadTemplateList(); }}
 *       onSearchChange={tm.setLoadSearch}
 *       onSelect={handleLoadSelect}
 *       onDelete={tm.handleDeleteTemplate}
 *       onDuplicate={tm.handleDuplicateTemplate}
 *   />
 */
export function TemplateLoader({
    isLoadingList,
    showLoadDropdown,
    loadSearch,
    filteredTemplates,
    isDeletingId,
    isDuplicatingId,
    currentTemplateId,
    onToggle,
    onSearchChange,
    onSelect,
    onDelete,
    onDuplicate,
}: TemplateLoaderProps) {
    /* 드롭다운 위치 기준(anchor) — 토글 버튼 */
    const buttonRef = useRef<HTMLButtonElement>(null);

    return (
        <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 bg-slate-50/30">
            <div className="relative">
                <button
                    ref={buttonRef}
                    onClick={onToggle}
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

                {/* 드롭다운 패널 — Portal(body)로 렌더링하여 부모 overflow에 잘리지 않음.
                    ⚠️ 외부클릭 닫기 로직은 기존에도 없었으므로 onOutsideClick 미지정(기존 동작 보존) */}
                <PortalDropdown
                    open={showLoadDropdown}
                    anchorRef={buttonRef}
                    className="bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
                >
                    <div className="p-2 border-b border-slate-100">
                        <input
                            type="text"
                            value={loadSearch}
                            onChange={e => onSearchChange(e.target.value)}
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
                                <button onClick={() => onSelect(tpl)} className="flex-1 min-w-0 text-left">
                                    <p className="text-[11px] font-medium text-slate-800 truncate">{tpl.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono truncate">{tpl.slug}</p>
                                </button>
                                {currentTemplateId === tpl.id && (
                                    <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1 py-0.5 rounded shrink-0 mr-1">현재</span>
                                )}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                    <button
                                        onClick={e => { e.stopPropagation(); onDuplicate(tpl); }}
                                        disabled={isDuplicatingId === tpl.id}
                                        className="p-1 rounded text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all disabled:opacity-50"
                                        title="복사"
                                    >
                                        {isDuplicatingId === tpl.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); onDelete(tpl.id); }}
                                        disabled={isDeletingId === tpl.id}
                                        className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                                        title="삭제"
                                    >
                                        {isDeletingId === tpl.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </PortalDropdown>
            </div>
        </div>
    );
}
