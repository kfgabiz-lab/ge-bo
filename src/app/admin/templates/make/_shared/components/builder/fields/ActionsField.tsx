'use client';

/**
 * ActionsField — 액션 버튼 컬럼 설정 (프리셋 체크박스 + 팝업 연결 + 커스텀 버튼)
 *
 * actions 타입 컬럼에서 수정/상세/삭제 프리셋 버튼 활성화,
 * 팝업 slug 연결, 커스텀 버튼 추가를 담당한다.
 *
 * 사용법:
 *   <ActionsField
 *     values={col} onChange={patch => updateColumn(col.id, patch)}
 *     layerTemplates={layerTemplates}
 *     onRequestLayerTemplates={loadLayerTemplates} />
 */

import React from 'react';
import { Plus, X } from 'lucide-react';
import { TemplateItem } from '../../../types';
import { createIdGenerator } from '../../../utils';
import { ColEditProps, CUSTOM_ACTION_COLORS } from './col-types';

/* 커스텀 액션 버튼 고유 ID 생성기 */
const caUid = createIdGenerator('tb-ca');

/** 프리셋 액션 타입 */
type PresetAction = 'edit' | 'detail' | 'delete';

/** 프리셋 액션 한국어 라벨 */
const ACTION_LABELS: Record<PresetAction, string> = {
    edit: '수정', detail: '상세', delete: '삭제',
};

interface ActionsFieldProps extends ColEditProps {
    layerTemplates: TemplateItem[];
    /** 레이어 팝업 목록 lazy 로딩 트리거 */
    onRequestLayerTemplates: () => void;
}

export function ActionsField({ values, onChange, layerTemplates, onRequestLayerTemplates }: ActionsFieldProps) {
    const presetActions = values.actions ?? [];
    const customActions = values.customActions ?? [];

    /* 프리셋 액션 토글 */
    const toggleAction = (action: PresetAction, checked: boolean) =>
        onChange({ actions: checked ? [...presetActions, action] : presetActions.filter(a => a !== action) });

    return (
        <div className="space-y-1.5 pt-1 border-t border-slate-100" onClick={onRequestLayerTemplates}>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">액션 버튼</span>

            {/* 프리셋 체크박스 + 팝업/경로 연결 (수정·상세만) */}
            {(['edit', 'detail', 'delete'] as const).map(action => (
                <div key={action} className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={presetActions.includes(action)}
                            onChange={e => toggleAction(action, e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-400 text-slate-900"
                        />
                        <span className="text-[11px] text-slate-600">{ACTION_LABELS[action]}</span>
                    </label>
                    {/* 삭제 제외, 체크된 경우에만 팝업/경로 연결 UI 표시 */}
                    {action !== 'delete' && presetActions.includes(action) && (
                        <div className="ml-5 space-y-1">
                            {/* 관리자방식 팝업: LAYER 템플릿 slug 선택 */}
                            <select
                                value={action === 'edit' ? (values.editPopupSlug ?? '') : (values.detailPopupSlug ?? '')}
                                onChange={e => onChange(action === 'edit'
                                    ? { editPopupSlug: e.target.value || undefined }
                                    : { detailPopupSlug: e.target.value || undefined }
                                )}
                                className="w-full text-[10px] border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-slate-900">
                                <option value="">팝업 없음</option>
                                {layerTemplates.map(t => <option key={t.id} value={t.slug}>{t.name}</option>)}
                            </select>
                            {/* 개발자방식 경로: 로컬 컴포넌트명 직접 입력 */}
                            <input
                                type="text"
                                value={action === 'edit' ? (values.editFileLayerSlug ?? '') : (values.detailFileLayerSlug ?? '')}
                                onChange={e => onChange(action === 'edit'
                                    ? { editFileLayerSlug: e.target.value || undefined }
                                    : { detailFileLayerSlug: e.target.value || undefined }
                                )}
                                placeholder="연결 경로 (예: LayerPopup)"
                                className="w-full text-[10px] border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-slate-900"
                            />
                        </div>
                    )}
                </div>
            ))}

            {/* 커스텀 버튼 rows: 색상 | 라벨 | 삭제 */}
            {customActions.map(ca => (
                <div key={ca.id} className="flex items-center gap-1.5 pl-0.5">
                    <select
                        value={ca.color}
                        onChange={e => onChange({ customActions: customActions.map(c => c.id === ca.id ? { ...c, color: e.target.value } : c) })}
                        className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white">
                        {CUSTOM_ACTION_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <input
                        type="text"
                        value={ca.label}
                        onChange={e => onChange({ customActions: customActions.map(c => c.id === ca.id ? { ...c, label: e.target.value } : c) })}
                        placeholder="버튼명"
                        className="flex-1 text-[11px] border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-slate-900"
                    />
                    <button
                        onClick={() => onChange({ customActions: customActions.filter(c => c.id !== ca.id) })}
                        className="text-slate-300 hover:text-red-400 transition-all">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ))}

            {/* 커스텀 버튼 추가 */}
            <button
                onClick={() => onChange({ customActions: [...customActions, { id: caUid(), label: '', color: 'slate' }] })}
                className="w-full flex items-center justify-center gap-1 py-0.5 border border-dashed border-slate-200 rounded text-[10px] text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all">
                <Plus className="w-3 h-3" />버튼 추가
            </button>
        </div>
    );
}
