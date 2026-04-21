'use client';

/**
 * BadgeOptionsField — 배지 셀 옵션 설정 (모양·아이콘 토글·옵션 rows)
 *
 * badge 타입 컬럼에서 배지 모양, 아이콘 표시 여부, 옵션(텍스트/값/색상) 목록을 구성한다.
 *
 * 사용법:
 *   <BadgeOptionsField values={col} onChange={patch => updateColumn(col.id, patch)} />
 *   <BadgeOptionsField values={pendingCol} onChange={patch => setPendingCol(prev => ({ ...prev!, ...patch }))} />
 */

import React from 'react';
import { Plus, X } from 'lucide-react';
import { ColEditProps, PRESET_COLORS } from './col-types';

export function BadgeOptionsField({ values, onChange }: ColEditProps) {
    const cellOptions = values.cellOptions ?? [];
    const badgeShape  = values.badgeShape ?? 'round';
    const showIcon    = values.showIcon ?? false;

    /* 특정 인덱스 옵션 부분 수정 헬퍼 */
    const updateOption = (idx: number, patch: Partial<{ text: string; value: string; color: string }>) => {
        const next = [...cellOptions];
        next[idx] = { ...next[idx], ...patch };
        onChange({ cellOptions: next });
    };

    return (
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
            {/* 섹션 헤더: 배지 모양 + 아이콘 토글 */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">옵션</span>
                <div className="flex items-center gap-2">
                    {/* 모양 선택 (둥근/각진) */}
                    <div className="flex items-center gap-0.5">
                        <button type="button" onClick={() => onChange({ badgeShape: 'round' })}
                            className={`px-1.5 py-0.5 text-[9px] rounded transition-all ${badgeShape === 'round' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                            둥근
                        </button>
                        <button type="button" onClick={() => onChange({ badgeShape: 'square' })}
                            className={`px-1.5 py-0.5 text-[9px] rounded transition-all ${badgeShape === 'square' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                            각진
                        </button>
                    </div>
                    {/* 아이콘 표시 토글 스위치 */}
                    <label className="flex items-center gap-1 cursor-pointer">
                        <span className="text-[10px] text-slate-500">●</span>
                        <button type="button" onClick={() => onChange({ showIcon: !showIcon })}
                            className={`relative w-7 h-4 rounded-full transition-colors ${showIcon ? 'bg-slate-900' : 'bg-slate-300'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${showIcon ? 'translate-x-3' : 'translate-x-0.5'}`} />
                        </button>
                    </label>
                </div>
            </div>

            {/* 옵션 rows: 텍스트 | value | 색상 | 삭제 */}
            {cellOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-1">
                    <input type="text" value={opt.text}
                        onChange={e => updateOption(idx, { text: e.target.value })}
                        placeholder="텍스트"
                        className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                    <input type="text" value={opt.value}
                        onChange={e => updateOption(idx, { value: e.target.value })}
                        placeholder="value"
                        className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900" />
                    <select value={opt.color}
                        onChange={e => updateOption(idx, { color: e.target.value })}
                        className="w-16 border border-slate-200 rounded px-1 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900">
                        {PRESET_COLORS.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                    </select>
                    <button
                        onClick={() => onChange({ cellOptions: cellOptions.filter((_, j) => j !== idx) })}
                        disabled={cellOptions.length <= 1}
                        className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ))}

            {/* 옵션 추가 버튼 */}
            <button
                onClick={() => onChange({ cellOptions: [...cellOptions, { text: '', value: '', color: 'slate' }] })}
                className="w-full flex items-center justify-center gap-1 py-1 border border-dashed border-slate-200 rounded text-[10px] font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all">
                <Plus className="w-3 h-3" />옵션 추가
            </button>
        </div>
    );
}
