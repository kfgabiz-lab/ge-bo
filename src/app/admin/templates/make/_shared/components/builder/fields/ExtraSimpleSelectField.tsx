'use client';

/**
 * ExtraSimpleSelectField — 다중선택 추가 필드 (select / radio / checkbox 타입) 설정 컴포넌트
 *
 * 기존 SelectField에서 colSpan / ValidationSection / 동적 조건을 제거한 축소 버전.
 * FieldBase로 라벨·Key·다국어·필수항목을 처리하고, _FieldOptions로 수동/공통코드 옵션을 처리.
 *
 * 사용법:
 *   <ExtraSimpleSelectField
 *     values={values} onChange={onChange}
 *     codeGroups={codeGroups} codeGroupsLoading={loading} />
 */

import { FieldBase } from './_FieldBase';
import { FieldOptions } from './_FieldOptions';
import type { CodeGroupDef } from '../../../types';

export interface ExtraSimpleSelectFieldValues {
    label: string;
    labelMsgKey?: string;
    fieldKey: string;
    options?: string[];
    codeGroupCode?: string;
    required?: boolean;
}

interface ExtraSimpleSelectFieldProps {
    values: ExtraSimpleSelectFieldValues;
    onChange: (updates: Partial<ExtraSimpleSelectFieldValues>) => void;
    codeGroups: CodeGroupDef[];
    codeGroupsLoading: boolean;
    /** Slug Entity 필드 목록 — 있으면 Key 입력이 selectbox로 전환됨 (widget 빌더 전용) */
    slugEntityFields?: { key: string | null; label: string }[];
}

export function ExtraSimpleSelectField({ values, onChange, codeGroups, codeGroupsLoading, slugEntityFields }: ExtraSimpleSelectFieldProps) {
    return (
        <div className="space-y-1.5">
            {/* 라벨 | Key | 필수항목 — FieldBase가 다국어 포함 처리 */}
            <FieldBase
                label={values.label}
                labelMsgKey={values.labelMsgKey}
                fieldKey={values.fieldKey}
                colSpan={1}
                colSpanMode={{ type: 'input', min: 1, max: 1 }}
                hideColSpan={true}
                hideConditionFields={true}
                required={values.required}
                slugEntityFields={slugEntityFields}
                onChange={updates => onChange({
                    ...(updates.label       !== undefined && { label:       updates.label }),
                    ...(updates.labelMsgKey !== undefined && { labelMsgKey: updates.labelMsgKey }),
                    ...(updates.fieldKey    !== undefined && { fieldKey:    updates.fieldKey }),
                    ...(updates.required    !== undefined && { required:    updates.required }),
                })}
            />

            {/* 옵션 — 수동 입력 / 공통코드 탭 (_FieldOptions 기존 그대로) */}
            <FieldOptions
                options={values.options}
                codeGroupCode={values.codeGroupCode}
                codeGroups={codeGroups}
                codeGroupsLoading={codeGroupsLoading}
                onChange={updates => onChange(updates)}
            />
        </div>
    );
}
