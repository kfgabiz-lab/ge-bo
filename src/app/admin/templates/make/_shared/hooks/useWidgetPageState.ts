"use client";

import type React from "react";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLeaveCheck } from "./useLeaveCheck";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import api, { getApiErrorMessage } from "@/lib/api";
import { useSiteStore } from "@/store/use-site-store";
import { useServerClockStore } from "@/store/use-server-clock-store";
import {
  buildDataJson,
  buildDataSavePayload,
  validateFormFields,
  validateSubListRows,
  uploadFiles,
  flattenPageDataItem,
  applySortChange,
  initFormDefaultValues,
  computeFieldDefaultValue,
  buildSearchFieldDefaultValues,
  buildDateRangeGenerationPatch,
  validateDataSaveWidgets,
  saveTableRows,
  processFormFilesAndSubList,
  validateSearchDateRange,
  parseActionParams,
  buildSearchFieldsMap,
  buildSearchQueryParams,
  buildDateRangeStatusParam,
  buildDateRangeStatusSortExpr,
  extractSubListRows,
  extractMultiSelectSelection,
  evalWidgetHideCondition,
  resolveFetchSortKey,
  buildGenerationBaselineValues,
} from "../utils";
import {
  entityApiPath,
  entityItemPath,
  normalizeEntityRow,
  normalizeEntityPageEnvelope,
  buildEntityRequestBody,
  buildEntityDateFieldMeta,
  buildSubListEntityDateFieldMeta,
  restoreEntityDateFields,
} from "../utils/entityApi";
import { FILE_FIELD_TYPES } from "../constants";
import { useI18n } from "@/hooks/use-i18n";
import type { PageWidgetItem, PageTableData } from "../components/renderer/PageGridRenderer";
import type { AnyWidget, GenerationBaseline } from "../components/renderer/types";
import type { TableWidget } from "../components/builder/TableBuilder";
import type { FormWidget } from "../components/builder/FormBuilder";
import type { SubListWidget, MultiSelectWidget } from "../components/renderer/types";
import type { SubListRow } from "../components/renderer/SubListRenderer";
import type { ApiInfoOption } from "../components/builder/fields/ApiInfoSelectField";
import type { SearchFieldConfig } from "../types";
import type { ConnectedType } from "./useOutputMode";

const DEFAULT_PAGE_SIZE = 10;

const DATE_RANGE_GENERATION_PARTS: ("from" | "to")[] = ["from", "to"];

export function flatWidgets(items: PageWidgetItem[]): AnyWidget[] {
  return items.flatMap((item) => item.contents.map((c) => c.widget));
}

export function stampConnectedSlug<
  W extends { type: string; connectedSlug?: string },
  C extends { widget: W },
  T extends { contents: C[] },
>(
  widgetItems: T[],
  defaultSlug: string | undefined,
  targetTypes: string[] = ["form", "table", "sublist", "multiselect"]
): T[] {
  if (!defaultSlug) return widgetItems;
  return widgetItems.map((item) => ({
    ...item,
    contents: item.contents.map((c) => {
      if (!targetTypes.includes(c.widget.type)) return c;
      if (c.widget.connectedSlug) return c;
      return { ...c, widget: { ...c.widget, connectedSlug: defaultSlug } };
    }),
  })) as T[];
}

interface UseWidgetPageStateOptions {
  onGoBack?: () => void;
  enableUrlEditMode?: boolean;
  contentKey?: string;
  sharedDataId?: number | null;
  onDataIdCreated?: (connectedSlug: string, id: number) => void;
  onSaved?: () => void;
  mainConnectedSlug?: string;
  leaveCheck?: boolean;
  connectedType?: ConnectedType;
  entitySearchEnabled?: boolean;
  menuId?: number | null;
}

function findSection(dataJson: Record<string, unknown>, contentKey: string | undefined): Record<string, unknown> {
  if (!contentKey) return dataJson;
  if (dataJson[contentKey] && typeof dataJson[contentKey] === "object") {
    return dataJson[contentKey] as Record<string, unknown>;
  }
  for (const [key, val] of Object.entries(dataJson)) {
    if (key.startsWith("_fetchedRel")) continue;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const nested = (val as Record<string, unknown>)[contentKey];
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        return nested as Record<string, unknown>;
      }
    }
  }
  return dataJson;
}

async function restoreFormDataFromJson(
  dataJson: Record<string, unknown>,
  forms: FormWidget[],
  sublists: SubListWidget[],
  multiSels: MultiSelectWidget[],
  setFormValuesMap: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>,
  setSubListRowsMap: React.Dispatch<React.SetStateAction<Record<string, SubListRow[]>>>,
  setMultiSelectValuesMap: React.Dispatch<React.SetStateAction<Record<string, number[]>>>,
  setMultiSelectExtraFieldValuesMap: React.Dispatch<
    React.SetStateAction<Record<string, Record<number, Record<string, string>>>>
  >,
  setExistingFileMetaMap: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>>
  >,
  setImgBlobUrls: React.Dispatch<React.SetStateAction<Record<number, string>>>,
  isEntity?: boolean,
  t?: (key: string) => string
): Promise<void> {
  forms.forEach((fw) => {
    const section = findSection(dataJson, fw.contentKey);
    const vals: Record<string, string> = {};
    fw.fields.forEach((f) => {
      const key = f.fieldKey || f.label;
      if (!key) return;
      if (f.type === "dateRange" || f.type === "yearMonthRange") {
        const fromVal = f.fieldKey2 ? section[key] : section[key + "_from"];
        const toVal = f.fieldKey2 ? section[f.fieldKey2] : section[key + "_to"];
        if (fromVal === undefined && toVal === undefined) {
          Object.assign(vals, computeFieldDefaultValue(f, t));
        } else {
          if (fromVal !== undefined) vals[f.id + "_from"] = String(fromVal ?? "");
          if (toVal !== undefined) vals[f.id + "_to"] = String(toVal ?? "");
        }
      } else if (f.type === "address") {
        const hasAddressVal =
          section[key] !== undefined || section[key + "_lat"] !== undefined || section[key + "_lng"] !== undefined;
        if (!hasAddressVal) {
          Object.assign(vals, computeFieldDefaultValue(f, t));
        } else {
          if (section[key] !== undefined) vals[f.id] = String(section[key] ?? "");
          if (section[key + "_lat"] !== undefined) vals[f.id + "_lat"] = String(section[key + "_lat"] ?? "");
          if (section[key + "_lng"] !== undefined) vals[f.id + "_lng"] = String(section[key + "_lng"] ?? "");
        }
      } else if (section[key] !== undefined) {
        const raw = section[key];
        if (!Array.isArray(raw)) vals[f.id] = String(raw ?? "");
      } else {
        Object.assign(vals, computeFieldDefaultValue(f, t));
      }
    });
    setFormValuesMap((prev) => {
      const existingVals = prev[fw.widgetId] ?? {};
      const preservedVirtualVals: Record<string, string> = {};
      Object.keys(existingVals).forEach((k) => {
        if (k.includes(".") && !fw.fields.some((f) => f.id === k)) {
          preservedVirtualVals[k] = existingVals[k];
        }
      });
      return { ...prev, [fw.widgetId]: { ...preservedVirtualVals, ...vals } };
    });
  });

  sublists.forEach((sw) => {
    const rows = extractSubListRows(dataJson, sw.contentKey);
    setSubListRowsMap((prev) => ({ ...prev, [sw.widgetId]: rows }));
  });

  multiSels.forEach((mw) => {
    const result = extractMultiSelectSelection(dataJson, mw.contentKey, mw.connectedSlug);
    if (result.kind === "none") return;
    setMultiSelectValuesMap((prev) => ({ ...prev, [mw.widgetId]: result.ids }));
    if (result.kind === "objects") {
      setMultiSelectExtraFieldValuesMap((prev) => ({ ...prev, [mw.widgetId]: result.extraFieldValues }));
    }
  });

  try {
    const fileIds: number[] = [];
    const collectIds = (obj: Record<string, unknown>) => {
      Object.values(obj).forEach((v) => {
        if (Array.isArray(v) && v.every((x) => typeof x === "number")) fileIds.push(...(v as number[]));
        else if (v && typeof v === "object" && !Array.isArray(v)) collectIds(v as Record<string, unknown>);
      });
    };
    collectIds(dataJson);

    if (fileIds.length > 0) {
      const metaList = isEntity
        ? await api.get("/file-meta", { params: { ids: fileIds.join(",") } }).then((r) =>
            (r.data as { id: number; originalName: string; fileSize: number; mimeType: string }[]).map((m) => ({
              id: m.id,
              origName: m.originalName,
              fileSize: m.fileSize,
            }))
          )
        : await api
            .get("/page-files/meta", { params: { ids: fileIds.join(",") } })
            .then((r) => r.data as { id: number; origName: string; fileSize: number; mimeType: string }[]);
      forms.forEach((fw) => {
        const section = findSection(dataJson, fw.contentKey);
        const metaByFieldId: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
        fw.fields.forEach((f) => {
          if (!f.fieldKey || !FILE_FIELD_TYPES.includes(f.type as (typeof FILE_FIELD_TYPES)[number])) return;
          const ids = section[f.fieldKey];
          if (!Array.isArray(ids)) return;
          metaByFieldId[f.id] = (ids as number[])
            .map((id) => {
              const m = metaList.find((m) => m.id === id);
              return m ? { id: m.id, origName: m.origName, fileSize: m.fileSize } : null;
            })
            .filter((m): m is { id: number; origName: string; fileSize: number } => m !== null);
          if (f.type === "image" || f.type === "video" || f.type === "media") {
            (ids as number[]).forEach((id) => {
              const blobReq = isEntity
                ? api.get(`/file-meta/${id}/download`, { responseType: "blob" })
                : api.get(`/page-files/${id}`, { responseType: "blob" });
              blobReq
                .then((r) => setImgBlobUrls((prev) => ({ ...prev, [id]: URL.createObjectURL(r.data) })))
                .catch(() => {});
            });
          }
        });
        setExistingFileMetaMap((prev) => ({ ...prev, [fw.widgetId]: metaByFieldId }));
      });
    }
  } catch {}
}

function extractFetchRelData(dataJson: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.entries(dataJson).forEach(([key, val]) => {
    if (key.startsWith("_fetchedRel")) {
      result[key] = val;
    }
  });
  return result;
}

function parseContentDispositionFilename(disposition?: string): string | null {
  if (!disposition) return null;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }
  const basicMatch = /filename="?([^";]+)"?/i.exec(disposition);
  return basicMatch ? basicMatch[1].trim() : null;
}

export function useWidgetPageState(
  widgetItems: PageWidgetItem[],
  pageSlug?: string,
  options?: UseWidgetPageStateOptions
) {
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const { markDirty, markClean, confirmLeave } = useLeaveCheck(options?.leaveCheck ?? false);

  const pageIsEntity = options?.connectedType === "data";

  const sitesLoaded = useSiteStore((s) => s.sitesLoaded);
  const clockReady = useServerClockStore((s) => s.status === "synced" || s.status === "failed");

  const [searchValues, setSearchValues] = useState<Record<string, string>>({});
  const searchValuesRef = useRef<Record<string, string>>({});

  const [tableDataMap, setTableDataMap] = useState<Record<string, PageTableData>>({});
  const tableDataMapRef = useRef<Record<string, PageTableData>>({});
  const [sortKeyMap, setSortKeyMap] = useState<Record<string, string | null>>({});
  const [sortDirMap, setSortDirMap] = useState<Record<string, "asc" | "desc">>({});
  const [sortExprMap, setSortExprMap] = useState<Record<string, string | undefined>>({});
  const [tableSelectedRowsMap, setTableSelectedRowsMap] = useState<Record<string, number[]>>({});

  const [formValuesMap, setFormValuesMap] = useState<Record<string, Record<string, string>>>({});

  const [subListRowsMap, setSubListRowsMap] = useState<Record<string, SubListRow[]>>({});

  const [categorySelections, setCategorySelections] = useState<Record<string, number | null>>({});

  const [fileValuesMap, setFileValuesMap] = useState<Record<string, Record<string, File[]>>>({});
  const [existingFileMetaMap, setExistingFileMetaMap] = useState<
    Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>
  >({});
  const [imgBlobUrls, setImgBlobUrls] = useState<Record<number, string>>({});
  const [subListFileMap, setSubListFileMap] = useState<Record<string, Record<string, Record<string, File[]>>>>({});
  const pendingDeleteFileIdsRef = useRef<Set<number>>(new Set());

  const [multiSelectValuesMap, setMultiSelectValuesMap] = useState<Record<string, number[]>>({});
  const [multiSelectExtraFieldValuesMap, setMultiSelectExtraFieldValuesMap] = useState<
    Record<string, Record<number, Record<string, string>>>
  >({});

  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  const [urlParamSaveExtras, setUrlParamSaveExtras] = useState<Record<string, unknown>>({});

  const [formFetchRelMap, setFormFetchRelMap] = useState<Record<string, Record<string, unknown>>>({});

  const [recordLoaded, setRecordLoaded] = useState(false);
  const [generationBaseline, setGenerationBaseline] = useState<GenerationBaseline>({ pending: false, values: {} });

  const [apiInfoOptions, setApiInfoOptions] = useState<ApiInfoOption[]>([]);
  useEffect(() => {
    api
      .get("/api-infos/active")
      .then((res) => setApiInfoOptions(res.data || []))
      .catch(() => {});
  }, []);

  const fetchTableData = useCallback(
    async ({
      tableWidget,
      connectedSlug,
      searchFields,
      sv,
      page = 0,
      sk,
      sd = "asc",
      sortExpr,
      append = false,
      isEntity = pageIsEntity,
    }: {
      tableWidget: TableWidget;
      connectedSlug: string;
      searchFields: SearchFieldConfig[];
      sv: Record<string, string>;
      page?: number;
      sk?: string | null;
      sd?: "asc" | "desc";
      sortExpr?: string;
      append?: boolean;
      isEntity?: boolean;
    }) => {
      const wid = tableWidget.widgetId;
      const empty: PageTableData = {
        rows: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: 0,
        loading: false,
        appendLoading: false,
        hasMore: true,
        nextPage: 0,
      };

      setTableDataMap((prev) => ({
        ...prev,
        [wid]: append ? { ...(prev[wid] ?? empty), appendLoading: true } : { ...(prev[wid] ?? empty), loading: true },
      }));

      try {
        const pageSize = tableWidget.pageSize || DEFAULT_PAGE_SIZE;
        const params: Record<string, string> = { page: String(page), size: String(pageSize) };
        if (sk) params.sort = `${resolveFetchSortKey(tableWidget.columns, sk)},${sd}`;
        if (sk && sortExpr && !isEntity) params.sortExpr = sortExpr;

        if (!isEntity || options?.entitySearchEnabled) {
          Object.assign(params, buildSearchQueryParams(searchFields, sv));
        }

        if (tableWidget.sourceFilter && !isEntity) params.filterExpr = tableWidget.sourceFilter;

        if (tableWidget.contentRelation?.inner) {
          const innerRelationId = tableWidget.contentRelation.inner.relationId;
          params[`innerRel_${innerRelationId}`] = String(innerRelationId);
        }
        if (tableWidget.contentRelation?.outer) {
          params.fetchRelationIds = tableWidget.contentRelation.outer.relationIds.join(",");
        }

        const drsKeys = buildDateRangeStatusParam(tableWidget.columns);
        if (drsKeys) params.drsKeys = drsKeys;

        const url = isEntity ? entityApiPath(connectedSlug) : `/page-data/${connectedSlug}`;
        const menuIdHeader =
          !isEntity && connectedSlug === pageSlug && options?.menuId != null
            ? { "X-Menu-Id": String(options.menuId) }
            : undefined;
        const res = await api.get(url, { params, headers: menuIdHeader });

        const envelope = isEntity ? normalizeEntityPageEnvelope(res.data) : res.data;

        const rows = isEntity
          ? (envelope.content as Record<string, unknown>[]).map(normalizeEntityRow)
          : (
              envelope.content as {
                id: number;
                groupId?: string | null;
                dataJson: Record<string, unknown>;
                createdAt?: string | null;
                createdBy?: string | null;
                updatedAt?: string | null;
                updatedBy?: string | null;
              }[]
            ).map(flattenPageDataItem);

        const hasMore = envelope.last === false;
        setTableDataMap((prev) => ({
          ...prev,
          [wid]: {
            rows: append ? [...(prev[wid]?.rows ?? []), ...rows] : rows,
            totalElements: envelope.totalElements,
            totalPages: envelope.totalPages,
            currentPage: page,
            loading: false,
            appendLoading: false,
            hasMore,
            nextPage: hasMore ? page + 1 : page,
          },
        }));
      } catch {
        toast.error(t("common.error.load_data"));
        setTableDataMap((prev) => ({
          ...prev,
          [wid]: { ...(prev[wid] ?? empty), loading: false, appendLoading: false },
        }));
      }
    },
    [t, pageIsEntity, pageSlug, options?.menuId]
  );

  useEffect(() => {
    if (!widgetItems.length) return;
    if (!sitesLoaded || !clockReady) return;

    const initVals: Record<string, string> = {};
    flatWidgets(widgetItems).forEach((w) => {
      if (w.type !== "search") return;

      const fields = (w.rows as { fields: SearchFieldConfig[] }[]).flatMap((r) => r.fields);

      const widgetVals: Record<string, string> = {};
      fields.forEach((f: SearchFieldConfig) => {
        Object.assign(widgetVals, buildSearchFieldDefaultValues(f));
      });

      const defaultsSnapshot = { ...widgetVals };
      fields.forEach((f: SearchFieldConfig) => {
        if (f.type !== "dateRange" && f.type !== "yearMonthRange") return;
        DATE_RANGE_GENERATION_PARTS.forEach((part) => {
          const sourceValue = defaultsSnapshot[`${f.id}_${part}`];
          if (!sourceValue) return;
          Object.assign(widgetVals, buildDateRangeGenerationPatch(fields, f.id, part, sourceValue));
        });
      });

      Object.assign(initVals, widgetVals);
    });

    let effectiveSv = searchValuesRef.current;
    if (Object.keys(initVals).length > 0) {
      effectiveSv = { ...initVals, ...searchValuesRef.current };
      searchValuesRef.current = effectiveSv;
      setSearchValues((prev) => ({ ...initVals, ...prev }));
    }

    const fieldsMap = buildSearchFieldsMap(widgetItems);
    flatWidgets(widgetItems).forEach((w) => {
      if (w.type !== "table") return;
      const connectedSlug = (w as TableWidget).connectedSlug;
      if (!connectedSlug) return;
      const searchFields = (w as TableWidget).connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);
      fetchTableData({ tableWidget: w as TableWidget, connectedSlug, searchFields, sv: effectiveSv });
    });
  }, [widgetItems, sitesLoaded, clockReady, fetchTableData]);

  useEffect(() => {
    tableDataMapRef.current = tableDataMap;
  }, [tableDataMap]);

  useEffect(() => {
    if (!widgetItems.length) return;

    const formWidgets = flatWidgets(widgetItems).filter((w) => w.type === "form") as FormWidget[];

    const patch = initFormDefaultValues(formWidgets, t);

    formWidgets.forEach((fw) => {
      (fw.fields ?? []).forEach((f) => {
        const fieldKey = f.fieldKey || f.label;
        if (!fieldKey) return;
        const urlVal = searchParams.get(fieldKey);
        if (urlVal !== null) {
          if (!patch[fw.widgetId]) patch[fw.widgetId] = {};
          patch[fw.widgetId][f.id] = urlVal;
        }
      });
    });

    if (Object.values(patch).every((v) => Object.keys(v).length === 0)) return;

    setFormValuesMap((prev) => {
      const next = { ...prev };
      for (const [wid, vals] of Object.entries(patch)) {
        next[wid] = { ...(next[wid] ?? {}), ...vals };
      }
      return next;
    });
  }, [widgetItems, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!options?.enableUrlEditMode || !widgetItems.length) return;
    setRecordLoaded(false);

    const allWidgets = flatWidgets(widgetItems);
    const formWidgets = allWidgets.filter((w) => w.type === "form") as FormWidget[];
    const sublistWidgets = allWidgets.filter((w) => w.type === "sublist") as SubListWidget[];
    const multiSelWidgets = allWidgets.filter((w) => w.type === "multiselect") as MultiSelectWidget[];

    const queryGroupId = searchParams.get("group_id");
    const queryId = searchParams.get("id");

    const applyUrlParams = () => {
      const SKIP = new Set(["id", "group_id", "_paramSave"]);
      const isParamSave = searchParams.get("_paramSave") === "true";
      const urlOverrides: Record<string, Record<string, string>> = {};
      const extras: Record<string, unknown> = {};
      searchParams.forEach((value, key) => {
        if (SKIP.has(key)) return;
        const dotIdx = key.indexOf(".");
        if (dotIdx !== -1) {
          const ck = key.slice(0, dotIdx);
          const fk = key.slice(dotIdx + 1);
          const fw = formWidgets.find((f) => f.contentKey === ck);
          if (!fw) return;
          const field = fw.fields.find((f) => (f.fieldKey || f.label) === fk);
          if (field) {
            if (!urlOverrides[fw.widgetId]) urlOverrides[fw.widgetId] = {};
            urlOverrides[fw.widgetId][field.id] = value;
          } else if (isParamSave) {
            if (!extras[ck]) extras[ck] = {};
            (extras[ck] as Record<string, string>)[fk] = value;
          }
        } else {
          let found = false;
          formWidgets.forEach((fw) => {
            const field = fw.fields.find((f) => (f.fieldKey || f.label) === key);
            if (field) {
              found = true;
              if (!urlOverrides[fw.widgetId]) urlOverrides[fw.widgetId] = {};
              urlOverrides[fw.widgetId][field.id] = value;
            }
          });
          if (!found && isParamSave) extras[key] = value;
        }
      });
      if (Object.keys(urlOverrides).length > 0) {
        setFormValuesMap((prev) => {
          const next = { ...prev };
          Object.entries(urlOverrides).forEach(([wId, vals]) => {
            next[wId] = { ...(next[wId] ?? {}), ...vals };
          });
          return next;
        });
      }
      if (Object.keys(extras).length > 0) setUrlParamSaveExtras(extras);
    };

    if (queryGroupId) {
      setCurrentGroupId(queryGroupId);
      const slugSet = new Set(
        [
          ...formWidgets.map((fw) => fw.connectedSlug),
          ...sublistWidgets.map((sw) => sw.connectedSlug),
          ...multiSelWidgets.map((mw) => mw.connectedSlug),
        ].filter((s): s is string => !!s)
      );
      const loadPromises = Array.from(slugSet).map((s) => {
        const fetchPromise = pageIsEntity
          ? api.get(entityItemPath(s, queryGroupId)).then((r) => {
              const dateFieldMeta = buildEntityDateFieldMeta(
                formWidgets.filter((fw) => fw.connectedSlug === s).flatMap((fw) => fw.fields)
              );
              return restoreEntityDateFields(normalizeEntityRow(r.data), dateFieldMeta);
            })
          : api
              .get(`/page-data/${s}/group/${queryGroupId}`)
              .then((r) => (r.data.dataJson || {}) as Record<string, unknown>);
        return fetchPromise
          .then(async (dataJson) => {
            await restoreFormDataFromJson(
              dataJson,
              formWidgets.filter((fw) => fw.connectedSlug === s),
              sublistWidgets.filter((sw) => sw.connectedSlug === s),
              multiSelWidgets.filter((mw) => mw.connectedSlug === s),
              setFormValuesMap,
              setSubListRowsMap,
              setMultiSelectValuesMap,
              setMultiSelectExtraFieldValuesMap,
              setExistingFileMetaMap,
              setImgBlobUrls,
              pageIsEntity,
              t
            );
            applyUrlParams();
          })
          .catch(() => {});
      });
      Promise.all(loadPromises).then(() => setRecordLoaded(true));
    } else if (queryId) {
      const connectedSlug =
        formWidgets[0]?.connectedSlug ?? multiSelWidgets[0]?.connectedSlug ?? sublistWidgets[0]?.connectedSlug;
      if (connectedSlug) {
        const fetchPromise = pageIsEntity
          ? api.get(entityItemPath(connectedSlug, Number(queryId))).then((r) => {
              const dateFieldMeta = buildEntityDateFieldMeta(formWidgets.flatMap((fw) => fw.fields));
              return restoreEntityDateFields(normalizeEntityRow(r.data), dateFieldMeta);
            })
          : api
              .get(`/page-data/${connectedSlug}/${Number(queryId)}`)
              .then((r) => (r.data.dataJson || {}) as Record<string, unknown>);
        fetchPromise
          .then(async (dataJson) => {
            await restoreFormDataFromJson(
              dataJson,
              formWidgets,
              sublistWidgets,
              multiSelWidgets,
              setFormValuesMap,
              setSubListRowsMap,
              setMultiSelectValuesMap,
              setMultiSelectExtraFieldValuesMap,
              setExistingFileMetaMap,
              setImgBlobUrls,
              pageIsEntity,
              t
            );
            const fetchRelData = extractFetchRelData(dataJson);
            if (Object.keys(fetchRelData).length > 0) {
              formWidgets.forEach((fw) => {
                setFormFetchRelMap((prev) => ({ ...prev, [fw.widgetId]: fetchRelData }));
              });
            }
            applyUrlParams();
            setRecordLoaded(true);
          })
          .catch(() => toast.error(t("common.error.load_existing_data")));
      }
    } else {
      setCurrentGroupId(null);
      setMultiSelectValuesMap({});
      if (sitesLoaded && clockReady) {
        setFormValuesMap(initFormDefaultValues(formWidgets, t));
        setRecordLoaded(true);
      }
      applyUrlParams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetItems, searchParams, options?.enableUrlEditMode, sitesLoaded, clockReady]);

  useEffect(() => {
    if (!widgetItems.length) return;

    const id = options?.sharedDataId ?? null;
    const allWidgets = flatWidgets(widgetItems);
    const forms = allWidgets.filter((w) => w.type === "form") as FormWidget[];
    const sublists = allWidgets.filter((w) => w.type === "sublist") as SubListWidget[];
    const multiSels = allWidgets.filter((w) => w.type === "multiselect") as MultiSelectWidget[];
    const connectedSlug = forms[0]?.connectedSlug;

    const willFetch = !!id && forms.length > 0 && !!connectedSlug;
    setGenerationBaseline({ pending: willFetch, values: {} });
    setRecordLoaded(false);
    if (!id || !forms.length || !connectedSlug) return;

    const fetchPromise = pageIsEntity
      ? api.get(entityItemPath(connectedSlug, id)).then((r) => {
          const dateFieldMeta = buildEntityDateFieldMeta(forms.flatMap((fw) => fw.fields));
          return restoreEntityDateFields(normalizeEntityRow(r.data), dateFieldMeta);
        })
      : api.get(`/page-data/${connectedSlug}/${id}`).then((r) => (r.data.dataJson ?? {}) as Record<string, unknown>);

    fetchPromise
      .then(async (rawDataJson) => {
        await restoreFormDataFromJson(
          rawDataJson,
          forms,
          sublists,
          multiSels,
          setFormValuesMap,
          setSubListRowsMap,
          setMultiSelectValuesMap,
          setMultiSelectExtraFieldValuesMap,
          setExistingFileMetaMap,
          setImgBlobUrls,
          pageIsEntity,
          t
        );
        setGenerationBaseline({ pending: false, values: buildGenerationBaselineValues(rawDataJson) });
        const fetchRelData = extractFetchRelData(rawDataJson);
        if (Object.keys(fetchRelData).length > 0) {
          forms.forEach((fw) => {
            setFormFetchRelMap((prev) => ({ ...prev, [fw.widgetId]: fetchRelData }));
          });
        }
        setRecordLoaded(true);
      })
      .catch(() => setGenerationBaseline({ pending: false, values: {} }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetItems, options?.sharedDataId]);

  const updateSearchValue = useCallback((id: string, val: string) => {
    setSearchValues((prev) => {
      const next = { ...prev, [id]: val };
      searchValuesRef.current = next;
      return next;
    });
  }, []);

  const handleSearch = useCallback(
    (searchWidgetId: string) => {
      const fieldsMap = buildSearchFieldsMap(widgetItems);
      const sv = searchValuesRef.current;

      const searchFields = fieldsMap[searchWidgetId] ?? [];
      if (!validateSearchDateRange(searchFields, sv, t)) return;

      flatWidgets(widgetItems).forEach((w) => {
        if (w.type !== "table") return;
        if (!(w as TableWidget).connectedSearchIds.includes(searchWidgetId)) return;
        const connectedSlug = (w as TableWidget).connectedSlug;
        if (!connectedSlug) return;
        const searchFields = (w as TableWidget).connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);
        fetchTableData({
          tableWidget: w as TableWidget,
          connectedSlug,
          searchFields,
          sv,
          page: 0,
          sk: sortKeyMap[(w as TableWidget).widgetId] ?? undefined,
          sd: sortDirMap[(w as TableWidget).widgetId] ?? "asc",
          sortExpr: sortExprMap[(w as TableWidget).widgetId],
        });
      });
    },
    [widgetItems, sortKeyMap, sortDirMap, sortExprMap, fetchTableData, t]
  );

  const handleReset = useCallback(
    (searchWidgetId: string) => {
      setSearchValues({});
      searchValuesRef.current = {};
      const fieldsMap = buildSearchFieldsMap(widgetItems);
      flatWidgets(widgetItems).forEach((w) => {
        if (w.type !== "table") return;
        if (!(w as TableWidget).connectedSearchIds.includes(searchWidgetId)) return;
        const connectedSlug = (w as TableWidget).connectedSlug;
        if (!connectedSlug) return;
        const tableWidgetId = (w as TableWidget).widgetId;
        setSortKeyMap((prev) => ({ ...prev, [tableWidgetId]: null }));
        setSortDirMap((prev) => ({ ...prev, [tableWidgetId]: "asc" }));
        setSortExprMap((prev) => ({ ...prev, [tableWidgetId]: undefined }));
        const searchFields = (w as TableWidget).connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);
        fetchTableData({ tableWidget: w as TableWidget, connectedSlug, searchFields, sv: {}, page: 0 });
      });
    },
    [widgetItems, fetchTableData]
  );

  const handlePageChange = useCallback(
    (tableWidgetId: string, page: number) => {
      const fieldsMap = buildSearchFieldsMap(widgetItems);
      const tableWidget = flatWidgets(widgetItems).find(
        (w) => w.type === "table" && (w as TableWidget).widgetId === tableWidgetId
      ) as TableWidget | undefined;
      if (!tableWidget?.connectedSlug) return;
      const searchFields = tableWidget.connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);
      fetchTableData({
        tableWidget,
        connectedSlug: tableWidget.connectedSlug,
        searchFields,
        sv: searchValuesRef.current,
        page,
        sk: sortKeyMap[tableWidgetId] ?? undefined,
        sd: sortDirMap[tableWidgetId] ?? "asc",
        sortExpr: sortExprMap[tableWidgetId],
      });
    },
    [widgetItems, sortKeyMap, sortDirMap, sortExprMap, fetchTableData]
  );

  const handleSortChange = useCallback(
    (tableWidgetId: string, accessor: string, dir: "asc" | "desc" | null, dataExpr?: string) => {
      const { sk, sd } = applySortChange(tableWidgetId, accessor, dir, setSortKeyMap, setSortDirMap);
      const fieldsMap = buildSearchFieldsMap(widgetItems);
      const tableWidget = flatWidgets(widgetItems).find(
        (w) => w.type === "table" && (w as TableWidget).widgetId === tableWidgetId
      ) as TableWidget | undefined;
      const sortCol = tableWidget?.columns.find((c) => c.accessor === accessor);
      const resolvedDataExpr = dataExpr || (sortCol ? buildDateRangeStatusSortExpr(sortCol) : undefined);
      const sortExpr = dir ? resolvedDataExpr : undefined;
      setSortExprMap((prev) => ({ ...prev, [tableWidgetId]: sortExpr }));
      if (!tableWidget?.connectedSlug) return;
      const searchFields = tableWidget.connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);

      let resolvedSk = sk;
      if (sk) {
        const rows = tableDataMap[tableWidgetId]?.rows ?? [];
        for (const row of rows) {
          const pathMap = row._pathMap as Record<string, string> | undefined;
          if (pathMap?.[sk]) {
            resolvedSk = pathMap[sk];
            break;
          }
        }
      }

      fetchTableData({
        tableWidget,
        connectedSlug: tableWidget.connectedSlug,
        searchFields,
        sv: searchValuesRef.current,
        page: 0,
        sk: resolvedSk,
        sd,
        sortExpr,
      });
    },
    [widgetItems, fetchTableData, tableDataMap]
  );

  const updateFormValue = useCallback(
    (widgetId: string, fieldId: string, value: string) => {
      setFormValuesMap((prev) => ({ ...prev, [widgetId]: { ...(prev[widgetId] ?? {}), [fieldId]: value } }));
      markDirty();
    },
    [markDirty]
  );

  const updateDerivedValue = useCallback((widgetId: string, fieldId: string, value: string) => {
    setFormValuesMap((prev) => ({ ...prev, [widgetId]: { ...(prev[widgetId] ?? {}), [fieldId]: value } }));
  }, []);

  const handleFileChange = useCallback(
    (widgetId: string, fieldId: string, files: File[], rowId?: string) => {
      if (rowId !== undefined) {
        setSubListFileMap((prev) => ({
          ...prev,
          [widgetId]: {
            ...(prev[widgetId] ?? {}),
            [rowId]: {
              ...(prev[widgetId]?.[rowId] ?? {}),
              [fieldId]: files,
            },
          },
        }));
        return;
      }
      setFileValuesMap((prev) => ({
        ...prev,
        [widgetId]: { ...(prev[widgetId] ?? {}), [fieldId]: files },
      }));
      markDirty();
    },
    [markDirty]
  );

  const handleRemoveExisting = useCallback(
    (widgetId: string, fieldId: string, fileId: number) => {
      pendingDeleteFileIdsRef.current.add(fileId);
      setExistingFileMetaMap((prev) => ({
        ...prev,
        [widgetId]: {
          ...(prev[widgetId] ?? {}),
          [fieldId]: (prev[widgetId]?.[fieldId] ?? []).filter((f) => f.id !== fileId),
        },
      }));
      setImgBlobUrls((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      markDirty();
    },
    [markDirty]
  );

  const handleContentAction = useCallback(
    async (
      connectedContentWidgetIds: string[],
      action: "save" | "delete",
      goBackAfterAction?: boolean,
      resolvedFormValuesMap?: Record<string, Record<string, string>>,
      contentValidationRuleIds?: Record<string, number[]>
    ) => {
      const mapToUse = resolvedFormValuesMap ?? formValuesMap;
      const allFlat = flatWidgets(widgetItems);

      const targetWidgets = connectedContentWidgetIds
        .map((wid) =>
          allFlat.find(
            (w) =>
              (w.type === "form" || w.type === "sublist" || w.type === "multiselect") &&
              (w as FormWidget | SubListWidget | MultiSelectWidget).widgetId === wid
          )
        )
        .filter(Boolean) as (FormWidget | SubListWidget | MultiSelectWidget)[];

      if (targetWidgets.length === 0) return;

      const slugGroupsMap = new Map<string, (FormWidget | SubListWidget | MultiSelectWidget)[]>();
      for (const w of targetWidgets) {
        const s = (w as FormWidget | SubListWidget | MultiSelectWidget).connectedSlug;
        if (!s) continue;
        if (!slugGroupsMap.has(s)) slugGroupsMap.set(s, []);
        slugGroupsMap.get(s)!.push(w);
      }
      if (slugGroupsMap.size === 0) return;

      const storedGroupId = searchParams.get("group_id") ?? currentGroupId;
      const storedId = searchParams.get("id") ? Number(searchParams.get("id")) : (options?.sharedDataId ?? null);
      const isUpdate = !!(storedGroupId || storedId);

      try {
        if (action === "delete") {
          if (!isUpdate) {
            toast.info(t("common.info.no_data_to_delete"));
            return;
          }
          if (!confirm(t("common.confirm.delete"))) return;

          const firstSlug = slugGroupsMap.keys().next().value!;
          if (pageIsEntity) {
            const entityRecordId = storedId ?? (storedGroupId ? Number(storedGroupId) : null);
            if (entityRecordId) await api.delete(entityItemPath(firstSlug, entityRecordId));
          } else if (storedGroupId) {
            await api.delete(`/page-data/${firstSlug}/group/${storedGroupId}`);
          } else {
            await api.delete(`/page-data/${firstSlug}/${storedId}`);
          }
          toast.success(t("common.deleted"));
          markClean();
          if (goBackAfterAction) options?.onGoBack?.();
          return;
        }

        const allFormValues = Object.assign({}, ...Object.values(mapToUse)) as Record<string, string>;
        const allFieldKeyToId: Record<string, string> = {};
        const allFieldLabels: Record<string, string> = {};
        flatWidgets(widgetItems)
          .filter((w) => w.type === "form")
          .forEach((w) => {
            const fw = w as FormWidget;
            fw.fields?.forEach((f) => {
              if (!f.fieldKey) return;
              allFieldKeyToId[f.fieldKey] = f.id;
              allFieldLabels[f.fieldKey] = String((f.labelMsgKey && t ? t(f.labelMsgKey) : f.label) || f.fieldKey);
              if (fw.contentKey) allFieldKeyToId[`${fw.contentKey}.${f.fieldKey}`] = f.id;
            });
          });

        for (const w of targetWidgets) {
          if (w.type !== "form") continue;
          const fw = w as FormWidget;
          if (
            !validateFormFields(
              fw.fields,
              mapToUse[fw.widgetId] ?? {},
              fileValuesMap[fw.widgetId] ?? {},
              existingFileMetaMap[fw.widgetId] ?? {},
              allFormValues,
              allFieldKeyToId,
              t
            )
          )
            return;
        }

        const subWidgetsForValidation = targetWidgets.filter((w) => w.type === "sublist") as Array<{
          type: string;
          widgetId?: string;
          required?: boolean;
          title?: string;
          columns?: import("../components/renderer/types").SubListColumn[];
        }>;
        if (
          !validateSubListRows(
            subWidgetsForValidation,
            subListRowsMap,
            subListFileMap,
            allFormValues,
            allFieldKeyToId,
            allFieldLabels,
            t
          )
        )
          return;

        for (const w of targetWidgets) {
          if (w.type !== "multiselect") continue;
          const mw = w as MultiSelectWidget;
          if (!mw.required) continue;
          if (mw.hideCondition && evalWidgetHideCondition(mw.hideCondition, allFieldKeyToId, allFormValues)) continue;
          if ((multiSelectValuesMap[mw.widgetId] ?? []).length === 0) {
            const title = mw.titleMsgKey ? (t ? t(mw.titleMsgKey) : mw.titleMsgKey) : mw.title || "다중선택";
            toast.warning(
              t ? t("common.validation.multiselect_required", { title }) : `'${title}' 항목은 필수 선택입니다.`
            );
            return;
          }
        }

        const slugGroups = options?.mainConnectedSlug
          ? [[options.mainConnectedSlug, targetWidgets] as [string, (FormWidget | SubListWidget | MultiSelectWidget)[]]]
          : Array.from(slugGroupsMap.entries());

        const groupId = slugGroups.length > 1 ? (storedGroupId ?? crypto.randomUUID()) : undefined;

        for (let groupIdx = 0; groupIdx < slugGroups.length; groupIdx++) {
          const [connectedSlug, widgets] = slugGroups[groupIdx];
          const isFirstSlugGroup = groupIdx === 0;
          const newFileIdsByFieldId: Record<string, number[]> = {};

          const groupValidationRuleIds = contentValidationRuleIds
            ? [...new Set(widgets.flatMap((w) => contentValidationRuleIds[(w as { widgetId: string }).widgetId] ?? []))]
            : [];

          for (const w of widgets) {
            if (w.type !== "form") continue;
            const fw = w as FormWidget;
            for (const [fieldId, files] of Object.entries(fileValuesMap[fw.widgetId] ?? {})) {
              const field = fw.fields.find((f) => f.id === fieldId);
              if (!field?.fieldKey || !files.length) continue;
              const ids: number[] = [];
              for (const file of files) {
                const fd = new FormData();
                fd.append("file", file);
                let uploadRes;
                if (pageIsEntity) {
                  uploadRes = await api.post("/file-meta/upload", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                  });
                } else {
                  fd.append("templateSlug", connectedSlug);
                  fd.append("fieldKey", field.fieldKey);
                  uploadRes = await api.post("/page-files/upload", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                  });
                }
                ids.push(uploadRes.data.id);
              }
              newFileIdsByFieldId[fieldId] = ids;
            }
          }

          const processedSubListRowsMap: Record<string, Record<string, unknown>[]> = {};
          for (const w of widgets) {
            if (w.type !== "sublist") continue;
            const sw = w as SubListWidget;
            const processedRows: Record<string, unknown>[] = [];
            for (const row of subListRowsMap[sw.widgetId] ?? []) {
              const { _rowId, ...rest } = row;
              const processedRow: Record<string, unknown> = { ...rest };
              for (const col of sw.columns ?? []) {
                if (!["file", "image"].includes(col.type)) continue;
                const existingIds = Array.isArray(processedRow[col.key]) ? (processedRow[col.key] as number[]) : [];
                const newFiles = subListFileMap[sw.widgetId]?.[_rowId]?.[col.id] ?? [];
                const allIds = [...existingIds];
                for (const file of newFiles) {
                  const fd = new FormData();
                  fd.append("file", file);
                  fd.append("templateSlug", connectedSlug);
                  fd.append("fieldKey", col.key);
                  const uploadRes = await api.post("/page-files/upload", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                  });
                  const newId = uploadRes.data.id;
                  allIds.push(newId);
                  newFileIdsByFieldId[col.id] = [...(newFileIdsByFieldId[col.id] ?? []), newId];
                }
                processedRow[col.key] = allIds;
              }
              processedRows.push(processedRow);
            }
            processedSubListRowsMap[sw.widgetId] = processedRows;
          }

          const formFileIdsMap: Record<string, Record<string, number[]>> = {};
          for (const w of widgets) {
            if (w.type !== "form") continue;
            const fw = w as FormWidget;
            formFileIdsMap[fw.widgetId] = {};
            for (const f of fw.fields) {
              if (!FILE_FIELD_TYPES.includes(f.type as (typeof FILE_FIELD_TYPES)[number])) continue;
              const existingIds = (existingFileMetaMap[fw.widgetId]?.[f.id] ?? []).map((m) => m.id);
              formFileIdsMap[fw.widgetId][f.id] = [...existingIds, ...(newFileIdsByFieldId[f.id] ?? [])];
            }
          }

          const multiSelectMap: Record<string, number[]> = {};
          for (const w of widgets) {
            if (w.type !== "multiselect") continue;
            const mw = w as MultiSelectWidget;
            multiSelectMap[mw.widgetId] = multiSelectValuesMap[mw.widgetId] ?? [];
          }

          const { dataJson, pkKeys } = buildDataJson(
            widgets as Parameters<typeof buildDataJson>[0],
            mapToUse,
            formFileIdsMap,
            processedSubListRowsMap,
            multiSelectMap,
            multiSelectExtraFieldValuesMap,
            options?.mainConnectedSlug,
            allFormValues,
            pageIsEntity
          );

          if (Object.keys(urlParamSaveExtras).length > 0) {
            Object.entries(urlParamSaveExtras).forEach(([key, val]) => {
              if (val !== null && typeof val === "object" && !Array.isArray(val)) {
                const hasContentKey = widgets.some((w) => w.type === "form" && (w as FormWidget).contentKey === key);
                if (hasContentKey) {
                  dataJson[key] = {
                    ...((dataJson[key] as Record<string, unknown>) ?? {}),
                    ...(val as Record<string, unknown>),
                  };
                }
              } else if (isFirstSlugGroup) {
                dataJson[key] = val as unknown;
              }
            });
          }

          let savedDataId: number;

          if (pageIsEntity) {
            const entityRecordId = storedId ?? (storedGroupId ? Number(storedGroupId) : null);
            const dateFieldMeta = buildEntityDateFieldMeta(
              widgets.filter((w) => w.type === "form").flatMap((w) => (w as FormWidget).fields)
            );
            const entityBody = buildEntityRequestBody(dataJson, dateFieldMeta);
            if (entityRecordId) {
              await api.put(entityItemPath(connectedSlug, entityRecordId), entityBody);
              savedDataId = entityRecordId;
            } else {
              const res = await api.post(entityApiPath(connectedSlug), entityBody);
              savedDataId = res.data.id;
              options?.onDataIdCreated?.(connectedSlug, savedDataId);
            }
            options?.onSaved?.();
          } else {
            const slugStoredId = storedGroupId
              ? await api
                  .get(`/page-data/${connectedSlug}/group/${storedGroupId}`)
                  .then((r) => r.data.id as number)
                  .catch(() => null)
              : storedId;

            let finalDataJson = dataJson;
            if (options?.contentKey) {
              let baseDataJson: Record<string, unknown> = {};
              if (slugStoredId) {
                try {
                  const getRes = await api.get(`/page-data/${connectedSlug}/${slugStoredId}`);
                  baseDataJson = (getRes.data.dataJson ?? {}) as Record<string, unknown>;
                } catch {}
              }
              finalDataJson = { ...baseDataJson, ...dataJson };
            }

            if (slugStoredId) {
              await api.put(
                `/page-data/${connectedSlug}/${slugStoredId}`,
                buildDataSavePayload({
                  dataJson: finalDataJson,
                  pkKeys: [],
                  templateSlug: pageSlug,
                  validationRuleIds: groupValidationRuleIds,
                })
              );
              savedDataId = slugStoredId;
            } else {
              const res = await api.post(
                `/page-data/${connectedSlug}`,
                buildDataSavePayload({
                  dataJson: finalDataJson,
                  pkKeys,
                  groupId,
                  templateSlug: pageSlug,
                  validationRuleIds: groupValidationRuleIds,
                })
              );
              savedDataId = res.data.id;
              if (groupId && !storedGroupId) setCurrentGroupId(groupId);
              options?.onDataIdCreated?.(connectedSlug, savedDataId);
            }
            options?.onSaved?.();
          }

          if (!pageIsEntity) {
            const allNewIds = Object.values(newFileIdsByFieldId).flat();
            if (allNewIds.length > 0) {
              await api.patch("/page-files/link", { fileIds: allNewIds, dataId: savedDataId });
              setFileValuesMap((prev) => {
                const next = { ...prev };
                widgets.forEach((w) => {
                  if (w.type === "form") delete next[(w as FormWidget).widgetId];
                });
                return next;
              });
            }
          }

          try {
            const fileIds: number[] = [];
            const collectIds = (obj: Record<string, unknown>) => {
              Object.values(obj).forEach((v) => {
                if (Array.isArray(v) && v.every((x) => typeof x === "number")) fileIds.push(...(v as number[]));
                else if (v && typeof v === "object" && !Array.isArray(v)) collectIds(v as Record<string, unknown>);
              });
            };
            collectIds(dataJson);

            if (fileIds.length > 0) {
              const metaList = pageIsEntity
                ? await api
                    .get("/file-meta", { params: { ids: fileIds.join(",") } })
                    .then((r) =>
                      (r.data as { id: number; originalName: string; fileSize: number; mimeType: string }[]).map(
                        (m) => ({ id: m.id, origName: m.originalName, fileSize: m.fileSize })
                      )
                    )
                : await api.get("/page-files/meta", { params: { ids: fileIds.join(",") } }).then(
                    (r) =>
                      r.data as {
                        id: number;
                        fieldKey: string;
                        origName: string;
                        fileSize: number;
                        mimeType: string;
                      }[]
                  );

              for (const w of widgets) {
                if (w.type !== "form") continue;
                const fw = w as FormWidget;
                const section = fw.contentKey ? (dataJson[fw.contentKey] as Record<string, unknown>) : dataJson;
                const imageFieldIds = new Set(fw.fields.filter((f) => f.type === "image").map((f) => f.id));
                const metaByFieldId: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
                fw.fields.forEach((f) => {
                  if (!f.fieldKey || !FILE_FIELD_TYPES.includes(f.type as (typeof FILE_FIELD_TYPES)[number])) return;
                  const ids = section[f.fieldKey];
                  if (!Array.isArray(ids)) return;
                  metaByFieldId[f.id] = (ids as number[])
                    .map((id) => {
                      const m = metaList.find((m) => m.id === id);
                      return m ? { id: m.id, origName: m.origName, fileSize: m.fileSize } : null;
                    })
                    .filter((m): m is { id: number; origName: string; fileSize: number } => m !== null);
                  if (imageFieldIds.has(f.id) || f.type === "video" || f.type === "media") {
                    (ids as number[]).forEach((id) => {
                      if (imgBlobUrls[id]) return;
                      const blobReq = pageIsEntity
                        ? api.get(`/file-meta/${id}/download`, { responseType: "blob" })
                        : api.get(`/page-files/${id}`, { responseType: "blob" });
                      blobReq
                        .then((blobRes) =>
                          setImgBlobUrls((prev) => ({
                            ...prev,
                            [id]: URL.createObjectURL(blobRes.data),
                          }))
                        )
                        .catch(() => {});
                    });
                  }
                });
                setExistingFileMetaMap((prev) => ({ ...prev, [fw.widgetId]: metaByFieldId }));
              }
            }
          } catch {}
        }

        if (pendingDeleteFileIdsRef.current.size > 0) {
          const fileIdsToDelete = Array.from(pendingDeleteFileIdsRef.current);
          for (const fileId of fileIdsToDelete) {
            try {
              if (pageIsEntity) {
                await api.delete(`/file-meta/${fileId}`);
              } else {
                await api.delete(`/page-files/${fileId}`);
              }
            } catch {
              console.error(`[handleContentAction] 삭제 대기 파일 커밋 실패: fileId=${fileId}`);
            }
          }
          pendingDeleteFileIdsRef.current.clear();
        }

        toast.success(isUpdate ? t("common.updated") : t("common.saved"));
        markClean();
        if (goBackAfterAction) options?.onGoBack?.();
      } catch (err: unknown) {
        const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
        if (action === "save" && response?.status === 409) {
          toast.error(response.data?.message || t("common.error.duplicate_key"));
        } else {
          toast.error(action === "save" ? t("common.error.save") : t("common.error.delete"));
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      widgetItems,
      formValuesMap,
      fileValuesMap,
      subListRowsMap,
      subListFileMap,
      existingFileMetaMap,
      imgBlobUrls,
      multiSelectValuesMap,
      searchParams,
      currentGroupId,
      pageSlug,
      options,
      markClean,
    ]
  );

  const handleDataSave = useCallback(
    async (
      connectedContentWidgetIds: string[],
      dataSaveSlug: string,
      goBackAfterAction?: boolean,
      paramSave?: string,
      validationRuleIds?: number[]
    ) => {
      if (!dataSaveSlug) return;
      const allFlat = flatWidgets(widgetItems);

      const targetWidgets = connectedContentWidgetIds
        .map((wid) =>
          allFlat.find(
            (w) =>
              (w.type === "form" || w.type === "sublist" || w.type === "multiselect" || w.type === "table") &&
              (w as FormWidget | SubListWidget | MultiSelectWidget | TableWidget).widgetId === wid
          )
        )
        .filter(Boolean) as (FormWidget | SubListWidget | MultiSelectWidget | TableWidget)[];

      if (targetWidgets.length === 0) {
        toast.warning(t("common.widget.no_content"));
        return;
      }

      if (
        !validateDataSaveWidgets({
          targetWidgets: targetWidgets as Parameters<typeof validateDataSaveWidgets>[0]["targetWidgets"],
          formValuesMap,
          fileValuesMap,
          existingFileMetaMap,
          subListRowsMap,
          subListFileMap,
          multiSelectValuesMap,
          tableSelectedRowsMap,
          t,
        })
      )
        return;

      const nonTableWidgets = targetWidgets.filter((w) => w.type !== "table") as (
        | FormWidget
        | SubListWidget
        | MultiSelectWidget
      )[];
      const tableWidgets = targetWidgets.filter((w) => w.type === "table") as TableWidget[];

      try {
        let anySaved = false;

        if (nonTableWidgets.length > 0) {
          const { formFileIdsMap, processedSubListRowsMap, allNewIds } = await processFormFilesAndSubList({
            targetWidgets: nonTableWidgets as Parameters<typeof processFormFilesAndSubList>[0]["targetWidgets"],
            fileValuesMap,
            existingFileMetaMap,
            subListRowsMap,
            subListFileMap,
            dataSaveSlug,
          });

          const multiSelectMap: Record<string, number[]> = {};
          for (const w of nonTableWidgets) {
            if (w.type !== "multiselect") continue;
            const mw = w as MultiSelectWidget;
            multiSelectMap[mw.widgetId] = multiSelectValuesMap[mw.widgetId] ?? [];
          }

          const dataSaveAllFormValues = Object.assign({}, ...Object.values(formValuesMap)) as Record<string, string>;
          const { dataJson, pkKeys } = buildDataJson(
            nonTableWidgets as Parameters<typeof buildDataJson>[0],
            formValuesMap,
            formFileIdsMap,
            processedSubListRowsMap,
            multiSelectMap,
            multiSelectExtraFieldValuesMap,
            options?.mainConnectedSlug,
            dataSaveAllFormValues
          );

          const res = await api.post(
            `/page-data/${dataSaveSlug}`,
            buildDataSavePayload({ dataJson, pkKeys, templateSlug: pageSlug, validationRuleIds })
          );

          if (allNewIds.length > 0 && res.data.id) {
            await api.patch("/page-files/link", { fileIds: allNewIds, dataId: res.data.id });
          }
          anySaved = true;
        }

        for (const tw of tableWidgets) {
          const allRows = tableDataMapRef.current[tw.widgetId]?.rows ?? [];
          const selectedIds = tableSelectedRowsMap[tw.widgetId] ?? [];
          const rowsToSave = tw.enableRowSelection
            ? allRows.filter((r) => selectedIds.includes(Number(r["_id"])))
            : allRows;

          if (rowsToSave.length === 0) {
            toast.warning(t("common.table.no_save_data"));
            return;
          }

          const tableExtras = paramSave ? {} : ((urlParamSaveExtras[tw.contentKey] ?? {}) as Record<string, unknown>);
          const saved = await saveTableRows({
            contentKey: tw.contentKey,
            columns: tw.columns,
            rows: rowsToSave,
            extras: tableExtras,
            dataSaveSlug,
            templateSlug: pageSlug,
            paramSave,
            validationRuleIds,
          });
          if (saved > 0) anySaved = true;
        }

        if (anySaved) {
          toast.success(t("common.saved"));
          markClean();
          if (goBackAfterAction) options?.onGoBack?.();
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, t("common.error.save")));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      widgetItems,
      formValuesMap,
      fileValuesMap,
      subListRowsMap,
      subListFileMap,
      existingFileMetaMap,
      multiSelectValuesMap,
      tableSelectedRowsMap,
      urlParamSaveExtras,
      pageSlug,
      options,
      markClean,
    ]
  );

  const currentSearchParams = useMemo(() => {
    const fieldsMap = buildSearchFieldsMap(widgetItems);
    return buildSearchQueryParams(Object.values(fieldsMap).flat(), searchValues);
  }, [searchValues, widgetItems]);

  const tableSortParams = useMemo(() => {
    const result: Record<string, { sort: string; sortExpr?: string }> = {};
    flatWidgets(widgetItems).forEach((w) => {
      if (w.type !== "table") return;
      const tableWidget = w as TableWidget;
      const sk = sortKeyMap[tableWidget.widgetId];
      if (!sk) return;
      const sd = sortDirMap[tableWidget.widgetId] ?? "asc";
      const sortExpr = sortExprMap[tableWidget.widgetId];
      const entry: { sort: string; sortExpr?: string } = {
        sort: `${resolveFetchSortKey(tableWidget.columns, sk)},${sd}`,
      };
      if (sortExpr && !pageIsEntity) entry.sortExpr = sortExpr;
      result[tableWidget.widgetId] = entry;
    });
    return result;
  }, [widgetItems, sortKeyMap, sortDirMap, sortExprMap, pageIsEntity]);

  const handleApiCall = useCallback(
    async (
      apiInfoId: number | undefined,
      paramsStr?: string,
      connectedContentWidgetIds?: string[],
      downloadFile?: boolean,
      includeSearchParams?: boolean
    ) => {
      if (apiInfoId == null) {
        if (!connectedContentWidgetIds || connectedContentWidgetIds.length === 0) {
          toast.warning(t("common.widget.no_content"));
          return;
        }

        const allFlat = flatWidgets(widgetItems);
        const targetWidgets = connectedContentWidgetIds
          .map((wid) =>
            allFlat.find(
              (w) => (w.type === "form" || w.type === "sublist") && (w as FormWidget | SubListWidget).widgetId === wid
            )
          )
          .filter(Boolean) as (FormWidget | SubListWidget)[];

        if (targetWidgets.length === 0) return;

        if (
          !validateDataSaveWidgets({
            targetWidgets: targetWidgets as Parameters<typeof validateDataSaveWidgets>[0]["targetWidgets"],
            formValuesMap,
            fileValuesMap,
            existingFileMetaMap,
            subListRowsMap,
            subListFileMap,
            multiSelectValuesMap,
            t,
          })
        )
          return;

        const formWidgets = targetWidgets.filter((w) => w.type === "form") as FormWidget[];
        const mainWidget = formWidgets[0];
        if (!mainWidget?.connectedSlug) {
          toast.warning("저장할 Form 위젯을 선택해 주세요.");
          return;
        }
        const subListWidgets = targetWidgets.filter(
          (w) =>
            w.type === "sublist" &&
            (w as SubListWidget).connectedSlug &&
            (w as SubListWidget).connectedSlug !== mainWidget.connectedSlug
        ) as SubListWidget[];

        const storedGroupId = searchParams.get("group_id") ?? currentGroupId;
        const storedId = searchParams.get("id") ? Number(searchParams.get("id")) : (options?.sharedDataId ?? null);
        const existingParentId = storedId ?? (storedGroupId ? Number(storedGroupId) : null);

        try {
          const { formFileIdsMap, processedSubListRowsMap } = await processFormFilesAndSubList({
            targetWidgets: targetWidgets as Parameters<typeof processFormFilesAndSubList>[0]["targetWidgets"],
            fileValuesMap,
            existingFileMetaMap,
            subListRowsMap,
            subListFileMap,
            dataSaveSlug: mainWidget.connectedSlug,
          });

          const { dataJson } = buildDataJson(
            formWidgets as Parameters<typeof buildDataJson>[0],
            formValuesMap,
            formFileIdsMap,
            processedSubListRowsMap,
            {},
            multiSelectExtraFieldValuesMap,
            undefined,
            undefined,
            true
          );
          const entityBody = buildEntityRequestBody(
            dataJson,
            buildEntityDateFieldMeta(formWidgets.flatMap((fw) => fw.fields))
          );

          let parentId: number;
          if (existingParentId) {
            await api.put(entityItemPath(mainWidget.connectedSlug, existingParentId), entityBody);
            parentId = existingParentId;
          } else {
            const res = await api.post(entityApiPath(mainWidget.connectedSlug), entityBody);
            parentId = res.data.id;
          }

          const warnings: string[] = [];
          let childOkCount = 0;
          let childFailCount = 0;

          for (const sw of subListWidgets) {
            const swLabel = sw.title || sw.contentKey || sw.widgetId;
            if (!sw.connectedSlug || !sw.parentIdField) {
              warnings.push(`"${swLabel}" 항목은 연결 slug 또는 부모 연결 필드가 설정되지 않아 저장되지 않았습니다.`);
              continue;
            }
            const rows = processedSubListRowsMap[sw.widgetId] ?? [];
            const dateFieldMeta = buildSubListEntityDateFieldMeta(sw.columns ?? []);
            for (const row of rows) {
              const { id: rowId, ...rowData } = row;
              const rowBody = buildEntityRequestBody({ ...rowData, [sw.parentIdField]: parentId }, dateFieldMeta);
              try {
                if (typeof rowId === "number") {
                  await api.put(entityItemPath(sw.connectedSlug, rowId), rowBody);
                } else {
                  await api.post(entityApiPath(sw.connectedSlug), rowBody);
                }
                childOkCount++;
              } catch {
                childFailCount++;
              }
            }
          }

          if (childFailCount > 0) {
            toast.error(`저장은 완료됐지만 하위 항목 ${childFailCount}건 저장에 실패했습니다.`);
          } else if (warnings.length > 0) {
            toast.warning(warnings.join(" "));
          } else {
            toast.success(childOkCount > 0 ? `${t("common.saved")} (하위 ${childOkCount}건 저장)` : t("common.saved"));
          }
          markClean();
        } catch (err) {
          toast.error(getApiErrorMessage(err, t("common.error.save")));
        }
        return;
      }

      const apiInfo = apiInfoOptions.find((a) => a.id === apiInfoId);
      if (!apiInfo) {
        console.warn(`[handleApiCall] 연결된 API 정보를 찾을 수 없습니다. apiInfoId=${apiInfoId}`);
        toast.error("연결된 API를 찾을 수 없습니다. 관리자에게 문의해 주세요.");
        return;
      }

      const parsedParams = parseActionParams(paramsStr, {});

      let url = apiInfo.urlPattern.startsWith("/api/v1")
        ? apiInfo.urlPattern.slice("/api/v1".length)
        : apiInfo.urlPattern;

      const restParams: Record<string, string> = { ...parsedParams };
      url = url.replace(/\{([^}]+)\}/g, (matched, key: string) => {
        if (!(key in restParams)) return matched;
        const val = restParams[key];
        delete restParams[key];
        return encodeURIComponent(val);
      });

      const firstTableWidget = flatWidgets(widgetItems).find((w) => w.type === "table") as TableWidget | undefined;
      const currentTableSortParams = firstTableWidget ? tableSortParams[firstTableWidget.widgetId] : undefined;

      const finalParams: Record<string, string> = includeSearchParams
        ? { ...currentSearchParams, ...currentTableSortParams, ...restParams }
        : restParams;

      const method = (apiInfo.method || "GET").toUpperCase();
      const isBodyMethod = method === "POST" || method === "PUT" || method === "PATCH";

      let contentBody: Record<string, unknown> = {};

      if (isBodyMethod && connectedContentWidgetIds && connectedContentWidgetIds.length > 0) {
        const allFlat = flatWidgets(widgetItems);
        const targetWidgets = connectedContentWidgetIds
          .map((wid) =>
            allFlat.find(
              (w) =>
                (w.type === "form" || w.type === "sublist" || w.type === "multiselect") &&
                (w as FormWidget | SubListWidget | MultiSelectWidget).widgetId === wid
            )
          )
          .filter(Boolean) as (FormWidget | SubListWidget | MultiSelectWidget)[];

        if (targetWidgets.length > 0) {
          if (
            !validateDataSaveWidgets({
              targetWidgets: targetWidgets as Parameters<typeof validateDataSaveWidgets>[0]["targetWidgets"],
              formValuesMap,
              fileValuesMap,
              existingFileMetaMap,
              subListRowsMap,
              subListFileMap,
              multiSelectValuesMap,
              t,
            })
          )
            return;

          const formWidgetsForParent = targetWidgets.filter((w) => w.type === "form") as FormWidget[];

          const { formFileIdsMap, processedSubListRowsMap } = await processFormFilesAndSubList({
            targetWidgets: targetWidgets as Parameters<typeof processFormFilesAndSubList>[0]["targetWidgets"],
            fileValuesMap,
            existingFileMetaMap,
            subListRowsMap,
            subListFileMap,
            dataSaveSlug: pageSlug ?? "",
          });

          const multiSelectMap: Record<string, number[]> = {};
          for (const w of targetWidgets) {
            if (w.type !== "multiselect") continue;
            const mw = w as MultiSelectWidget;
            multiSelectMap[mw.widgetId] = multiSelectValuesMap[mw.widgetId] ?? [];
          }

          const { dataJson } = buildDataJson(
            targetWidgets as Parameters<typeof buildDataJson>[0],
            formValuesMap,
            formFileIdsMap,
            processedSubListRowsMap,
            multiSelectMap,
            multiSelectExtraFieldValuesMap,
            undefined,
            undefined,
            !!apiInfo.connectedEntity
          );

          contentBody = apiInfo.connectedEntity
            ? buildEntityRequestBody(
                dataJson,
                buildEntityDateFieldMeta(formWidgetsForParent.flatMap((fw) => fw.fields))
              )
            : dataJson;
        }
      }

      try {
        if (downloadFile) {
          const res = await api.request({
            method,
            url,
            responseType: "blob",
            ...(method === "GET" || method === "DELETE"
              ? { params: finalParams }
              : { data: { ...contentBody, ...finalParams } }),
          });

          const disposition = res.headers?.["content-disposition"] as string | undefined;
          const filename = parseContentDispositionFilename(disposition) ?? `${apiInfo.name || "download"}.xlsx`;

          const blobUrl = URL.createObjectURL(res.data);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        } else if (method === "GET" || method === "DELETE") {
          await api.request({ method, url, params: finalParams });
          toast.success(`${apiInfo.name} 요청이 완료되었습니다.`);
        } else {
          await api.request({ method, url, data: { ...contentBody, ...finalParams } });
          toast.success(`${apiInfo.name} 요청이 완료되었습니다.`);
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, "요청을 실행할 수 없습니다."));
      }
    },
    [
      apiInfoOptions,
      widgetItems,
      formValuesMap,
      fileValuesMap,
      subListRowsMap,
      subListFileMap,
      existingFileMetaMap,
      multiSelectValuesMap,
      multiSelectExtraFieldValuesMap,
      pageSlug,
      options,
      searchParams,
      currentGroupId,
      currentSearchParams,
      tableSortParams,
      markClean,
      t,
    ]
  );

  const handleRefresh = useCallback(() => {
    const fieldsMap = buildSearchFieldsMap(widgetItems);
    const sv = searchValuesRef.current;
    flatWidgets(widgetItems).forEach((w) => {
      if (w.type !== "table") return;
      const connectedSlug = (w as TableWidget).connectedSlug;
      if (!connectedSlug) return;
      const searchFields = (w as TableWidget).connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);
      fetchTableData({ tableWidget: w as TableWidget, connectedSlug, searchFields, sv, page: 0 });
    });
  }, [widgetItems, fetchTableData]);

  const handleLoadMore = useCallback(
    (tableWidgetId: string) => {
      const td = tableDataMapRef.current[tableWidgetId];
      if (!td || !td.hasMore || td.loading || td.appendLoading) return;
      const fieldsMap = buildSearchFieldsMap(widgetItems);
      const tableWidget = flatWidgets(widgetItems).find(
        (w) => w.type === "table" && (w as TableWidget).widgetId === tableWidgetId
      ) as TableWidget | undefined;
      if (!tableWidget?.connectedSlug) return;
      const searchFields = tableWidget.connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);
      fetchTableData({
        tableWidget,
        connectedSlug: tableWidget.connectedSlug,
        searchFields,
        sv: searchValuesRef.current,
        page: td.nextPage,
        sk: sortKeyMap[tableWidgetId] ?? undefined,
        sd: sortDirMap[tableWidgetId] ?? "asc",
        sortExpr: sortExprMap[tableWidgetId],
        append: true,
      });
    },
    [widgetItems, sortKeyMap, sortDirMap, sortExprMap, fetchTableData]
  );

  const handleCategorySelect = useCallback((widgetId: string, selectedId: number | null) => {
    setCategorySelections((prev) => ({ ...prev, [widgetId]: selectedId }));
  }, []);

  const handleMultiSelectChange = useCallback(
    (wId: string, ids: number[]) => {
      setMultiSelectValuesMap((prev) => ({ ...prev, [wId]: ids }));
      markDirty();
    },
    [markDirty]
  );

  const handleMultiSelectExtraFieldChange = useCallback(
    (wId: string, itemId: number, fieldKey: string, value: string) => {
      setMultiSelectExtraFieldValuesMap((prev) => ({
        ...prev,
        [wId]: {
          ...(prev[wId] ?? {}),
          [itemId]: { ...(prev[wId]?.[itemId] ?? {}), [fieldKey]: value },
        },
      }));
    },
    []
  );

  const gridProps = {
    searchValues,
    onSearchChange: updateSearchValue,
    onSearch: handleSearch,
    onReset: handleReset,
    formValuesMap,
    onFormValuesChange: updateFormValue,
    onDerivedValueChange: updateDerivedValue,
    onContentAction: handleContentAction,
    onDataSave: handleDataSave,
    onApiCall: handleApiCall,
    subListRowsMap,
    onSubListRowsChange: (wId: string, rows: SubListRow[]) => {
      setSubListRowsMap((prev) => ({ ...prev, [wId]: rows }));
      markDirty();
    },
    tableDataMap,
    sortKeyMap,
    sortDirMap,
    onSort: handleSortChange,
    onPageChange: handlePageChange,
    onLoadMore: handleLoadMore,
    tableSelectedRowsMap,
    onTableRowsSelect: (wId: string, ids: number[]) => setTableSelectedRowsMap((prev) => ({ ...prev, [wId]: ids })),
    categorySelections,
    onCategorySelect: handleCategorySelect,
    onRefresh: handleRefresh,
    pageSlug,
    currentSearchParams,
    tableSortParams,
    leaveCheck: options?.leaveCheck ?? false,
    fileValuesMap,
    existingFileMetaMap,
    imgBlobUrls,
    onFileChange: handleFileChange,
    onRemoveExisting: handleRemoveExisting,
    multiSelectValuesMap,
    onMultiSelectChange: handleMultiSelectChange,
    multiSelectExtraFieldValuesMap,
    onMultiSelectExtraFieldChange: handleMultiSelectExtraFieldChange,
    formFetchRelMap,
    pageIsEntity,
    recordLoaded,
    generationBaseline,
  };

  return { gridProps, setSubListRowsMap, confirmLeave };
}
