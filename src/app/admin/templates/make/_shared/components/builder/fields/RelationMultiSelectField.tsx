"use client";

import React from "react";
import { SlugSelectField } from "./SlugSelectField";
import type { SlugRelationOption } from "../../SearchBuilder";

interface RelationMultiSelectFieldProps {
  label: string;
  value: number[];
  onChange: (ids: number[]) => void;
  relations: SlugRelationOption[];
  emptyLabel?: string;
}

const formatRelationLabel = (r: SlugRelationOption) =>
  r.description ? `${r.description} (${r.masterSlug} → ${r.slaveSlug})` : `${r.masterSlug} → ${r.slaveSlug}`;

export function RelationMultiSelectField({
  label,
  value,
  onChange,
  relations,
  emptyLabel,
}: RelationMultiSelectFieldProps) {
  const availableRelations = relations.filter((r) => !value.includes(r.id));

  const handleAdd = (slug: string) => {
    if (!slug) return;
    const id = Number(slug);
    if (!Number.isFinite(id) || value.includes(id)) return;
    onChange([...value, id]);
  };

  const handleRemove = (id: number) => {
    onChange(value.filter((v) => v !== id));
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
        <div className="flex flex-wrap gap-1 mt-1.5">
          {value.map((id) => {
            const rel = relations.find((r) => r.id === id);
            const chipLabel = rel ? formatRelationLabel(rel) : `#${id}`;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700"
              >
                {chipLabel}
                <button
                  type="button"
                  onClick={() => handleRemove(id)}
                  className="text-slate-400 hover:text-slate-600 leading-none"
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
