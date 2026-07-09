'use client';

/**
 * SelectField — 셀렉트 박스 필드 설정 컴포넌트
 *
 * 사용법:
 *   <SelectField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5] }}
 *     codeGroups={codeGroups} codeGroupsLoading={loading} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { FieldOptions } from './_FieldOptions';
import { ToggleRow } from './_ToggleRow';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';
import { selectCls } from '../../../styles';

export function SelectField({ values, onChange, colSpanMode, rowSpanConfig, codeGroups, codeGroupsLoading, autoFocus, onLabelKeyDown, hideColSpan, hideConditionFields, slugEntityFields, slugOptions }: FieldEditProps) {
    const { i18nMode } = useBuilderI18nMode();
    return (
        <div className="space-y-1.5">
            {/* 타입 선택 — selectbox(기본) 또는 autocomplete */}
            <div>
                <label className={LABEL_CLS}>타입</label>
                <select
                    value={values.selectType ?? 'selectbox'}
                    onChange={e => onChange({ selectType: e.target.value as 'selectbox' | 'autocomplete' })}
                    className={selectCls}
                >
                    <option value="selectbox">selectbox</option>
                    <option value="autocomplete">autocomplete</option>
                </select>
            </div>
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
                excludeFromSearch={values.excludeFromSearch}
                hideColSpan={hideColSpan}
                hideConditionFields={hideConditionFields}
                slugEntityFields={slugEntityFields}
                onChange={onChange}
            />
            {/* Placeholder */}
            <div>
                <label className={LABEL_CLS}>Placeholder</label>
                {i18nMode ? (
                    <MessageKeySelector
                        value={values.placeholderMsgKey ?? ''}
                        onChange={key => onChange({ placeholderMsgKey: key })}
                        resourceType={undefined}
                        size="sm"
                    />
                ) : (
                    <input type="text" value={values.placeholder || ''}
                        onChange={e => onChange({ placeholder: e.target.value })}
                        placeholder="예: 전체"
                        className={INPUT_CLS} />
                )}
            </div>
            {/* 옵션 — SLUG 탭 포함 (select 전용) */}
            <FieldOptions
                options={values.options}
                codeGroupCode={values.codeGroupCode}
                optionSlug={values.optionSlug}
                optionValueKey={values.optionValueKey}
                optionTextKey={values.optionTextKey}
                optionOrderKey={values.optionOrderKey}
                optionOrderDir={values.optionOrderDir}
                optionFilter={values.optionFilter}
                codeGroups={codeGroups}
                codeGroupsLoading={codeGroupsLoading}
                onChange={updates => onChange(updates)}
                defaultOptionValue={values.defaultOptionValue}
                onDefaultOptionChange={v => onChange({ defaultOptionValue: v || undefined })}
                showSlugTab={true}
                slugOptions={slugOptions}
            />
            <div>
                <label className={LABEL_CLS}>조건식 검색 <span className="text-slate-300 font-normal">(선택)</span></label>
                <input
                    type="text"
                    value={values.data ?? ''}
                    onChange={e => onChange({ data: e.target.value || undefined })}
                    placeholder="예: isVisible=001,postDate_from<today(),postDate_to>today()?게시:미게시"
                    className={`${INPUT_CLS} font-mono`}
                />
            </div>
            {/* 필수 항목 */}
        </div>
    );
}
