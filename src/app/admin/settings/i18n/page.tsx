"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { WidgetRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { SearchWidget, SpaceWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { TableWidget } from "@/app/admin/templates/make/_shared/components/builder/TableBuilder";
import type { TableActionHandlers } from "@/app/admin/templates/make/_shared/components/renderer/types";
import { useMessageResourceStore, MessageResource } from "@/store/use-message-resource-store";
import { MessageResourceDrawer } from "@/components/i18n/message-resource-drawer";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useI18n } from "@/hooks/use-i18n";

/* ── 상수 ── */

const PAGE_SIZE = 10;

/** 검색 위젯 — key / 한국어 / 영어 / 사용여부 */
const SEARCH_WIDGET: SearchWidget = {
  type: "search",
  widgetId: "i18n-search",
  contentKey: "i18nSearch",
  displayStyle: "simple",
  rows: [
    {
      id: "r1",
      cols: 5,
      fields: [
        {
          id: "f1",
          type: "input",
          label: "Key",
          labelMsgKey: "i18n.label.key",
          colSpan: 1,
          placeholder: "Key 검색",
          placeholderMsgKey: "i18n.placeholder.keySearch",
        },
        {
          id: "f2",
          type: "input",
          label: "한국어",
          labelMsgKey: "i18n.label.korean",
          colSpan: 1,
          placeholder: "한국어 검색",
          placeholderMsgKey: "i18n.placeholder.koreanSearch",
        },
        {
          id: "f3",
          type: "input",
          label: "영어",
          labelMsgKey: "i18n.label.english",
          colSpan: 1,
          placeholder: "영어 검색",
          placeholderMsgKey: "i18n.placeholder.englishSearch",
        },
        {
          id: "f4",
          type: "select",
          label: "유형",
          labelMsgKey: "common.label.type",
          colSpan: 1,
          options: ["전체", "단어", "문장"],
        },
        {
          id: "f5",
          type: "select",
          label: "사용여부",
          labelMsgKey: "common.label.isActive",
          colSpan: 1,
          options: ["전체", "사용", "미사용"],
        },
      ],
    },
  ],
};

/** 공간영역 위젯 — 항목 추가 버튼 */
const SPACE_WIDGET: SpaceWidget = {
  type: "space",
  widgetId: "i18n-space",
  align: "right",
  showBorder: false,
  items: [
    {
      id: "s1",
      type: "action-button",
      label: "항목 추가",
      labelMsgKey: "i18n.btn.addItem",
      colSpan: 1,
      color: "black",
      connType: "close",
    },
  ],
};

/** 테이블 위젯 */
const TABLE_WIDGET: TableWidget = {
  type: "table",
  widgetId: "i18n-table",
  contentKey: "i18nList",
  displayMode: "pagination",
  pageSize: PAGE_SIZE,
  connectedSearchIds: ["i18n-search"],
  columns: [
    {
      id: "c1",
      header: "Key",
      headerMsgKey: "i18n.label.key",
      accessor: "key",
      cellType: "text",
      align: "left",
      sortable: true,
      width: 200,
    },
    {
      id: "c2",
      header: "한국어",
      headerMsgKey: "i18n.label.korean",
      accessor: "ko",
      cellType: "text",
      align: "left",
      sortable: true,
    },
    {
      id: "c3",
      header: "영어",
      headerMsgKey: "i18n.label.english",
      accessor: "en",
      cellType: "text",
      align: "left",
      sortable: true,
    },
    {
      id: "c4",
      header: "유형",
      headerMsgKey: "common.label.type",
      accessor: "resourceType",
      cellType: "badge",
      align: "center",
      sortable: true,
      width: 80,
      cellOptions: [
        { value: "WORD", text: "단어", color: "blue" },
        { value: "SENTENCE", text: "문장", color: "purple" },
      ],
    },
    {
      id: "c5",
      header: "사용여부",
      headerMsgKey: "common.label.isActive",
      accessor: "active",
      cellType: "badge",
      align: "center",
      sortable: true,
      width: 90,
      cellOptions: [
        { value: "true", text: "사용", color: "green" },
        { value: "false", text: "미사용", color: "gray" },
      ],
    },
    {
      id: "c6",
      header: "등록일",
      headerMsgKey: "common.label.createdAt",
      accessor: "createdAt",
      cellType: "text",
      align: "center",
      sortable: true,
      width: 160,
    },
    {
      id: "c7",
      header: "관리",
      headerMsgKey: "common.label.manage",
      accessor: "_actions",
      cellType: "actions",
      align: "center",
      sortable: false,
      width: 100,
      actions: ["edit", "delete"],
    },
  ],
};

/** 검색 필드 초기값 */
const INITIAL_SEARCH: Record<string, string> = { f1: "", f2: "", f3: "", f4: "전체", f5: "전체" };

/* ── 페이지 컴포넌트 ── */

export default function I18nPage() {
  const { items, totalElements, totalPages, currentPage, isLoading, fetchItems, deleteItem, openDrawer } =
    useMessageResourceStore();
  const { t } = useI18n();

  /* 검색 상태 */
  const [searchValues, setSearchValues] = useState<Record<string, string>>(INITIAL_SEARCH);
  const [appliedSearch, setAppliedSearch] = useState<Record<string, string>>(INITIAL_SEARCH);

  /* 정렬 상태 */
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  /* 삭제 대상 */
  const [deleteTarget, setDeleteTarget] = useState<MessageResource | null>(null);

  /* 검색 파라미터 → fetchItems 호출용 변환 */
  const buildSearchParams = useCallback(
    (search: Record<string, string>, page: number, sk: string | null, sd: "asc" | "desc") => ({
      key: search.f1 ?? "",
      ko: search.f2 ?? "",
      en: search.f3 ?? "",
      resourceType: search.f4 ?? "전체",
      active: search.f5 ?? "전체",
      page,
      size: PAGE_SIZE,
      sort: sk ? `${sk},${sd}` : undefined,
    }),
    []
  );

  /* 페이지 진입 시 목록 조회 */
  useEffect(() => {
    fetchItems(buildSearchParams(INITIAL_SEARCH, 0, null, "asc"));
  }, [fetchItems, buildSearchParams]);

  /* 검색 필드 변경 */
  const handleSearchChange = useCallback((fieldId: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  /* 검색 버튼 */
  const handleSearch = useCallback(() => {
    setAppliedSearch({ ...searchValues });
    fetchItems(buildSearchParams(searchValues, 0, sortKey, sortDir));
  }, [searchValues, fetchItems, buildSearchParams, sortKey, sortDir]);

  /* 초기화 버튼 */
  const handleReset = useCallback(() => {
    setSearchValues(INITIAL_SEARCH);
    setAppliedSearch(INITIAL_SEARCH);
    fetchItems(buildSearchParams(INITIAL_SEARCH, 0, sortKey, sortDir));
  }, [fetchItems, buildSearchParams, sortKey, sortDir]);

  /* 페이지 변경 */
  const handlePageChange = useCallback(
    (page: number) => {
      fetchItems(buildSearchParams(appliedSearch, page, sortKey, sortDir));
    },
    [appliedSearch, fetchItems, buildSearchParams, sortKey, sortDir]
  );

  const handleSort = useCallback(
    (accessor: string, dir: "asc" | "desc" | null) => {
      const nextSortKey = dir ? accessor : null;
      const nextSortDir = dir ?? sortDir;
      setSortKey(nextSortKey);
      if (dir) setSortDir(nextSortDir);
      fetchItems(buildSearchParams(appliedSearch, 0, nextSortKey, nextSortDir));
    },
    [appliedSearch, buildSearchParams, fetchItems, sortDir]
  );

  /* 삭제 확인 */
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem(deleteTarget.id);
      fetchItems(buildSearchParams(appliedSearch, currentPage, sortKey, sortDir));
    } catch {
      /* 오류는 store에서 toast 처리 */
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteItem, fetchItems, buildSearchParams, appliedSearch, currentPage, sortKey, sortDir]);

  /* 테이블 액션 핸들러 */
  const handlers: TableActionHandlers = useMemo(
    () => ({
      onEdit: (row) => {
        /* 테이블 row → MessageResource 타입으로 변환 후 Drawer 오픈 */
        const item = items.find((i) => i.id === Number(row._id));
        if (item) openDrawer(item);
      },
      onDelete: (id) => {
        const item = items.find((i) => i.id === id);
        if (item) setDeleteTarget(item);
      },
    }),
    [items, openDrawer]
  );

  const tableData = useMemo(
    () =>
      items.map((item) => ({
        _id: item.id,
        key: item.key,
        ko: item.ko,
        en: item.en ?? "",
        resourceType: item.resourceType ?? "WORD",
        active: String(item.active),
        createdAt: item.createdAt ? item.createdAt.replace("T", " ").substring(0, 16) : "",
      })) as unknown as Record<string, unknown>[],
    [items]
  );

  return (
    <>
      <PageLayout mode="live">
        {/* 검색 위젯 */}
        <GridCell colSpan={12} rowSpan={1}>
          <WidgetRenderer
            mode="live"
            widget={SEARCH_WIDGET}
            contentColSpan={12}
            searchValues={searchValues}
            onSearchChange={handleSearchChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        </GridCell>

        {/* 항목 추가 버튼 */}
        <GridCell colSpan={1} colStart={12} rowSpan={1}>
          <WidgetRenderer mode="live" widget={SPACE_WIDGET} contentColSpan={1} onClose={() => openDrawer()} />
        </GridCell>

        {/* 테이블 위젯 */}
        <GridCell colSpan={12} rowSpan={9}>
          <WidgetRenderer
            mode="live"
            widget={TABLE_WIDGET}
            contentColSpan={12}
            tableData={tableData}
            tableLoading={isLoading}
            totalElements={totalElements}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            handlers={handlers}
          />
        </GridCell>
      </PageLayout>

      {/* 등록/수정 Drawer */}
      <MessageResourceDrawer />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t("i18n.title.deleteItem")}
        description={t("i18n.confirm.deleteItem", { key: deleteTarget?.key ?? "" })}
        confirmText={t("i18n.btn.deleteConfirm")}
        variant="danger"
      />
    </>
  );
}
