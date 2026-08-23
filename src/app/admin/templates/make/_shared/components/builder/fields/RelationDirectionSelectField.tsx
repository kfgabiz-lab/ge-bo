"use client";

import React from "react";
import { SlugSelectField } from "./SlugSelectField";
import { selectCls } from "../../../styles";
import { SelectArrow } from "../../SelectArrow";
import type { SlugRelationOption } from "../../SearchBuilder";
import type { PageRelationDirection, PageRelationLink } from "../../../hooks/useOutputMode";
import { formatRelationLabel } from "../relationLabel";

interface RelationDirectionSelectFieldProps {
  label: string;
  value: PageRelationLink[];
  onChange: (v: PageRelationLink[]) => void;
  relations: SlugRelationOption[];
  emptyLabel?: string;
}

const DIRECTION_OPTIONS: { value: PageRelationDirection; label: string }[] = [
  { value: "in", label: "IN" },
  { value: "out", label: "OUT" },
];

export function RelationDirectionSelectField({
  label,
  value,
  onChange,
  relations,
  emptyLabel,
}: RelationDirectionSelectFieldProps) {
  const selectedIds = value.map((link) => link.relationId);
  const availableRelations = relations.filter((r) => !selectedIds.includes(r.id));

  const handleAdd = (slug: string) => {
    if (!slug) return;
    const id = Number(slug);
    if (!Number.isFinite(id) || selectedIds.includes(id)) return;
    onChange([...value, { relationId: id, direction: "in" }]);
  };

  const handleRemove = (relationId: number) => {
    onChange(value.filter((link) => link.relationId !== relationId));
  };

  const handleDirectionChange = (relationId: number, direction: PageRelationDirection) => {
    onChange(value.map((link) => (link.relationId === relationId ? { ...link, direction } : link)));
  };

  return (
    <div>
      <SlugSelectField
        label={label}
        value=""
        onChange={handleAdd}
        slugOptions={availableRelations.map((r) => ({
          id: r.id,
          slug: String(r.id),
          name: formatRelationLabel(r),
        }))}
        formatDisplay={(opt) => opt.name}
        emptyLabel={emptyLabel ?? "연동 없음"}
      />
      {value.length > 0 && (
        <div className="space-y-1.5 mt-1.5">
          {value.map((link) => {
            const rel = relations.find((r) => r.id === link.relationId);
            const relLabel = rel ? formatRelationLabel(rel) : `#${link.relationId}`;
            return (
              <div key={link.relationId} className="flex items-center gap-1.5">
                <div className="relative w-20 shrink-0">
                  <select
                    value={link.direction}
                    onChange={(e) => handleDirectionChange(link.relationId, e.target.value as PageRelationDirection)}
                    className={selectCls}
                  >
                    {DIRECTION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <SelectArrow />
                </div>
                <span className="flex-1 text-xs text-slate-700 truncate" title={relLabel}>
                  {relLabel}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(link.relationId)}
                  className="text-slate-400 hover:text-slate-600 leading-none px-1"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
