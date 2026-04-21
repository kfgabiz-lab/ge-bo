'use client';

/**
 * ActionButtonField — 액션 버튼 설정 필드 컴포넌트
 *
 * 클릭 시 동작(Form·팝업·경로)을 지정하는 버튼을 구성하는 빌더 설정 컴포넌트.
 * Space 위젯의 버튼 아이템 설정에 사용하며, 향후 다른 위젯에서도 재사용 가능.
 *
 * [Form 연결 동작]
 *  1. Form 위젯 목록에서 선택
 *  2. 선택한 Form의 connectedSlug 있음 → 저장 / 삭제 선택 (formAction)
 *     선택한 Form의 connectedSlug 없음 → API 목록 내부 fetch 후 선택
 *
 * 사용법:
 *   <ActionButtonField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5] }}
 *     codeGroups={[]} codeGroupsLoading={false}
 *     layerTemplates={layerTemplates}
 *     slugOptions={slugOptions}
 *     formWidgets={formWidgets} />
 */

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FieldEditProps } from './types';
import { FieldBase, LABEL_CLS, INPUT_CLS } from './_FieldBase';
import type { TemplateItem } from '../../../types';

/** API 정보 타입 (내부 fetch 전용) */
interface ApiOption {
    id: number;
    name: string;
    method: string;
    urlPattern: string;
}

/** Form 위젯 정보 타입 */
interface FormWidgetOption {
    widgetId: string;
    contentKey: string;
    connectedSlug?: string;
}

/** 버튼 색상 옵션 */
const BTN_COLOR_OPTIONS = [
    { value: 'black', label: '검정' },
    { value: 'green', label: '초록' },
    { value: 'blue', label: '파랑' },
    { value: 'yellow', label: '노랑' },
    { value: 'red', label: '빨강' },
    { value: 'gray', label: '회색' },
    { value: 'pink', label: '분홍' },
];

/** ActionButtonField 전용 추가 props */
export interface ActionButtonFieldProps extends FieldEditProps {
    /** Quick-Detail 템플릿 목록 — configJson.outputMode 파싱으로 팝업/상세 구분 */
    pageTemplates: TemplateItem[];
    formWidgets?: FormWidgetOption[];
}

/** 공통 select 스타일 */
const SELECT_CLS = 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900';

/** configJson.outputMode 파싱 → "팝업" / "상세" 접두어 반환 */
const getPageLabel = (t: TemplateItem): string => {
    try {
        const cfg = JSON.parse(t.configJson || '{}');
        if (cfg.outputMode === 'layerpopup') return `팝업 - ${t.name}`;
        if (cfg.outputMode === 'page') return `상세 - ${t.name}`;
    } catch { /* 파싱 실패 시 이름만 표시 */ }
    return t.name;
};

export function ActionButtonField({
    values,
    onChange,
    colSpanMode,
    rowSpanConfig,
    compact,
    autoFocus,
    onLabelKeyDown,
    pageTemplates,
    formWidgets = [],
}: ActionButtonFieldProps) {
    const connType = values.connType ?? '';

    /* 선택된 Form 위젯 정보 */
    const selectedForm = formWidgets.find(f => f.widgetId === values.connectedFormWidgetId);

    /* Form 연결 + 선택한 Form의 slug 없을 때 사용할 API 목록 (내부 fetch) */
    const [apiOptions, setApiOptions] = useState<ApiOption[]>([]);
    const [apiLoading, setApiLoading] = useState(false);

    /**
     * Form 선택 후 connectedSlug 없을 때만 API 목록 fetch
     * connectedSlug 있으면 저장/삭제 UI 표시이므로 불필요
     */
    useEffect(() => {
        if (connType !== 'form') return;
        if (!selectedForm) return;
        if (selectedForm.connectedSlug) return;

        setApiLoading(true);
        api.get('/api-infos', { params: { size: 100 } })
            .then(res => setApiOptions(res.data.content || []))
            .catch(() => {})
            .finally(() => setApiLoading(false));
    }, [connType, selectedForm]);

    /** 연결 타입 변경 시 연결 관련 값 초기화 */
    const handleConnTypeChange = (newType: string) => {
        onChange({
            connType: newType as '' | 'form' | 'popup' | 'path' | 'close',
            popupSlug: undefined,
            fileLayerSlug: undefined,
            connectedFormWidgetId: undefined,
            apiId: undefined,
            formAction: undefined,
        });
    };

    /** Form 위젯 선택 시 연결 관련 값 초기화 */
    const handleFormWidgetChange = (widgetId: string) => {
        onChange({
            connectedFormWidgetId: widgetId || undefined,
            apiId: undefined,
            formAction: undefined,
        });
    };

    return (
        <FieldBase
            label={values.label}
            fieldKey={values.fieldKey || ''}
            colSpan={values.colSpan}
            colSpanMode={colSpanMode}
            rowSpan={values.rowSpan}
            rowSpanConfig={rowSpanConfig}
            compact={compact}
            autoFocus={autoFocus}
            onChange={onChange}
            onLabelKeyDown={onLabelKeyDown}
        >
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100 mt-1.5">
                {/* 색상 설정 */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                        <label className={LABEL_CLS}>배경색</label>
                        <select
                            value={values.color ?? 'black'}
                            onChange={e => onChange({ color: e.target.value })}
                            className={SELECT_CLS}
                        >
                            {BTN_COLOR_OPTIONS.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={LABEL_CLS}>글자색</label>
                        <select
                            value={values.textColor ?? 'white'}
                            onChange={e => onChange({ textColor: e.target.value })}
                            className={SELECT_CLS}
                        >
                            <option value="white">흰색</option>
                            {BTN_COLOR_OPTIONS.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 연결 방식 */}
                <div className="space-y-1.5">
                    <label className={LABEL_CLS}>연결</label>

                    {/* 연결 타입 선택 */}
                    <select
                        value={connType}
                        onChange={e => handleConnTypeChange(e.target.value)}
                        className={SELECT_CLS}
                    >
                        <option value="">없음</option>
                        <option value="form">Form</option>
                        <option value="popup">페이지 (관리자)</option>
                        <option value="path">경로 (개발자)</option>
                        <option value="close">닫기</option>
                    </select>

                    {/* Form 연결 */}
                    {connType === 'form' && (
                        <div className="space-y-1.5">
                            {/* Form 위젯 선택 */}
                            <select
                                value={values.connectedFormWidgetId ?? ''}
                                onChange={e => handleFormWidgetChange(e.target.value)}
                                className={SELECT_CLS}
                            >
                                <option value="">— Form 선택 —</option>
                                {formWidgets.map(f => (
                                    <option key={f.widgetId} value={f.widgetId}>
                                        {f.contentKey || f.widgetId}
                                    </option>
                                ))}
                            </select>

                            {/* Form 선택 후 — slug 있으면 저장/삭제, 없으면 API 선택 */}
                            {selectedForm && (
                                selectedForm.connectedSlug ? (
                                    /* slug 있음 → 저장 / 삭제 선택 */
                                    <div>
                                        <label className={LABEL_CLS}>
                                            동작
                                            <span className="ml-1.5 font-mono text-slate-400">({selectedForm.connectedSlug})</span>
                                        </label>
                                        <div className="flex gap-4">
                                            {(['save', 'delete'] as const).map(action => (
                                                <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`formAction-${values.fieldKey}`}
                                                        value={action}
                                                        checked={values.formAction === action}
                                                        onChange={() => onChange({ formAction: action })}
                                                        className="accent-slate-900"
                                                    />
                                                    <span className="text-xs text-slate-700">
                                                        {action === 'save' ? '저장' : '삭제'}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* slug 없음 → API 목록 선택 */
                                    <div>
                                        <label className={LABEL_CLS}>API 선택</label>
                                        <select
                                            value={values.apiId ?? ''}
                                            onChange={e => onChange({ apiId: e.target.value ? Number(e.target.value) : undefined })}
                                            className={SELECT_CLS}
                                            disabled={apiLoading}
                                        >
                                            <option value="">{apiLoading ? '로딩 중...' : '— API 선택 —'}</option>
                                            {apiOptions.map(a => (
                                                <option key={a.id} value={a.id}>
                                                    [{a.method}] {a.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {/* 페이지 — Quick-Detail 템플릿 선택 (팝업/상세 구분 표시) */}
                    {connType === 'popup' && (
                        <select
                            value={values.popupSlug ?? ''}
                            onChange={e => onChange({ popupSlug: e.target.value || undefined })}
                            className={SELECT_CLS}
                        >
                            <option value="">— 페이지 선택 —</option>
                            {pageTemplates.map(t => (
                                <option key={t.id} value={t.slug}>{getPageLabel(t)} ({t.slug})</option>
                            ))}
                        </select>
                    )}

                    {/* 경로 — 직접 입력 */}
                    {connType === 'path' && (
                        <input
                            type="text"
                            value={values.fileLayerSlug ?? ''}
                            onChange={e => onChange({ fileLayerSlug: e.target.value || undefined })}
                            placeholder="예: LayerPopup"
                            className={INPUT_CLS}
                        />
                    )}
                </div>
            </div>
        </FieldBase>
    );
}
