"use client";

/**
 * MultiSelectRenderer — 다중선택 컨텐츠 위젯 렌더러
 *
 * 연결된 slug에서 옵션 목록을 가져와 체크박스 드롭다운으로 선택하고,
 * 선택된 항목을 태그로 표시한다. 저장 시 ID 배열을 contentKey로 저장한다.
 *
 * [동작]
 * - 입력창 클릭 → 드롭다운 열림
 * - 텍스트 입력 → 옵션 필터링
 * - 체크박스 클릭 → 선택/해제 (드롭다운 유지)
 * - 하단 태그 X → 해당 항목 선택 해제
 *
 * [모드]
 * - preview: 샘플 데이터, 드롭다운 항상 노출 (disabled)
 * - live: sourceSlug에서 전체 로드, 선택값 관리
 *
 * 사용법:
 *   <MultiSelectRenderer mode="preview" widget={widget} />
 *   <MultiSelectRenderer mode="live" widget={widget} selectedIds={ids} onChange={setIds} />
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, X, Search } from "lucide-react";
import api from "@/lib/api";
import { RendererContainer } from "./RendererContainer";
import { FieldRenderer } from "./FieldRenderer";
import type { MultiSelectWidget, MultiSelectExtraField, RendererMode } from "./types";
import type { SearchFieldConfig } from "../../types";
import { useI18n } from "@/hooks/use-i18n";
import { flattenPageDataItem, evalConditionExpr, formatFetchedRelValue } from "../../utils";
import { PortalDropdown } from "@/components/ui/portal-dropdown";
import { useSlugRelations } from "../../hooks/useSlugRelations";

/* ── 샘플 데이터 (preview 모드 전용) ── */
const PREVIEW_OPTIONS = [
  { id: 1, name: "홍길동", dept: "개발팀" },
  { id: 2, name: "이순신", dept: "운영팀" },
  { id: 3, name: "강감찬", dept: "기획팀" },
  { id: 4, name: "유관순", dept: "마케팅팀" },
  { id: 5, name: "세종대왕", dept: "경영팀" },
];
const PREVIEW_SELECTED_IDS = [1, 3];

/* ── 옵션 항목 타입 ── */
interface OptionItem {
  id: number;
  [key: string]: unknown;
}

/* ── Props ── */
export interface MultiSelectRendererProps {
  mode: RendererMode;
  widget: MultiSelectWidget;
  /** live 모드 — 현재 선택된 ID 배열 */
  selectedIds?: number[];
  /** live 모드 — 선택 변경 콜백 */
  onChange?: (ids: number[]) => void;
  /**
   * live 모드 — 항목별 추가 입력 필드 값
   * { [itemId]: { [fieldId]: value } }
   */
  extraFieldValues?: Record<number, Record<string, string>>;
  /** live 모드 — 추가 필드 값 변경 콜백 */
  onExtraFieldChange?: (itemId: number, fieldId: string, value: string) => void;
}

/**
 * MultiSelectExtraField → SearchFieldConfig 변환
 * FieldRenderer 재사용을 위해 최소 필드만 매핑
 */
function toFieldConfig(f: MultiSelectExtraField): SearchFieldConfig {
  return {
    id: f.key, // 저장 키는 key 사용 (id는 DnD 내부 식별자)
    type: f.type,
    label: f.label,
    colSpan: 1,
    options: f.options,
    required: f.required,
    placeholder: f.placeholder,
  };
}

/* ── 옵션 소스 요청 원본 응답 타입 (flattenPageDataItem 입력과 동일) ── */
type SourceRow = { dataJson: Record<string, unknown> };

/* ── 모듈 레벨 in-flight 요청 캐시 ──
 * 한 페이지에 동일 sourceSlug(예: "category-data")를 쓰는 MultiSelectRenderer 인스턴스가
 * 여러 개 동시에 마운트되면, 각 인스턴스가 각자 GET /page-data/{slug}를 호출해서
 * 완전히 동일한 요청이 동시에 여러 건 나간다. 이 중 하나가 브라우저에 의해
 * net::ERR_ABORTED로 취소되면 해당 위젯만 옵션 0건으로 남는 문제가 있었다(실제 재현 확인).
 *
 * → 같은 slug에 대한 요청이 진행 중이면 새 요청을 만들지 않고 진행 중인 Promise를 그대로 공유한다.
 * → 이 캐시는 "필터링 전 원본 응답(rows)"만 공유하며, sourceFilter에 따른 필터링은
 *   각 인스턴스가 응답을 받은 뒤 개별적으로 수행한다(아래 useEffect 참고) — 위젯별 필터 결과가 섞이지 않는다.
 * → 요청이 끝나면(성공/실패 상관없이) 캐시에서 즉시 제거하여, 다음 조회 시 항상 새 데이터를 받는다.
 */
const inFlightSourceRequests = new Map<string, Promise<SourceRow[]>>();

function fetchSourceRows(slug: string): Promise<SourceRow[]> {
  const cached = inFlightSourceRequests.get(slug);
  if (cached) return cached;

  const request = api
    .get(`/page-data/${slug}`, { params: { size: 9999 } })
    .then((res) => (res.data.content ?? []) as SourceRow[])
    .finally(() => {
      /* 성공/실패 무관하게 캐시 제거 — 다음 호출은 항상 새 요청을 보낸다 */
      inFlightSourceRequests.delete(slug);
    });

  inFlightSourceRequests.set(slug, request);
  return request;
}

/* ── 유틸: dot notation 경로로 중첩 객체 값 접근 (예: "form.title" → item['form']['title']) ── */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/* ── 유틸: 옵션 항목 표시 텍스트 생성 ──
 * - sourceMode='relation': item['_fetchedRel{sourceRelationSlugId}'] 값을 그대로 사용
 *   (BE가 카테고리 계층이면 categoryDepth/categoryDepthFrom 기준으로 이미 ' > '로 합쳐서 내려준 문자열)
 *   다건 매칭(배열)이면 formatFetchedRelValue 공통함수로 구분자 합침 (TableCellRenderer와 동일 패턴)
 * - sourceMode='call'(기본): labelFields로 지정한 필드들을 dot notation으로 읽어 ' > '로 연결 (기존 동작 그대로) */
function buildLabel(item: OptionItem, widget: MultiSelectWidget): string {
  if ((widget.sourceMode ?? "call") === "relation" && widget.sourceRelationSlugId) {
    const raw = item[`_fetchedRel${widget.sourceRelationSlugId}`];
    if (Array.isArray(raw)) {
      return formatFetchedRelValue(
        raw,
        item as Record<string, unknown>,
        widget.sourceRelationSlugId,
        undefined,
        "ONE_LINE"
      );
    }
    /* fetch_fields 미설정 relation을 잘못 선택한 경우 Map 전체가 내려올 수 있음 — 빈 문자열로 방어 (TableCellRenderer와 동일 가드) */
    return raw == null || typeof raw === "object" ? "" : String(raw);
  }
  const labelFields = widget.labelFields || "name";
  return labelFields
    .split(",")
    .map((f) => String(getNestedValue(item as Record<string, unknown>, f.trim()) ?? ""))
    .filter(Boolean)
    .join(" > ");
}

/**
 * 추가 입력 필드 그룹(좌/우 한쪽) 렌더링
 * 그룹 내부에서만 idx>0일 때 필드 사이 구분선을 표시한다.
 */
function renderExtraFieldGroup(
  fields: MultiSelectExtraField[],
  itemVals: Record<string, string>,
  optId: number,
  isPreview: boolean,
  onExtraFieldChange?: (itemId: number, fieldId: string, value: string) => void
) {
  return fields.map((ef, idx) => (
    <React.Fragment key={ef.id}>
      {/* 필드 사이 구분선 */}
      {idx > 0 && <div className="w-px h-4 bg-slate-200 shrink-0" />}
      <div
        className={`shrink-0 ${
          /* radio/checkbox는 auto, input/select/date는 고정 폭 */
          ef.type === "radio" || ef.type === "checkbox" ? "min-w-fit" : "w-[120px]"
        }`}
      >
        {/* FieldRenderer — placeholder에 label 대체 */}
        <FieldRenderer
          mode={isPreview ? "preview" : "live"}
          field={{
            ...toFieldConfig(ef),
            /* input/select/date는 placeholder로 label 표시 */
            placeholder: ef.placeholder ?? ef.label,
          }}
          value={isPreview ? "" : (itemVals[ef.key] ?? "")}
          onChange={(v) => onExtraFieldChange?.(optId, ef.key, v)}
        />
      </div>
    </React.Fragment>
  ));
}

export function MultiSelectRenderer({
  mode,
  widget,
  selectedIds = [],
  onChange,
  extraFieldValues = {},
  onExtraFieldChange,
}: MultiSelectRendererProps) {
  const isPreview = mode === "preview";
  const { t } = useI18n();

  /* ── 옵션 소스 모드 해석 ── */
  const sourceMode = widget.sourceMode ?? "call";
  /* 연동 모드일 때만 relation 목록 조회 (호출 모드/미리보기에서는 불필요한 API 호출 방지) */
  const relations = useSlugRelations(!isPreview && sourceMode === "relation");
  /* 실제 조회할 slug — 연동 모드면 선택된 relation의 masterSlug, 호출 모드면 기존 sourceSlug */
  const effectiveSourceSlug =
    sourceMode === "relation"
      ? relations.find((r) => r.id === widget.sourceRelationSlugId)?.masterSlug
      : widget.sourceSlug;

  /* ── 상태 ── */
  const [liveOptions, setOptions] = useState<OptionItem[]>([]);
  /* 미리보기는 항상 PREVIEW_OPTIONS를 그대로 노출 — FieldRenderer의 isPreview 분기와 동일 패턴(effect 안에서 동기 setState 금지) */
  const options = isPreview ? (PREVIEW_OPTIONS as OptionItem[]) : liveOptions;
  const [selected, setSelected] = useState<number[]>(isPreview ? PREVIEW_SELECTED_IDS : selectedIds);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  /* 드롭다운 위치 기준(anchor) — 토글 버튼 */
  const buttonRef = useRef<HTMLButtonElement>(null);

  /* ── 옵션 로드 ── */
  useEffect(() => {
    if (isPreview || !effectiveSourceSlug) return;
    /* 언마운트/재실행 이후 응답이 늦게 도착해도 setOptions가 호출되지 않도록 방지 */
    let cancelled = false;
    /* 호출/연동 대상 slug에서 전체 목록 한 번에 로드 (페이징 없음)
           연동 모드는 relation.masterSlug를 그대로 조회하며, BE가 해당 slug 조회 응답에
           FETCH relation을 자동 병합(_fetchedRel{id})해 내려주므로 조회 로직 자체는 동일하다
           동일 slug를 쓰는 다른 위젯 인스턴스와 요청 자체는 fetchSourceRows에서 공유하되,
           필터링(sourceFilter)은 아래에서 이 인스턴스가 개별적으로 수행한다 */
    fetchSourceRows(effectiveSourceSlug)
      .then((rows) => {
        if (cancelled) return;
        /* flattenPageDataItem으로 nested dataJson을 flat 병합 — 테이블과 동일한 공통 패턴 */
        const flatRows = rows.map((r) => flattenPageDataItem(r as Parameters<typeof flattenPageDataItem>[0]));
        /* sourceFilter 지정 시 조건에 맞는 행만 남김 — evalConditionExpr 공통함수 재사용 */
        const filteredRows = widget.sourceFilter
          ? flatRows.filter((row) =>
              evalConditionExpr(widget.sourceFilter!, (key) => (key in row ? String(row[key] ?? "") : undefined))
            )
          : flatRows;
        setOptions(filteredRows.map((row) => ({ ...row, id: Number(row._id ?? 0) })));
      })
      .catch((err) => {
        /* 침묵 대신 콘솔 경고만 남김 — 옵션 목록은 빈 상태로 유지(기존 동작과 동일) */
        console.warn(`[MultiSelectRenderer] 옵션 목록 조회 실패 (slug: ${effectiveSourceSlug})`, err);
      });
    /* 연동 모드 진입 직후에는 relations가 비동기로 채워지기 전이라 effectiveSourceSlug가 일시적으로 undefined이며,
           relation 목록이 로드되면 deps 변경으로 effect가 자동 재실행된다 (추가 로딩 상태 처리 불필요) */
    return () => {
      cancelled = true;
    };
  }, [isPreview, effectiveSourceSlug, widget.sourceFilter]);

  /* ── live: 외부 selectedIds 동기화 ── */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 기존 코드, 이번 작업과 무관, 추후 기술부채로 별도 정리 예정
    if (!isPreview) setSelected(selectedIds);
  }, [isPreview, selectedIds]);

  /* ── 체크 토글 ── */
  const toggleItem = useCallback(
    (id: number) => {
      const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
      setSelected(next);
      onChange?.(next);
    },
    [selected, onChange]
  );

  /* ── 태그 제거 ── */
  const removeItem = useCallback(
    (id: number) => {
      const next = selected.filter((x) => x !== id);
      setSelected(next);
      onChange?.(next);
    },
    [selected, onChange]
  );

  /* ── 필터링된 옵션 ── */
  const filteredOptions = options.filter((opt) => {
    if (!search) return true;
    return buildLabel(opt, widget).toLowerCase().includes(search.toLowerCase());
  });

  /* ── 선택된 옵션 (태그 표시용) ── */
  const selectedOptions = options.filter((opt) => selected.includes(opt.id));

  return (
    <RendererContainer showBorder={widget.showBorder ?? true} bgColor={widget.bgColor}>
      <div className="p-3 flex flex-col gap-3 h-full">
        {/* 타이틀 */}
        {(widget.titleMsgKey || widget.title) && (
          <p className="text-sm font-medium text-slate-700">
            {widget.titleMsgKey ? t(widget.titleMsgKey) : widget.title}
          </p>
        )}

        {/* 설명 */}
        {(widget.descriptionMsgKey || widget.description) && (
          <p className="text-xs text-slate-500">
            {widget.descriptionMsgKey ? t(widget.descriptionMsgKey) : widget.description}
          </p>
        )}

        {/* 드롭다운 영역 */}
        <div ref={containerRef} className="relative">
          {/* 토글 버튼 */}
          <button
            ref={buttonRef}
            type="button"
            disabled={isPreview}
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-300 rounded-md bg-white text-sm hover:border-slate-400 transition-colors disabled:cursor-default"
          >
            <span className={selected.length > 0 ? "text-slate-800" : "text-slate-400"}>
              {selected.length > 0
                ? t("common.multiselect.selected_count", { count: String(selected.length) })
                : widget.placeholderMsgKey
                  ? t(widget.placeholderMsgKey)
                  : (widget.placeholder ?? t("common.multiselect.placeholder"))}
            </span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* 드롭다운 패널 — Portal(body)로 렌더링하여 부모 overflow에 잘리지 않음. preview는 버튼 disabled라 열리지 않음 */}
          <PortalDropdown
            open={isOpen}
            anchorRef={buttonRef}
            onOutsideClick={() => setIsOpen(false)}
            className="bg-white border border-slate-200 rounded-md shadow-lg"
          >
            {/* 검색 입력 */}
            <div className="p-2 border-b border-slate-100">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-200">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  disabled={isPreview}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("common.input.search_placeholder")}
                  className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none"
                />
              </div>
            </div>

            {/* 옵션 목록 */}
            <ul className="max-h-48 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-xs text-slate-400 text-center">{t("common.table.no_data")}</li>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = selected.includes(opt.id);
                  return (
                    <li key={opt.id}>
                      <label
                        className={`flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors ${isPreview ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isPreview}
                          onChange={() => !isPreview && toggleItem(opt.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 accent-slate-800"
                        />
                        <span className="text-sm text-slate-700">{buildLabel(opt, widget)}</span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
          </PortalDropdown>
        </div>

        {/* 선택된 항목 목록 — [좌측 필드][항목명][우측 필드][X버튼] 1줄 배치 */}
        {selectedOptions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {selectedOptions.map((opt) => {
              const extraFields = widget.extraFields ?? [];
              /* position='left'인 필드만 좌측 그룹, 그 외(right 및 미설정)는 우측 그룹 */
              const leftFields = extraFields.filter((ef) => ef.position === "left");
              const rightFields = extraFields.filter((ef) => ef.position !== "left");
              const itemVals = extraFieldValues[opt.id] ?? {};

              return (
                <div
                  key={opt.id}
                  className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 flex items-center gap-2 overflow-x-auto"
                >
                  {/* 좌측 추가 입력 필드 */}
                  {leftFields.length > 0 &&
                    renderExtraFieldGroup(leftFields, itemVals, opt.id, isPreview, onExtraFieldChange)}

                  {/* 좌측 필드 ↔ 항목명 구분선 */}
                  {leftFields.length > 0 && <div className="w-px h-4 bg-slate-300 shrink-0" />}

                  {/* 항목명 — 고정 너비로 잘림 방지 */}
                  <span className="text-xs font-medium text-slate-700 shrink-0 whitespace-nowrap">
                    {buildLabel(opt, widget)}
                  </span>

                  {/* 항목명 ↔ 우측 필드 구분선 */}
                  {rightFields.length > 0 && <div className="w-px h-4 bg-slate-300 shrink-0" />}

                  {/* 우측 추가 입력 필드 */}
                  {rightFields.length > 0 &&
                    renderExtraFieldGroup(rightFields, itemVals, opt.id, isPreview, onExtraFieldChange)}

                  {/* X버튼 — 오른쪽 끝 고정 */}
                  <button
                    type="button"
                    disabled={isPreview}
                    onClick={() => removeItem(opt.id)}
                    className="ml-auto text-slate-400 hover:text-slate-600 transition-colors disabled:cursor-default shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RendererContainer>
  );
}
