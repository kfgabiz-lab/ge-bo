"use client";

import React, { useState, useEffect, useRef } from "react";
import { GridCell, ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";
import { PageGridContainer } from "@/components/layout/page-grid-container";
import PageLayout from "@/components/layout/page-layout";
import { usePageTitleStore } from "@/store/use-page-title-store";
import { useI18n } from "@/hooks/use-i18n";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { flattenPageDataItem, parseActionParams, buildRowActionQuery } from "@/app/admin/templates/make/_shared/utils";
import { useRouter } from "next/navigation";

interface CategoryItem {
  id: number;
  name: string;
  depth: number;
  parentId: number | null;
  sortOrder?: number;
  code?: string;
  description?: string;
  _dataJson?: Record<string, unknown>;
  _flatJson?: Record<string, unknown>;
}
const CATEGORY_FETCH_SIZE = "9999";
const CATEGORY_LEVEL1_PAGE_PATH = "/admin/product/category/level1";
const CATEGORY_FIELD_KEYS_Category1 = {
  id: "category.id",
  code: "category.code",
  title: "category.title",
  desc: "category.sub_title",
};
function sortCategoryItems(rows: CategoryItem[]): CategoryItem[] {
  return [...rows].sort((a, b) => {
    if (a.sortOrder == null && b.sortOrder == null) return 0;
    if (a.sortOrder == null) return 1;
    if (b.sortOrder == null) return -1;
    return a.sortOrder - b.sortOrder;
  });
}
const CATEGORY_LEVEL2_PAGE_PATH = "/admin/product/category/level2";
const CATEGORY_FIELD_KEYS_Category2 = {
  id: "category.id",
  code: "category.code",
  title: "category.title",
  desc: "category.sub_title",
};
const PRODUCT_SEARCH_POPUP_PAGE_PATH = "/admin/widgetSub/product-search-popup";
const PRODUCT_DETAIL_PAGE_PATH = "/admin/product/product-detail";
const CATEGORY_FIELD_KEYS_Category3 = {
  id: "id",
  code: "_fetchedRel18.product.product_code",
  title: "_fetchedRel18.product.product_name",
  desc: "_fetchedRel18.product.product_description",
};

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("menu.catelv1.label"));
  }, [setPageTitle, t]);
  const categoryDbSlugCategory1 = "category-data";
  const router = useRouter();
  const [categoryItemsCategory1, setCategoryItemsCategory1] = useState<CategoryItem[]>([]);
  const [categoryLoadingCategory1, setCategoryLoadingCategory1] = useState(false);
  const [selectedIdCategory1, setSelectedIdCategory1] = useState<number | null>(null);
  const categoryDragIndexRefCategory1 = useRef<number | null>(null);
  const [categoryDropIndexCategory1, setCategoryDropIndexCategory1] = useState<number | null>(null);
  const categoryDbSlugCategory2 = "category-data";
  const [categoryItemsCategory2, setCategoryItemsCategory2] = useState<CategoryItem[]>([]);
  const [categoryLoadingCategory2, setCategoryLoadingCategory2] = useState(false);
  const [selectedIdCategory2, setSelectedIdCategory2] = useState<number | null>(null);
  const categoryDragIndexRefCategory2 = useRef<number | null>(null);
  const [categoryDropIndexCategory2, setCategoryDropIndexCategory2] = useState<number | null>(null);
  const categoryDbSlugCategory3 = "category-data";
  const [categoryItemsCategory3, setCategoryItemsCategory3] = useState<CategoryItem[]>([]);
  const [categoryLoadingCategory3, setCategoryLoadingCategory3] = useState(false);
  const [selectedIdCategory3, setSelectedIdCategory3] = useState<number | null>(null);
  const categoryDragIndexRefCategory3 = useRef<number | null>(null);
  const [categoryDropIndexCategory3, setCategoryDropIndexCategory3] = useState<number | null>(null);

  const fetchCategoryCategory1 = async (parentId: number | null) => {
    if (!categoryDbSlugCategory1) return;
    setCategoryLoadingCategory1(true);
    try {
      const params: Record<string, string> = { eq_depth: "1", size: CATEGORY_FETCH_SIZE };
      if (parentId != null) params.eq_parentId = String(parentId);
      const res = await api.get(`/page-data/${categoryDbSlugCategory1}`, { params });
      const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[]).map((item) => {
        const flat = flattenPageDataItem(item as Parameters<typeof flattenPageDataItem>[0]);
        return {
          id: flat[CATEGORY_FIELD_KEYS_Category1.id] != null ? Number(flat[CATEGORY_FIELD_KEYS_Category1.id]) : item.id,
          name: String(flat[CATEGORY_FIELD_KEYS_Category1.title] ?? ""),
          depth: Number(item.dataJson.depth ?? 1),
          parentId: item.dataJson.parentId != null ? Number(item.dataJson.parentId) : null,
          sortOrder: item.dataJson.sortOrder != null ? Number(item.dataJson.sortOrder) : undefined,
          code:
            flat[CATEGORY_FIELD_KEYS_Category1.code] != null
              ? String(flat[CATEGORY_FIELD_KEYS_Category1.code])
              : undefined,
          description:
            flat[CATEGORY_FIELD_KEYS_Category1.desc] != null
              ? String(flat[CATEGORY_FIELD_KEYS_Category1.desc])
              : undefined,
          _dataJson: item.dataJson,
          _flatJson: flat,
        };
      });
      setCategoryItemsCategory1(sortCategoryItems(rows));
    } catch {
      toast.error(t("common.error.load"));
    } finally {
      setCategoryLoadingCategory1(false);
    }
  };

  useEffect(() => {
    fetchCategoryCategory1(null);
  }, []);

  const handleCategorySelectCategory1 = (item: CategoryItem) => {
    setSelectedIdCategory1(selectedIdCategory1 === item.id ? null : item.id);
  };

  const handleCategoryAddCategory1 = () => {
    const rowForParams = {};
    const parsed = parseActionParams("depth=1", rowForParams);
    const qs = Object.keys(parsed).length > 0 ? `?${new URLSearchParams(parsed).toString()}` : "";
    router.push(`${CATEGORY_LEVEL1_PAGE_PATH}${qs}`);
  };

  const handleCategoryEditCategory1 = (item: CategoryItem) => {
    router.push(`${CATEGORY_LEVEL1_PAGE_PATH}${buildRowActionQuery(item.id, "depth=1", item._flatJson ?? {})}`);
  };

  const handleCategoryDeleteCategory1 = async (id: number) => {
    if (!confirm(t("common.confirm.delete"))) return;
    try {
      await api.delete(`/page-data/${categoryDbSlugCategory1}/${id}`);
      toast.success(t("common.deleted"));
      if (selectedIdCategory1 === id) setSelectedIdCategory1(null);
      fetchCategoryCategory1(null);
    } catch {
      toast.error(t("common.error.delete"));
    }
  };

  const handleCategoryDragStartCategory1 = (index: number) => {
    categoryDragIndexRefCategory1.current = index;
  };

  const handleCategoryDragOverCategory1 = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (categoryDropIndexCategory1 === index) return;
    setCategoryDropIndexCategory1(index);
  };

  const handleCategoryDragLeaveCategory1 = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setCategoryDropIndexCategory1(null);
  };

  const handleCategoryDropCategory1 = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setCategoryDropIndexCategory1(null);
    const fromIndex = categoryDragIndexRefCategory1.current;
    categoryDragIndexRefCategory1.current = null;
    if (fromIndex == null || fromIndex === toIndex) return;
    const reordered = [...categoryItemsCategory1];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const updated = reordered.map((item, i) => ({ ...item, sortOrder: i + 1 }));
    setCategoryItemsCategory1(updated);
    const originalSortMap = new Map(categoryItemsCategory1.map((item) => [item.id, item.sortOrder]));
    const changed = updated.filter((item) => item.sortOrder !== originalSortMap.get(item.id));
    try {
      await Promise.all(
        changed.map((item) => {
          const dataJson: Record<string, unknown> = { ...(item._dataJson ?? {}), sortOrder: item.sortOrder };
          return api.put(`/page-data/${categoryDbSlugCategory1}/${item.id}`, { dataJson });
        })
      );
    } catch {
      toast.error(t("common.error.sort"));
      fetchCategoryCategory1(null);
    }
  };

  const fetchCategoryCategory2 = async (parentId: number | null) => {
    if (!categoryDbSlugCategory2) return;
    if (parentId == null) {
      setCategoryItemsCategory2([]);
      return;
    }
    setCategoryLoadingCategory2(true);
    try {
      const params: Record<string, string> = { eq_depth: "2", size: CATEGORY_FETCH_SIZE };
      if (parentId != null) params.eq_parentId = String(parentId);
      const res = await api.get(`/page-data/${categoryDbSlugCategory2}`, { params });
      const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[]).map((item) => {
        const flat = flattenPageDataItem(item as Parameters<typeof flattenPageDataItem>[0]);
        return {
          id: flat[CATEGORY_FIELD_KEYS_Category2.id] != null ? Number(flat[CATEGORY_FIELD_KEYS_Category2.id]) : item.id,
          name: String(flat[CATEGORY_FIELD_KEYS_Category2.title] ?? ""),
          depth: Number(item.dataJson.depth ?? 2),
          parentId: item.dataJson.parentId != null ? Number(item.dataJson.parentId) : null,
          sortOrder: item.dataJson.sortOrder != null ? Number(item.dataJson.sortOrder) : undefined,
          code:
            flat[CATEGORY_FIELD_KEYS_Category2.code] != null
              ? String(flat[CATEGORY_FIELD_KEYS_Category2.code])
              : undefined,
          description:
            flat[CATEGORY_FIELD_KEYS_Category2.desc] != null
              ? String(flat[CATEGORY_FIELD_KEYS_Category2.desc])
              : undefined,
          _dataJson: item.dataJson,
          _flatJson: flat,
        };
      });
      setCategoryItemsCategory2(sortCategoryItems(rows));
    } catch {
      toast.error(t("common.error.load"));
    } finally {
      setCategoryLoadingCategory2(false);
    }
  };

  useEffect(() => {
    setSelectedIdCategory2(null);
    fetchCategoryCategory2(selectedIdCategory1);
  }, [selectedIdCategory1]);

  const handleCategorySelectCategory2 = (item: CategoryItem) => {
    setSelectedIdCategory2(selectedIdCategory2 === item.id ? null : item.id);
  };

  const handleCategoryAddCategory2 = () => {
    if (selectedIdCategory1 == null) {
      toast.warning(t("common.category.select_parent_warning"));
      return;
    }
    const rowForParams = selectedIdCategory1 != null ? { id: String(selectedIdCategory1) } : {};
    const parsed = parseActionParams("depth=2", rowForParams);
    if (selectedIdCategory1 != null) parsed["parentId"] = String(selectedIdCategory1);
    const qs = Object.keys(parsed).length > 0 ? `?${new URLSearchParams(parsed).toString()}` : "";
    router.push(`${CATEGORY_LEVEL2_PAGE_PATH}${qs}`);
  };

  const handleCategoryEditCategory2 = (item: CategoryItem) => {
    router.push(`${CATEGORY_LEVEL2_PAGE_PATH}${buildRowActionQuery(item.id, "depth=2", item._flatJson ?? {})}`);
  };

  const handleCategoryDeleteCategory2 = async (id: number) => {
    if (!confirm(t("common.confirm.delete"))) return;
    try {
      await api.delete(`/page-data/${categoryDbSlugCategory2}/${id}`);
      toast.success(t("common.deleted"));
      if (selectedIdCategory2 === id) setSelectedIdCategory2(null);
      fetchCategoryCategory2(selectedIdCategory1);
    } catch {
      toast.error(t("common.error.delete"));
    }
  };

  const handleCategoryDragStartCategory2 = (index: number) => {
    categoryDragIndexRefCategory2.current = index;
  };

  const handleCategoryDragOverCategory2 = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (categoryDropIndexCategory2 === index) return;
    setCategoryDropIndexCategory2(index);
  };

  const handleCategoryDragLeaveCategory2 = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setCategoryDropIndexCategory2(null);
  };

  const handleCategoryDropCategory2 = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setCategoryDropIndexCategory2(null);
    const fromIndex = categoryDragIndexRefCategory2.current;
    categoryDragIndexRefCategory2.current = null;
    if (fromIndex == null || fromIndex === toIndex) return;
    const reordered = [...categoryItemsCategory2];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const updated = reordered.map((item, i) => ({ ...item, sortOrder: i + 1 }));
    setCategoryItemsCategory2(updated);
    const originalSortMap = new Map(categoryItemsCategory2.map((item) => [item.id, item.sortOrder]));
    const changed = updated.filter((item) => item.sortOrder !== originalSortMap.get(item.id));
    try {
      await Promise.all(
        changed.map((item) => {
          const dataJson: Record<string, unknown> = { ...(item._dataJson ?? {}), sortOrder: item.sortOrder };
          return api.put(`/page-data/${categoryDbSlugCategory2}/${item.id}`, { dataJson });
        })
      );
    } catch {
      toast.error(t("common.error.sort"));
      fetchCategoryCategory2(selectedIdCategory1);
    }
  };

  const fetchCategoryCategory3 = async (parentId: number | null) => {
    if (!categoryDbSlugCategory3) return;
    if (parentId == null) {
      setCategoryItemsCategory3([]);
      return;
    }
    setCategoryLoadingCategory3(true);
    try {
      const params: Record<string, string> = { eq_depth: "3", size: CATEGORY_FETCH_SIZE };
      if (parentId != null) params.eq_parentId = String(parentId);
      const res = await api.get(`/page-data/${categoryDbSlugCategory3}`, { params });
      const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[]).map((item) => {
        const flat = flattenPageDataItem(item as Parameters<typeof flattenPageDataItem>[0]);
        return {
          id: flat[CATEGORY_FIELD_KEYS_Category3.id] != null ? Number(flat[CATEGORY_FIELD_KEYS_Category3.id]) : item.id,
          name: String(flat[CATEGORY_FIELD_KEYS_Category3.title] ?? ""),
          depth: Number(item.dataJson.depth ?? 3),
          parentId: item.dataJson.parentId != null ? Number(item.dataJson.parentId) : null,
          sortOrder: item.dataJson.sortOrder != null ? Number(item.dataJson.sortOrder) : undefined,
          code:
            flat[CATEGORY_FIELD_KEYS_Category3.code] != null
              ? String(flat[CATEGORY_FIELD_KEYS_Category3.code])
              : undefined,
          description:
            flat[CATEGORY_FIELD_KEYS_Category3.desc] != null
              ? String(flat[CATEGORY_FIELD_KEYS_Category3.desc])
              : undefined,
          _dataJson: item.dataJson,
          _flatJson: flat,
        };
      });
      setCategoryItemsCategory3(sortCategoryItems(rows));
    } catch {
      toast.error(t("common.error.load"));
    } finally {
      setCategoryLoadingCategory3(false);
    }
  };

  useEffect(() => {
    setSelectedIdCategory3(null);
    fetchCategoryCategory3(selectedIdCategory2);
  }, [selectedIdCategory2]);

  const handleCategorySelectCategory3 = (item: CategoryItem) => {
    setSelectedIdCategory3(selectedIdCategory3 === item.id ? null : item.id);
  };

  const handleCategoryAddCategory3 = () => {
    if (selectedIdCategory2 == null) {
      toast.warning(t("common.category.select_parent_warning"));
      return;
    }
    /* TODO(파일빌드): 연결 대상(product-search-popup)이 LayerPopup 모드입니다. 산출물에서는 페이지 이동으로 동작합니다(레이어 팝업 미지원). */
    const rowForParams = selectedIdCategory2 != null ? { id: String(selectedIdCategory2) } : {};
    const parsed = parseActionParams(
      "product.depth=3,product.parentId=id,product.is_training_category=true",
      rowForParams
    );
    if (selectedIdCategory2 != null) parsed["parentId"] = String(selectedIdCategory2);
    parsed["_paramSave"] = "true";
    const qs = Object.keys(parsed).length > 0 ? `?${new URLSearchParams(parsed).toString()}` : "";
    router.push(`${PRODUCT_SEARCH_POPUP_PAGE_PATH}${qs}`);
  };

  const handleCategoryEditCategory3 = (item: CategoryItem) => {
    router.push(`${PRODUCT_DETAIL_PAGE_PATH}${buildRowActionQuery(item.id, "id=product.id", item._flatJson ?? {})}`);
  };

  const handleCategoryDeleteCategory3 = async (id: number) => {
    if (!confirm(t("common.confirm.delete"))) return;
    try {
      await api.delete(`/page-data/${categoryDbSlugCategory3}/${id}`);
      toast.success(t("common.deleted"));
      if (selectedIdCategory3 === id) setSelectedIdCategory3(null);
      fetchCategoryCategory3(selectedIdCategory2);
    } catch {
      toast.error(t("common.error.delete"));
    }
  };

  const handleCategoryDragStartCategory3 = (index: number) => {
    categoryDragIndexRefCategory3.current = index;
  };

  const handleCategoryDragOverCategory3 = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (categoryDropIndexCategory3 === index) return;
    setCategoryDropIndexCategory3(index);
  };

  const handleCategoryDragLeaveCategory3 = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setCategoryDropIndexCategory3(null);
  };

  const handleCategoryDropCategory3 = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setCategoryDropIndexCategory3(null);
    const fromIndex = categoryDragIndexRefCategory3.current;
    categoryDragIndexRefCategory3.current = null;
    if (fromIndex == null || fromIndex === toIndex) return;
    const reordered = [...categoryItemsCategory3];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const updated = reordered.map((item, i) => ({ ...item, sortOrder: i + 1 }));
    setCategoryItemsCategory3(updated);
    const originalSortMap = new Map(categoryItemsCategory3.map((item) => [item.id, item.sortOrder]));
    const changed = updated.filter((item) => item.sortOrder !== originalSortMap.get(item.id));
    try {
      await Promise.all(
        changed.map((item) => {
          const dataJson: Record<string, unknown> = { ...(item._dataJson ?? {}), sortOrder: item.sortOrder };
          return api.put(`/page-data/${categoryDbSlugCategory3}/${item.id}`, { dataJson });
        })
      );
    } catch {
      toast.error(t("common.error.sort"));
      fetchCategoryCategory3(selectedIdCategory2);
    }
  };

  return (
    <PageLayout mode="live">
      <GridCell colSpan={10} rowSpan={8}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(10, 1fr)",
            gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
            gridAutoFlow: "row dense",
            rowGap: `${GAP_SIZE}px`,
            columnGap: 0,
          }}
        >
          <div style={{ gridColumn: "span 3", gridRow: "span 8", height: `${8 * ROW_HEIGHT - GAP_SIZE}px` }}>
            <div className="h-full w-full pr-2">
              <div
                className="h-full w-full rounded border border-slate-200 flex flex-col bg-white"
                style={{ overflow: "clip" }}
              >
                <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-700">{t("category.label.lv1")}</span>
                  <button
                    onClick={handleCategoryAddCategory1}
                    className="flex items-center gap-1 text-[11px] transition-colors text-slate-500 hover:text-slate-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("common.btn.add")}
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {categoryLoadingCategory1 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-slate-300">{t("common.loading")}</span>
                    </div>
                  )}
                  {!categoryLoadingCategory1 && categoryItemsCategory1.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-slate-300 italic">{t("common.table.no_data")}</span>
                    </div>
                  )}
                  {!categoryLoadingCategory1 && categoryItemsCategory1.length > 0 && (
                    <div className="p-2 space-y-1.5">
                      {categoryItemsCategory1.map((item, index) => (
                        <div key={item.id} className="relative">
                          {categoryDropIndexCategory1 === index && categoryDragIndexRefCategory1.current !== index && (
                            <div className="absolute top-0 left-1 right-1 h-0.5 bg-blue-400 rounded z-10 pointer-events-none" />
                          )}
                          <div
                            draggable
                            onDragStart={() => handleCategoryDragStartCategory1(index)}
                            onDragOver={(e) => handleCategoryDragOverCategory1(e, index)}
                            onDragLeave={(e) => handleCategoryDragLeaveCategory1(e)}
                            onDrop={(e) => handleCategoryDropCategory1(e, index)}
                            onClick={() => handleCategorySelectCategory1(item)}
                            className={
                              selectedIdCategory1 === item.id
                                ? "group relative rounded-lg border cursor-pointer transition-all\n                                    bg-slate-900 border-slate-700 shadow-md"
                                : "group relative rounded-lg border cursor-pointer transition-all\n                                    bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm"
                            }
                          >
                            {selectedIdCategory1 === item.id && (
                              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r" />
                            )}
                            <div className="flex items-center gap-1 px-2 py-2.5">
                              <div
                                className="flex items-center gap-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing select-none "
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical
                                  className={
                                    selectedIdCategory1 === item.id
                                      ? "w-3.5 h-3.5 text-white/40"
                                      : "w-3.5 h-3.5 text-slate-300"
                                  }
                                />
                                <span
                                  className={
                                    selectedIdCategory1 === item.id
                                      ? "text-[10px] font-mono w-4 text-center text-white/50"
                                      : "text-[10px] font-mono w-4 text-center text-slate-300"
                                  }
                                >
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 pl-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {item.code && (
                                    <span
                                      className={
                                        selectedIdCategory1 === item.id
                                          ? "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white/80"
                                          : "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500"
                                      }
                                    >
                                      {item.code}
                                    </span>
                                  )}
                                  <span
                                    className={
                                      selectedIdCategory1 === item.id
                                        ? "flex-1 text-xs font-semibold truncate text-white"
                                        : "flex-1 text-xs font-semibold truncate text-slate-800"
                                    }
                                  >
                                    {item.name}
                                  </span>
                                  <div
                                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => handleCategoryEditCategory1(item)}
                                      className={
                                        selectedIdCategory1 === item.id
                                          ? "p-0.5 transition-colors  text-slate-300 hover:text-white"
                                          : "p-0.5 transition-colors  text-slate-400 hover:text-slate-700"
                                      }
                                      title={t("common.btn.edit")}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleCategoryDeleteCategory1(item.id)}
                                      className={
                                        selectedIdCategory1 === item.id
                                          ? "p-0.5 transition-colors  text-slate-300 hover:text-red-300"
                                          : "p-0.5 transition-colors  text-slate-400 hover:text-red-500"
                                      }
                                      title={t("common.btn.delete")}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {item.description && (
                                  <p
                                    className={
                                      selectedIdCategory1 === item.id
                                        ? "text-[10px] line-clamp-1 text-white/60"
                                        : "text-[10px] line-clamp-1 text-slate-400"
                                    }
                                  >
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {categoryDropIndexCategory1 === categoryItemsCategory1.length && (
                        <div className="h-0.5 bg-blue-400 rounded mx-1" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div style={{ gridColumn: "span 3", gridRow: "span 8", height: `${8 * ROW_HEIGHT - GAP_SIZE}px` }}>
            <div className="h-full w-full pr-2">
              <div
                className="h-full w-full rounded border border-slate-200 flex flex-col bg-white"
                style={{ overflow: "clip" }}
              >
                <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-700">{t("category.label.lv2")}</span>
                  <button
                    onClick={handleCategoryAddCategory2}
                    className="flex items-center gap-1 text-[11px] transition-colors text-slate-500 hover:text-slate-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("common.btn.add")}
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {selectedIdCategory1 == null && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-slate-300 italic">{t("common.category.select_parent")}</span>
                    </div>
                  )}
                  {!(selectedIdCategory1 == null) && categoryLoadingCategory2 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-slate-300">{t("common.loading")}</span>
                    </div>
                  )}
                  {!(selectedIdCategory1 == null) &&
                    !categoryLoadingCategory2 &&
                    categoryItemsCategory2.length === 0 && (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[11px] text-slate-300 italic">{t("common.table.no_data")}</span>
                      </div>
                    )}
                  {!(selectedIdCategory1 == null) && !categoryLoadingCategory2 && categoryItemsCategory2.length > 0 && (
                    <div className="p-2 space-y-1.5">
                      {categoryItemsCategory2.map((item, index) => (
                        <div key={item.id} className="relative">
                          {categoryDropIndexCategory2 === index && categoryDragIndexRefCategory2.current !== index && (
                            <div className="absolute top-0 left-1 right-1 h-0.5 bg-blue-400 rounded z-10 pointer-events-none" />
                          )}
                          <div
                            draggable
                            onDragStart={() => handleCategoryDragStartCategory2(index)}
                            onDragOver={(e) => handleCategoryDragOverCategory2(e, index)}
                            onDragLeave={(e) => handleCategoryDragLeaveCategory2(e)}
                            onDrop={(e) => handleCategoryDropCategory2(e, index)}
                            onClick={() => handleCategorySelectCategory2(item)}
                            className={
                              selectedIdCategory2 === item.id
                                ? "group relative rounded-lg border cursor-pointer transition-all\n                                    bg-slate-900 border-slate-700 shadow-md"
                                : "group relative rounded-lg border cursor-pointer transition-all\n                                    bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm"
                            }
                          >
                            {selectedIdCategory2 === item.id && (
                              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r" />
                            )}
                            <div className="flex items-center gap-1 px-2 py-2.5">
                              <div
                                className="flex items-center gap-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing select-none "
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical
                                  className={
                                    selectedIdCategory2 === item.id
                                      ? "w-3.5 h-3.5 text-white/40"
                                      : "w-3.5 h-3.5 text-slate-300"
                                  }
                                />
                                <span
                                  className={
                                    selectedIdCategory2 === item.id
                                      ? "text-[10px] font-mono w-4 text-center text-white/50"
                                      : "text-[10px] font-mono w-4 text-center text-slate-300"
                                  }
                                >
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 pl-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {item.code && (
                                    <span
                                      className={
                                        selectedIdCategory2 === item.id
                                          ? "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white/80"
                                          : "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500"
                                      }
                                    >
                                      {item.code}
                                    </span>
                                  )}
                                  <span
                                    className={
                                      selectedIdCategory2 === item.id
                                        ? "flex-1 text-xs font-semibold truncate text-white"
                                        : "flex-1 text-xs font-semibold truncate text-slate-800"
                                    }
                                  >
                                    {item.name}
                                  </span>
                                  <div
                                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => handleCategoryEditCategory2(item)}
                                      className={
                                        selectedIdCategory2 === item.id
                                          ? "p-0.5 transition-colors  text-slate-300 hover:text-white"
                                          : "p-0.5 transition-colors  text-slate-400 hover:text-slate-700"
                                      }
                                      title={t("common.btn.edit")}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleCategoryDeleteCategory2(item.id)}
                                      className={
                                        selectedIdCategory2 === item.id
                                          ? "p-0.5 transition-colors  text-slate-300 hover:text-red-300"
                                          : "p-0.5 transition-colors  text-slate-400 hover:text-red-500"
                                      }
                                      title={t("common.btn.delete")}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {item.description && (
                                  <p
                                    className={
                                      selectedIdCategory2 === item.id
                                        ? "text-[10px] line-clamp-1 text-white/60"
                                        : "text-[10px] line-clamp-1 text-slate-400"
                                    }
                                  >
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {categoryDropIndexCategory2 === categoryItemsCategory2.length && (
                        <div className="h-0.5 bg-blue-400 rounded mx-1" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div style={{ gridColumn: "span 3", gridRow: "span 8", height: `${8 * ROW_HEIGHT - GAP_SIZE}px` }}>
            <div className="h-full w-full pr-2">
              <div
                className="h-full w-full rounded border border-slate-200 flex flex-col bg-white"
                style={{ overflow: "clip" }}
              >
                <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-700">{t("category.label.lv3")}</span>
                  <button
                    onClick={handleCategoryAddCategory3}
                    className="flex items-center gap-1 text-[11px] transition-colors text-slate-500 hover:text-slate-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("common.btn.add")}
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {selectedIdCategory2 == null && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-slate-300 italic">{t("common.category.select_parent")}</span>
                    </div>
                  )}
                  {!(selectedIdCategory2 == null) && categoryLoadingCategory3 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-slate-300">{t("common.loading")}</span>
                    </div>
                  )}
                  {!(selectedIdCategory2 == null) &&
                    !categoryLoadingCategory3 &&
                    categoryItemsCategory3.length === 0 && (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[11px] text-slate-300 italic">{t("common.table.no_data")}</span>
                      </div>
                    )}
                  {!(selectedIdCategory2 == null) && !categoryLoadingCategory3 && categoryItemsCategory3.length > 0 && (
                    <div className="p-2 space-y-1.5">
                      {categoryItemsCategory3.map((item, index) => (
                        <div key={item.id} className="relative">
                          {categoryDropIndexCategory3 === index && categoryDragIndexRefCategory3.current !== index && (
                            <div className="absolute top-0 left-1 right-1 h-0.5 bg-blue-400 rounded z-10 pointer-events-none" />
                          )}
                          <div
                            draggable
                            onDragStart={() => handleCategoryDragStartCategory3(index)}
                            onDragOver={(e) => handleCategoryDragOverCategory3(e, index)}
                            onDragLeave={(e) => handleCategoryDragLeaveCategory3(e)}
                            onDrop={(e) => handleCategoryDropCategory3(e, index)}
                            onClick={() => handleCategorySelectCategory3(item)}
                            className={
                              selectedIdCategory3 === item.id
                                ? "group relative rounded-lg border cursor-pointer transition-all\n                                    bg-slate-900 border-slate-700 shadow-md"
                                : "group relative rounded-lg border cursor-pointer transition-all\n                                    bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm"
                            }
                          >
                            {selectedIdCategory3 === item.id && (
                              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r" />
                            )}
                            <div className="flex items-center gap-1 px-2 py-2.5">
                              <div
                                className="flex items-center gap-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing select-none "
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical
                                  className={
                                    selectedIdCategory3 === item.id
                                      ? "w-3.5 h-3.5 text-white/40"
                                      : "w-3.5 h-3.5 text-slate-300"
                                  }
                                />
                                <span
                                  className={
                                    selectedIdCategory3 === item.id
                                      ? "text-[10px] font-mono w-4 text-center text-white/50"
                                      : "text-[10px] font-mono w-4 text-center text-slate-300"
                                  }
                                >
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 pl-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {item.code && (
                                    <span
                                      className={
                                        selectedIdCategory3 === item.id
                                          ? "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white/80"
                                          : "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500"
                                      }
                                    >
                                      {item.code}
                                    </span>
                                  )}
                                  <span
                                    className={
                                      selectedIdCategory3 === item.id
                                        ? "flex-1 text-xs font-semibold truncate text-white"
                                        : "flex-1 text-xs font-semibold truncate text-slate-800"
                                    }
                                  >
                                    {item.name}
                                  </span>
                                  <div
                                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => handleCategoryEditCategory3(item)}
                                      className={
                                        selectedIdCategory3 === item.id
                                          ? "p-0.5 transition-colors  text-slate-300 hover:text-white"
                                          : "p-0.5 transition-colors  text-slate-400 hover:text-slate-700"
                                      }
                                      title={t("common.btn.edit")}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleCategoryDeleteCategory3(item.id)}
                                      className={
                                        selectedIdCategory3 === item.id
                                          ? "p-0.5 transition-colors  text-slate-300 hover:text-red-300"
                                          : "p-0.5 transition-colors  text-slate-400 hover:text-red-500"
                                      }
                                      title={t("common.btn.delete")}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {item.description && (
                                  <p
                                    className={
                                      selectedIdCategory3 === item.id
                                        ? "text-[10px] line-clamp-1 text-white/60"
                                        : "text-[10px] line-clamp-1 text-slate-400"
                                    }
                                  >
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {categoryDropIndexCategory3 === categoryItemsCategory3.length && (
                        <div className="h-0.5 bg-blue-400 rounded mx-1" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </GridCell>
    </PageLayout>
  );
}
