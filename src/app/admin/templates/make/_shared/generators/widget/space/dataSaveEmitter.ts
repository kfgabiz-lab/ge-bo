import type { FormWidget } from "../../../components/builder/FormBuilder";
import type { TableWidget } from "../../../components/builder/TableBuilder";
import type { MultiSelectWidget, SubListWidget } from "../../../components/renderer/types";
import type { ImportRequirement, PageWidget, WidgetGenContext } from "../../widgetGenerator";
import { jsStringLiteral, formVarNames, multiSelectVarNames, hasMultiSelectExtraFields } from "../../widgetGenerator";
import { FILE_FIELD_TYPES } from "../../../constants";

const UTILS_MODULE = "@/app/admin/templates/make/_shared/utils";

export interface DataSaveEmitResult {
  handlerLines: string[];
  helperLines: string[];
  imports: ImportRequirement[];
  todo?: string;
}

export interface DataSaveEmitOptions {
  ctx: WidgetGenContext;
  fnName: string;
  connectedContentWidgetIds: string[];
  dataSaveSlug: string;
  goBackAfterAction: boolean;
  paramSave?: string;
  validationRuleIds?: number[];
}

type DataSaveTargetWidget = FormWidget | SubListWidget | MultiSelectWidget | TableWidget;

const literalOf = (pairs: string[]): string => (pairs.length > 0 ? `{ ${pairs.join(", ")} }` : "{}");

const isDataSaveTarget = (w: PageWidget | undefined): w is DataSaveTargetWidget =>
  !!w && (w.type === "form" || w.type === "sublist" || w.type === "multiselect" || w.type === "table");

export const resolveDataSaveTargets = (
  allWidgets: PageWidget[],
  connectedContentWidgetIds: string[]
): DataSaveTargetWidget[] =>
  connectedContentWidgetIds.map((wid) => allWidgets.find((w) => w.widgetId === wid)).filter(isDataSaveTarget);

export const canEmitDataSave = (allWidgets: PageWidget[], connectedContentWidgetIds: string[]): boolean => {
  const targets = resolveDataSaveTargets(allWidgets, connectedContentWidgetIds);
  return targets.length > 0 && !targets.some((w) => w.type === "sublist");
};

export const emitDataSaveHandler = (o: DataSaveEmitOptions): DataSaveEmitResult => {
  const { ctx, fnName, connectedContentWidgetIds, dataSaveSlug, goBackAfterAction, paramSave, validationRuleIds } = o;
  const { ind, allWidgets, suffixOf, mainConnectedSlug, pageSlug, insideTab, leaveCheckNames } = ctx;
  const emitGoBack = goBackAfterAction && !insideTab;

  const targetWidgets = resolveDataSaveTargets(allWidgets, connectedContentWidgetIds);

  if (targetWidgets.length === 0) {
    return {
      handlerLines: [],
      helperLines: [],
      imports: [],
      todo: `연결된 컨텐츠 위젯(${connectedContentWidgetIds.join(", ")})을 이 페이지에서 찾을 수 없습니다. 참조가 끊어졌습니다.`,
    };
  }

  if (targetWidgets.some((w) => w.type === "sublist")) {
    return {
      handlerLines: [],
      helperLines: [],
      imports: [],
      todo: `SubList 위젯이 연결된 데이터저장은 아직 코드 생성이 지원되지 않습니다. 직접 구현해주세요.`,
    };
  }

  const forms = targetWidgets.filter((w) => w.type === "form") as FormWidget[];
  const multiSelects = targetWidgets.filter((w) => w.type === "multiselect") as MultiSelectWidget[];
  const tables = targetWidgets.filter((w) => w.type === "table") as TableWidget[];
  const nonTableTargets = targetWidgets.filter((w) => w.type !== "table");
  const pageFormValueVars = allWidgets
    .filter((w) => w.type === "form")
    .map((w) => formVarNames(suffixOf(w.widgetId)).values);
  const allFormValuesExpr = `Object.assign({}${pageFormValueVars.map((v) => `, ${v}`).join("")}) as Record<string, string>`;

  const targetEntryOf = (w: DataSaveTargetWidget): string => {
    if (w.type === "form") return formVarNames(suffixOf(w.widgetId)).widget;
    if (w.type === "multiselect") return multiSelectVarNames(suffixOf(w.widgetId)).widget;
    const tw = w as TableWidget;
    return `{ type: 'table', widgetId: ${jsStringLiteral(tw.widgetId)}, contentKey: ${jsStringLiteral(tw.contentKey)}, enableRowSelection: ${tw.enableRowSelection === true} }`;
  };

  const dataSaveTargetsLiteral = targetWidgets.map(targetEntryOf).join(", ");
  const dataSaveContentTargetsLiteral = nonTableTargets.map(targetEntryOf).join(", ");
  const nonTableExpr = tables.length > 0 ? "dataSaveContentTargets" : "dataSaveTargets";

  const formValuesMapLiteral = literalOf(
    forms.map((fw) => `${jsStringLiteral(fw.widgetId)}: ${formVarNames(suffixOf(fw.widgetId)).values}`)
  );
  const formsWithFiles = forms.filter((fw) =>
    (fw.fields ?? []).some((f) => (FILE_FIELD_TYPES as readonly string[]).includes(f.type))
  );
  const hasFileFields = formsWithFiles.length > 0;
  const fileValuesMapLiteral = literalOf(
    formsWithFiles.map((fw) => `${jsStringLiteral(fw.widgetId)}: ${formVarNames(suffixOf(fw.widgetId)).files}`)
  );
  const existingMetaMapLiteral = literalOf(
    formsWithFiles.map((fw) => `${jsStringLiteral(fw.widgetId)}: ${formVarNames(suffixOf(fw.widgetId)).existingMeta}`)
  );
  const multiSelectMapLiteral = literalOf(
    multiSelects.map((mw) => `${jsStringLiteral(mw.widgetId)}: ${multiSelectVarNames(suffixOf(mw.widgetId)).ids}`)
  );
  const multiSelectExtraFieldMapLiteral = literalOf(
    multiSelects
      .filter((mw) => hasMultiSelectExtraFields(mw))
      .map((mw) => `${jsStringLiteral(mw.widgetId)}: ${multiSelectVarNames(suffixOf(mw.widgetId)).extraFieldValues}`)
  );
  const tableSelectedRowsMapLiteral = literalOf(
    tables
      .filter((tw) => tw.enableRowSelection === true)
      .map((tw) => `${jsStringLiteral(tw.widgetId)}: selectedRowIds${suffixOf(tw.widgetId)}`)
  );

  const imports: ImportRequirement[] = [
    { module: UTILS_MODULE, named: ["validateDataSaveWidgets"] },
    { module: "sonner", named: ["toast"] },
    { module: "@/hooks/use-i18n", named: ["useI18n"] },
    { module: "@/lib/api", named: ["getApiErrorMessage"] },
  ];
  if (nonTableTargets.length > 0) {
    imports.push({ module: UTILS_MODULE, named: ["buildDataJson", "buildDataSavePayload"] });
    imports.push({ module: "@/lib/api", defaultName: "api" });
  }
  if (forms.length > 0) imports.push({ module: UTILS_MODULE, named: ["processFormFilesAndSubList"] });
  if (tables.length > 0) imports.push({ module: UTILS_MODULE, named: ["saveTableRows"] });
  if (emitGoBack) imports.push({ module: "next/navigation", named: ["useRouter"] });

  const validationRuleIdsArr = validationRuleIds ?? [];
  const validationRuleIdsExpr = validationRuleIdsArr.length > 0 ? `[${validationRuleIdsArr.join(", ")}]` : undefined;
  const templateSlugExpr = pageSlug ? jsStringLiteral(pageSlug) : "undefined";

  const handlerLines: string[] = [];
  handlerLines.push(`${ind(1)}const ${fnName} = async () => {`);
  handlerLines.push(
    `${ind(2)}const dataSaveTargets: Parameters<typeof validateDataSaveWidgets>[0]['targetWidgets'] = [${dataSaveTargetsLiteral}];`
  );
  if (nonTableTargets.length > 0 && tables.length > 0) {
    handlerLines.push(
      `${ind(2)}const dataSaveContentTargets: Parameters<typeof validateDataSaveWidgets>[0]['targetWidgets'] = [${dataSaveContentTargetsLiteral}];`
    );
  }
  handlerLines.push(`${ind(2)}if (!validateDataSaveWidgets({`);
  handlerLines.push(`${ind(3)}targetWidgets: dataSaveTargets,`);
  handlerLines.push(`${ind(3)}formValuesMap: ${formValuesMapLiteral},`);
  handlerLines.push(`${ind(3)}fileValuesMap: ${fileValuesMapLiteral},`);
  handlerLines.push(`${ind(3)}existingFileMetaMap: ${existingMetaMapLiteral},`);
  handlerLines.push(`${ind(3)}subListRowsMap: {},`);
  handlerLines.push(`${ind(3)}subListFileMap: {},`);
  handlerLines.push(`${ind(3)}multiSelectValuesMap: ${multiSelectMapLiteral},`);
  handlerLines.push(`${ind(3)}tableSelectedRowsMap: ${tableSelectedRowsMapLiteral},`);
  handlerLines.push(`${ind(3)}t,`);
  handlerLines.push(`${ind(2)}})) return;`);
  handlerLines.push(`${ind(2)}try {`);
  if (tables.length > 0) handlerLines.push(`${ind(3)}let anySaved = false;`);

  if (forms.length > 0) {
    const destructure = hasFileFields ? "{ formFileIdsMap, allNewIds }" : "{ formFileIdsMap }";
    handlerLines.push(`${ind(3)}const ${destructure} = await processFormFilesAndSubList({`);
    handlerLines.push(`${ind(4)}targetWidgets: ${nonTableExpr},`);
    handlerLines.push(`${ind(4)}fileValuesMap: ${fileValuesMapLiteral},`);
    handlerLines.push(`${ind(4)}existingFileMetaMap: ${existingMetaMapLiteral},`);
    handlerLines.push(`${ind(4)}subListRowsMap: {},`);
    handlerLines.push(`${ind(4)}subListFileMap: {},`);
    handlerLines.push(`${ind(4)}dataSaveSlug: ${jsStringLiteral(dataSaveSlug)},`);
    handlerLines.push(`${ind(3)}});`);
  }

  if (nonTableTargets.length > 0) {
    handlerLines.push(`${ind(3)}const { dataJson, pkKeys } = buildDataJson(`);
    handlerLines.push(`${ind(4)}${nonTableExpr} as Parameters<typeof buildDataJson>[0],`);
    handlerLines.push(`${ind(4)}${formValuesMapLiteral},`);
    handlerLines.push(`${ind(4)}${forms.length > 0 ? "formFileIdsMap" : "{}"},`);
    handlerLines.push(`${ind(4)}{},`);
    handlerLines.push(`${ind(4)}${multiSelectMapLiteral},`);
    handlerLines.push(`${ind(4)}${multiSelectExtraFieldMapLiteral},`);
    handlerLines.push(`${ind(4)}${mainConnectedSlug ? jsStringLiteral(mainConnectedSlug) : "undefined"},`);
    handlerLines.push(`${ind(4)}${allFormValuesExpr}`);
    handlerLines.push(`${ind(3)});`);
    handlerLines.push(
      `${ind(3)}${hasFileFields ? "const res = " : ""}await api.post(${jsStringLiteral(`/page-data/${dataSaveSlug}`)}, buildDataSavePayload({`
    );
    handlerLines.push(`${ind(4)}dataJson,`);
    handlerLines.push(`${ind(4)}pkKeys,`);
    handlerLines.push(`${ind(4)}templateSlug: ${templateSlugExpr},`);
    if (validationRuleIdsExpr) handlerLines.push(`${ind(4)}validationRuleIds: ${validationRuleIdsExpr},`);
    handlerLines.push(`${ind(3)}}));`);
    if (hasFileFields) {
      handlerLines.push(`${ind(3)}if (allNewIds.length > 0 && res.data.id) {`);
      handlerLines.push(`${ind(4)}await api.patch('/page-files/link', { fileIds: allNewIds, dataId: res.data.id });`);
      handlerLines.push(`${ind(3)}}`);
    }
    if (tables.length > 0) handlerLines.push(`${ind(3)}anySaved = true;`);
  }

  tables.forEach((tw) => {
    if (!paramSave) {
      handlerLines.push(
        `${ind(3)}/* TODO(파일빌드): paramSave 미설정 데이터테이블 저장 — 런타임은 URL '_paramSave=true' 추가 파라미터를 함께 저장하지만 산출물은 URL 편집모드를 이식하지 않아 extras가 비어 있습니다. */`
      );
    }
    const s = suffixOf(tw.widgetId);
    const rowsToSaveVar = `rowsToSave${s}`;
    const savedVar = `saved${s}`;
    const rowsExpr =
      tw.enableRowSelection === true
        ? `rows${s}.filter((r) => selectedRowIds${s}.includes(Number(r['_id'])))`
        : `rows${s}`;
    handlerLines.push(`${ind(3)}const ${rowsToSaveVar} = ${rowsExpr};`);
    handlerLines.push(`${ind(3)}if (${rowsToSaveVar}.length === 0) {`);
    handlerLines.push(`${ind(4)}toast.warning(t('common.table.no_save_data'));`);
    handlerLines.push(`${ind(4)}return;`);
    handlerLines.push(`${ind(3)}}`);
    handlerLines.push(`${ind(3)}const ${savedVar} = await saveTableRows({`);
    handlerLines.push(`${ind(4)}contentKey: ${jsStringLiteral(tw.contentKey)},`);
    if (!paramSave) {
      const colsLiteral = (tw.columns ?? [])
        .filter((c) => !!c.accessor)
        .map((c) => `{ accessor: ${jsStringLiteral(c.accessor as string)} }`)
        .join(", ");
      handlerLines.push(`${ind(4)}columns: [${colsLiteral}],`);
    }
    handlerLines.push(`${ind(4)}rows: ${rowsToSaveVar},`);
    handlerLines.push(`${ind(4)}extras: {},`);
    handlerLines.push(`${ind(4)}dataSaveSlug: ${jsStringLiteral(dataSaveSlug)},`);
    handlerLines.push(`${ind(4)}templateSlug: ${templateSlugExpr},`);
    if (paramSave) handlerLines.push(`${ind(4)}paramSave: ${jsStringLiteral(paramSave)},`);
    if (validationRuleIdsExpr) handlerLines.push(`${ind(4)}validationRuleIds: ${validationRuleIdsExpr},`);
    handlerLines.push(`${ind(3)}});`);
    handlerLines.push(`${ind(3)}if (${savedVar} > 0) anySaved = true;`);
  });

  const successLines: string[] = [`toast.success(t('common.saved'));`];
  if (leaveCheckNames.includes("markClean")) successLines.push(`markClean();`);
  if (emitGoBack) successLines.push(`router.back();`);

  if (tables.length > 0) {
    handlerLines.push(`${ind(3)}if (anySaved) {`);
    successLines.forEach((l) => handlerLines.push(`${ind(4)}${l}`));
    handlerLines.push(`${ind(3)}}`);
  } else {
    successLines.forEach((l) => handlerLines.push(`${ind(3)}${l}`));
  }

  handlerLines.push(`${ind(2)}} catch (err) {`);
  handlerLines.push(`${ind(3)}toast.error(getApiErrorMessage(err, t('common.error.save')));`);
  handlerLines.push(`${ind(2)}}`);
  handlerLines.push(`${ind(1)}};`);
  handlerLines.push("");

  return { handlerLines, helperLines: [], imports };
};
