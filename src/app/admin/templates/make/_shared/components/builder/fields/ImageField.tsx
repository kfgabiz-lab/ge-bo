import React from "react";
import { FieldEditProps } from "./types";
import { FieldBase, INPUT_CLS, LABEL_CLS } from "./_FieldBase";
import { FILE_TYPE_LABELS } from "../../../constants";

/**
 * ImageField: 이미지 설정용 L3 컴포넌트
 */
export const ImageField = (props: FieldEditProps) => {
  const { values, onChange } = props;

  /* 용량 단위 — 미설정 시 'MB' (하위호환). 단위에 따라 입력 상한을 다르게 적용해야
       KB 선택 시에도 실무에서 쓰는 값(수백 KB)을 입력할 수 있다 */
  const sizeUnit = values.maxFileSizeUnit ?? "MB";
  const sizeMax = sizeUnit === "KB" ? 50 * 1024 : 50;

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
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">이미지 등록 설정</p>

        <div>
          <label className={LABEL_CLS}>최대 이미지 수</label>
          <input
            type="number"
            min={1}
            max={20}
            value={values.maxFileCount ?? 1}
            onChange={(e) => onChange({ maxFileCount: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
            className={INPUT_CLS}
          />
        </div>

        {/* 이미지 크기 제한 (px) — 0 또는 빈값이면 제한 없음 */}
        <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">이미지 크기 제한 (px)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL_CLS}>
                가로 최대(px) <span className="text-slate-300 font-normal">(선택)</span>
              </label>
              <input
                type="number"
                min={0}
                value={values.imageMaxWidthPx ?? ""}
                onChange={(e) => {
                  const n = Number(e.target.value) || 0;
                  onChange({ imageMaxWidthPx: n > 0 ? n : undefined });
                }}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>
                세로 최대(px) <span className="text-slate-300 font-normal">(선택)</span>
              </label>
              <input
                type="number"
                min={0}
                value={values.imageMaxHeightPx ?? ""}
                onChange={(e) => {
                  const n = Number(e.target.value) || 0;
                  onChange({ imageMaxHeightPx: n > 0 ? n : undefined });
                }}
                className={INPUT_CLS}
              />
            </div>
          </div>
        </div>

        {/* 용량 제한 — 숫자 + 단위(KB/MB) */}
        <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">용량 제한</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL_CLS}>개당 최대</label>
              <input
                type="number"
                min={1}
                max={sizeMax}
                value={values.maxFileSizeMB ?? 10}
                onChange={(e) =>
                  onChange({ maxFileSizeMB: Math.max(1, Math.min(sizeMax, Number(e.target.value) || 1)) })
                }
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>단위</label>
              {/* INPUT_CLS 재사용 — DateRangeField 선례와 동일하게 select에도 그대로 사용 */}
              <select
                value={sizeUnit}
                onChange={(e) => onChange({ maxFileSizeUnit: e.target.value as "KB" | "MB" })}
                className={INPUT_CLS}
              >
                <option value="MB">MB</option>
                <option value="KB">KB</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
          <p className="text-[10px] font-semibold text-slate-500 mb-1">허용 형식 (고정)</p>
          <p className="text-[9.5px] text-slate-400 leading-relaxed font-mono">{FILE_TYPE_LABELS.image}</p>
        </div>
      </div>
    </FieldBase>
  );
};
