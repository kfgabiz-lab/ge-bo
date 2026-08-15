"use client";

import { useEffect, useRef } from "react";
import { buildSearchFieldDefaultValues, getSearchFieldValueKeys } from "../../utils";
import type { SearchFieldConfig } from "../../types";

interface UseHiddenSearchFieldResetParams {
  isPreview: boolean;
  fields: SearchFieldConfig[];
  hiddenMap: Record<string, boolean>;
  values: Record<string, string>;
  onChangeValues?: (fieldId: string, value: string) => void;
}

export function useHiddenSearchFieldReset({
  isPreview,
  fields,
  hiddenMap,
  values,
  onChangeValues,
}: UseHiddenSearchFieldResetParams): void {
  const prevHiddenRef = useRef<Record<string, boolean>>({});
  const onChangeRef = useRef(onChangeValues);
  const valuesRef = useRef(values);

  useEffect(() => {
    onChangeRef.current = onChangeValues;
    valuesRef.current = values;
  });

  useEffect(() => {
    if (isPreview) return;
    if (!onChangeRef.current) return;

    fields.forEach((f) => {
      const isHidden = !!hiddenMap[f.id];
      const wasHidden = prevHiddenRef.current[f.id];

      if (wasHidden === undefined) {
        prevHiddenRef.current[f.id] = isHidden;
        return;
      }

      if (!wasHidden && isHidden) {
        const defaults = buildSearchFieldDefaultValues(f);
        getSearchFieldValueKeys(f).forEach((key) => {
          const target = defaults[key] ?? "";
          if (valuesRef.current[key] !== target) {
            onChangeRef.current?.(key, target);
          }
        });
      }

      prevHiddenRef.current[f.id] = isHidden;
    });
  }, [hiddenMap, fields, isPreview]);
}
