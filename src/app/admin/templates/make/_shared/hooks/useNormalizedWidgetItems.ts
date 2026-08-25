"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { evalConditionExpr, buildFieldConditionResolver } from "../utils";
import { normalizeFormItemRowSpans, packedRowCount } from "../utils/formGridLayout";
import type { FormVisibilityContext } from "../utils/formGridLayout";
import type { PageContentItem, PageWidgetItem } from "../components/renderer/PageGridRenderer";
import type { FormWidget } from "../components/builder/FormBuilder";
import type { RendererMode } from "../components/renderer/types";

interface UseNormalizedWidgetItemsParams {
  widgetItems: PageWidgetItem[];
  mode: RendererMode;
  recordLoaded?: boolean;
  allFieldKeyToId: Record<string, string>;
  allFormValues: Record<string, string>;
  urlParams?: Record<string, string>;
  crossTabFormValues?: Record<string, string>;
  filterVisibleContents: (contents: PageContentItem[]) => PageContentItem[];
  tabContentRowsByContentId: Map<string, number>;
  activeTabIndexByContentId: Map<string, number>;
}

function collectVisibleFieldIds(
  widgetItems: PageWidgetItem[],
  resolveField: (key: string) => string | undefined
): Set<string> {
  const visibleFieldIds = new Set<string>();
  widgetItems
    .flatMap((item) => item.contents.map((c) => c.widget))
    .filter((w): w is FormWidget => w.type === "form")
    .forEach((w) =>
      w.fields?.forEach((f) => {
        if (!f.hideCondition || !evalConditionExpr(f.hideCondition, resolveField)) visibleFieldIds.add(f.id);
      })
    );
  return visibleFieldIds;
}

function applyNormalization(
  widgetItems: PageWidgetItem[],
  visibility: FormVisibilityContext,
  filterVisibleContents: (contents: PageContentItem[]) => PageContentItem[]
): PageWidgetItem[] {
  return widgetItems.map((item) => {
    const visibleContents = filterVisibleContents(item.contents);
    const normalized = normalizeFormItemRowSpans(item.colSpan, item.rowSpan, visibleContents, visibility);
    return {
      ...item,
      contents: normalized.contents,
      rowSpan: normalized.rowSpan,
      rowIsAuto: normalized.rowIsAuto,
      contentAutoTrailing: normalized.contentAutoTrailing,
    };
  });
}

export function useNormalizedWidgetItems({
  widgetItems,
  mode,
  recordLoaded,
  allFieldKeyToId,
  allFormValues,
  urlParams,
  crossTabFormValues,
  filterVisibleContents,
  tabContentRowsByContentId,
  activeTabIndexByContentId,
}: UseNormalizedWidgetItemsParams) {
  const allFieldKeyToIdRef = useRef(allFieldKeyToId);
  const allFormValuesRef = useRef(allFormValues);
  const urlParamsRef = useRef(urlParams);
  const crossTabFormValuesRef = useRef(crossTabFormValues);
  useEffect(() => {
    allFieldKeyToIdRef.current = allFieldKeyToId;
    allFormValuesRef.current = allFormValues;
    urlParamsRef.current = urlParams;
    crossTabFormValuesRef.current = crossTabFormValues;
  }, [allFieldKeyToId, allFormValues, urlParams, crossTabFormValues]);

  const contentRowSpanRatchetRef = useRef<Map<string, number>>(new Map());
  const [liveNormalizedWidgetItems, setLiveNormalizedWidgetItems] = useState<PageWidgetItem[] | undefined>(undefined);

  useEffect(() => {
    if (mode !== "live" || !recordLoaded) {
      contentRowSpanRatchetRef.current = new Map();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mode/recordLoaded 변화 시점에만 실행되는 의도된 계산, 기존 코드 설계 유지
      setLiveNormalizedWidgetItems(undefined);
      return;
    }
    const resolveField = buildFieldConditionResolver(
      allFieldKeyToIdRef.current,
      allFormValuesRef.current,
      urlParamsRef.current,
      crossTabFormValuesRef.current
    );
    const visibleFieldIds = collectVisibleFieldIds(widgetItems, resolveField);
    const visibility: FormVisibilityContext = {
      visibleFieldIds,
      maxRowSpanByContentId: contentRowSpanRatchetRef.current,
      tabContentRowsByContentId,
      activeTabIndexByContentId,
    };
    setLiveNormalizedWidgetItems(applyNormalization(widgetItems, visibility, filterVisibleContents));
  }, [mode, recordLoaded, widgetItems, filterVisibleContents, tabContentRowsByContentId, activeTabIndexByContentId]);

  const worstCaseVisibility = useMemo<FormVisibilityContext>(() => {
    const resolveField = buildFieldConditionResolver(allFieldKeyToId, allFormValues, urlParams, crossTabFormValues);
    const visibleFieldIds = collectVisibleFieldIds(widgetItems, resolveField);
    return {
      visibleFieldIds,
      maxRowSpanByContentId: undefined,
      tabContentRowsByContentId,
      activeTabIndexByContentId,
    };
  }, [
    widgetItems,
    allFieldKeyToId,
    allFormValues,
    urlParams,
    crossTabFormValues,
    tabContentRowsByContentId,
    activeTabIndexByContentId,
  ]);

  const worstCaseWidgetItems = useMemo<PageWidgetItem[]>(
    () => applyNormalization(widgetItems, worstCaseVisibility, filterVisibleContents),
    [widgetItems, filterVisibleContents, worstCaseVisibility]
  );

  const normalizedWidgetItems = liveNormalizedWidgetItems ?? worstCaseWidgetItems;

  const totalRows = useMemo(
    () =>
      packedRowCount(
        normalizedWidgetItems.map(({ colSpan, rowSpan }) => ({ colSpan, rowSpan })),
        12,
        false
      ),
    [normalizedWidgetItems]
  );

  return { normalizedWidgetItems, totalRows };
}
