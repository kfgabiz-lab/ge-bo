"use client";

/**
 * InlineEditField — inlineEdit 셀 설정 (타입 선택 + 수동/공통코드 옵션 + 저장 대상 리다이렉트)
 *
 * 테이블 셀에서 즉시 값 변경(토글·체크박스·라디오)을 위한 컬럼 편집 UI.
 * - 타입 선택: 토글 / 체크박스 / 라디오버튼
 * - 토글 전용: true/false 값 매핑 (예: 001/002 같은 공통코드 값 판정)
 * - 옵션 입력: 수동 입력 / 공통코드 (토글 제외)
 * - 저장 대상 리다이렉트: 연동 slug-relation을 선택하면 이 컬럼의 저장을 테이블 자신이 아닌
 *   relation의 연동 slug(slave)로 보낸다 (예: 카테고리 목록에서 연동된 제품 데이터의 필드 수정)
 *
 * 사용법:
 *   <InlineEditField values={col} onChange={patch => updateColumn(col.id, patch)}
 *     codeGroups={codeGroups} codeGroupsLoading={false}
 *     fetchRelations={allSlugRelations.filter(r => r.relationDir === 'FETCH')} />
 */

import React from "react";
import { ColEditProps } from "./col-types";
import { LABEL_CLS, INPUT_CLS } from "./_FieldBase";
import { FieldOptions } from "./_FieldOptions";
import { SlugSelectField } from "./SlugSelectField";
import { CodeGroupDef } from "../../../types";
import type { SlugRelationOption } from "../../SearchBuilder";

const INLINE_EDIT_TYPES: { type: "toggle" | "checkbox" | "radio"; label: string }[] = [
  { type: "toggle", label: "토글" },
  { type: "checkbox", label: "체크박스" },
  { type: "radio", label: "라디오" },
];

interface InlineEditFieldProps extends ColEditProps {
  codeGroups: CodeGroupDef[];
  codeGroupsLoading: boolean;
  /** 저장 대상 리다이렉트용 연동 slug-relation 후보 목록 — FETCH 타입만 전달 (TableBuilder에서 필터링) */
  fetchRelations?: SlugRelationOption[];
}

export function InlineEditField({
  values,
  onChange,
  codeGroups,
  codeGroupsLoading,
  fetchRelations = [],
}: InlineEditFieldProps) {
  const inlineEditType = values.inlineEditType ?? "toggle";

  /* 저장 대상 리다이렉트 후보 — ARRAY_CONTAINS는 masterKey가 배열이라 slave id 단건 추출이 불가능해 제외 */
  const redirectRelations = fetchRelations.filter((r) => r.joinType !== "ARRAY_CONTAINS");

  return (
    <div className="space-y-1.5 pt-1 border-t border-slate-100">
      {/* 저장 경로 — 필수 입력 (dot notation) */}
      <div>
        <label className={LABEL_CLS}>
          저장 경로 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={values.inlineEditFieldKey ?? ""}
          onChange={(e) => onChange({ inlineEditFieldKey: e.target.value })}
          placeholder="form1.active"
          className={`${INPUT_CLS} font-mono`}
        />
        <p className="text-[10px] text-slate-400 mt-0.5">데이터 저장 경로 — dot notation 지원 (예: form1.active)</p>
      </div>

      {/* 저장 대상 리다이렉트 — 연동 slug-relation 선택 시 이 컬럼 저장을 slave slug로 전송 */}
      <div>
        <SlugSelectField
          label="저장 대상 (연동 Slug)"
          value={String(values.inlineEditRelationSlugId ?? "")}
          onChange={(id) => onChange({ inlineEditRelationSlugId: id ? Number(id) : undefined })}
          slugOptions={redirectRelations.map((r) => ({
            id: r.id,
            slug: String(r.id),
            name: r.description
              ? `${r.description} (${r.masterSlug} → ${r.slaveSlug})`
              : `${r.masterSlug} → ${r.slaveSlug}`,
          }))}
          formatDisplay={(opt) => opt.name}
          emptyLabel="테이블 자신에 저장 (기본)"
        />
        <p className="text-[10px] text-slate-400 mt-0.5">
          선택 시 위 저장 경로는 연동 slug 기준 경로여야 함 (예: productDataForm.trainingYn)
        </p>
      </div>

      {/* 타입 선택 — 토글 / 체크박스 / 라디오 */}
      <div>
        <label className={LABEL_CLS}>타입</label>
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
          {INLINE_EDIT_TYPES.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ inlineEditType: type, options: undefined, codeGroupCode: undefined })}
              className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all
                                ${inlineEditType === type ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 토글 전용 — true/false 값 매핑 (미입력 시 기존처럼 Boolean(value)로 판정) */}
      {inlineEditType === "toggle" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={LABEL_CLS}>true일 때 값</label>
            <input
              type="text"
              value={values.inlineEditTrueValue ?? ""}
              onChange={(e) => onChange({ inlineEditTrueValue: e.target.value })}
              placeholder="001"
              className={`${INPUT_CLS} font-mono`}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>false일 때 값</label>
            <input
              type="text"
              value={values.inlineEditFalseValue ?? ""}
              onChange={(e) => onChange({ inlineEditFalseValue: e.target.value })}
              placeholder="002"
              className={`${INPUT_CLS} font-mono`}
            />
          </div>
        </div>
      )}

      {/* 옵션 — 토글은 on/off 고정이라 옵션 불필요, 체크박스/라디오만 표시 */}
      {inlineEditType !== "toggle" && (
        <FieldOptions
          options={values.options}
          codeGroupCode={values.codeGroupCode}
          codeGroups={codeGroups}
          codeGroupsLoading={codeGroupsLoading}
          onChange={(patch) => onChange(patch)}
        />
      )}
    </div>
  );
}
