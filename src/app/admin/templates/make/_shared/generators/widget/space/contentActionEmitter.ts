import type { FormWidget } from "../../../components/builder/FormBuilder";
import type { MultiSelectWidget, SubListWidget } from "../../../components/renderer/types";
import type { ImportRequirement, WidgetGenContext } from "../../widgetGenerator";
import {
  jsStringLiteral,
  formVarNames,
  multiSelectVarNames,
  pageVar,
  hasMultiSelectExtraFields,
} from "../../widgetGenerator";
import { FILE_FIELD_TYPES } from "../../../constants";

const UTILS_MODULE = "@/app/admin/templates/make/_shared/utils";
const CONTENT_SAVE_MODULE = "@/app/admin/templates/make/_shared/utils/contentSave";

export interface ContentActionEmitResult {
  handlerLines: string[];
  helperLines: string[];
  imports: ImportRequirement[];
  todo?: string;
}

export interface ContentActionEmitOptions {
  ctx: WidgetGenContext;
  fnName: string;
  widgetsConstName: string;
  connectedContentWidgetIds: string[];
  action: "save" | "delete";
  goBackAfterAction: boolean;
  contentValidationRuleIds?: Record<string, number[]>;
}

type ContentWidget = FormWidget | SubListWidget | MultiSelectWidget;

export const emitContentActionHandler = (o: ContentActionEmitOptions): ContentActionEmitResult => {
  const { ctx, fnName, widgetsConstName, connectedContentWidgetIds, action, goBackAfterAction } = o;
  const { ind, allWidgets, suffixOf, isEntity, mainConnectedSlug, pageSlug, insideTab } = ctx;
  const emitGoBack = goBackAfterAction && !insideTab;

  const targetWidgets = connectedContentWidgetIds
    .map((wid) => allWidgets.find((w) => w.widgetId === wid))
    .filter((w): w is ContentWidget => !!w && (w.type === "form" || w.type === "sublist" || w.type === "multiselect"));

  if (targetWidgets.length === 0) {
    return {
      handlerLines: [],
      helperLines: [],
      imports: [],
      todo: `연결된 컨텐츠 위젯(${connectedContentWidgetIds.join(", ")})을 이 페이지에서 찾을 수 없습니다. 참조가 끊어졌습니다.`,
    };
  }

  const subLists = targetWidgets.filter((w) => w.type === "sublist");
  if (subLists.length > 0) {
    return {
      handlerLines: [],
      helperLines: [],
      imports: [],
      todo: `SubList 위젯이 연결된 저장은 아직 코드 생성이 지원되지 않습니다. 직접 구현해주세요.`,
    };
  }

  const slugs = new Set(targetWidgets.map((w) => (w as ContentWidget).connectedSlug).filter((s): s is string => !!s));
  const resolvedSlug = mainConnectedSlug || [...slugs][0] || "";
  if (!resolvedSlug) {
    return {
      handlerLines: [],
      helperLines: [],
      imports: [],
      todo: `저장 대상 slug를 확정할 수 없습니다. 위젯의 연결 slug 또는 페이지 mainConnectedSlug를 설정해주세요.`,
    };
  }
  if (!mainConnectedSlug && slugs.size > 1) {
    return {
      handlerLines: [],
      helperLines: [],
      imports: [],
      todo: `연결 slug가 ${slugs.size}개(${[...slugs].join(", ")})인 다중 그룹 저장은 아직 코드 생성이 지원되지 않습니다.`,
    };
  }

  const forms = targetWidgets.filter((w) => w.type === "form") as FormWidget[];
  const multiSelects = targetWidgets.filter((w) => w.type === "multiselect") as MultiSelectWidget[];

  const helperLines: string[] = [
    `const ${widgetsConstName}: ContentSaveWidget[] = [${targetWidgets
      .map((w) =>
        w.type === "form" ? formVarNames(suffixOf(w.widgetId)).widget : multiSelectVarNames(suffixOf(w.widgetId)).widget
      )
      .join(", ")}];`,
  ];

  const imports: ImportRequirement[] = [
    { module: CONTENT_SAVE_MODULE, named: ["ContentSaveWidget"], typeOnly: true },
    { module: "sonner", named: ["toast"] },
    { module: "next/navigation", named: ["useRouter"] },
    { module: "@/hooks/use-i18n", named: ["useI18n"] },
  ];

  const handlerLines: string[] = [];

  if (action === "delete") {
    imports.push({ module: CONTENT_SAVE_MODULE, named: ["deleteContentRecord"] });
    handlerLines.push(`${ind(1)}const ${fnName} = async () => {`);
    handlerLines.push(`${ind(2)}if (storedId === null) { toast.info(t('common.info.no_data_to_delete')); return; }`);
    handlerLines.push(`${ind(2)}if (!confirm(t('common.confirm.delete'))) return;`);
    handlerLines.push(`${ind(2)}try {`);
    handlerLines.push(
      `${ind(3)}await deleteContentRecord({ connectedSlug: ${jsStringLiteral(resolvedSlug)}, isEntity: ${isEntity}, storedId, storedGroupId: null });`
    );
    handlerLines.push(`${ind(3)}toast.success(t('common.deleted'));`);
    if (ctx.leaveCheckNames.includes("markClean")) handlerLines.push(`${ind(3)}markClean();`);
    if (emitGoBack) handlerLines.push(`${ind(3)}router.back();`);
    handlerLines.push(`${ind(2)}} catch {`);
    handlerLines.push(`${ind(3)}toast.error(t('common.error.delete'));`);
    handlerLines.push(`${ind(2)}}`);
    handlerLines.push(`${ind(1)}};`);
    handlerLines.push("");
    return { handlerLines, helperLines, imports };
  }

  imports.push({ module: UTILS_MODULE, named: ["validateFormFields", "buildDataJson"] });
  imports.push({
    module: CONTENT_SAVE_MODULE,
    named: ["uploadContentFormFiles", "buildFormFileIdsMap", "persistContentDataJson"],
  });

  const hasFileFields = forms.some((fw) =>
    (fw.fields ?? []).some((f) => (FILE_FIELD_TYPES as readonly string[]).includes(f.type))
  );
  const fileValuesMapLiteral = `{ ${forms
    .filter((fw) => (fw.fields ?? []).some((f) => (FILE_FIELD_TYPES as readonly string[]).includes(f.type)))
    .map((fw) => `${jsStringLiteral(fw.widgetId)}: ${formVarNames(suffixOf(fw.widgetId)).files}`)
    .join(", ")} }`;
  const existingMetaMapLiteral = `{ ${forms
    .filter((fw) => (fw.fields ?? []).some((f) => (FILE_FIELD_TYPES as readonly string[]).includes(f.type)))
    .map((fw) => `${jsStringLiteral(fw.widgetId)}: ${formVarNames(suffixOf(fw.widgetId)).existingMeta}`)
    .join(", ")} }`;
  const formValuesMapLiteral = `{ ${forms
    .map((fw) => `${jsStringLiteral(fw.widgetId)}: ${formVarNames(suffixOf(fw.widgetId)).values}`)
    .join(", ")} }`;
  const multiSelectMapLiteral = `{ ${multiSelects
    .map((mw) => `${jsStringLiteral(mw.widgetId)}: ${multiSelectVarNames(suffixOf(mw.widgetId)).ids}`)
    .join(", ")} }`;
  const multiSelectExtraFieldMapLiteral = `{ ${multiSelects
    .filter((mw) => hasMultiSelectExtraFields(mw))
    .map((mw) => `${jsStringLiteral(mw.widgetId)}: ${multiSelectVarNames(suffixOf(mw.widgetId)).extraFieldValues}`)
    .join(", ")} }`;
  const entityDateFieldsExpr =
    forms.length > 0 ? `[${forms.map((fw) => `...${formVarNames(suffixOf(fw.widgetId)).fields}`).join(", ")}]` : "[]";
  const validationRuleIds = [...new Set(targetWidgets.flatMap((w) => o.contentValidationRuleIds?.[w.widgetId] ?? []))];

  handlerLines.push(`${ind(1)}const ${fnName} = async () => {`);
  handlerLines.push(`${ind(2)}const isUpdate = storedId !== null;`);
  forms.forEach((fw) => {
    const n = formVarNames(suffixOf(fw.widgetId));
    const hasFiles = (fw.fields ?? []).some((f) => (FILE_FIELD_TYPES as readonly string[]).includes(f.type));
    handlerLines.push(
      `${ind(2)}if (!validateFormFields(${n.fields}, ${n.values}, ${hasFiles ? n.files : "{}"}, ${hasFiles ? n.existingMeta : "{}"}, ${pageVar("allFormValues")}, ${pageVar("allFieldKeyToId")}, t)) return;`
    );
  });
  if (multiSelects.length > 0) {
    imports.push({ module: UTILS_MODULE, named: ["findMissingRequiredMultiSelect"] });
    handlerLines.push(
      `${ind(2)}const missingMultiSelectTitle = findMissingRequiredMultiSelect(${widgetsConstName}, ${multiSelectMapLiteral}, allFieldKeyToId, allFormValues, t);`
    );
    handlerLines.push(`${ind(2)}if (missingMultiSelectTitle !== null) {`);
    handlerLines.push(
      `${ind(3)}toast.warning(t('common.validation.multiselect_required', { title: missingMultiSelectTitle }));`
    );
    handlerLines.push(`${ind(3)}return;`);
    handlerLines.push(`${ind(2)}}`);
  }
  handlerLines.push(`${ind(2)}try {`);
  handlerLines.push(
    `${ind(3)}const newFileIdsByFieldId = await uploadContentFormFiles(${widgetsConstName}, ${fileValuesMapLiteral}, ${jsStringLiteral(resolvedSlug)}, ${isEntity});`
  );
  handlerLines.push(
    `${ind(3)}const formFileIdsMap = buildFormFileIdsMap(${widgetsConstName}, ${existingMetaMapLiteral}, newFileIdsByFieldId);`
  );
  handlerLines.push(`${ind(3)}const { dataJson, pkKeys } = buildDataJson(`);
  handlerLines.push(`${ind(4)}${widgetsConstName} as Parameters<typeof buildDataJson>[0],`);
  handlerLines.push(`${ind(4)}${formValuesMapLiteral},`);
  handlerLines.push(`${ind(4)}formFileIdsMap,`);
  handlerLines.push(`${ind(4)}{},`);
  handlerLines.push(`${ind(4)}${multiSelectMapLiteral},`);
  handlerLines.push(`${ind(4)}${multiSelectExtraFieldMapLiteral},`);
  handlerLines.push(`${ind(4)}${mainConnectedSlug ? jsStringLiteral(mainConnectedSlug) : "undefined"},`);
  handlerLines.push(`${ind(4)}allFormValues,`);
  handlerLines.push(`${ind(4)}${isEntity}`);
  handlerLines.push(`${ind(3)});`);
  handlerLines.push(`${ind(3)}await persistContentDataJson({`);
  handlerLines.push(`${ind(4)}connectedSlug: ${jsStringLiteral(resolvedSlug)},`);
  handlerLines.push(`${ind(4)}dataJson,`);
  handlerLines.push(`${ind(4)}pkKeys,`);
  handlerLines.push(`${ind(4)}templateSlug: ${pageSlug ? jsStringLiteral(pageSlug) : "undefined"},`);
  handlerLines.push(`${ind(4)}groupId: undefined,`);
  handlerLines.push(`${ind(4)}storedId,`);
  handlerLines.push(`${ind(4)}storedGroupId: null,`);
  handlerLines.push(`${ind(4)}validationRuleIds: [${validationRuleIds.join(", ")}],`);
  handlerLines.push(`${ind(4)}isEntity: ${isEntity},`);
  handlerLines.push(`${ind(4)}entityDateFields: ${entityDateFieldsExpr},`);
  handlerLines.push(`${ind(4)}newFileIdsByFieldId,`);
  handlerLines.push(`${ind(4)}mergeExistingBeforeSave: ${ctx.mergeExistingBeforeSave},`);
  if (hasFileFields) {
    const resetLines = forms
      .filter((fw) => (fw.fields ?? []).some((f) => (FILE_FIELD_TYPES as readonly string[]).includes(f.type)))
      .map((fw) => `${formVarNames(suffixOf(fw.widgetId)).setFiles}({});`)
      .join(" ");
    handlerLines.push(`${ind(4)}onFilesLinked: () => { ${resetLines} },`);
  }
  handlerLines.push(`${ind(3)}});`);
  if (hasFileFields) {
    imports.push({
      module: CONTENT_SAVE_MODULE,
      named: ["collectFileIdsDeep", "fetchFileMetaByIds", "fetchFileBlobUrl"],
    });
    handlerLines.push(`${ind(3)}try {`);
    handlerLines.push(`${ind(4)}const savedFileIds = collectFileIdsDeep(dataJson);`);
    handlerLines.push(`${ind(4)}if (savedFileIds.length > 0) {`);
    handlerLines.push(`${ind(5)}const metaList = await fetchFileMetaByIds(savedFileIds, ${isEntity});`);
    forms
      .filter((fw) => (fw.fields ?? []).some((f) => (FILE_FIELD_TYPES as readonly string[]).includes(f.type)))
      .forEach((fw) => {
        const n = formVarNames(suffixOf(fw.widgetId));
        const sfx = suffixOf(fw.widgetId);
        handlerLines.push(
          `${ind(5)}const savedSection${sfx} = ${fw.contentKey ? `(dataJson[${jsStringLiteral(fw.contentKey)}] as Record<string, unknown>)` : "dataJson"};`
        );
        handlerLines.push(
          `${ind(5)}const savedMetaByFieldId${sfx}: Record<string, { id: number; origName: string; fileSize: number }[]> = {};`
        );
        handlerLines.push(`${ind(5)}${n.fields}.forEach((f) => {`);
        handlerLines.push(`${ind(6)}if (!f.fieldKey || !FILE_FIELD_TYPE_SET.has(f.type)) return;`);
        handlerLines.push(`${ind(6)}const ids = savedSection${sfx}[f.fieldKey];`);
        handlerLines.push(`${ind(6)}if (!Array.isArray(ids)) return;`);
        handlerLines.push(
          `${ind(6)}savedMetaByFieldId${sfx}[f.id] = (ids as number[]).map((id) => metaList.find((m) => m.id === id)).filter((m): m is { id: number; origName: string; fileSize: number } => !!m);`
        );
        handlerLines.push(`${ind(6)}if (f.type === 'image' || f.type === 'video' || f.type === 'media') {`);
        handlerLines.push(`${ind(7)}(ids as number[]).forEach((id) => {`);
        handlerLines.push(`${ind(8)}if (imgBlobUrls[id]) return;`);
        handlerLines.push(
          `${ind(8)}fetchFileBlobUrl(id, ${isEntity}).then((url) => setImgBlobUrls((prev) => ({ ...prev, [id]: url }))).catch(() => {});`
        );
        handlerLines.push(`${ind(7)}});`);
        handlerLines.push(`${ind(6)}}`);
        handlerLines.push(`${ind(5)}});`);
        handlerLines.push(`${ind(5)}${n.setExistingMeta}(savedMetaByFieldId${sfx});`);
      });
    handlerLines.push(`${ind(4)}}`);
    handlerLines.push(`${ind(3)}} catch {}`);
    imports.push({ module: CONTENT_SAVE_MODULE, named: ["deletePendingFiles"] });
    handlerLines.push(`${ind(3)}if (pendingDeleteFileIds.current.size > 0) {`);
    handlerLines.push(`${ind(4)}await deletePendingFiles(Array.from(pendingDeleteFileIds.current), ${isEntity});`);
    handlerLines.push(`${ind(4)}pendingDeleteFileIds.current.clear();`);
    handlerLines.push(`${ind(3)}}`);
  }
  handlerLines.push(`${ind(3)}toast.success(isUpdate ? t('common.updated') : t('common.saved'));`);
  if (ctx.tabSavedMarker) handlerLines.push(`${ind(3)}${ctx.tabSavedMarker}`);
  if (ctx.leaveCheckNames.includes("markClean")) handlerLines.push(`${ind(3)}markClean();`);
  if (emitGoBack) handlerLines.push(`${ind(3)}router.back();`);
  handlerLines.push(`${ind(2)}} catch (err: unknown) {`);
  handlerLines.push(
    `${ind(3)}const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;`
  );
  handlerLines.push(`${ind(3)}if (response?.status === 409) {`);
  handlerLines.push(`${ind(4)}toast.error(response.data?.message || t('common.error.duplicate_key'));`);
  handlerLines.push(`${ind(3)}} else {`);
  handlerLines.push(`${ind(4)}toast.error(t('common.error.save'));`);
  handlerLines.push(`${ind(3)}}`);
  handlerLines.push(`${ind(2)}}`);
  handlerLines.push(`${ind(1)}};`);
  handlerLines.push("");

  return { handlerLines, helperLines, imports };
};
