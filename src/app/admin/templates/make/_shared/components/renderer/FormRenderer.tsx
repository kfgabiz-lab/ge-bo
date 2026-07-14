'use client';

/**
 * FormRenderer — Form 위젯 렌더러 (CSS Grid 12칸 레이아웃)
 *
 * - preview: disabled 필드 (빌더 미리보기)
 * - live: 인터랙티브 입력 (실제 페이지용)
 *
 * 필드 렌더링은 FieldRenderer(공통)를 재사용한다.
 * 각 필드의 colSpan / rowSpan으로 그리드 내 위치와 크기를 결정한다.
 *
 * 사용법:
 *   // preview
 *   <FormRenderer mode="preview" fields={widget.fields} codeGroups={codeGroups} />
 *
 *   // live
 *   <FormRenderer
 *     mode="live"
 *     fields={widget.fields}
 *     codeGroups={codeGroups}
 *     values={formValues}
 *     onChangeValues={(fieldId, v) => updateFormValue(fieldId, v)}
 *   />
 */

import { useMemo, useCallback, useRef } from 'react';
import type { FormFieldItem } from '../builder/FormBuilder';
import type { RendererMode } from './types';
import { FieldRenderer } from './FieldRenderer';
import { RendererContainer } from './RendererContainer';
import type { CodeGroupDef, SearchFieldConfig } from '../../types';
import { useI18n } from '@/hooks/use-i18n';
import { applyDataGeneration, flattenPageDataItem, evalConditionExpr, buildKeyToId } from '../../utils';

/** flattenPageDataItem이 항상 붙이는 부가 키 — rowData 병합 시 제외 */
const FLATTEN_META_KEYS = new Set(['_id', '_groupId', '_pathMap', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy']);

interface FormRendererProps {
    mode: RendererMode;
    fields: FormFieldItem[];
    /** 폼 섹션 타이틀 — 1행 영역 상단에 표시 (선택) */
    title?: string;
    /** 타이틀 다국어 키 */
    titleMsgKey?: string;
    /** 타이틀 아래 설명 — 타이틀과 함께 1행 안에 표시 (선택) */
    description?: string;
    /** 설명 다국어 키 */
    descriptionMsgKey?: string;
    /** 테두리 표시 여부 (기본 true) */
    showBorder?: boolean;
    /** 바탕색 CSS 값 ('none' 또는 미설정 시 투명) */
    bgColor?: string;
    /** 부모 위젯 colSpan — 그리드 열 수를 결정 (기본 12) */
    contentColSpan?: number;
    /** 공통코드 그룹 목록 — select 필드 옵션 렌더링에 사용 */
    codeGroups?: CodeGroupDef[];
    /** 필드별 입력값 — live 모드에서 외부 상태 관리 (fieldId → value) */
    values?: Record<string, string>;
    /** 필드값 변경 핸들러 — live 모드에서 외부로 값 전달 */
    onChangeValues?: (fieldId: string, value: string) => void;
    /** cross-form 데이터생성 실시간 자동입력 콜백 — 어느 폼이든 fieldId로 값 업데이트 */
    onChangeAllFormValues?: (fieldId: string, value: string) => void;
    /** 페이지 내 모든 Form 위젯 통합 values — cross-form hideCondition 평가용 (fieldId → value) */
    allFormValues?: Record<string, string>;
    /** 페이지 내 모든 Form 위젯 fieldKey → fieldId 역매핑 — cross-form hideCondition 평가용 */
    allFieldKeyToId?: Record<string, string>;
    /** URL 쿼리 파라미터 — hideCondition/disableCondition에서 폼 필드 외 URL 파라미터도 참조 가능 (key → value) */
    urlParams?: Record<string, string>;
    /** cross-tab 공유 폼 값 — TabRenderer가 관리, 다른 탭 필드 hide/disable 조건 평가용 (fieldKey → value) */
    crossTabFormValues?: Record<string, string>;
    /** 이 폼 위젯의 contentKey — cross-tab 에스컬레이션 시 contentKey.fieldKey 형식으로도 저장하여 탭 간 명시 참조 지원 */
    contentKey?: string;
    /* ── 파일/이미지/비디오 전용 (live 모드) ── */
    /** 새로 선택한 파일 목록 (fieldId → File[]) */
    fileValues?: Record<string, File[]>;
    /** 기존 파일 메타 (fieldId → 메타 배열) */
    existingFileMeta?: Record<string, { id: number; origName: string; fileSize: number }[]>;
    /** 이미지 blob URL 캐시 (fileId → blob URL) */
    imgBlobUrls?: Record<number, string>;
    /** 파일 변경 핸들러 */
    onFileChange?: (fieldId: string, files: File[]) => void;
    /** 기존 파일 제거 핸들러 */
    onRemoveExisting?: (fieldId: string, fileId: number) => void;
    /** _fetchedRel{id} 원본 데이터 — TABLE과 동일한 dot-notation rowData 구성용 */
    fetchRelData?: Record<string, unknown>;
    /** entity 연결 페이지 여부 — 파일 다운로드 경로 분기용 (FieldRenderer까지 전달) */
    isEntity?: boolean;
}

export function FormRenderer({
    mode,
    fields,
    title,
    titleMsgKey,
    description,
    descriptionMsgKey,
    showBorder = true,
    bgColor,
    contentColSpan = 12,
    codeGroups = [],
    values = {},
    onChangeValues,
    onChangeAllFormValues,
    allFormValues,
    allFieldKeyToId,
    urlParams,
    crossTabFormValues,
    contentKey,
    fileValues,
    existingFileMeta,
    imgBlobUrls,
    onFileChange,
    onRemoveExisting,
    fetchRelData,
    isEntity,
}: FormRendererProps) {
    const isPreview = mode === 'preview';
    const { t } = useI18n();

    /* fieldKey → fieldId 역매핑 테이블 — hideCondition 평가에 사용 (공통함수로 분리) */
    const keyToId = useMemo(() => buildKeyToId(fields), [fields]);

    /* data 표현식 평가용 — fieldKey → 현재 값 맵 */
    const rowData = useMemo(() => {
        const map: Record<string, unknown> = {};
        fields.forEach(f => {
            if (f.fieldKey) map[f.fieldKey] = values[f.id] ?? '';
        });
        /* _fetchedRel{id} 데이터를 공통함수(flattenPageDataItem)로 평탄화 — TABLE(TableCellRenderer)과 완전히 동일한 방식
           (dot-notation 전체 경로 + 유일한 필드명일 때의 짧은 키 승격까지 동일하게 지원) */
        if (fetchRelData) {
            const flatRel = flattenPageDataItem({ id: 0, dataJson: fetchRelData });
            Object.entries(flatRel).forEach(([k, v]) => {
                if (!FLATTEN_META_KEYS.has(k)) map[k] = v;
            });
        }
        return map;
    }, [fields, values, fetchRelData]);

    /** hideCondition / disableCondition 공통 평가 함수 — 공용 evalConditionExpr에 위임
     *  resolver 순서: 폼 필드(현재+cross-form) → urlParams → crossTabFormValues
     *  형식: 콤마AND 다중조건, today() 함수토큰, 날짜비교(</>/<=/>=) 등 공용 파서가 지원하는 문법 전체 */
    const evalCondition = (condition: string): boolean => {
        const resolvedKeyToId = { ...(allFieldKeyToId ?? {}), ...keyToId };
        const resolvedValues  = { ...(allFormValues  ?? {}), ...values  };
        return evalConditionExpr(condition, (key) => {
            const fieldId = resolvedKeyToId[key];
            if (fieldId) return resolvedValues[fieldId] ?? '';
            if (urlParams && key in urlParams) return urlParams[key] ?? '';
            if (crossTabFormValues && key in crossTabFormValues) return crossTabFormValues[key] ?? '';
            return undefined;
        });
    };

    /** hideCondition 평가 — "key=v1,key2=v2" AND 복수 조건 지원
     *  cross-form 참조: allFieldKeyToId/allFormValues로 다른 Form 위젯 필드도 조회 */
    const shouldHide    = (f: FormFieldItem): boolean =>
        !isPreview && !!f.hideCondition    && evalCondition(f.hideCondition);

    const shouldDisable = (f: FormFieldItem): boolean =>
        !isPreview && !!f.disableCondition && evalCondition(f.disableCondition);

    /* 페이지 최초 로드 시 값을 저장 — onlyIfEmpty 체크 기준
     * 신규 등록: 초기값 모두 "" → 항상 반영 (연속 타이핑 가능)
     * 편집 모드: 초기값이 있는 필드 → 소스 변경해도 skip (기존값 보호) */
    const initialValuesRef = useRef<Record<string, string>>(values);
    const initialAllFormValuesRef = useRef<Record<string, string> | undefined>(allFormValues);

    /**
     * 필드값 변경 핸들러 — generationKey 설정 시 대상 필드에 변환값 자동 입력
     * - generationKey 마지막 '.' 이후 세그먼트 = 대상 fieldKey
     * - 대상 fieldKey가 같은 Form 내에 있으면 실시간 자동 입력
     */
    const handleFieldChange = useCallback((fieldId: string, value: string) => {
        onChangeValues?.(fieldId, value);

        const sourceField = fields.find(f => f.id === fieldId);
        if (!sourceField) return;

        /* fieldKey 있는 모든 필드 변경 시 — cross-tab hide/disable 조건 평가용 값 공유
         * 단순 fieldKey("title")와 contentKey.fieldKey("form1.title") 두 형식 모두 저장 */
        if (sourceField.fieldKey) {
            onChangeAllFormValues?.(sourceField.fieldKey, value);
            if (contentKey) {
                onChangeAllFormValues?.(`${contentKey}.${sourceField.fieldKey}`, value);
            }
        }

        /* generationKey 자동입력 처리 */

        /* generationKey로 대상 fieldId 탐색
         * - 도트 포함(예: form3.title): allFieldKeyToId에서 cross-form 탐색
         * - 단순 key(예: title): keyToId(현재 폼) 우선, 없으면 allFieldKeyToId(같은 탭 내 다른 폼) 탐색 */
        const resolveTargetFieldId = (generationKey: string): string | undefined => {
            if (generationKey.includes('.')) return allFieldKeyToId?.[generationKey];
            return keyToId[generationKey] ?? allFieldKeyToId?.[generationKey];
        };

        /* 대상 fieldId에 변환값 전달
         * - 현재 폼 소속: onChangeValues
         * - 다른 폼 소속: onChangeAllFormValues */
        const dispatchValue = (targetFieldId: string, transformed: string) => {
            if (keyToId[Object.keys(keyToId).find(k => keyToId[k] === targetFieldId) ?? ''] !== undefined || Object.values(keyToId).includes(targetFieldId)) {
                onChangeValues?.(targetFieldId, transformed);
            } else {
                onChangeAllFormValues?.(targetFieldId, transformed);
            }
        };

        /* 단일 generationKey 처리 (기존 호환) */
        if (sourceField.generationKey) {
            const targetFieldId = resolveTargetFieldId(sourceField.generationKey);
            const transformed = applyDataGeneration(value, sourceField.dataReplacement, sourceField.caseChange, sourceField.appendText, sourceField.truncateLength, undefined);
            if (targetFieldId && targetFieldId !== fieldId) {
                dispatchValue(targetFieldId, transformed);
            } else if (!targetFieldId) {
                /* 현재 탭에서 못 찾음 → generationKey(fieldKey)를 키로 cross-tab 에스컬레이션 */
                onChangeAllFormValues?.(sourceField.generationKey, transformed);
            }
        }

        /* 다중 dataGenerations 배열 처리 */
        (sourceField.dataGenerations ?? []).forEach(dg => {
            if (!dg.generationKey) return;
            const targetFieldId = resolveTargetFieldId(dg.generationKey);
            const transformed = applyDataGeneration(value, dg.dataReplacement, dg.caseChange, dg.appendText, dg.truncateLength, dg.stripHtml);
            if (targetFieldId && targetFieldId !== fieldId) {
                /* onlyIfEmpty=true: 초기값 기준 체크 — 신규 등록은 연속 반영, 편집 모드는 기존값 보호 */
                if (dg.onlyIfEmpty) {
                    const initialVal = initialValuesRef.current[targetFieldId] ?? initialAllFormValuesRef.current?.[targetFieldId] ?? '';
                    if (initialVal !== '') return;
                }
                dispatchValue(targetFieldId, transformed);
            } else if (!targetFieldId) {
                /* 현재 탭에서 못 찾음 → generationKey(fieldKey)를 키로 cross-tab 에스컬레이션 */
                if (dg.onlyIfEmpty) {
                    const crossFieldId = allFieldKeyToId?.[dg.generationKey];
                    const initialCrossVal = (crossFieldId ? initialAllFormValuesRef.current?.[crossFieldId] : undefined) ?? '';
                    if (initialCrossVal !== '') return;
                }
                onChangeAllFormValues?.(dg.generationKey, transformed);
            }
        });
    }, [fields, keyToId, allFieldKeyToId, onChangeValues, onChangeAllFormValues]);


    if (!fields.length) {
        return (
            <RendererContainer showBorder={showBorder} bgColor={bgColor} className="flex items-center justify-center">
                <span className="text-[10px] text-slate-300 italic">필드를 추가하세요</span>
            </RendererContainer>
        );
    }

    return (
        /* RendererContainer — grid 배치 공통 처리 (contentColSpan 전달 시 CSS Grid 활성화) */
        <RendererContainer showBorder={showBorder} bgColor={bgColor} contentColSpan={contentColSpan}>
            {/* 타이틀 — grid item으로 전체 너비 차지 (1행 고정) */}
            {(titleMsgKey || title) && (
                <div
                    className="flex flex-col justify-center px-3"
                    style={{ gridColumn: `span ${contentColSpan}`, gridRow: 'span 1' }}
                >
                    <h3 className="text-sm font-bold text-slate-900">
                        {titleMsgKey ? t(titleMsgKey) : title}
                    </h3>
                    {(descriptionMsgKey || description) && (
                        <p className="text-xs text-slate-400 mt-0.5">
                            {descriptionMsgKey ? t(descriptionMsgKey) : description}
                        </p>
                    )}
                </div>
            )}
            {/* 필드들 — gridColumn/gridRow로 자리만 지정, 나머지는 RendererContainer grid가 처리 */}
            {fields.map(f => {
                /* live 모드에서 hideCondition 조건 충족 시 렌더링 skip */
                if (shouldHide(f)) return null;
                return (
                <div
                    key={f.id}
                    className="flex flex-col px-3 min-w-0"
                    style={{
                        gridColumn: `span ${Math.min(f.colSpan, contentColSpan)}`,
                        gridRow: `span ${f.rowSpan}`,
                    }}
                >
                    {/* 라벨 — labelMsgKey 있으면 t(key), 없으면 label 직접 표시 */}
                    {(f.labelMsgKey || f.label) && (
                        <label className="block text-xs font-medium text-slate-700 flex-shrink-0">
                            {f.labelMsgKey ? t(f.labelMsgKey) : f.label}
                            {f.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                    )}
                    {/* 설명 — descriptionMsgKey 우선, 없으면 description 직접 표시 */}
                    <p className="text-[10px] text-slate-400 mb-0.5 flex-shrink-0 leading-tight truncate min-h-[13px]">
                        {f.descriptionMsgKey ? t(f.descriptionMsgKey) : f.description}
                    </p>
                    {/* 필드 렌더링 */}
                    <div className="flex-1 min-h-0">
                        <FieldRenderer
                            mode={mode}
                            field={f as unknown as SearchFieldConfig}
                            codeGroups={codeGroups}
                            value={(f.type === 'dateRange' || f.type === 'yearMonthRange') ? undefined : (values?.[f.id] ?? '')}
                            onChange={(f.type === 'dateRange' || f.type === 'yearMonthRange') ? undefined : (isPreview ? () => {} : v => handleFieldChange(f.id, v))}
                            valueFrom={(f.type === 'dateRange' || f.type === 'yearMonthRange') ? (values?.[f.id + '_from'] ?? '') : undefined}
                            valueTo={(f.type === 'dateRange' || f.type === 'yearMonthRange') ? (values?.[f.id + '_to'] ?? '') : undefined}
                            onFromChange={(f.type === 'dateRange' || f.type === 'yearMonthRange') ? (isPreview ? undefined : v => handleFieldChange(f.id + '_from', v)) : undefined}
                            onToChange={(f.type === 'dateRange' || f.type === 'yearMonthRange') ? (isPreview ? undefined : v => handleFieldChange(f.id + '_to', v)) : undefined}
                            /* address 전용: Places 후보 선택 시 주소+위도+경도 3값을 fieldId/_lat/_lng 3키로 한 번에 저장
                               (dateRange가 _from/_to 2키로 나눠 저장하는 것과 동일한 flat key 패턴) */
                            onAddressSelect={(f.type === 'address' && !isPreview) ? (address, lat, lng) => {
                                handleFieldChange(f.id, address);
                                handleFieldChange(f.id + '_lat', String(lat));
                                handleFieldChange(f.id + '_lng', String(lng));
                            } : undefined}
                            fileList={fileValues?.[f.id]}
                            existingFileMeta={existingFileMeta?.[f.id]}
                            imgBlobUrls={imgBlobUrls}
                            onFileChange={isPreview ? undefined : files => onFileChange?.(f.id, files)}
                            onRemoveExisting={isPreview ? undefined : fileId => onRemoveExisting?.(f.id, fileId)}
                            forceDisabled={shouldDisable(f)}
                            rowData={rowData}
                            isEntity={isEntity}
                        />
                    </div>
                </div>
                );
            })}
        </RendererContainer>
    );
}
