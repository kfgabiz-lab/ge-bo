"use client";

import { INPUT_CLS, LABEL_CLS } from "./_FieldBase";

export interface HiddenFieldValues {
  fieldKey: string;
  defaultValue?: string;
}

interface HiddenFieldProps {
  values: HiddenFieldValues;
  onChange: (updates: Partial<HiddenFieldValues>) => void;
}

export function HiddenField({ values, onChange }: HiddenFieldProps) {
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <label className={LABEL_CLS}>
          Key <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={INPUT_CLS}
          value={values.fieldKey ?? ""}
          placeholder="예: depth"
          onChange={(e) => onChange({ fieldKey: e.target.value })}
        />
      </div>
      <div className="flex-1">
        <label className={LABEL_CLS}>
          Value <span className="text-slate-400 font-normal">(기본값)</span>
        </label>
        <input
          type="text"
          className={INPUT_CLS}
          value={values.defaultValue ?? ""}
          placeholder="예: 1"
          onChange={(e) => onChange({ defaultValue: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
