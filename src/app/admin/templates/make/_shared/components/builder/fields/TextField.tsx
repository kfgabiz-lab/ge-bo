'use client';

/**
 * TextField — 연결 Slug 값 표시 전용 필드 설정 컴포넌트
 *
 * Input과 달리 사용자 입력을 받지 않고, 연결 Slug로 가져온 값을 그대로 보여주기만 한다.
 * TableBuilder의 "Text" 셀타입과 동일한 개념 — SlugSelectField(연결 Slug) + FetchDisplayField(출력방식+Data)를 그대로 재사용한다.
 *
 * 사용법:
 *   <TextField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'input', min: 1, max: 12 }}
 *     fetchRelations={slugRelations} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase } from './_FieldBase';
import { SlugSelectField } from './SlugSelectField';
import { FetchDisplayField } from './FetchDisplayField';
import { buildFetchKey } from './utils';

export function TextField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown, hideColSpan, hideConditionFields, slugEntityFields, fetchRelations = [] }: FieldEditProps) {
    return (
        <div className="space-y-1.5">
            <FieldBase
                label={values.label}
                labelMsgKey={values.labelMsgKey}
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
                labelSideSlot={
                    /* 연결 Slug — 라벨 오른쪽 슬롯으로 배치 (InputField와 동일 패턴) */
                    <SlugSelectField
                        label="연결 Slug"
                        value={String(values.relationSlugId ?? '')}
                        onChange={slug => {
                            if (slug) {
                                const id = Number(slug);
                                const selected = fetchRelations.find(r => r.id === id);
                                onChange({
                                    relationSlugId: id,
                                    fieldKey: selected ? buildFetchKey(selected.id) : values.fieldKey,
                                });
                            } else {
                                onChange({ relationSlugId: undefined });
                            }
                        }}
                        slugOptions={fetchRelations.map(r => ({
                            id: r.id,
                            slug: String(r.id),
                            name: r.description
                                ? `${r.description} (${r.masterSlug} → ${r.slaveSlug})`
                                : `${r.masterSlug} → ${r.slaveSlug}`,
                        }))}
                        formatDisplay={opt => opt.name}
                        emptyLabel="연동 없음"
                    />
                }
                keySideSlotFullWidth={
                    /* 출력방식 + Data — Key 아래 전체 폭 row로 3:7 배치 (Table ColumnBaseField와 동일 레이아웃·동일 컴포넌트 재사용) */
                    <FetchDisplayField
                        fetchDisplayMode={values.fetchDisplayMode}
                        data={values.data}
                        onChange={patch => onChange(patch)}
                    />
                }
            />
        </div>
    );
}
