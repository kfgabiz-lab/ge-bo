import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';

/**
 * ImageField: 이미지 설정용 L3 컴포넌트
 */
export const ImageField = (props: FieldEditProps) => {
    const { values, onChange } = props;

    return (
        <FieldBase {...props} onChange={onChange} label={values.label} fieldKey={values.fieldKey} colSpan={values.colSpan} colSpanMode={props.colSpanMode} isPk={values.isPk}
                required={values.required}
        readonly={values.readonly}>
            <div className="space-y-3 pt-1 border-t border-slate-100 mt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">이미지 등록 설정</p>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">최대 이미지 수</label>
                        <input
                            type="number" min={1} max={20}
                            value={values.maxFileCount ?? 1}
                            onChange={e => onChange({ maxFileCount: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">개당 최대 (MB)</label>
                        <input
                            type="number" min={1} max={50}
                            value={values.maxFileSizeMB ?? 10}
                            onChange={e => onChange({ maxFileSizeMB: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                        />
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                    <p className="text-[10px] font-semibold text-slate-500 mb-1">허용 형식 (고정)</p>
                    <p className="text-[9.5px] text-slate-400 leading-relaxed font-mono">jpg, jpeg, png, gif, webp, svg, bmp</p>
                </div>
            </div>
        </FieldBase>
    );
};
