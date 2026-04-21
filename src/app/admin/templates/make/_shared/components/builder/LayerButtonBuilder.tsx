'use client';

import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { LayerButtonConfig, LayerButtonType, LayerButtonAction } from '../../types';
import { selectCls } from '../../styles';
import { SelectArrow } from '../SelectArrow';

/**
 * LayerButtonBuilder — 레이어 하단 버튼 설정 컴포넌트 (L3)
 * 
 * 레이어 팝업의 하단 버튼(닫기, 저장 등)을 추가, 삭제, 수정, 정렬하는 UI를 제공한다.
 */

/* ── 버튼 타입 배지 색상 ── */
const LAYER_BTN_TYPE_BADGE: Record<LayerButtonType, string> = {
    primary: 'bg-slate-900 text-white',
    secondary: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-600',
    success: 'bg-emerald-100 text-emerald-600',
    danger: 'bg-red-100 text-red-600',
};

interface LayerButtonBuilderProps {
    buttons: LayerButtonConfig[];
    onChange: (buttons: LayerButtonConfig[]) => void;
    onAdd: () => void;
}

export function LayerButtonBuilder({ buttons, onChange, onAdd }: LayerButtonBuilderProps) {

    const updateButton = (id: string, updates: Partial<LayerButtonConfig>) => {
        onChange(buttons.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const removeButton = (id: string) => {
        onChange(buttons.filter(b => b.id !== id));
    };

    const moveButton = (index: number, direction: 'up' | 'down') => {
        const next = [...buttons];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-slate-400">팝업 하단에 표시될 버튼을 설정합니다.</p>
                <button
                    onClick={onAdd}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-all"
                >
                    <Plus className="w-3 h-3" />추가
                </button>
            </div>

            {buttons.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                    버튼이 없습니다. 추가 버튼을 눌러 생성하세요.
                </div>
            )}

            {buttons.map((btn, idx) => (
                <div key={btn.id} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
                    {/* 헤더: 타입 배지 + 이동/삭제 */}
                    <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${LAYER_BTN_TYPE_BADGE[btn.type]}`}>
                            {btn.type}
                        </span>
                        <div className="flex items-center gap-0.5">
                            <button onClick={() => moveButton(idx, 'up')} disabled={idx === 0} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                            <button onClick={() => moveButton(idx, 'down')} disabled={idx === buttons.length - 1} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                            <button onClick={() => removeButton(btn.id)} className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"><Trash2 className="w-3 h-3" /></button>
                        </div>
                    </div>

                    {/* 레이블 */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-500 mb-0.5 block">버튼 레이블</label>
                        <input
                            value={btn.label}
                            onChange={e => updateButton(btn.id, { label: e.target.value })}
                            className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-slate-900 transition-all"
                            placeholder="버튼 이름"
                        />
                    </div>

                    {/* 스타일 */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-500 mb-0.5 block">스타일</label>
                        <div className="relative">
                            <select
                                value={btn.type}
                                onChange={e => updateButton(btn.id, { type: e.target.value as LayerButtonType })}
                                className={selectCls}
                            >
                                <option value="primary">Primary (기본 · 검정)</option>
                                <option value="secondary">Secondary (보조 · 회색)</option>
                                <option value="blue">Blue (파랑)</option>
                                <option value="success">Success (초록)</option>
                                <option value="danger">Danger (위험 · 빨강)</option>
                            </select>
                            <SelectArrow />
                        </div>
                    </div>

                    {/* 액션 */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-500 mb-0.5 block">액션</label>
                        <div className="relative">
                            <select
                                value={btn.action}
                                onChange={e => updateButton(btn.id, { action: e.target.value as LayerButtonAction })}
                                className={selectCls}
                            >
                                <option value="close">닫기 (close)</option>
                                <option value="save">저장 (save)</option>
                                <option value="custom">커스텀 (custom)</option>
                            </select>
                            <SelectArrow />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
