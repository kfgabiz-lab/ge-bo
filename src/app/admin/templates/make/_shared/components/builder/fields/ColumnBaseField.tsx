"use client";

import React from "react";
import { ColEditProps } from "./col-types";
import { INPUT_CLS, LABEL_CLS } from "./_FieldBase";
import { RelationMultiSelectField } from "./RelationMultiSelectField";
import { FetchDisplayField } from "./FetchDisplayField";
import { buildFetchKey } from "./utils";
import { getColumnRelationIds } from "../../../utils";
import { MessageKeySelector } from "@/components/i18n/message-key-selector";
import { useBuilderI18nMode } from "../../../contexts/BuilderI18nModeContext";
import type { SlugRelationOption } from "../../SearchBuilder";

interface ColumnBaseFieldProps extends ColEditProps {
  autoFocus?: boolean;
  fetchRelations?: SlugRelationOption[];
}

export function ColumnBaseField({ values, onChange, autoFocus, fetchRelations = [] }: ColumnBaseFieldProps) {
  const isActions = values.cellType === "actions";
  const { i18nMode } = useBuilderI18nMode();

  return (
    <div className="space-y-2">
      {!isActions && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={LABEL_CLS}>
              헤더명 <span className="text-red-400">*</span>
            </label>
            {i18nMode ? (
              <MessageKeySelector
                value={values.headerMsgKey ?? ""}
                onChange={(key) => onChange({ headerMsgKey: key })}
                resourceType="WORD"
                size="sm"
              />
            ) : (
              <input
                type="text"
                value={values.header ?? ""}
                autoFocus={autoFocus}
                onChange={(e) => onChange({ header: e.target.value })}
                className={INPUT_CLS}
              />
            )}
          </div>
          <div>
            <label className={LABEL_CLS}>
              Key <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={values.accessor ?? ""}
              onChange={(e) => onChange({ accessor: e.target.value })}
              className={`${INPUT_CLS} font-mono`}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL_CLS}>너비</label>
          <div className="flex">
            <input
              type="number"
              value={values.width ?? ""}
              onChange={(e) => onChange({ width: Number(e.target.value) || undefined })}
              className="flex-1 min-w-0 border border-slate-200 rounded-l px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
            />
            <select
              value={values.widthUnit ?? "px"}
              onChange={(e) => onChange({ widthUnit: e.target.value as "px" | "%" })}
              className="border border-l-0 border-slate-200 rounded-r px-1 py-1.5 text-xs bg-slate-50 focus:outline-none focus:border-slate-900"
            >
              <option value="px">px</option>
              <option value="%">%</option>
            </select>
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>정렬</label>
          <select
            value={values.align ?? "left"}
            onChange={(e) => onChange({ align: e.target.value as "left" | "center" | "right" })}
            className={INPUT_CLS}
          >
            <option value="left">좌측</option>
            <option value="center">중앙</option>
            <option value="right">우측</option>
          </select>
        </div>
      </div>

      {!isActions && (
        <>
          <RelationMultiSelectField
            label="연결 Slug"
            value={getColumnRelationIds(values)}
            onChange={(ids) => {
              const prevIds = getColumnRelationIds(values);
              if (ids.length === 0) {
                onChange({ relationSlugIds: undefined, relationSlugId: undefined });
                return;
              }
              const patch: { relationSlugIds: number[]; relationSlugId: number; accessor?: string } = {
                relationSlugIds: ids,
                relationSlugId: ids[0],
              };
              if (prevIds.length === 0) {
                patch.accessor = buildFetchKey(ids[0]);
              } else if (prevIds[0] !== ids[0] && values.accessor === buildFetchKey(prevIds[0])) {
                patch.accessor = buildFetchKey(ids[0]);
              }
              onChange(patch);
            }}
            relations={fetchRelations}
            emptyLabel="연동 없음"
          />

          <FetchDisplayField
            fetchDisplayMode={values.fetchDisplayMode}
            data={values.data}
            onChange={(patch) => onChange(patch)}
          />
        </>
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={values.sortable ?? true}
          onChange={(e) => onChange({ sortable: e.target.checked })}
          className="w-3.5 h-3.5 rounded border-slate-400 text-slate-900"
        />
        <span className="text-[11px] text-slate-600">정렬 활성화</span>
      </label>
    </div>
  );
}
