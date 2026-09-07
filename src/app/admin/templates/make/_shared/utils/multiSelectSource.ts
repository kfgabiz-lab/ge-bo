import api from "@/lib/api";
import { extractFetchedRelItems, formatFetchedRelValue } from "../utils";
import type { MultiSelectWidget } from "../components/renderer/types";

export type MultiSelectSourceRow = { dataJson: Record<string, unknown> };

export interface MultiSelectOptionItem {
  id: number;
  [key: string]: unknown;
}

export interface MultiSelectLabelPathEntry {
  path: string;
  selectionId: number;
}

const inFlightSourceRequests = new Map<string, Promise<MultiSelectSourceRow[]>>();

export function fetchMultiSelectSourceRows(
  slug: string,
  depthGte?: number,
  depthLte?: number,
  fetchRelationIds?: number[],
  innerRelationId?: number,
  sourceFilter?: string
): Promise<MultiSelectSourceRow[]> {
  const cacheKey = `${slug}|${depthGte ?? ""}|${depthLte ?? ""}|${fetchRelationIds?.join(",") ?? ""}|${innerRelationId ?? ""}|${sourceFilter ?? ""}`;
  const cached = inFlightSourceRequests.get(cacheKey);
  if (cached) return cached;

  const params: Record<string, number | string> = { size: 9999 };
  if (depthGte !== undefined) params.depth_gte = depthGte;
  if (depthLte !== undefined) params.depth_lte = depthLte;
  if (fetchRelationIds && fetchRelationIds.length > 0) params.fetchRelationIds = fetchRelationIds.join(",");
  if (innerRelationId !== undefined) params[`innerRel_${innerRelationId}`] = String(innerRelationId);
  if (sourceFilter) params.filterExpr = sourceFilter;

  const request = api
    .get(`/page-data/${slug}`, { params })
    .then((res) => (res.data.content ?? []) as MultiSelectSourceRow[])
    .finally(() => {
      inFlightSourceRequests.delete(cacheKey);
    });

  inFlightSourceRequests.set(cacheKey, request);
  return request;
}

export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function buildLabelPathEntries(
  item: MultiSelectOptionItem,
  widget: MultiSelectWidget
): MultiSelectLabelPathEntry[] {
  const outerRelationIds = widget.contentRelation?.outer?.relationIds;
  if (outerRelationIds && outerRelationIds.length > 0) {
    const perRelationValues = outerRelationIds.map((id) =>
      extractFetchedRelItems(item as Record<string, unknown>, id, undefined)
    );
    const mappingIdRaw =
      outerRelationIds[0] !== undefined
        ? (item as Record<string, unknown>)[`_fetchedRel${outerRelationIds[0]}_mappingId`]
        : undefined;
    const mappingIds = Array.isArray(mappingIdRaw)
      ? (mappingIdRaw as unknown[]).map((v) => Number(v))
      : mappingIdRaw !== undefined && mappingIdRaw !== null
        ? [Number(mappingIdRaw)]
        : [];
    const pathCount = Math.max(0, ...perRelationValues.map((v) => v.length));
    const entries: MultiSelectLabelPathEntry[] = [];
    for (let i = 0; i < pathCount; i++) {
      const parts = perRelationValues.map((v) => v[i]).filter((v): v is string => Boolean(v));
      if (parts.length > 0) {
        const mappingId = mappingIds[i];
        entries.push({
          path: parts.join(" > "),
          selectionId: Number.isFinite(mappingId) ? mappingId : item.id,
        });
      }
    }
    if (entries.length > 0) return entries;
  }
  if ((widget.sourceMode ?? "call") === "relation" && widget.sourceRelationSlugId) {
    const raw = item[`_fetchedRel${widget.sourceRelationSlugId}`];
    if (Array.isArray(raw)) {
      return [
        {
          path: formatFetchedRelValue(
            raw,
            item as Record<string, unknown>,
            widget.sourceRelationSlugId,
            undefined,
            "ONE_LINE"
          ),
          selectionId: item.id,
        },
      ];
    }
    return [{ path: raw == null || typeof raw === "object" ? "" : String(raw), selectionId: item.id }];
  }
  const labelFields = widget.labelFields || "name";
  return [
    {
      path: labelFields
        .split(",")
        .map((f) => String(getNestedValue(item as Record<string, unknown>, f.trim()) ?? ""))
        .filter(Boolean)
        .join(" > "),
      selectionId: item.id,
    },
  ];
}
