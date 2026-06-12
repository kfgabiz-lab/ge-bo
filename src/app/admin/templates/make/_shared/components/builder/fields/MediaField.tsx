import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { FILE_TYPE_LABELS } from '../../../constants';

/**
 * MediaField: 이미지 + 동영상 통합 업로드 설정용 L3 컴포넌트
 *
 * 허용 확장자는 고정 표시 (ImageField 패턴),
 * 이미지·동영상 각각 최대 크기(MB)만 설정 가능.
 */
export const MediaField = (props: FieldEditProps) => {
    const { values, onChange } = props;

    return (
        <FieldBase
            {...props}
            onChange={onChange}
            label={values.label}
            labelMsgKey={values.labelMsgKey}
            fieldKey={values.fieldKey}
            colSpan={values.colSpan}
            rowSpan={values.rowSpan}
            colSpanMode={props.colSpanMode}
            isPk={values.isPk}
            required={values.required}
            description={values.description}
            descriptionMsgKey={values.descriptionMsgKey}
            readonly={values.readonly}
            hideCondition={values.hideCondition}
            disableCondition={values.disableCondition}
        >
            <div className="space-y-3 pt-1 border-t border-slate-100 mt-1">

                {/* ── 이미지 섹션 ── */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">이미지 설정</p>
                    <div>
                        <label className={LABEL_CLS}>최대 크기 (MB)</label>
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={values.mediaImageMaxSizeMB ?? 5}
                            onChange={e => onChange({ mediaImageMaxSizeMB: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })}
                            className={INPUT_CLS}
                        />
                    </div>
                    {/* 허용 형식 고정 표시 */}
                    <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                        <p className="text-[10px] font-semibold text-slate-500 mb-1">허용 형식 (고정)</p>
                        <p className="text-[9.5px] text-slate-400 leading-relaxed font-mono">{FILE_TYPE_LABELS.image}</p>
                    </div>
                </div>

                {/* ── 동영상 섹션 ── */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">동영상 설정</p>
                    <div>
                        <label className={LABEL_CLS}>최대 크기 (MB)</label>
                        <input
                            type="number"
                            min={1}
                            max={2048}
                            value={values.mediaVideoMaxSizeMB ?? 20}
                            onChange={e => onChange({ mediaVideoMaxSizeMB: Math.max(1, Math.min(2048, Number(e.target.value) || 1)) })}
                            className={INPUT_CLS}
                        />
                    </div>
                    {/* 허용 형식 고정 표시 */}
                    <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                        <p className="text-[10px] font-semibold text-slate-500 mb-1">허용 형식 (고정)</p>
                        <p className="text-[9.5px] text-slate-400 leading-relaxed font-mono">{FILE_TYPE_LABELS.video}</p>
                    </div>
                </div>

            </div>
        </FieldBase>
    );
};
