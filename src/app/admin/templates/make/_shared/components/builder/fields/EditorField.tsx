import { FieldEditProps } from './types';
import { FieldBase } from './_FieldBase';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';

/**
 * EditorField: 위지윅 에디터 설정용 L3 컴포넌트
 */
export const EditorField = (props: FieldEditProps) => {
    const { values, onChange } = props;
    const { i18nMode } = useBuilderI18nMode();

    return (
        <FieldBase {...props} onChange={onChange} label={values.label} labelMsgKey={values.labelMsgKey} fieldKey={values.fieldKey}
            colSpan={values.colSpan} colSpanMode={props.colSpanMode}
            rowSpan={values.rowSpan} rowSpanConfig={props.rowSpanConfig}
            labelOptional isPk={values.isPk} required={values.required}
            description={values.description} descriptionMsgKey={values.descriptionMsgKey} readonly={values.readonly}
            hideCondition={values.hideCondition}
            disableCondition={values.disableCondition}>
            <div className="space-y-3 pt-1 border-t border-slate-100 mt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">에디터 설정</p>

                <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">Placeholder</label>
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
                            onChange={e => onChange({ placeholder: e.target.value || undefined })}
                            placeholder="내용을 입력하세요"
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                        />
                    )}
                </div>

                {/* 기본값 */}
                <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">기본값</label>
                    {i18nMode ? (
                        <MessageKeySelector
                            value={values.defaultValueMsgKey ?? ''}
                            onChange={key => onChange({ defaultValueMsgKey: key || undefined })}
                            size="sm"
                        />
                    ) : (
                        <input
                            type="text"
                            value={values.defaultValue || ''}
                            onChange={e => onChange({ defaultValue: e.target.value || undefined })}
                            placeholder="기본 내용"
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                        />
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">최소 글자 수</label>
                        <input
                            type="number"
                            min={0}
                            value={values.minLength ?? ''}
                            onChange={e => onChange({ minLength: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">최대 글자 수</label>
                        <input
                            type="number"
                            min={0}
                            value={values.maxLength ?? ''}
                            onChange={e => onChange({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                        />
                    </div>
                </div>
            </div>
        </FieldBase>
    );
};
