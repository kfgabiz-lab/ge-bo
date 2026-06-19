'use client';

/**
 * CategoryBuilder — 카테고리 위젯 설정 빌더
 *
 * 빌더에서 카테고리 컨텐츠를 추가할 때 표시되는 설정 패널.
 * - dbSlug: 연결할 카테고리 데이터 slug
 * - depth: 이 위젯이 표시할 depth 번호 (1=대분류, 2=중분류, ...)
 * - parentWidgetId: 상위 depth 위젯 ID (선택 연동용)
 * - label: depth 레이블 (예: '대분류')
 * - allowCreate/Edit/Delete: CRUD 허용 여부
 *
 * 사용법:
 *   <CategoryBuilder widget={categoryWidget} onChange={setWidget} categoryWidgets={[...]} />
 */

import React from 'react';
import { LABEL_CLS, INPUT_CLS } from './fields/_FieldBase';
import { SlugSelectField } from './fields';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../contexts/BuilderI18nModeContext';
import { ParamWithSaveField } from './ParamWithSaveField';
import type { CategoryWidget } from '../renderer/types';
import type { TemplateItem } from '../../types';

export interface CategoryBuilderProps {
    widget: CategoryWidget;
    onChange: (w: CategoryWidget) => void;
    /** slug-registry에서 불러온 PAGE_DATA 슬러그 목록 — 데이터 Slug 드롭다운용 */
    slugOptions?: { id: number; slug: string; name: string }[];
    /** 현재 페이지에 있는 다른 카테고리 위젯 목록 — parentWidgetId 선택용 */
    categoryWidgets?: { widgetId: string; label?: string; depth: number }[];
    /** Quick-Detail 템플릿 목록 — 등록/수정 페이지 연결용 */
    pageTemplates?: TemplateItem[];
}

export function CategoryBuilder({ widget, onChange, slugOptions = [], categoryWidgets = [], pageTemplates = [] }: CategoryBuilderProps) {
    const { i18nMode } = useBuilderI18nMode();
    /** 상위로 연결 가능한 위젯 목록 — 자기 자신 제외, depth가 더 낮은 것만 */
    const parentCandidates = categoryWidgets.filter(
        w => w.widgetId !== widget.widgetId && w.depth < widget.depth
    );

    return (
        <div className="space-y-4 p-1">

            {/* Key | 연결 Slug (depth 1) 또는 상위 카테고리 (depth 2+) — 한 줄 배치 */}
            <div className="flex gap-2">
                {/* Key */}
                <div className="flex-1">
                    <label className={LABEL_CLS}>Key <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        className={INPUT_CLS}
                        value={widget.contentKey}
                        placeholder="예: category1 (페이지 내 고유)"
                        onChange={e => onChange({ ...widget, contentKey: e.target.value })}
                    />
                </div>
                {/* 연결 Slug (depth 1) 또는 상위 카테고리 위젯 (depth 2+) */}
                <div className="flex-1 min-w-0">
                    {widget.depth === 1 ? (
                        <>
                            <SlugSelectField
                                value={widget.dbSlug}
                                onChange={slug => onChange({ ...widget, dbSlug: slug })}
                                slugOptions={slugOptions}
                                required
                            />
                        </>
                    ) : (
                        <>
                            <label className={LABEL_CLS}>상위 카테고리 위젯</label>
                            <select
                                className={INPUT_CLS}
                                value={widget.parentWidgetId ?? ''}
                                onChange={e => onChange({ ...widget, parentWidgetId: e.target.value || undefined })}
                            >
                                <option value="">선택 안 함</option>
                                {parentCandidates.map(w => (
                                    <option key={w.widgetId} value={w.widgetId}>
                                        {w.label ? `${w.label} (depth ${w.depth})` : `depth ${w.depth}`}
                                    </option>
                                ))}
                            </select>
                        </>
                    )}
                </div>
            </div>

            {/* Depth(계층) | 레이블 — 한 줄 배치 */}
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className={LABEL_CLS}>Depth (계층)</label>
                    <select
                        className={INPUT_CLS}
                        value={widget.depth}
                        onChange={e => onChange({ ...widget, depth: Number(e.target.value) })}
                    >
                        <option value={1}>1 — 대분류</option>
                        <option value={2}>2 — 중분류</option>
                        <option value={3}>3 — 소분류</option>
                        <option value={4}>4 — 세분류</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className={LABEL_CLS}>레이블</label>
                    {i18nMode ? (
                        <MessageKeySelector
                            value={widget.labelMsgKey ?? ''}
                            onChange={key => onChange({ ...widget, labelMsgKey: key || undefined })}
                            resourceType="WORD"
                            size="sm"
                        />
                    ) : (
                        <input
                            type="text"
                            className={INPUT_CLS}
                            value={widget.label ?? ''}
                            placeholder="예: 대분류"
                            onChange={e => onChange({ ...widget, label: e.target.value || undefined })}
                        />
                    )}
                </div>
            </div>

            {/* 카드 필드 키 설정 — ID / CODE / TITLE / DESC 한 줄 배치 */}
            <div>
                <label className={LABEL_CLS}>카드 필드 키</label>
                <div className="flex gap-1.5">
                    <div className="flex-1">
                        <label className={LABEL_CLS}>
                            ID <span className="text-slate-400 font-normal">(미노출)</span>
                        </label>
                        <input
                            type="text"
                            className={INPUT_CLS}
                            value={widget.fieldId ?? ''}
                            placeholder="폼key.id"
                            onChange={e => onChange({ ...widget, fieldId: e.target.value || undefined })}
                        />
                    </div>
                    <div className="flex-1">
                        <label className={LABEL_CLS}>CODE</label>
                        <input
                            type="text"
                            className={INPUT_CLS}
                            value={widget.fieldCode ?? ''}
                            placeholder="폼key.code"
                            onChange={e => onChange({ ...widget, fieldCode: e.target.value || undefined })}
                        />
                    </div>
                    <div className="flex-1">
                        <label className={LABEL_CLS}>TITLE</label>
                        <input
                            type="text"
                            className={INPUT_CLS}
                            value={widget.fieldTitle ?? ''}
                            placeholder="폼key.컬럼명"
                            onChange={e => onChange({ ...widget, fieldTitle: e.target.value || undefined })}
                        />
                    </div>
                    <div className="flex-1">
                        <label className={LABEL_CLS}>DESC</label>
                        <input
                            type="text"
                            className={INPUT_CLS}
                            value={widget.fieldDesc ?? ''}
                            placeholder="폼key.컬럼명"
                            onChange={e => onChange({ ...widget, fieldDesc: e.target.value || undefined })}
                        />
                    </div>
                </div>
            </div>

            {/* 등록 연결 — 타입 select + 세부 select/input 한 줄 배치 */}
            {/* INPUT_CLS에 w-full이 포함되어 있으므로 wrapper div로 너비 제어 */}
            <div>
                <label className={LABEL_CLS}>등록 연결</label>
                <div className="flex gap-1.5">
                    {/* 연결 타입 */}
                    <div className="flex-1">
                        <select
                            value={widget.createConnType ?? ''}
                            onChange={e => onChange({
                                ...widget,
                                createConnType: (e.target.value as 'popup' | 'path') || undefined,
                                createPopupSlug: undefined,
                                createPath: undefined,
                            })}
                            className={INPUT_CLS}
                        >
                            <option value="">없음</option>
                            <option value="popup">페이지 (관리자)</option>
                            <option value="path">경로 (개발자)</option>
                        </select>
                    </div>
                    {/* 페이지 선택 — 남은 너비 채움 */}
                    {widget.createConnType === 'popup' && (
                        <div className="flex-1 min-w-0">
                            <select
                                value={widget.createPopupSlug ?? ''}
                                onChange={e => onChange({ ...widget, createPopupSlug: e.target.value || undefined })}
                                className={INPUT_CLS}
                            >
                                <option value="">— 페이지 선택 —</option>
                                {pageTemplates.map(t => (
                                    <option key={t.id} value={t.slug}>{t.name} ({t.slug})</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {/* 경로 직접 입력 — 남은 너비 채움 */}
                    {widget.createConnType === 'path' && (
                        <div className="flex-1 min-w-0">
                            <input
                                type="text"
                                value={widget.createPath ?? ''}
                                onChange={e => onChange({ ...widget, createPath: e.target.value || undefined })}
                                placeholder="/admin/category/create"
                                className={INPUT_CLS}
                            />
                        </div>
                    )}
                </div>
                {/* 파라미터 + 저장 체크박스 — 연결 타입 설정 시만 표시 */}
                {widget.createConnType && (
                    <ParamWithSaveField
                        paramsValue={widget.createParams}
                        paramSaveValue={widget.createParamSave}
                        onParamsChange={val => onChange({ ...widget, createParams: val })}
                        onParamSaveChange={val => onChange({ ...widget, createParamSave: val })}
                    />
                )}
            </div>

            {/* 수정 연결 — 타입 select + 세부 select/input 한 줄 배치 */}
            <div>
                <label className={LABEL_CLS}>수정 연결</label>
                <div className="flex gap-1.5">
                    {/* 연결 타입 */}
                    <div className="flex-1">
                        <select
                            value={widget.editConnType ?? ''}
                            onChange={e => onChange({
                                ...widget,
                                editConnType: (e.target.value as 'popup' | 'path') || undefined,
                                editPopupSlug: undefined,
                                editPath: undefined,
                            })}
                            className={INPUT_CLS}
                        >
                            <option value="">없음</option>
                            <option value="popup">페이지 (관리자)</option>
                            <option value="path">경로 (개발자)</option>
                        </select>
                    </div>
                    {/* 페이지 선택 — 남은 너비 채움 */}
                    {widget.editConnType === 'popup' && (
                        <div className="flex-1 min-w-0">
                            <select
                                value={widget.editPopupSlug ?? ''}
                                onChange={e => onChange({ ...widget, editPopupSlug: e.target.value || undefined })}
                                className={INPUT_CLS}
                            >
                                <option value="">— 페이지 선택 —</option>
                                {pageTemplates.map(t => (
                                    <option key={t.id} value={t.slug}>{t.name} ({t.slug})</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {/* 경로 직접 입력 — 남은 너비 채움 */}
                    {widget.editConnType === 'path' && (
                        <div className="flex-1 min-w-0">
                            <input
                                type="text"
                                value={widget.editPath ?? ''}
                                onChange={e => onChange({ ...widget, editPath: e.target.value || undefined })}
                                placeholder="/admin/category/edit"
                                className={INPUT_CLS}
                            />
                        </div>
                    )}
                </div>
                {/* 파라미터 + 저장 체크박스 — 연결 타입 설정 시만 표시 */}
                {widget.editConnType && (
                    <ParamWithSaveField
                        paramsValue={widget.editParams}
                        paramSaveValue={widget.editParamSave}
                        onParamsChange={val => onChange({ ...widget, editParams: val })}
                        onParamSaveChange={val => onChange({ ...widget, editParamSave: val })}
                    />
                )}
            </div>

            {/* 상세 연결 — 토글 ON 시 카드 hover에 상세 버튼 표시 */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className={LABEL_CLS + ' mb-0'}>상세 연결</label>
                    {/* 토글 스위치 */}
                    <button
                        type="button"
                        onClick={() => onChange({
                            ...widget,
                            allowDetail: !widget.allowDetail,
                            detailConnType: undefined,
                            detailPopupSlug: undefined,
                            detailPath: undefined,
                        })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            widget.allowDetail ? 'bg-slate-700' : 'bg-slate-200'
                        }`}
                    >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            widget.allowDetail ? 'translate-x-4' : 'translate-x-1'
                        }`} />
                    </button>
                </div>
                {/* 토글 ON 시에만 연결 설정 표시 */}
                {widget.allowDetail && (
                    <div className="flex gap-1.5">
                        {/* 연결 타입 */}
                        <div className="flex-1">
                            <select
                                value={widget.detailConnType ?? ''}
                                onChange={e => onChange({
                                    ...widget,
                                    detailConnType: (e.target.value as 'popup' | 'path') || undefined,
                                    detailPopupSlug: undefined,
                                    detailPath: undefined,
                                })}
                                className={INPUT_CLS}
                            >
                                <option value="">없음</option>
                                <option value="popup">페이지 (관리자)</option>
                                <option value="path">경로 (개발자)</option>
                            </select>
                        </div>
                        {/* 페이지 선택 */}
                        {widget.detailConnType === 'popup' && (
                            <div className="flex-1 min-w-0">
                                <select
                                    value={widget.detailPopupSlug ?? ''}
                                    onChange={e => onChange({ ...widget, detailPopupSlug: e.target.value || undefined })}
                                    className={INPUT_CLS}
                                >
                                    <option value="">— 페이지 선택 —</option>
                                    {pageTemplates.map(t => (
                                        <option key={t.id} value={t.slug}>{t.name} ({t.slug})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {/* 경로 직접 입력 */}
                        {widget.detailConnType === 'path' && (
                            <div className="flex-1 min-w-0">
                                <input
                                    type="text"
                                    value={widget.detailPath ?? ''}
                                    onChange={e => onChange({ ...widget, detailPath: e.target.value || undefined })}
                                    placeholder="/admin/category/detail"
                                    className={INPUT_CLS}
                                />
                            </div>
                        )}
                    </div>
                )}
                {/* 파라미터 — 연결 타입 설정 시만 표시 */}
                {widget.allowDetail && widget.detailConnType && (
                    <div className="mt-1.5">
                        <label className={LABEL_CLS}>파라미터</label>
                        <input
                            type="text"
                            value={widget.detailParams ?? ''}
                            onChange={e => onChange({ ...widget, detailParams: e.target.value || undefined })}
                            placeholder="param1=1&param2=2"
                            className={INPUT_CLS}
                        />
                    </div>
                )}
            </div>

        </div>
    );
}
