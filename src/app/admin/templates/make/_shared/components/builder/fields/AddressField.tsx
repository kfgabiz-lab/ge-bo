'use client';

/**
 * AddressField — 주소검색 필드 설정 컴포넌트
 *
 * 저장값 구조(types.ts AddressFieldValue 참고)는 렌더러(FieldRenderer)가 Google Places
 * 저수준 검색 API로 채우므로, 빌더 설정 화면에서는 다른 필드처럼 옵션·기본값을 직접
 * 입력하는 항목이 없다 — 공통 항목(라벨/Key/Placeholder/필수/ColSpan/RowSpan/설명)만 있으면 된다.
 *
 * 사용법:
 *   <AddressField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'input', min: 1, max: 12 }}
 *     codeGroups={[]} codeGroupsLoading={false} />
 */

import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { FieldEditProps } from './types';
import { FieldBase, LABEL_CLS, INPUT_CLS } from './_FieldBase';

export function AddressField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown, hideColSpan, hideConditionFields, slugEntityFields }: FieldEditProps) {
    const { i18nMode } = useBuilderI18nMode();

    return (
        <div className="space-y-1.5">
            <FieldBase
                label={values.label} labelMsgKey={values.labelMsgKey}
                fieldKey={values.fieldKey}
                colSpan={values.colSpan} colSpanMode={colSpanMode}
                rowSpan={values.rowSpan} rowSpanConfig={rowSpanConfig}
                autoFocus={autoFocus} onLabelKeyDown={onLabelKeyDown}
                required={values.required}
                description={values.description}
                descriptionMsgKey={values.descriptionMsgKey}
                hideCondition={values.hideCondition}
                disableCondition={values.disableCondition}
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
                    <input
                        type="text"
                        value={values.placeholder || ''}
                        onChange={e => onChange({ placeholder: e.target.value })}
                        placeholder="예: 주소를 검색하세요"
                        className={INPUT_CLS}
                    />
                )}
            </div>
            {/* 검색 결과 언어 — 영문 / 한글 2택 토글 (VideoField URL/파일 탭 패턴 재사용) */}
            <div>
                <label className={LABEL_CLS}>검색 결과 언어</label>
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                        type="button"
                        onClick={() => onChange({ addressLanguage: 'en' })}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${(values.addressLanguage ?? 'en') === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >영문</button>
                    <button
                        type="button"
                        onClick={() => onChange({ addressLanguage: 'ko' })}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${values.addressLanguage === 'ko' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >한글</button>
                </div>
            </div>
        </div>
    );
}
