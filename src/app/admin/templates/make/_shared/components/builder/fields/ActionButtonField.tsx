'use client';

/**
 * ActionButtonField — 액션 버튼 설정 필드 컴포넌트
 *
 * 클릭 시 동작(컨텐츠·팝업·경로)을 지정하는 버튼을 구성하는 빌더 설정 컴포넌트.
 * Space 위젯의 버튼 아이템 설정에 사용하며, 향후 다른 위젯에서도 재사용 가능.
 *
 * [컨텐츠 연결 동작]
 *  1. Form/SubList 위젯 목록에서 체크박스로 다중 선택
 *  2. 1개 이상 선택된 경우 저장 / 삭제 선택 (contentAction)
 *
 * 사용법:
 *   <ActionButtonField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5] }}
 *     codeGroups={[]} codeGroupsLoading={false}
 *     pageTemplates={pageTemplates}
 *     contentWidgets={contentWidgets} />
 */

import { FieldEditProps } from './types';
import { FieldBase, LABEL_CLS, INPUT_CLS } from './_FieldBase';
import type { TemplateItem } from '../../../types';
import { getTemplateLabel } from '../../../utils';

/** 컨텐츠 위젯 정보 타입 (Form + SubList + MultiSelect 공용) */
export interface ContentWidgetOption {
    type: 'form' | 'sublist' | 'multiselect';
    widgetId: string;
    contentKey: string;
    title?: string;
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
    /** 현재 페이지의 Form + SubList 위젯 목록 — 컨텐츠 연결 다중 선택용 */
    contentWidgets?: ContentWidgetOption[];
}

/** 공통 select 스타일 */
const SELECT_CLS = 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900';


export function ActionButtonField({
    values,
    onChange,
    colSpanMode,
    rowSpanConfig,
    compact,
    autoFocus,
    onLabelKeyDown,
    pageTemplates,
    contentWidgets = [],
}: ActionButtonFieldProps) {
    const connType = values.connType ?? '';

    /* 현재 선택된 위젯 ID 목록 */
    const selectedIds: string[] = values.connectedContentWidgetIds ?? [];

    /** 연결 타입 변경 시 연결 관련 값 초기화 */
    const handleConnTypeChange = (newType: string) => {
        onChange({
            connType: newType as '' | 'content' | 'popup' | 'path' | 'close',
            popupSlug: undefined,
            fileLayerSlug: undefined,
            connectedContentWidgetIds: undefined,
            contentAction: undefined,
        });
    };

    /** 체크박스 토글 — 선택 배열에 추가/제거 */
    const handleContentWidgetToggle = (widgetId: string) => {
        const next = selectedIds.includes(widgetId)
            ? selectedIds.filter(id => id !== widgetId)
            : [...selectedIds, widgetId];
        onChange({
            connectedContentWidgetIds: next.length > 0 ? next : undefined,
            /* 선택 해제 시 contentAction도 초기화 */
            contentAction: next.length > 0 ? values.contentAction : undefined,
        });
    };

    /** 컨텐츠 아이템 표시 라벨 구성 */
    const getContentLabel = (w: ContentWidgetOption): string => {
        const typeLabel = w.type === 'form' ? 'Form' : w.type === 'sublist' ? 'SubList' : 'MultiSelect';
        const name = w.title || w.contentKey || w.widgetId;
        return `[${typeLabel}] ${name}`;
    };

    return (
        <FieldBase
            label={values.label}
            labelMsgKey={values.labelMsgKey}
            fieldKey={values.fieldKey || ''}
            colSpan={values.colSpan}
            colSpanMode={colSpanMode}
            rowSpan={values.rowSpan}
            rowSpanConfig={rowSpanConfig}
            compact={compact}
            autoFocus={autoFocus}
            hideCondition={values.hideCondition}
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
                        <option value="content">컨텐츠</option>
                        <option value="popup">페이지 (관리자)</option>
                        <option value="path">경로 (개발자)</option>
                        <option value="close">닫기</option>
                    </select>

                    {/* 컨텐츠 연결 — Form/SubList 다중 체크박스 선택 */}
                    {connType === 'content' && (
                        <div className="space-y-1.5">
                            {/* 위젯 목록이 없을 때 안내 */}
                            {contentWidgets.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic px-1">
                                    연결 가능한 Form/SubList/MultiSelect 위젯이 없습니다.
                                </p>
                            ) : (
                                <div className="border border-slate-200 rounded overflow-hidden">
                                    {contentWidgets.map(w => (
                                        <label
                                            key={w.widgetId}
                                            className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(w.widgetId)}
                                                onChange={() => handleContentWidgetToggle(w.widgetId)}
                                                className="accent-slate-900 w-3.5 h-3.5 flex-shrink-0"
                                            />
                                            <span className="text-xs text-slate-700 truncate">
                                                {getContentLabel(w)}
                                            </span>
                                            {w.connectedSlug && (
                                                <span className="ml-auto text-[9px] text-slate-400 font-mono flex-shrink-0">
                                                    {w.connectedSlug}
                                                </span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* 1개 이상 선택된 경우에만 저장/삭제 표시 */}
                            {selectedIds.length > 0 && (
                                <div className="space-y-1.5">
                                    <label className={LABEL_CLS}>동작</label>
                                    <div className="flex gap-4">
                                        {(['save', 'delete'] as const).map(action => (
                                            <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`contentAction-${values.fieldKey}`}
                                                    value={action}
                                                    checked={values.contentAction === action}
                                                    onChange={() => onChange({ contentAction: action })}
                                                    className="accent-slate-900"
                                                />
                                                <span className="text-xs text-slate-700">
                                                    {action === 'save' ? '저장' : '삭제'}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    {/* 동작 완료 후 이전 페이지 이동 여부 */}
                                    <label className="flex items-center gap-1.5 cursor-pointer mt-0.5">
                                        <input
                                            type="checkbox"
                                            checked={values.goBackAfterAction ?? false}
                                            onChange={e => onChange({ goBackAfterAction: e.target.checked || undefined })}
                                            className="accent-slate-900 w-3.5 h-3.5 flex-shrink-0"
                                        />
                                        <span className="text-xs text-slate-700">동작 후 이전페이지 이동</span>
                                    </label>
                                </div>
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
                                <option key={t.id} value={t.slug}>{getTemplateLabel(t)} ({t.slug})</option>
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
