import api from "@/lib/api";
import { buildDataSavePayload } from "../utils";
import { entityApiPath, entityItemPath, buildEntityDateFieldMeta, buildEntityRequestBody } from "./entityApi";
import { FILE_FIELD_TYPES } from "../constants";
import type { FormWidget, FormFieldItem } from "../components/builder/FormBuilder";
import type { SubListWidget, MultiSelectWidget } from "../components/renderer/types";
import type { SubListRow } from "../components/renderer/SubListRenderer";

export type ContentSaveWidget = FormWidget | SubListWidget | MultiSelectWidget;

export interface ContentFileMeta {
  id: number;
  origName: string;
  fileSize: number;
}

export async function uploadContentFormFiles(
  widgets: ContentSaveWidget[],
  fileValuesMap: Record<string, Record<string, File[]>>,
  connectedSlug: string,
  isEntity: boolean
): Promise<Record<string, number[]>> {
  const newFileIdsByFieldId: Record<string, number[]> = {};
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
        if (isEntity) {
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
  return newFileIdsByFieldId;
}

export async function uploadContentSubListFiles(
  widgets: ContentSaveWidget[],
  subListRowsMap: Record<string, SubListRow[]>,
  subListFileMap: Record<string, Record<string, Record<string, File[]>>>,
  connectedSlug: string,
  newFileIdsByFieldId: Record<string, number[]>
): Promise<Record<string, Record<string, unknown>[]>> {
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
  return processedSubListRowsMap;
}

export function buildFormFileIdsMap(
  widgets: ContentSaveWidget[],
  existingFileMetaMap: Record<string, Record<string, ContentFileMeta[]>>,
  newFileIdsByFieldId: Record<string, number[]>
): Record<string, Record<string, number[]>> {
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
  return formFileIdsMap;
}

export interface PersistContentDataJsonParams {
  connectedSlug: string;
  dataJson: Record<string, unknown>;
  pkKeys: string[];
  templateSlug?: string;
  groupId?: string;
  storedId: number | null;
  storedGroupId: string | null;
  validationRuleIds: number[];
  isEntity: boolean;
  entityDateFields: FormFieldItem[];
  newFileIdsByFieldId: Record<string, number[]>;
  mergeExistingBeforeSave: boolean;
  onDataIdCreated?: (connectedSlug: string, id: number) => void;
  onGroupIdCreated?: (groupId: string) => void;
  onSaved?: () => void;
  onFilesLinked?: () => void;
}

export async function persistContentDataJson(
  params: PersistContentDataJsonParams
): Promise<{ savedDataId: number; created: boolean }> {
  const {
    connectedSlug,
    dataJson,
    pkKeys,
    templateSlug,
    groupId,
    storedId,
    storedGroupId,
    validationRuleIds,
    isEntity,
    entityDateFields,
    newFileIdsByFieldId,
    mergeExistingBeforeSave,
    onDataIdCreated,
    onGroupIdCreated,
    onSaved,
    onFilesLinked,
  } = params;

  let savedDataId: number;
  let created: boolean;

  if (isEntity) {
    const entityRecordId = storedId ?? (storedGroupId ? Number(storedGroupId) : null);
    const dateFieldMeta = buildEntityDateFieldMeta(entityDateFields);
    const entityBody = buildEntityRequestBody(dataJson, dateFieldMeta);
    if (entityRecordId) {
      await api.put(entityItemPath(connectedSlug, entityRecordId), entityBody);
      savedDataId = entityRecordId;
      created = false;
    } else {
      const res = await api.post(entityApiPath(connectedSlug), entityBody);
      savedDataId = res.data.id;
      created = true;
      onDataIdCreated?.(connectedSlug, savedDataId);
    }
    onSaved?.();
  } else {
    const slugStoredId = storedGroupId
      ? await api
          .get(`/page-data/${connectedSlug}/group/${storedGroupId}`)
          .then((r) => r.data.id as number)
          .catch(() => null)
      : storedId;

    let finalDataJson = dataJson;
    if (mergeExistingBeforeSave) {
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
          templateSlug,
          validationRuleIds,
        })
      );
      savedDataId = slugStoredId;
      created = false;
    } else {
      const res = await api.post(
        `/page-data/${connectedSlug}`,
        buildDataSavePayload({
          dataJson: finalDataJson,
          pkKeys,
          groupId,
          templateSlug,
          validationRuleIds,
        })
      );
      savedDataId = res.data.id;
      created = true;
      if (groupId && !storedGroupId) onGroupIdCreated?.(groupId);
      onDataIdCreated?.(connectedSlug, savedDataId);
    }
    onSaved?.();
  }

  if (!isEntity) {
    const allNewIds = Object.values(newFileIdsByFieldId).flat();
    if (allNewIds.length > 0) {
      await api.patch("/page-files/link", { fileIds: allNewIds, dataId: savedDataId });
      onFilesLinked?.();
    }
  }

  return { savedDataId, created };
}

export async function deleteContentRecord(params: {
  connectedSlug: string;
  isEntity: boolean;
  storedId: number | null;
  storedGroupId: string | null;
}): Promise<void> {
  const { connectedSlug, isEntity, storedId, storedGroupId } = params;
  if (isEntity) {
    const entityRecordId = storedId ?? (storedGroupId ? Number(storedGroupId) : null);
    if (entityRecordId) await api.delete(entityItemPath(connectedSlug, entityRecordId));
  } else if (storedGroupId) {
    await api.delete(`/page-data/${connectedSlug}/group/${storedGroupId}`);
  } else {
    await api.delete(`/page-data/${connectedSlug}/${storedId}`);
  }
}

export function collectFileIdsDeep(dataJson: Record<string, unknown>): number[] {
  const fileIds: number[] = [];
  const collectIds = (obj: Record<string, unknown>) => {
    Object.values(obj).forEach((v) => {
      if (Array.isArray(v) && v.every((x) => typeof x === "number")) fileIds.push(...(v as number[]));
      else if (v && typeof v === "object" && !Array.isArray(v)) collectIds(v as Record<string, unknown>);
    });
  };
  collectIds(dataJson);
  return fileIds;
}

export async function fetchFileMetaByIds(fileIds: number[], isEntity: boolean): Promise<ContentFileMeta[]> {
  return isEntity
    ? await api.get("/file-meta", { params: { ids: fileIds.join(",") } }).then((r) =>
        (r.data as { id: number; originalName: string; fileSize: number; mimeType: string }[]).map((m) => ({
          id: m.id,
          origName: m.originalName,
          fileSize: m.fileSize,
        }))
      )
    : await api
        .get("/page-files/meta", { params: { ids: fileIds.join(",") } })
        .then((r) => r.data as ContentFileMeta[]);
}

export async function fetchFileBlobUrl(fileId: number, isEntity: boolean): Promise<string> {
  const res = isEntity
    ? await api.get(`/file-meta/${fileId}/download`, { responseType: "blob" })
    : await api.get(`/page-files/${fileId}`, { responseType: "blob" });
  return URL.createObjectURL(res.data);
}

export async function deletePendingFiles(fileIds: number[], isEntity: boolean): Promise<void> {
  for (const fileId of fileIds) {
    try {
      if (isEntity) {
        await api.delete(`/file-meta/${fileId}`);
      } else {
        await api.delete(`/page-files/${fileId}`);
      }
    } catch {
      console.error(`[handleContentAction] 삭제 대기 파일 커밋 실패: fileId=${fileId}`);
    }
  }
}
