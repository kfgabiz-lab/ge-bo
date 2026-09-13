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

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, X, Search } from "lucide-react";
import { RendererContainer } from "./RendererContainer";
import { FieldRenderer } from "./FieldRenderer";
import type { MultiSelectWidget, MultiSelectExtraField, RendererMode } from "./types";
import { useI18n } from "@/hooks/use-i18n";
import { flattenPageDataItem, evalConditionExpr, multiSelectExtraFieldToConfig } from "../../utils";
import {
  fetchMultiSelectSourceRows,
  buildLabelPathEntries,
  type MultiSelectOptionItem,
} from "../../utils/multiSelectSource";
import { PortalDropdown } from "@/components/ui/portal-dropdown";
import { useSlugRelations } from "../../hooks/useSlugRelations";
import { fieldRequiredMarkCls, fieldOptionTextCls } from "../../styles";
import {
  MULTISELECT_BODY_CLS,
  MULTISELECT_TITLE_CLS,
  MULTISELECT_DESC_CLS,
  MULTISELECT_TOGGLE_WRAP_CLS,
  MULTISELECT_TOGGLE_BTN_CLS,
  MULTISELECT_PANEL_CLS,
  MULTISELECT_SEARCH_WRAP_CLS,
  MULTISELECT_SEARCH_BOX_CLS,
  MULTISELECT_SEARCH_ICON_CLS,
  MULTISELECT_SEARCH_INPUT_CLS,
  MULTISELECT_OPTION_LIST_CLS,
  MULTISELECT_EMPTY_CLS,
  MULTISELECT_CHECKBOX_CLS,
  MULTISELECT_TAG_SCROLL_WRAP_CLS,
  MULTISELECT_TAG_LIST_CLS,
  MULTISELECT_TAG_ROW_CLS,
  MULTISELECT_TAG_TEXT_CLS,
  MULTISELECT_TAG_REMOVE_BTN_CLS,
  MULTISELECT_TAG_REMOVE_ICON_CLS,
  multiSelectFieldWrapClass,
  multiSelectToggleTextClass,
  multiSelectChevronClass,
  multiSelectOptionItemClass,
  MULTISELECT_EXTRA_FIELD_SEP_CLS,
  MULTISELECT_TAG_GROUP_SEP_CLS,
  multiSelectExtraFieldWrapClass,
} from "./rendererStyles";

/* ── 샘플 데이터 (preview 모드 전용) ── */
const PREVIEW_OPTIONS = [
  { id: 1, name: "홍길동", dept: "개발팀" },
  { id: 2, name: "이순신", dept: "운영팀" },
  { id: 3, name: "강감찬", dept: "기획팀" },
  { id: 4, name: "유관순", dept: "마케팅팀" },
  { id: 5, name: "세종대왕", dept: "경영팀" },
];
const PREVIEW_SELECTED_IDS = [1, 3];

type OptionItem = MultiSelectOptionItem;

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
      {idx > 0 && <div className={MULTISELECT_EXTRA_FIELD_SEP_CLS} />}
      <div className={multiSelectExtraFieldWrapClass(ef.type)}>
        {/* FieldRenderer — placeholder에 label 대체 */}
        <FieldRenderer
          mode={isPreview ? "preview" : "live"}
          field={multiSelectExtraFieldToConfig(ef)}
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
  /* 연동 모드에서 선택된 relation 객체 — masterSlug뿐 아니라 옵션 조회 depth 범위(categoryDepthFrom/categoryDepth)도
     이 relation이 이미 갖고 있으므로(BE SlugRelationResponse) 위젯에 별도 depth 입력을 두지 않고 여기서 그대로 가져와 쓴다 */
  const selectedRelation =
    sourceMode === "relation" ? relations.find((r) => r.id === widget.sourceRelationSlugId) : undefined;
  /* 실제 조회할 slug — 연동 모드면 선택된 relation의 masterSlug, 호출 모드면 기존 sourceSlug */
  const effectiveSourceSlug = sourceMode === "relation" ? selectedRelation?.masterSlug : widget.sourceSlug;
  /* 옵션 조회 depth — 연동 모드에서는 relation의 categoryDepth(타겟 depth) "한 값"만으로 옵션 목록을 제한한다.
     categoryDepthFrom(라벨 시작 depth)~categoryDepth(라벨 끝 depth) 범위는 BE가 각 행의 라벨(breadcrumb)을
     만들 때만 쓰는 값이라, 옵션 목록 자체를 그 범위로 걸면 categoryDepthFrom에 해당하는 상위 depth 행(예:
     depth1 대분류)까지 별도 옵션으로 섞여 나온다 — 옵션은 항상 타겟 depth(예: depth2)만, 라벨은 상위 depth까지
     포함한 breadcrumb("대분류 > 소분류")로 나와야 하므로 gte/lte를 동일하게 categoryDepth로 고정한다.
     호출 모드는 depth 자동 적용 대상이 아니므로 항상 undefined(기존 동작 그대로 유지) */
  const depthGte = sourceMode === "relation" ? selectedRelation?.categoryDepth : undefined;
  const depthLte = sourceMode === "relation" ? selectedRelation?.categoryDepth : undefined;
  const outerRelationIds = widget.contentRelation?.outer?.relationIds;
  const outerRelationIdsKey = outerRelationIds?.join(",") ?? "";
  const innerRelationId = widget.contentRelation?.inner?.relationId;

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
    fetchMultiSelectSourceRows(
      effectiveSourceSlug,
      depthGte,
      depthLte,
      outerRelationIds,
      innerRelationId,
      widget.sourceFilter
    )
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
        /* 연동 모드에서 _fetchedRel{id}가 없는 행은 옵션에서 제외 — BE가 조상 체인이 끊긴(자기 depth만큼
           부모를 다 못 찾은) 행은 일부러 이 키를 만들지 않으므로, 그 판단을 그대로 따라 화면에서도 숨긴다 */
        const validRows =
          sourceMode === "relation" && widget.sourceRelationSlugId
            ? filteredRows.filter((row) => row[`_fetchedRel${widget.sourceRelationSlugId}`] !== undefined)
            : filteredRows;
        setOptions(validRows.map((row) => ({ ...row, id: Number(row._id ?? 0) })));
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
  }, [isPreview, effectiveSourceSlug, widget.sourceFilter, depthGte, depthLte, outerRelationIdsKey, innerRelationId]);

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

  /* ── 옵션 → 행(opt+entry) 단위로 평탄화 — 동일 텍스트를 가진 서로 다른 옵션 간 중복 제거는
     opt 단위로는 표현할 수 없어(하나의 옵션이 여러 행을 가질 수 있음), 행 단위로 먼저 펼쳐야 한다 ── */
  const flattenedRows = useMemo(
    () =>
      options.flatMap((opt) => buildLabelPathEntries(opt, widget).map((entry, pathIdx) => ({ opt, entry, pathIdx }))),
    [options, widget]
  );

  /* ── 검색어 필터링 — 행(경로) 단위로 검색어를 포함하는 행만 남긴다 ── */
  const searchedRows = useMemo(() => {
    if (!search) return flattenedRows;
    const q = search.toLowerCase();
    return flattenedRows.filter(({ entry }) => entry.path.toLowerCase().includes(q));
  }, [flattenedRows, search]);

  /* ── 텍스트 중복 제거 — dedupeByText 사용 시 표시 텍스트(path)가 동일한 행은 처음 1건만 남긴다 ── */
  const displayRows = useMemo(() => {
    if (!widget.dedupeByText) return searchedRows;
    const seen = new Set<string>();
    return searchedRows.filter(({ entry }) => {
      if (seen.has(entry.path)) return false;
      seen.add(entry.path);
      return true;
    });
  }, [searchedRows, widget.dedupeByText]);

  /* ── 선택된 행(태그 표시용) — 행(카테고리 매핑) 단위로 선택 여부를 판단한다.
     한 제품이 여러 카테고리에 매핑된 경우 그중 일부 행만 선택된 상태가 있을 수 있어, opt 단위가 아니라
     행(entry) 단위로 필터링한다 (opt.id로만 걸러내면 부분 선택 상태를 표현할 수 없다) */
  const selectedEntries = options.flatMap((opt) =>
    buildLabelPathEntries(opt, widget)
      .map((entry, pathIdx) => ({ opt, entry, pathIdx }))
      .filter(({ entry }) => selected.includes(entry.selectionId))
  );

  const fieldAlign = widget.fieldAlign ?? "left";
  const fieldWidthStyle: React.CSSProperties | undefined =
    typeof widget.fieldColSpan === "number" && widget.fieldColSpan >= 1 && widget.fieldColSpan < 12
      ? {
          width: `${(widget.fieldColSpan / 12) * 100}%`,
          marginLeft: fieldAlign === "center" || fieldAlign === "right" ? "auto" : undefined,
          marginRight: fieldAlign === "center" ? "auto" : undefined,
        }
      : undefined;

  return (
    <RendererContainer showBorder={widget.showBorder ?? true} bgColor={widget.bgColor}>
      <div className={MULTISELECT_BODY_CLS}>
        {/* 타이틀 */}
        {(widget.titleMsgKey || widget.title) && (
          <p className={MULTISELECT_TITLE_CLS}>
            {widget.titleMsgKey ? t(widget.titleMsgKey) : widget.title}
            {widget.required && <span className={fieldRequiredMarkCls}>*</span>}
          </p>
        )}

        {/* 설명 */}
        {(widget.descriptionMsgKey || widget.description) && (
          <p className={MULTISELECT_DESC_CLS}>
            {widget.descriptionMsgKey ? t(widget.descriptionMsgKey) : widget.description}
          </p>
        )}

        <div className={multiSelectFieldWrapClass(!!fieldWidthStyle)} style={fieldWidthStyle}>
          {/* 드롭다운 영역 */}
          <div ref={containerRef} className={MULTISELECT_TOGGLE_WRAP_CLS}>
            {/* 토글 버튼 */}
            <button
              ref={buttonRef}
              type="button"
              disabled={isPreview}
              onClick={() => setIsOpen((prev) => !prev)}
              className={MULTISELECT_TOGGLE_BTN_CLS}
            >
              <span className={multiSelectToggleTextClass(selectedEntries.length > 0)}>
                {selectedEntries.length > 0
                  ? t("common.multiselect.selected_count", { count: String(selectedEntries.length) })
                  : widget.placeholderMsgKey
                    ? t(widget.placeholderMsgKey)
                    : (widget.placeholder ?? t("common.multiselect.placeholder"))}
              </span>
              <ChevronDown className={multiSelectChevronClass(isOpen)} />
            </button>

            {/* 드롭다운 패널 — Portal(body)로 렌더링하여 부모 overflow에 잘리지 않음. preview는 버튼 disabled라 열리지 않음 */}
            <PortalDropdown
              open={isOpen}
              anchorRef={buttonRef}
              onOutsideClick={() => setIsOpen(false)}
              className={MULTISELECT_PANEL_CLS}
            >
              {/* 검색 입력 */}
              <div className={MULTISELECT_SEARCH_WRAP_CLS}>
                <div className={MULTISELECT_SEARCH_BOX_CLS}>
                  <Search className={MULTISELECT_SEARCH_ICON_CLS} />
                  <input
                    type="text"
                    disabled={isPreview}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("common.input.search_placeholder")}
                    className={MULTISELECT_SEARCH_INPUT_CLS}
                  />
                </div>
              </div>

              {/* 옵션 목록 */}
              <ul className={MULTISELECT_OPTION_LIST_CLS}>
                {displayRows.length === 0 ? (
                  <li className={MULTISELECT_EMPTY_CLS}>{t("common.table.no_data")}</li>
                ) : (
                  /* 옵션 하나가 카테고리 경로를 여러 개 가지면(제품이 여러 카테고리에 매핑) 경로 개수만큼
                   별도 행(row)으로 나열한다 — 매핑(depth3) 고유 id가 있으면 행별로 독립 토글되고,
                   없는 일반 옵션은 기존과 동일하게 opt.id 기준으로 전체가 함께 토글된다 */
                  displayRows.map(({ opt, entry, pathIdx }) => (
                    <li key={`${opt.id}-${pathIdx}`}>
                      <label className={multiSelectOptionItemClass(isPreview)}>
                        <input
                          type="checkbox"
                          checked={selected.includes(entry.selectionId)}
                          disabled={isPreview}
                          onChange={() => !isPreview && toggleItem(entry.selectionId)}
                          className={MULTISELECT_CHECKBOX_CLS}
                        />
                        <span className={fieldOptionTextCls}>{entry.path}</span>
                      </label>
                    </li>
                  ))
                )}
              </ul>
            </PortalDropdown>
          </div>

          {/* 선택된 항목 목록 — [좌측 필드][항목명][우측 필드][X버튼] 1줄 배치
             선택 개수가 늘어나면 위젯이 놓인 그리드 셀 높이를 넘어서서 잘리므로(그리드 셀 자체엔 스크롤이 없음),
             바깥 wrapper에만 높이 제한 + 세로 스크롤을 둔다.
             (flex-col 컨테이너 자체에 max-height를 주면 그 자식 row들이 flex-shrink로 찌그러지므로,
              반드시 별도 block 레벨 wrapper로 감싸서 안쪽 flex-col은 원래 크기 그대로 유지시킨다) */}
          {selectedEntries.length > 0 && (
            <div className={MULTISELECT_TAG_SCROLL_WRAP_CLS}>
              <div className={MULTISELECT_TAG_LIST_CLS}>
                {/* 옵션 하나가 카테고리 경로를 여러 개 가지면(제품이 여러 카테고리에 매핑) 경로 개수만큼
                  별도 행(row)으로 나열한다 — 추가입력필드는 같은 opt.id 값을 공유(제품 단위 데이터이므로 동일하게 표시),
                  X버튼은 매핑(depth3) 고유 id가 있으면 그 행만 선택 해제하고, 없는 일반 옵션은 기존처럼 opt.id 전체가 해제됨 */}
                {selectedEntries.map(({ opt, entry, pathIdx }) => {
                  const extraFields = widget.extraFields ?? [];
                  /* position='left'인 필드만 좌측 그룹, 그 외(right 및 미설정)는 우측 그룹 */
                  const leftFields = extraFields.filter((ef) => ef.position === "left");
                  const rightFields = extraFields.filter((ef) => ef.position !== "left");
                  const itemVals = extraFieldValues[opt.id] ?? {};

                  return (
                    <div key={`${opt.id}-${pathIdx}`} className={MULTISELECT_TAG_ROW_CLS}>
                      {/* 좌측 추가 입력 필드 */}
                      {leftFields.length > 0 &&
                        renderExtraFieldGroup(leftFields, itemVals, opt.id, isPreview, onExtraFieldChange)}

                      {/* 좌측 필드 ↔ 항목명 구분선 */}
                      {leftFields.length > 0 && <div className={MULTISELECT_TAG_GROUP_SEP_CLS} />}

                      {/* 항목명 — 고정 너비로 잘림 방지 */}
                      <span className={MULTISELECT_TAG_TEXT_CLS}>{entry.path}</span>

                      {/* 항목명 ↔ 우측 필드 구분선 */}
                      {rightFields.length > 0 && <div className={MULTISELECT_TAG_GROUP_SEP_CLS} />}

                      {/* 우측 추가 입력 필드 */}
                      {rightFields.length > 0 &&
                        renderExtraFieldGroup(rightFields, itemVals, opt.id, isPreview, onExtraFieldChange)}

                      {/* X버튼 — 오른쪽 끝 고정 */}
                      <button
                        type="button"
                        disabled={isPreview}
                        onClick={() => removeItem(entry.selectionId)}
                        className={MULTISELECT_TAG_REMOVE_BTN_CLS}
                      >
                        <X className={MULTISELECT_TAG_REMOVE_ICON_CLS} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </RendererContainer>
  );
}
