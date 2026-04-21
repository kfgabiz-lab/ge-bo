import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';

/**
 * EditorField: 위지윅 에디터 설정용 L3 컴포넌트
 */
export const EditorField = (props: FieldEditProps) => {
    const { values, onChange } = props;

    return (
        <FieldBase {...props} onChange={onChange} label={values.label} fieldKey={values.fieldKey} colSpan={values.colSpan} colSpanMode={props.colSpanMode} isPk={values.isPk}
                required={values.required}
        readonly={values.readonly}>
            <div className="space-y-3 pt-1 border-t border-slate-100 mt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">에디터 설정</p>

                <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">Placeholder</label>
                    <input
                        type="text"
                        value={values.placeholder || ''}
                        onChange={e => onChange({ placeholder: e.target.value || undefined })}
                        placeholder="내용을 입력하세요"
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                    />
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
