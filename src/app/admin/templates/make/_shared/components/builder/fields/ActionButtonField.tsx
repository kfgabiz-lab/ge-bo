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

import { useEffect, useState } from 'react';
import { FieldEditProps } from './types';
import { FieldBase, LABEL_CLS, INPUT_CLS } from './_FieldBase';
import { SlugSelectField } from './SlugSelectField';
import type { SlugOption } from './SlugSelectField';
import { ApiInfoSelectField } from './ApiInfoSelectField';
import type { ApiInfoOption } from './ApiInfoSelectField';
import type { TemplateItem, ValidationRule } from '../../../types';
import { getTemplateLabel } from '../../../utils';
import api from '@/lib/api';

/** 컨텐츠 위젯 정보 타입 (Form + SubList + MultiSelect + Table 공용) */
export interface ContentWidgetOption {
    type: 'form' | 'sublist' | 'multiselect' | 'table';
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
    /** slug 레지스트리 목록 — 데이터저장 연결slug 선택용 */
    slugOptions?: SlugOption[];
    /** API 정보 목록 — API 연동 연결(connType='api') 선택용 */
    apiInfoOptions?: ApiInfoOption[];
}

/** 공통 select 스타일 */
const SELECT_CLS = 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900';

/** 검증 규칙 1건을 화면에 보여줄 짧은 라벨 구성 */
const getRuleLabel = (rule: ValidationRule): string =>
    rule.type === 'unique'
        ? `중복방지: ${rule.fields || '-'}`
        : `최대건수: ${rule.maxCount ?? '-'}건`;

/**
 * ValidationRuleMultiSelect — 특정 slugRegistryId에 등록된 검증 규칙 목록을 조회해
 * 체크박스로 다중 선택하는 공통 서브컴포넌트.
 * connType='datasave'(단일 slug)와 connType='content'(위젯별 slug)에서 함께 사용한다.
 */
function ValidationRuleMultiSelect({
    slugRegistryId,
    selectedIds,
    onChange,
}: {
    /** 조회 대상 slug의 레지스트리 ID — 없으면 규칙 없음으로 처리 */
    slugRegistryId: number | null | undefined;
    /** 현재 선택된 검증 규칙 ID 목록 */
    selectedIds: number[];
    /** 선택 변경 콜백 */
    onChange: (ids: number[]) => void;
}) {
    const [rules, setRules] = useState<ValidationRule[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    /* slugRegistryId 변경 시 해당 slug의 검증 규칙 목록 조회 */
    useEffect(() => {
        if (!slugRegistryId) { setRules([]); return; }
        setIsLoading(true);
        api.get('/validation-rules', { params: { slugRegistryId } })
            .then(res => setRules(res.data ?? []))
            .catch(() => setRules([]))
            .finally(() => setIsLoading(false));
    }, [slugRegistryId]);

    if (!slugRegistryId) return null;
    if (isLoading) return <p className="text-[10px] text-slate-400 px-1">검증 규칙 불러오는 중...</p>;
    if (rules.length === 0) return <p className="text-[10px] text-slate-400 italic px-1">등록된 검증 규칙이 없습니다.</p>;

    const toggle = (id: number) => {
        onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
    };

    return (
        <div className="border border-slate-200 rounded overflow-hidden">
            {rules.map(rule => (
                <label
                    key={rule.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                >
                    <input
                        type="checkbox"
                        checked={selectedIds.includes(rule.id)}
                        onChange={() => toggle(rule.id)}
                        className="accent-slate-900 w-3.5 h-3.5 flex-shrink-0"
                    />
                    <span className="text-xs text-slate-700 truncate">{getRuleLabel(rule)}</span>
                </label>
            ))}
        </div>
    );
}

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
    slugOptions = [],
    apiInfoOptions = [],
}: ActionButtonFieldProps) {
    const connType = values.connType ?? '';

    /* 현재 선택된 위젯 ID 목록 */
    const selectedIds: string[] = values.connectedContentWidgetIds ?? [];

    /** 연결 타입 변경 시 연결 관련 값 초기화 */
    const handleConnTypeChange = (newType: string) => {
        onChange({
            connType: newType as '' | 'content' | 'popup' | 'path' | 'close' | 'excel' | 'datasave' | 'api',
            popupSlug: undefined,
            fileLayerSlug: undefined,
            connectedContentWidgetIds: undefined,
            contentAction: undefined,
            excelTableWidgetId: undefined,
            dataSaveSlug: undefined,
            validationRuleIds: undefined,
            contentValidationRuleIds: undefined,
            apiInfoId: undefined,
        });
    };

    /** 체크박스 토글 — 선택 배열에 추가/제거 */
    const handleContentWidgetToggle = (widgetId: string) => {
        const wasSelected = selectedIds.includes(widgetId);
        const next = wasSelected
            ? selectedIds.filter(id => id !== widgetId)
            : [...selectedIds, widgetId];

        /* 선택 해제되는 위젯은 검증 규칙 선택값도 함께 제거 */
        const nextContentRuleIds = { ...(values.contentValidationRuleIds ?? {}) };
        if (wasSelected) delete nextContentRuleIds[widgetId];

        onChange({
            connectedContentWidgetIds: next.length > 0 ? next : undefined,
            /* 선택 해제 시 contentAction도 초기화 */
            contentAction: next.length > 0 ? values.contentAction : undefined,
            contentValidationRuleIds: Object.keys(nextContentRuleIds).length > 0 ? nextContentRuleIds : undefined,
        });
    };

    /** 컨텐츠 아이템 표시 라벨 구성 */
    const getContentLabel = (w: ContentWidgetOption): string => {
        const typeLabel = w.type === 'form' ? 'Form'
            : w.type === 'sublist' ? 'SubList'
            : w.type === 'table' ? 'Table'
            : 'MultiSelect';
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
            disableCondition={values.disableCondition}
            saveConfirm={values.saveConfirm ?? false}
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
                        <option value="datasave">데이터저장</option>
                        <option value="excel">엑셀 다운로드</option>
                        <option value="api">API 연동</option>
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
                                        <div key={w.widgetId} className="border-b border-slate-100 last:border-b-0">
                                            <label className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-slate-50 transition-colors">
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
                                            {/* 선택된 위젯 + 연결 slug가 있는 경우에만 해당 slug 기준 검증 규칙 다중선택 노출 */}
                                            {selectedIds.includes(w.widgetId) && w.connectedSlug && (
                                                <div className="px-2.5 pb-1.5 pl-8">
                                                    <ValidationRuleMultiSelect
                                                        slugRegistryId={slugOptions.find(s => s.slug === w.connectedSlug)?.id ?? null}
                                                        selectedIds={values.contentValidationRuleIds?.[w.widgetId] ?? []}
                                                        onChange={ids => {
                                                            const next = { ...(values.contentValidationRuleIds ?? {}) };
                                                            if (ids.length > 0) next[w.widgetId] = ids;
                                                            else delete next[w.widgetId];
                                                            onChange({ contentValidationRuleIds: Object.keys(next).length > 0 ? next : undefined });
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
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

                    {/* 데이터저장 — form/sublist/table/multiselect 다중 체크박스 + 연결slug */}
                    {connType === 'datasave' && (
                        <div className="space-y-1.5">
                            {/* 컨텐츠 위젯 체크박스 목록 (4가지 타입 전체) */}
                            {contentWidgets.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic px-1">
                                    연결 가능한 Form/SubList/Table/MultiSelect 위젯이 없습니다.
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
                            {/* 연결 slug — 저장 API 엔드포인트 */}
                            <SlugSelectField
                                value={values.dataSaveSlug ?? ''}
                                onChange={slug => onChange({ dataSaveSlug: slug || undefined, validationRuleIds: undefined })}
                                slugOptions={slugOptions}
                                label="연결 Slug"
                                emptyLabel="— Slug 선택 —"
                            />
                            {/* 저장 파라미터 — 행별 추출 및 고정값 지정 */}
                            {values.dataSaveSlug && (
                                <div className="space-y-0.5">
                                    <input
                                        type="text"
                                        value={values.params ?? ''}
                                        onChange={e => onChange({ params: e.target.value || undefined })}
                                        placeholder="예: contentKey.depth=3,contentKey.id"
                                        className={INPUT_CLS}
                                    />
                                    <p className="text-[9px] text-slate-400 px-0.5">쉼표 구분 · =있으면 고정값 · 없으면 행에서 추출</p>
                                </div>
                            )}
                            {/* 연결 slug 기준 검증 규칙 다중선택 */}
                            {values.dataSaveSlug && (
                                <div className="space-y-0.5">
                                    <label className={LABEL_CLS}>검증 규칙</label>
                                    <ValidationRuleMultiSelect
                                        slugRegistryId={slugOptions.find(s => s.slug === values.dataSaveSlug)?.id ?? null}
                                        selectedIds={values.validationRuleIds ?? []}
                                        onChange={ids => onChange({ validationRuleIds: ids.length > 0 ? ids : undefined })}
                                    />
                                </div>
                            )}
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

                    {/* 엑셀 다운로드 — 테이블 위젯 단일 선택 + 개인정보 팝업 옵션 */}
                    {connType === 'excel' && (
                        <div className="space-y-1">
                            {/* table 타입 위젯만 필터링 */}
                            {contentWidgets.filter(w => w.type === 'table').length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic px-1">
                                    연결 가능한 데이터테이블 위젯이 없습니다.
                                </p>
                            ) : (
                                <select
                                    value={values.excelTableWidgetId ?? ''}
                                    onChange={e => onChange({ excelTableWidgetId: e.target.value || undefined })}
                                    className={SELECT_CLS}
                                >
                                    <option value="">— 테이블 선택 —</option>
                                    {contentWidgets
                                        .filter(w => w.type === 'table')
                                        .map(w => (
                                            <option key={w.widgetId} value={w.widgetId}>
                                                {w.title || w.contentKey || w.widgetId}
                                                {w.connectedSlug ? ` (${w.connectedSlug})` : ''}
                                            </option>
                                        ))
                                    }
                                </select>
                            )}
                            {/* 개인정보 팝업 사용 여부 */}
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={values.excelPrivacyPopup ?? false}
                                    onChange={e => onChange({ excelPrivacyPopup: e.target.checked || undefined })}
                                    className="accent-slate-900 w-3.5 h-3.5 flex-shrink-0"
                                />
                                <span className="text-xs text-slate-700">개인정보 팝업 사용</span>
                            </label>
                        </div>
                    )}

                    {/* API 연동 — 활성 API 정보 목록에서 1건 선택 (mode2) 또는 미선택 상태로 직접 CRUD (mode1) */}
                    {connType === 'api' && (() => {
                        /* 선택된 API의 method 확인 — POST/PUT/PATCH일 때만 컨텐츠 데이터 수집 UI 노출 */
                        const selectedApi = apiInfoOptions.find(a => a.id === values.apiInfoId);
                        const apiMethod = (selectedApi?.method ?? '').toUpperCase();
                        const supportsContentData = apiMethod === 'POST' || apiMethod === 'PUT' || apiMethod === 'PATCH';
                        /* mode2(API 선택): Table 제외 — Form/SubList/MultiSelect 데이터만 요청 바디에 포함 가능
                           mode1(API 미선택): id 유무로 자동 생성/수정 처리하는 entity CRUD 대상만 — Form/SubList만 포함, MultiSelect는 대상 아님(mode1 설계상 미지원) */
                        const apiContentWidgets = values.apiInfoId
                            ? contentWidgets.filter(w => w.type !== 'table')
                            : contentWidgets.filter(w => w.type === 'form' || w.type === 'sublist');
                        /* mode1(API 미선택)은 항상 컨텐츠위젯 선택 UI 노출, mode2(API 선택)는 POST/PUT/PATCH일 때만 노출 */
                        const showContentWidgets = !values.apiInfoId || supportsContentData;

                        return (
                            <div className="space-y-1">
                                <ApiInfoSelectField
                                    hideLabel
                                    value={values.apiInfoId}
                                    onChange={id => onChange({ apiInfoId: id, connectedContentWidgetIds: undefined })}
                                    apiInfoOptions={apiInfoOptions}
                                    emptyLabel="— API 선택 —"
                                />
                                {showContentWidgets && (
                                    <div className="space-y-1.5">
                                        {/* mode1 안내 — API 미선택 시 선택한 Form/SubList를 id 유무로 자동 생성/수정 처리 */}
                                        {!values.apiInfoId && (
                                            <p className="text-[10px] text-slate-400 italic px-1">
                                                자동 모드: 선택한 Form/SubList를 id 유무로 생성/수정 처리합니다.
                                            </p>
                                        )}
                                        {/* mode2: Form/SubList/MultiSelect / mode1: Form/SubList만 체크박스로 선택해 실제 데이터를 요청 바디에 포함 */}
                                        {apiContentWidgets.length === 0 ? (
                                            <p className="text-[10px] text-slate-400 italic px-1">
                                                {values.apiInfoId
                                                    ? '연결 가능한 Form/SubList/MultiSelect 위젯이 없습니다.'
                                                    : '연결 가능한 Form/SubList 위젯이 없습니다.'}
                                            </p>
                                        ) : (
                                            <div className="border border-slate-200 rounded overflow-hidden">
                                                {apiContentWidgets.map(w => (
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
                                        {/* 파라미터 — mode2(API 선택) 전용. mode1은 api_info 없이 위젯 데이터만 사용하므로 의미 없음 */}
                                        {values.apiInfoId && (
                                            <div className="space-y-0.5">
                                                <input
                                                    type="text"
                                                    value={values.params ?? ''}
                                                    onChange={e => onChange({ params: e.target.value || undefined })}
                                                    placeholder="파라미터 (예: id='1',status='use')"
                                                    className={INPUT_CLS}
                                                />
                                                <p className="text-[9px] text-slate-400 px-0.5">쉼표 구분 · =있으면 고정값 · urlPattern의 {'{'}key{'}'} 치환에도 사용</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* 페이지 — Quick-Detail 템플릿 선택 (팝업/상세 구분 표시) */}
                    {connType === 'popup' && (
                        <div className="space-y-1">
                            <SlugSelectField
                                hideLabel
                                value={values.popupSlug ?? ''}
                                onChange={slug => onChange({ popupSlug: slug || undefined })}
                                slugOptions={pageTemplates}
                                emptyLabel="— 페이지 선택 —"
                            />
                            {/* 연결 페이지가 선택된 경우에만 파라미터 입력란 노출 */}
                            {values.popupSlug && (
                                <div className="space-y-0.5">
                                    <input
                                        type="text"
                                        value={values.params ?? ''}
                                        onChange={e => onChange({ params: e.target.value || undefined })}
                                        placeholder="파라미터 (예: depth=1,type=create)"
                                        className={INPUT_CLS}
                                    />
                                    <p className="text-[9px] text-slate-400 px-0.5">쉼표 구분 · =있으면 고정값</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 경로 — 직접 입력 */}
                    {connType === 'path' && (
                        <div className="space-y-1">
                            <input
                                type="text"
                                value={values.fileLayerSlug ?? ''}
                                onChange={e => onChange({ fileLayerSlug: e.target.value || undefined })}
                                placeholder="예: LayerPopup"
                                className={INPUT_CLS}
                            />
                            {/* 경로가 입력된 경우에만 파라미터 입력란 노출 */}
                            {values.fileLayerSlug && (
                                <div className="space-y-0.5">
                                    <input
                                        type="text"
                                        value={values.params ?? ''}
                                        onChange={e => onChange({ params: e.target.value || undefined })}
                                        placeholder="파라미터 (예: depth=1,type=create)"
                                        className={INPUT_CLS}
                                    />
                                    <p className="text-[9px] text-slate-400 px-0.5">쉼표 구분 · =있으면 고정값</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </FieldBase>
    );
}
