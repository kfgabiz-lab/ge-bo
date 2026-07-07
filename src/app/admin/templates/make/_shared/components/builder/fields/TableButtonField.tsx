'use client';

/**
 * TableButtonField — 버튼 셀 설정 (라벨/색상/연결방식/대상slug/노출조건/전달파라미터)
 *
 * button 타입 컬럼에서 클릭 버튼의 라벨·색상과, 클릭 시 이동/오픈할 대상(페이지 이동·레이어팝업·윈도우팝업)을 설정한다.
 * 색상은 ActionsField와 동일하게 col-types.ts의 CUSTOM_ACTION_COLORS 팔레트를 그대로 재사용한다(신규 맵 금지).
 *
 * 사용법:
 *   <TableButtonField
 *     values={col} onChange={patch => updateColumn(col.id, patch)}
 *     layerTemplates={layerTemplates}
 *     onRequestLayerTemplates={loadLayerTemplates} />
 */

import React from 'react';
import { TemplateItem } from '../../../types';
import { ColEditProps, CUSTOM_ACTION_COLORS } from './col-types';
import { INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { SlugSelectField } from './SlugSelectField';

interface TableButtonFieldProps extends ColEditProps {
    /** 페이지/팝업 템플릿 목록 — targetSlug 선택용 (ActionsField의 layerTemplates와 동일 구조) */
    layerTemplates: TemplateItem[];
    /** 템플릿 목록 lazy 로딩 트리거 */
    onRequestLayerTemplates: () => void;
}

/** 연결 방식 옵션 */
const CONN_TYPE_OPTIONS: { value: 'page' | 'popup' | 'windowPopup'; label: string }[] = [
    { value: 'page',        label: '페이지 이동' },
    { value: 'popup',       label: '레이어 팝업' },
    { value: 'windowPopup', label: '윈도우 팝업' },
];

export function TableButtonField({ values, onChange, layerTemplates, onRequestLayerTemplates }: TableButtonFieldProps) {
    const connType = values.connType ?? 'page';
    /** 연결대상 방식 — page/windowPopup에서만 의미 있음. popup은 항상 slug 고정 */
    const targetType = values.targetType ?? 'slug';

    return (
        <div className="space-y-1.5 pt-1 border-t border-slate-100" onClick={onRequestLayerTemplates}>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">버튼 설정</span>

            {/* 버튼 라벨 | 색상 — 한 줄(1:1) */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className={LABEL_CLS}>버튼 라벨 <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        value={values.buttonLabel ?? ''}
                        onChange={e => onChange({ buttonLabel: e.target.value })}
                        placeholder="예: 상세보기"
                        className={INPUT_CLS}
                    />
                </div>

                {/* 색상 — CUSTOM_ACTION_COLORS 공통 팔레트 재사용 */}
                <div>
                    <label className={LABEL_CLS}>색상</label>
                    <select
                        value={values.buttonColor ?? 'slate'}
                        onChange={e => onChange({ buttonColor: e.target.value })}
                        className={INPUT_CLS}
                    >
                        {CUSTOM_ACTION_COLORS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 연결 방식 — 변경 시 대상slug/윈도우옵션 초기화 */}
            <div>
                <label className={LABEL_CLS}>연결 방식</label>
                <select
                    value={connType}
                    onChange={e => onChange({
                        connType: e.target.value as 'page' | 'popup' | 'windowPopup',
                        targetSlug: undefined,
                        windowPopupOption: undefined,
                        targetType: undefined,
                        externalUrl: undefined,
                    })}
                    className={INPUT_CLS}
                >
                    {CONN_TYPE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            {/* 연결대상 방식 + 대상 페이지/URL — page/windowPopup은 한 줄(연결대상|대상), popup은 대상 페이지만 단독 */}
            {connType !== 'popup' ? (
                <div className="grid grid-cols-10 gap-2">
                    <div className="col-span-3">
                        <label className={LABEL_CLS}>연결대상</label>
                        <select
                            value={targetType}
                            onChange={e => onChange({
                                targetType: e.target.value as 'slug' | 'url',
                                targetSlug: undefined,
                                externalUrl: undefined,
                            })}
                            className={INPUT_CLS}
                        >
                            <option value="slug">내부</option>
                            <option value="url">외부</option>
                        </select>
                    </div>
                    <div className="col-span-7">
                        {targetType === 'slug' ? (
                            <SlugSelectField
                                label="대상 페이지"
                                value={values.targetSlug ?? ''}
                                onChange={slug => onChange({ targetSlug: slug || undefined })}
                                slugOptions={layerTemplates}
                                emptyLabel="— 페이지 선택 —"
                            />
                        ) : (
                            <div>
                                <label className={LABEL_CLS}>외부 URL</label>
                                <input
                                    type="text"
                                    value={values.externalUrl ?? ''}
                                    onChange={e => onChange({ externalUrl: e.target.value || undefined })}
                                    placeholder="예: www.naver.com"
                                    className={INPUT_CLS}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <SlugSelectField
                    label="대상 페이지"
                    value={values.targetSlug ?? ''}
                    onChange={slug => onChange({ targetSlug: slug || undefined })}
                    slugOptions={layerTemplates}
                    emptyLabel="— 페이지 선택 —"
                />
            )}

            {/* 윈도우팝업 전용 — 새 창 너비·높이 */}
            {connType === 'windowPopup' && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={LABEL_CLS}>너비(px)</label>
                        <input
                            type="number"
                            min={100}
                            value={values.windowPopupOption?.width ?? 800}
                            onChange={e => onChange({
                                windowPopupOption: { ...values.windowPopupOption, width: Number(e.target.value) || undefined },
                            })}
                            className={INPUT_CLS}
                        />
                    </div>
                    <div>
                        <label className={LABEL_CLS}>높이(px)</label>
                        <input
                            type="number"
                            min={100}
                            value={values.windowPopupOption?.height ?? 600}
                            onChange={e => onChange({
                                windowPopupOption: { ...values.windowPopupOption, height: Number(e.target.value) || undefined },
                            })}
                            className={INPUT_CLS}
                        />
                    </div>
                </div>
            )}

            {/* 노출조건 — 비어있으면 항상 노출 */}
            <div>
                <label className={LABEL_CLS}>노출조건</label>
                <input
                    type="text"
                    value={values.conditionParam ?? ''}
                    onChange={e => onChange({ conditionParam: e.target.value || undefined })}
                    placeholder="예: status=1 (비어있으면 항상 노출)"
                    className={INPUT_CLS}
                />
            </div>

            {/* 전달파라미터 — =없으면 row 필드값, =있으면 고정값 */}
            <div>
                <label className={LABEL_CLS}>전달파라미터</label>
                <input
                    type="text"
                    value={values.passParam ?? ''}
                    onChange={e => onChange({ passParam: e.target.value || undefined })}
                    placeholder="예: id,title=abc"
                    className={INPUT_CLS}
                />
            </div>
        </div>
    );
}
