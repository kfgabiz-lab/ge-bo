'use client';

/**
 * ExtraSimpleInputField — 다중선택 추가 필드 (input / date 타입) 설정 컴포넌트
 *
 * 기존 InputField에서 colSpan / ValidationSection / 동적 조건을 제거한 축소 버전.
 * FieldBase로 라벨·Key·다국어·필수항목을 처리하고 Placeholder만 직접 추가.
 *
 * 사용법:
 *   <ExtraSimpleInputField values={values} onChange={onChange} />
 */

import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';

export interface ExtraSimpleInputFieldValues {
    label: string;
    labelMsgKey?: string;
    fieldKey: string;
    placeholder?: string;
    placeholderMsgKey?: string;
    required?: boolean;
}

interface ExtraSimpleInputFieldProps {
    values: ExtraSimpleInputFieldValues;
    onChange: (updates: Partial<ExtraSimpleInputFieldValues>) => void;
    /** Slug Entity 필드 목록 — 있으면 Key 입력이 selectbox로 전환됨 (widget 빌더 전용) */
    slugEntityFields?: { key: string | null; label: string }[];
}

export function ExtraSimpleInputField({ values, onChange, slugEntityFields }: ExtraSimpleInputFieldProps) {
    const { i18nMode } = useBuilderI18nMode();

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

            {/* Placeholder — i18nMode 시 MessageKeySelector 전환 */}
            <div>
                <label className={LABEL_CLS}>Placeholder</label>
                {i18nMode ? (
                    <MessageKeySelector
                        value={values.placeholderMsgKey ?? ''}
                        onChange={key => onChange({ placeholderMsgKey: key || undefined })}
                        resourceType={undefined}
                        size="sm"
                    />
                ) : (
                    <input
                        type="text"
                        value={values.placeholder ?? ''}
                        onChange={e => onChange({ placeholder: e.target.value || undefined })}
                        placeholder="예: 내용을 입력하세요"
                        className={INPUT_CLS}
                    />
                )}
            </div>
        </div>
    );
}
