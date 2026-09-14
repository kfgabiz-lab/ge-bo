"use client";

/**
 * CategoryRenderer — 카테고리 위젯 렌더러
 *
 * - preview: 샘플 카테고리 항목 표시 (빌더 미리보기용)
 * - live: page_data API로 실데이터 조회 + 등록/수정/삭제 기능
 *
 * 조회 방식:
 *   GET /page-data/{dbSlug}?eq_depth=1               (루트 카테고리)
 *   GET /page-data/{dbSlug}?eq_depth=2&eq_parentId=5 (선택된 상위 항목 기준 필터)
 *
 * depth 간 선택 연동:
 *   - 항목 클릭 시 onSelect(widgetId, selectedId) 호출
 *   - 상위 위젯(parentWidgetId)의 selectedId가 바뀌면 목록 재조회
 *
 * 사용법:
 *   // preview (빌더 미리보기)
 *   <CategoryRenderer mode="preview" widget={categoryWidget} />
 *
 *   // live (실제 페이지)
 *   <CategoryRenderer
 *     mode="live"
 *     widget={categoryWidget}
 *     selectedParentId={categorySelections[widget.parentWidgetId]}
 *     onSelect={(widgetId, id) => setCategorySelections(prev => ({ ...prev, [widgetId]: id }))}
 *   />
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X, ChevronRight, Eye, GripVertical } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { RendererContainer } from "./RendererContainer";
import {
  CATEGORY_OUTER_WRAP_CLS,
  CATEGORY_CONTAINER_CLS,
  CATEGORY_HEADER_CLS,
  CATEGORY_HEADER_LABEL_CLS,
  CATEGORY_HEADER_ICON_CLS,
  CATEGORY_INPUT_ROW_CLS,
  CATEGORY_INPUT_CLS,
  CATEGORY_INPUT_CONFIRM_BTN_CLS,
  CATEGORY_INPUT_CANCEL_BTN_CLS,
  CATEGORY_INPUT_ICON_CLS,
  CATEGORY_LIST_WRAP_CLS,
  CATEGORY_STATE_WRAP_CLS,
  CATEGORY_STATE_TEXT_ITALIC_CLS,
  CATEGORY_STATE_TEXT_CLS,
  CATEGORY_LIST_CLS,
  CATEGORY_ITEM_WRAP_CLS,
  CATEGORY_DROP_LINE_CLS,
  CATEGORY_DROP_LINE_LAST_CLS,
  CATEGORY_ACCENT_BAR_CLS,
  CATEGORY_CARD_BODY_CLS,
  CATEGORY_CARD_MAIN_CLS,
  CATEGORY_CARD_ROW1_CLS,
  CATEGORY_ACTIONS_WRAP_CLS,
  CATEGORY_ACTION_ICON_CLS,
  categoryAddButtonClass,
  categoryCardClass,
  categoryDragHandleClass,
  categoryGripIconClass,
  categoryOrderNumClass,
  categoryCodeBadgeClass,
  categoryTitleClass,
  categoryActionButtonClass,
  categoryDeleteButtonClass,
  categoryDescClass,
} from "./rendererStyles";
import type { CategoryWidget } from "./types";
import type { RendererMode } from "./types";
import { useI18n } from "@/hooks/use-i18n";
import { flattenPageDataItem, parseActionParams, buildRowActionQuery } from "../../utils";

/** 카테고리 항목 하나 */
interface CategoryItem {
  id: number;
  name: string;
  depth: number;
  parentId: number | null;
  sortOrder?: number; // 정렬 순번 (낮을수록 위)
  code?: string; // 항목 코드 (예: A-001)
  description?: string; // 항목 설명
  _dataJson?: Record<string, unknown>; // 원본 dataJson 보관 (드래그 정렬 시 구조 유지용)
  _flatJson?: Record<string, unknown>; // 평탄화된 row (parseActionParams용)
}

interface CategoryRendererProps {
  mode: RendererMode;
  widget: CategoryWidget;
  /** 상위 위젯에서 선택된 항목 ID — parentWidgetId가 있을 때 이 값으로 eq_parentId 필터 */
  selectedParentId?: number | null;
  /** 이 위젯에서 항목 선택 시 호출 — (widgetId, selectedId) */
  onSelect?: (widgetId: string, selectedId: number | null) => void;
  /**
   * 등록/수정 연결이 popup/path일 때 WidgetRenderer가 주입하는 팝업 오픈 핸들러.
   * - popup: handleInternalPopupOpen(slug, editId, listSlug) 호출
   * - path: router.push(path) 는 CategoryRenderer 내부에서 직접 처리
   */
  onPopupOpen?: (
    slug: string,
    editId?: number | null,
    listSlug?: string,
    initialValues?: Record<string, string>,
    paramSave?: boolean
  ) => void;
  /** 팝업 저장 완료 시 증가 — 값이 바뀔 때마다 목록 재조회 */
  refreshTick?: number;
}

const CATEGORY_FETCH_SIZE = "9999";

/** 미리보기 샘플 데이터 (스크롤 확인용으로 충분한 수량) */
const PREVIEW_ITEMS: CategoryItem[] = [
  {
    id: 1,
    name: "항목 A",
    depth: 1,
    parentId: null,
    code: "A-001",
    description: "첫 번째 항목에 대한 간단한 설명입니다.",
  },
  {
    id: 2,
    name: "항목 B",
    depth: 1,
    parentId: null,
    code: "A-002",
    description: "두 번째 항목에 대한 간단한 설명입니다.",
  },
  {
    id: 3,
    name: "항목 C",
    depth: 1,
    parentId: null,
    code: "A-003",
    description: "세 번째 항목에 대한 간단한 설명입니다.",
  },
  {
    id: 4,
    name: "항목 D",
    depth: 1,
    parentId: null,
    code: "A-004",
    description: "네 번째 항목에 대한 간단한 설명입니다.",
  },
  {
    id: 5,
    name: "항목 E",
    depth: 1,
    parentId: null,
    code: "A-005",
    description: "다섯 번째 항목에 대한 간단한 설명입니다.",
  },
  {
    id: 6,
    name: "항목 F",
    depth: 1,
    parentId: null,
    code: "A-006",
    description: "여섯 번째 항목에 대한 간단한 설명입니다.",
  },
  {
    id: 7,
    name: "항목 G",
    depth: 1,
    parentId: null,
    code: "A-007",
    description: "일곱 번째 항목에 대한 간단한 설명입니다.",
  },
  {
    id: 8,
    name: "항목 H",
    depth: 1,
    parentId: null,
    code: "A-008",
    description: "여덟 번째 항목에 대한 간단한 설명입니다.",
  },
  {
    id: 9,
    name: "항목 I",
    depth: 1,
    parentId: null,
    code: "A-009",
    description: "아홉 번째 항목에 대한 간단한 설명입니다.",
  },
  {
    id: 10,
    name: "항목 J",
    depth: 1,
    parentId: null,
    code: "A-010",
    description: "열 번째 항목에 대한 간단한 설명입니다.",
  },
  {
    id: 11,
    name: "항목 K",
    depth: 1,
    parentId: null,
    code: "A-011",
    description: "열한 번째 항목에 대한 간단한 설명입니다.",
  },
  {
    id: 12,
    name: "항목 L",
    depth: 1,
    parentId: null,
    code: "A-012",
    description: "열두 번째 항목에 대한 간단한 설명입니다.",
  },
];

export function CategoryRenderer({
  mode,
  widget,
  selectedParentId,
  onSelect,
  onPopupOpen,
  refreshTick,
}: CategoryRendererProps) {
  const isPreview = mode === "preview";
  const router = useRouter();
  const { t } = useI18n();

  /* ── 상태 ── */
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  /* 등록 입력 상태 */
  const [inputName, setInputName] = useState("");
  const [showInput, setShowInput] = useState(false); // 등록 입력창 표시

  /* ── 드래그 상태 ── */
  const dragIndexRef = useRef<number | null>(null); // 드래그 시작 항목 인덱스
  const [dropIndex, setDropIndex] = useState<number | null>(null); // 드롭 위치 인덱스 (파란 선 표시용)

  /* ── depth 2 이상: 상위 선택 없으면 목록 비움 ── */
  const needsParent = widget.depth > 1 && widget.parentWidgetId;
  const parentNotSelected = needsParent && selectedParentId == null;

  /* ── 목록 조회 ── */
  const fetchItems = useCallback(async () => {
    if (isPreview) {
      setItems(PREVIEW_ITEMS);
      return;
    }
    if (!widget.dbSlug) return;
    if (parentNotSelected) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string> = { eq_depth: String(widget.depth), size: CATEGORY_FETCH_SIZE };
      /* 상위 선택값이 있으면 parentId 필터 적용 */
      if (widget.depth > 1 && selectedParentId != null) {
        params.eq_parentId = String(selectedParentId);
      }
      const res = await api.get(`/page-data/${widget.dbSlug}`, { params });
      /* 연결 Slug(relationSlugId) 설정 시 — BE가 내려주는 _fetchedRel{id}.필드명 형태로 자동 접두사 결합.
               관리자는 카드 필드 키에 연결된 레코드의 순수 필드명만 입력하면 된다(예: prdNm). */
      const fetchPrefix = widget.relationSlugId ? `_fetchedRel${widget.relationSlugId}.` : "";
      /* ID는 카테고리 자기 자신의 식별자이므로 연결 Slug 접두사를 절대 적용하지 않는다 —
               fieldId="id"(기본값)면 자기 자신의 id, "refId"면 자기 자신의 refId 필드를 flat 데이터에서 직접 조회 */
      const idKey = widget.fieldId || "id";
      const codeKey = fetchPrefix + (widget.fieldCode || "code");
      const titleKey = fetchPrefix + (widget.fieldTitle || "name");
      const descKey = fetchPrefix + (widget.fieldDesc || "description");

      const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[])
        .map((item) => {
          /* flattenPageDataItem으로 중첩 구조 평탄화 — dot notation key 접근 가능 */
          const flat = flattenPageDataItem(item as Parameters<typeof flattenPageDataItem>[0]);
          return {
            /* ID: 평탄화된 row의 설정 키 값 또는 item.id */
            id: flat[idKey] != null ? Number(flat[idKey]) : item.id,
            name: String(flat[titleKey] ?? ""),
            depth: Number(item.dataJson.depth ?? widget.depth),
            parentId: item.dataJson.parentId != null ? Number(item.dataJson.parentId) : null,
            sortOrder: item.dataJson.sortOrder != null ? Number(item.dataJson.sortOrder) : undefined,
            code: flat[codeKey] != null ? String(flat[codeKey]) : undefined,
            description: flat[descKey] != null ? String(flat[descKey]) : undefined,
            /* 원본 dataJson 보관 — 드래그 정렬 시 구조 유지용 */
            _dataJson: item.dataJson,
            /* 평탄화된 row — parseActionParams 파라미터 바인딩용 */
            _flatJson: flat,
          };
        })
        /* sortOrder 기준 오름차순 정렬 — sortOrder 없는 항목은 뒤로 */
        .sort((a, b) => {
          if (a.sortOrder == null && b.sortOrder == null) return 0;
          if (a.sortOrder == null) return 1;
          if (b.sortOrder == null) return -1;
          return a.sortOrder - b.sortOrder;
        });
      setItems(rows);
    } catch {
      toast.error(t("common.error.load"));
    } finally {
      setLoading(false);
    }
  }, [isPreview, widget.dbSlug, widget.depth, widget.parentWidgetId, selectedParentId, parentNotSelected, t]);

  /* 상위 선택값이 바뀔 때마다 재조회 + 선택 초기화 */
  useEffect(() => {
    setSelectedId(null);
    onSelect?.(widget.widgetId, null);
    fetchItems();
  }, [selectedParentId]);

  /* 팝업 저장 완료 시 재조회 (refreshTick 증가 시점에 동작) */
  useEffect(() => {
    if (refreshTick && refreshTick > 0) fetchItems();
  }, [refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 항목 클릭 — 항상 selectedId 토글 (자식 카테고리 표시용) ── */
  const handleSelect = (item: CategoryItem) => {
    if (isPreview) return;
    const next = selectedId === item.id ? null : item.id;
    setSelectedId(next);
    onSelect?.(widget.widgetId, next);
  };

  /* ── 상세 버튼 클릭 — allowDetail + 연결 설정이 있을 때만 동작 ── */
  const handleDetail = (e: React.MouseEvent, item: CategoryItem) => {
    e.stopPropagation();
    if (isPreview) return;
    if (widget.detailConnType === "popup" && widget.detailPopupSlug) {
      const staticParams = parseActionParams(widget.detailParams, item._flatJson ?? {});
      onPopupOpen?.(widget.detailPopupSlug, item.id, widget.dbSlug, staticParams);
      return;
    }
    if (widget.detailConnType === "path" && widget.detailPath) {
      router.push(`${widget.detailPath}${buildRowActionQuery(item.id, widget.detailParams, item._flatJson ?? {})}`);
    }
  };

  /* ── 등록 ── */
  const handleCreate = async () => {
    if (!inputName.trim()) {
      toast.warning(t("common.validation.name.required"));
      return;
    }
    try {
      const dataJson: Record<string, unknown> = {
        name: inputName.trim(),
        depth: widget.depth,
        /* 마지막 순번 + 1 자동 부여 */
        sortOrder: items.length + 1,
      };
      /* depth 2 이상이면 상위 선택값을 parentId로 저장 */
      if (widget.depth > 1 && selectedParentId != null) {
        dataJson.parentId = selectedParentId;
      }
      await api.post(`/page-data/${widget.dbSlug}`, { dataJson });
      toast.success(t("common.saved"));
      setInputName("");
      setShowInput(false);
      fetchItems();
    } catch {
      toast.error(t("common.error.save"));
    }
  };

  /* ── 삭제 ── */
  const handleDelete = async (id: number) => {
    if (!confirm(t("common.confirm.delete"))) return;
    try {
      await api.delete(`/page-data/${widget.dbSlug}/${id}`);
      toast.success(t("common.deleted"));
      /* 삭제된 항목이 선택 중이었으면 선택 해제 */
      if (selectedId === id) {
        setSelectedId(null);
        onSelect?.(widget.widgetId, null);
      }
      fetchItems();
    } catch {
      toast.error(t("common.error.delete"));
    }
  };

  /* ── 드래그 핸들러 ── */

  /** 드래그 시작: 출발 인덱스 기록 */
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  /** 드래그 오버: 삽입 위치 갱신 (기본 동작 막아서 drop 이벤트 허용) */
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    // 같은 인덱스면 불필요한 리렌더 방지
    if (dropIndex === index) return;
    setDropIndex(index);
  };

  /** 드래그 영역 이탈: 파란 선 제거 */
  const handleDragLeave = (e: React.DragEvent) => {
    // 자식 요소 경계 이탈 시 오탐 방지 — 실제 컨테이너 밖으로 나갈 때만 초기화
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropIndex(null);
  };

  /**
   * 드롭: 항목 순서 재정렬 → 변경된 항목들의 sortOrder를 BE에 저장
   * - 출발 인덱스(dragIndexRef) → 목적지 인덱스(dropIndex) 로 이동
   * - 새 순번은 1-based 연속 숫자 재할당
   */
  const handleDrop = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setDropIndex(null);
    const fromIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (fromIndex == null || fromIndex === toIndex) return;

    /* 배열 재정렬 */
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    /* 1-based 순번 재할당 */
    const updated = reordered.map((item, i) => ({ ...item, sortOrder: i + 1 }));
    setItems(updated);

    /* ID 기준으로 이전 sortOrder와 달라진 항목만 BE 업데이트 */
    const originalSortMap = new Map(items.map((item) => [item.id, item.sortOrder]));
    const changed = updated.filter((item) => item.sortOrder !== originalSortMap.get(item.id));
    try {
      await Promise.all(
        changed.map((item) => {
          /* 원본 dataJson 구조를 유지하고 최상위에 sortOrder만 추가/갱신 */
          const dataJson: Record<string, unknown> = {
            ...(item._dataJson ?? {}),
            sortOrder: item.sortOrder,
          };
          return api.put(`/page-data/${widget.dbSlug}/${item.id}`, { dataJson });
        })
      );
    } catch {
      toast.error(t("common.error.sort"));
      fetchItems(); // 실패 시 원래 순서로 복원
    }
  };

  return (
    /* 우측 여백 — 인접 카테고리 위젯과 시각적 구분을 위한 padding-right */
    <div className={CATEGORY_OUTER_WRAP_CLS}>
      <RendererContainer showBorder className={CATEGORY_CONTAINER_CLS}>
        {/* 헤더: 레이블 + 등록 버튼 */}
        <div className={CATEGORY_HEADER_CLS}>
          <span className={CATEGORY_HEADER_LABEL_CLS}>
            {widget.labelMsgKey
              ? t(widget.labelMsgKey)
              : widget.label || t("common.category.default_label", { depth: String(widget.depth) })}
          </span>
          {/* 등록 버튼 — preview: 항상 표시 / live 인라인: 상위 선택 후 표시 / live popup·path: 항상 표시 */}
          {widget.allowCreate !== false &&
            (isPreview ||
              !parentNotSelected ||
              widget.createConnType === "popup" ||
              widget.createConnType === "path") && (
              <button
                onClick={async () => {
                  if (isPreview) return;
                  /* 상위 카테고리 미선택 시 validation (depth 2 이상) */
                  if (parentNotSelected) {
                    toast.warning(t("common.category.select_parent_warning"));
                    return;
                  }
                  /* 연결 타입에 따라 동작 분기 */
                  if (widget.createConnType === "popup" && widget.createPopupSlug) {
                    /* 파라미터 파싱 후 팝업/페이지 오픈, autoSave 플래그 전달 */
                    /* selectedParentId를 id로 참조 가능하도록 row 구성 */
                    const rowForParams = selectedParentId != null ? { id: String(selectedParentId) } : {};
                    const staticParams = parseActionParams(widget.createParams, rowForParams);
                    const dynamicParams: Record<string, string> =
                      selectedParentId != null ? { parentId: String(selectedParentId) } : {};
                    onPopupOpen?.(
                      widget.createPopupSlug,
                      null,
                      widget.dbSlug,
                      { ...staticParams, ...dynamicParams },
                      widget.createParamSave
                    );
                  } else if (widget.createConnType === "path" && widget.createPath) {
                    /* parseActionParams로 파싱 후 URLSearchParams로 올바른 쿼리스트링 생성 */
                    const rowForParams = selectedParentId != null ? { id: String(selectedParentId) } : {};
                    const parsed = parseActionParams(widget.createParams, rowForParams);
                    if (widget.createParamSave) parsed["_paramSave"] = "true";
                    const qs = Object.keys(parsed).length > 0 ? `?${new URLSearchParams(parsed).toString()}` : "";
                    router.push(`${widget.createPath}${qs}`);
                  } else {
                    /* 연결 없음 — inline 입력창 표시 */
                    setShowInput((v) => !v);
                    setInputName("");
                  }
                }}
                className={categoryAddButtonClass(isPreview)}
              >
                <Plus className={CATEGORY_HEADER_ICON_CLS} />
                {t("common.btn.add")}
              </button>
            )}
        </div>

        {/* 등록 입력창 */}
        {showInput && (
          <div className={CATEGORY_INPUT_ROW_CLS}>
            <input
              type="text"
              autoFocus
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowInput(false);
              }}
              placeholder={t("common.input.name_placeholder")}
              className={CATEGORY_INPUT_CLS}
            />
            <button onClick={handleCreate} className={CATEGORY_INPUT_CONFIRM_BTN_CLS}>
              <Check className={CATEGORY_INPUT_ICON_CLS} />
            </button>
            <button onClick={() => setShowInput(false)} className={CATEGORY_INPUT_CANCEL_BTN_CLS}>
              <X className={CATEGORY_INPUT_ICON_CLS} />
            </button>
          </div>
        )}

        {/* 항목 목록 — flex-1로 남은 높이 채우고, 항목 많으면 스크롤 */}
        <div className={CATEGORY_LIST_WRAP_CLS}>
          {/* 상위 미선택 안내 */}
          {parentNotSelected && (
            <div className={CATEGORY_STATE_WRAP_CLS}>
              <span className={CATEGORY_STATE_TEXT_ITALIC_CLS}>{t("common.category.select_parent")}</span>
            </div>
          )}

          {/* 로딩 */}
          {!parentNotSelected && loading && (
            <div className={CATEGORY_STATE_WRAP_CLS}>
              <span className={CATEGORY_STATE_TEXT_CLS}>{t("common.loading")}</span>
            </div>
          )}

          {/* 항목 없음 */}
          {!parentNotSelected && !loading && items.length === 0 && (
            <div className={CATEGORY_STATE_WRAP_CLS}>
              <span className={CATEGORY_STATE_TEXT_ITALIC_CLS}>{t("common.table.no_data")}</span>
            </div>
          )}

          {/* 항목 카드 목록 */}
          {!parentNotSelected && !loading && items.length > 0 && (
            <div className={CATEGORY_LIST_CLS}>
              {items.map((item, index) => (
                <div key={item.id} className={CATEGORY_ITEM_WRAP_CLS}>
                  {/* 드롭 위치 표시선 — absolute 오버레이로 레이아웃 밀림 없음 */}
                  {!isPreview && dropIndex === index && dragIndexRef.current !== index && (
                    <div className={CATEGORY_DROP_LINE_CLS} />
                  )}
                  <div
                    draggable={!isPreview}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={(e) => handleDragLeave(e)}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => handleSelect(item)}
                    className={categoryCardClass(selectedId === item.id)}
                  >
                    {/* 선택 강조 — 좌측 액센트 바 */}
                    {selectedId === item.id && <div className={CATEGORY_ACCENT_BAR_CLS} />}

                    <div className={CATEGORY_CARD_BODY_CLS}>
                      {/* 드래그 핸들 + 순번 */}
                      <div className={categoryDragHandleClass(isPreview)} onClick={(e) => e.stopPropagation()}>
                        <GripVertical className={categoryGripIconClass(selectedId === item.id)} />
                        <span className={categoryOrderNumClass(selectedId === item.id)}>{index + 1}</span>
                      </div>

                      <div className={CATEGORY_CARD_MAIN_CLS}>
                        {/* 1행: 코드 | 타이틀 | 우측 버튼 */}
                        <div className={CATEGORY_CARD_ROW1_CLS}>
                          {item.code && (
                            <span className={categoryCodeBadgeClass(selectedId === item.id)}>{item.code}</span>
                          )}
                          <span className={categoryTitleClass(selectedId === item.id)}>{item.name}</span>
                          {/* hover 시 수정/상세/삭제 버튼 */}
                          <div className={CATEGORY_ACTIONS_WRAP_CLS} onClick={(e) => e.stopPropagation()}>
                            {/* 수정 버튼 — allowEdit 토글 ON 시만 표시 */}
                            {widget.allowEdit && (
                              <button
                                onClick={async () => {
                                  if (isPreview) return;
                                  if (widget.editConnType === "popup" && widget.editPopupSlug) {
                                    /* 팝업/페이지로 이동하며 파라미터를 initialValues로 전달, autoSave 플래그 전달 */
                                    onPopupOpen?.(
                                      widget.editPopupSlug,
                                      item.id,
                                      widget.dbSlug,
                                      parseActionParams(widget.editParams, item._flatJson ?? {}),
                                      widget.editParamSave
                                    );
                                  } else if (widget.editConnType === "path" && widget.editPath) {
                                    router.push(
                                      `${widget.editPath}${buildRowActionQuery(item.id, widget.editParams, item._flatJson ?? {}, widget.editParamSave)}`
                                    );
                                  }
                                }}
                                className={categoryActionButtonClass(isPreview, selectedId === item.id)}
                                title={t("common.btn.edit")}
                              >
                                <Pencil className={CATEGORY_ACTION_ICON_CLS} />
                              </button>
                            )}
                            {/* 상세 버튼 — allowDetail 토글 ON + 연결 설정이 있을 때만 표시 */}
                            {widget.allowDetail &&
                              (widget.detailConnType === "popup" || widget.detailConnType === "path") && (
                                <button
                                  onClick={(e) => handleDetail(e, item)}
                                  className={categoryActionButtonClass(isPreview, selectedId === item.id)}
                                  title={t("common.btn.detail")}
                                >
                                  <Eye className={CATEGORY_ACTION_ICON_CLS} />
                                </button>
                              )}
                            {widget.allowDelete !== false && (
                              <button
                                onClick={() => {
                                  if (!isPreview) handleDelete(item.id);
                                }}
                                className={categoryDeleteButtonClass(isPreview, selectedId === item.id)}
                                title={t("common.btn.delete")}
                              >
                                <Trash2 className={CATEGORY_ACTION_ICON_CLS} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 2행: 설명 */}
                        {item.description && (
                          <p className={categoryDescClass(selectedId === item.id)}>{item.description}</p>
                        )}
                      </div>
                      {/* flex-1 min-w-0 끝 */}
                    </div>
                  </div>
                </div>
              ))}
              {/* 맨 마지막 드롭 위치 표시선 */}
              {!isPreview && dropIndex === items.length && <div className={CATEGORY_DROP_LINE_LAST_CLS} />}
            </div>
          )}
        </div>
      </RendererContainer>
    </div>
  );
}
