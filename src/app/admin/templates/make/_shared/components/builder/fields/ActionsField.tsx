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
import { SlugSelectField } from './SlugSelectField';

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
            {/* disabledActions에 포함된 항목은 빌더에서 아예 표시하지 않음 */}
            {(['edit', 'delete', 'copy'] as const).filter(action => !disabledActions.includes(action)).map(action => {
                const isChecked = presetActions.includes(action);
                return (
                <div key={action} className="space-y-1">
                    <div className="flex items-center gap-1">
                        <label className="flex items-center gap-2 flex-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => toggleAction(action, e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-slate-400 text-slate-900"
                            />
                            <span className="text-[11px] text-slate-600">{ACTION_LABELS[action]}</span>
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
                            <div key={rule.id} className="ml-5 space-y-1.5">
                                {/* 1행: 페이지(connType) | page slug — 2열 그리드 */}
                                <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                        <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">페이지</label>
                                        <select
                                            value={rule.connType ?? 'page'}
                                            onChange={e => updateEditPageRule(rule.id, { connType: e.target.value as 'page' | 'popup' })}
                                            className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-slate-900"
                                        >
                                            <option value="page">페이지</option>
                                            <option value="popup">팝업</option>
                                        </select>
                                    </div>
                                    <div>
                                        <SlugSelectField
                                            label="page slug"
                                            value={rule.pageSlug}
                                            onChange={slug => updateEditPageRule(rule.id, { pageSlug: slug })}
                                            slugOptions={layerTemplates}
                                            emptyLabel="슬러그 없음"
                                        />
                                    </div>
                                </div>
                                {/* 2행: 이동조건 | 전달파라미터 + x 버튼 — 2열 그리드 */}
                                <div className="flex items-end gap-1.5">
                                    <div className="grid grid-cols-2 gap-1.5 flex-1">
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">이동조건</label>
                                            <input
                                                type="text"
                                                value={rule.conditionParam}
                                                onChange={e => updateEditPageRule(rule.id, { conditionParam: e.target.value })}
                                                placeholder="예: title=1"
                                                className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-slate-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">전달파라미터</label>
                                            <input
                                                type="text"
                                                value={rule.passParam}
                                                onChange={e => updateEditPageRule(rule.id, { passParam: e.target.value })}
                                                placeholder="예: id,title=abc"
                                                className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-slate-900"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); removeEditPageRule(rule.id); }}
                                        className="text-slate-300 hover:text-red-400 transition-all pb-1.5"
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
