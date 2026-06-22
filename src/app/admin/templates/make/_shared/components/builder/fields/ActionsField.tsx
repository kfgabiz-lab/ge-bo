'use client';

/**
 * ActionsField — 액션 버튼 컬럼 설정 (프리셋 체크박스 + 팝업 연결)
 *
 * actions 타입 컬럼에서 수정/삭제 프리셋 버튼 활성화 및 팝업 slug 연결을 담당한다.
 *
 * 사용법:
 *   <ActionsField
 *     values={col} onChange={patch => updateColumn(col.id, patch)}
 *     layerTemplates={layerTemplates}
 *     onRequestLayerTemplates={loadLayerTemplates} />
 */

import React, { useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { TemplateItem, EditPageRule } from '../../../types';
import { createIdGenerator, getTemplateLabel } from '../../../utils';
import { ColEditProps } from './col-types';

/* 수정 버튼 페이지 이동 규칙 고유 ID 생성기 */
const epUid = createIdGenerator('tb-ep');

/** 프리셋 액션 타입 */
type PresetAction = 'edit' | 'delete' | 'copy';

/** 프리셋 액션 한국어 라벨 */
const ACTION_LABELS: Record<PresetAction, string> = {
    edit: '수정', delete: '삭제', copy: '복사',
};

interface ActionsFieldProps extends ColEditProps {
    layerTemplates: TemplateItem[];
    /** 레이어 팝업 목록 lazy 로딩 트리거 */
    onRequestLayerTemplates: () => void;
    /** 이 액션들은 체크박스 비활성화 + 항상 체크됨 (DataTable: copy / SubList: edit, delete) */
    disabledActions?: PresetAction[];
}

export function ActionsField({ values, onChange, layerTemplates, onRequestLayerTemplates, disabledActions = [] }: ActionsFieldProps) {
    const presetActions = values.actions ?? [];
    const editPageRules = values.editPageRules ?? [];

    /* 프리셋 액션 토글 */
    const toggleAction = (action: PresetAction, checked: boolean) =>
        onChange({ actions: checked ? [...presetActions, action] : presetActions.filter(a => a !== action) });

    /* 기존 editPopupSlug → editPageRules 1회성 마이그레이션 */
    useEffect(() => {
        if (!editPageRules.length && values.editPopupSlug) {
            onChange({
                editPageRules: [{ id: epUid(), connType: 'popup', pageSlug: values.editPopupSlug, conditionParam: '', passParam: values.editParams ?? '' }],
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* disabledActions 항목이 actions 배열에 없으면 자동으로 추가 (렌더러 표시 보장) */
    useEffect(() => {
        if (!disabledActions.length) return;
        const missing = disabledActions.filter(a => !presetActions.includes(a));
        if (missing.length > 0) {
            onChange({ actions: [...presetActions, ...missing] });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* 수정 페이지 이동 규칙 추가 */
    const addEditPageRule = () =>
        onChange({ editPageRules: [...editPageRules, { id: epUid(), connType: 'page', pageSlug: '', conditionParam: '', passParam: '' }] });

    /* 수정 페이지 이동 규칙 업데이트 */
    const updateEditPageRule = (id: string, patch: Partial<EditPageRule>) =>
        onChange({ editPageRules: editPageRules.map(r => r.id === id ? { ...r, ...patch } : r) });

    /* 수정 페이지 이동 규칙 삭제 */
    const removeEditPageRule = (id: string) =>
        onChange({ editPageRules: editPageRules.filter(r => r.id !== id) });

    return (
        <div className="space-y-1.5 pt-1 border-t border-slate-100" onClick={onRequestLayerTemplates}>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">액션 버튼</span>

            {/* 프리셋 체크박스 — edit / delete / copy */}
            {(['edit', 'delete', 'copy'] as const).map(action => {
                /* disabledActions에 포함된 액션: 항상 체크됨 + 체크박스 비활성 */
                const isForced = disabledActions.includes(action);
                const isChecked = isForced ? true : presetActions.includes(action);
                return (
                <div key={action} className="space-y-1">
                    <div className="flex items-center gap-1">
                        <label className={`flex items-center gap-2 flex-1 ${isForced ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                            <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isForced}
                                onChange={e => !isForced && toggleAction(action, e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-slate-400 text-slate-900 disabled:cursor-not-allowed"
                            />
                            <span className="text-[11px] text-slate-600">{ACTION_LABELS[action]}</span>
                            {isForced && <span className="text-[10px] text-slate-400">(비활성)</span>}
                        </label>
                        {/* 수정 체크 시 페이지 이동 규칙 추가 버튼 */}
                        {action === 'edit' && presetActions.includes('edit') && (
                            <button
                                onClick={e => { e.stopPropagation(); addEditPageRule(); }}
                                className="text-slate-400 hover:text-slate-600 transition-all"
                                title="페이지 이동 규칙 추가"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    {/* 수정 체크 시 페이지 이동 규칙 목록 */}
                    {action === 'edit' && presetActions.includes('edit') && editPageRules.map(rule => (
                            <div key={rule.id} className="ml-5 space-y-1">
                                {/* 1행: connType select + 페이지 슬러그 select + 이동 파라미터 input */}
                                <div className="flex items-center gap-1">
                                    <select
                                        value={rule.connType ?? 'page'}
                                        onChange={e => updateEditPageRule(rule.id, { connType: e.target.value as 'page' | 'popup' })}
                                        className="w-14 shrink-0 text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-slate-900">
                                        <option value="page">페이지</option>
                                        <option value="popup">팝업</option>
                                    </select>
                                    <select
                                        value={rule.pageSlug}
                                        onChange={e => updateEditPageRule(rule.id, { pageSlug: e.target.value })}
                                        className="flex-1 min-w-0 text-[10px] border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-slate-900">
                                        <option value="">슬러그 없음</option>
                                        {layerTemplates.map(t => <option key={t.id} value={t.slug}>{getTemplateLabel(t)} ({t.slug})</option>)}
                                    </select>
                                    <input
                                        type="text"
                                        value={rule.conditionParam}
                                        onChange={e => updateEditPageRule(rule.id, { conditionParam: e.target.value })}
                                        placeholder="이동조건 (예: title=1)"
                                        className="w-20 shrink-0 text-[10px] border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-slate-900"
                                    />
                                </div>
                                {/* 2행: 전달 파라미터 input + x 버튼 */}
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        value={rule.passParam}
                                        onChange={e => updateEditPageRule(rule.id, { passParam: e.target.value })}
                                        placeholder="전달 파라미터 (예: id,title=abc)"
                                        className="flex-1 text-[10px] border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-slate-900"
                                    />
                                    <button
                                        onClick={e => { e.stopPropagation(); removeEditPageRule(rule.id); }}
                                        className="text-slate-300 hover:text-red-400 transition-all"
                                        title="규칙 삭제"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
            ); })}

        </div>
    );
}
