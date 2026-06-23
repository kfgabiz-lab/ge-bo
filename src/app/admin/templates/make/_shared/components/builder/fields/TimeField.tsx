'use client';

/**
 * TimeField — 시간 선택 필드 설정 컴포넌트
 *
 * 사용법:
 *   <TimeField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'input', min: 1, max: 12 }}
 *     codeGroups={[]} codeGroupsLoading={false} />
 */

import { FieldEditProps } from './types';
import { FieldBase, LABEL_CLS, INPUT_CLS } from './_FieldBase';

/** step 옵션 (분 단위) */
const STEP_OPTIONS = [1, 5, 10, 30] as const;

const BTN_BASE = 'px-2 py-1 text-xs rounded border transition-colors';
const BTN_ACTIVE = 'bg-slate-900 text-white border-slate-900';
const BTN_INACTIVE = 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50';

export function TimeField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown, hideColSpan, hideConditionFields }: FieldEditProps) {
    const currentStep = values.timeStep ?? 1;

    return (
        <div className="space-y-1.5">
            <FieldBase
                label={values.label} labelMsgKey={values.labelMsgKey}
                fieldKey={values.fieldKey}
                colSpan={values.colSpan} colSpanMode={colSpanMode}
                rowSpan={values.rowSpan} rowSpanConfig={rowSpanConfig}
                autoFocus={autoFocus} onLabelKeyDown={onLabelKeyDown}
                isPk={values.isPk}
                required={values.required}
                description={values.description}
                descriptionMsgKey={values.descriptionMsgKey}
                readonly={values.readonly}
                hideCondition={values.hideCondition}
                disableCondition={values.disableCondition}
                hideColSpan={hideColSpan}
                hideConditionFields={hideConditionFields}
                onChange={onChange}
            />
            {/* 기본값 */}
            <div>
                <label className={LABEL_CLS}>기본값 (HH:MM)</label>
                <input
                    type="time"
                    value={values.defaultTime ?? ''}
                    onChange={e => onChange({ defaultTime: e.target.value || undefined })}
                    className={INPUT_CLS}
                />
            </div>
            {/* Step — 분 단위 간격 */}
            <div>
                <label className={LABEL_CLS}>Step (분 단위)</label>
                <div className="flex gap-1">
                    {STEP_OPTIONS.map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => onChange({ timeStep: s === 1 ? undefined : s })}
                            className={`${BTN_BASE} ${currentStep === s ? BTN_ACTIVE : BTN_INACTIVE}`}
                        >
                            {s}분
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
