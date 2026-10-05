import type { SubListWidget } from "../../components/renderer/types";
import type { ImportRequirement, WidgetCodeBlock, WidgetGenContext, UnhandledConfigKeys } from "../widgetGenerator";
import { collectUnhandledKeys, sublistVarNames } from "../widgetGenerator";

const RENDERER_TYPES_MODULE = "@/app/admin/templates/make/_shared/components/renderer/types";
const SUBLIST_RENDERER_MODULE = "@/app/admin/templates/make/_shared/components/renderer/SubListRenderer";

const FILE_COL_TYPES = ["file", "image"];

const HANDLED_WIDGET_KEYS = new Set([
  "type",
  "widgetId",
  "connectedSlug",
  "contentKey",
  "title",
  "titleMsgKey",
  "addButtonLabel",
  "addButtonLabelMsgKey",
  "maxRows",
  "required",
  "showBorder",
  "bgColor",
  "fieldColSpan",
  "fieldAlign",
  "columns",
]);

const IGNORED_WIDGET_KEYS = new Map<string, string>([
  [
    "parentIdField",
    "connType='api' 컨텐츠 연동 저장 전용 설정 — 파일빌드는 connType='api' 버튼 동작 자체를 지원하지 않아(spaceBlock.ts UNSUPPORTED_CONN_TYPE_NOTE) 이 값을 읽지 않음",
  ],
]);

export const hasSubListFileColumns = (widget: Pick<SubListWidget, "columns">): boolean =>
  (widget.columns ?? []).some((c) => (FILE_COL_TYPES as readonly string[]).includes(c.type));

const buildUnhandled = (widget: SubListWidget): UnhandledConfigKeys[] => [
  {
    scope: "widget",
    keys: collectUnhandledKeys(
      widget as unknown as Record<string, unknown>,
      HANDLED_WIDGET_KEYS,
      new Set(IGNORED_WIDGET_KEYS.keys())
    ),
  },
];

const SUBLIST_SUPPORTED_ACTIONS: readonly string[] = ["copy", "delete"];

const sanitizeWidgetForEmit = (widget: SubListWidget): SubListWidget => {
  const clone = { ...widget } as Record<string, unknown>;
  IGNORED_WIDGET_KEYS.forEach((_, key) => delete clone[key]);
  clone.columns = (widget.columns ?? []).map((col) =>
    col.type === "action" && col.actions
      ? { ...col, actions: col.actions.filter((a) => SUBLIST_SUPPORTED_ACTIONS.includes(a)) }
      : col
  );
  return clone as unknown as SubListWidget;
};

export const generateSubListBlock = (widget: SubListWidget, ctx: WidgetGenContext): WidgetCodeBlock => {
  const { ind, suffix, leaveCheckNames } = ctx;
  const names = sublistVarNames(suffix);
  const canMarkDirty = leaveCheckNames.includes("markDirty");
  const hasFileCols = hasSubListFileColumns(widget);

  const imports: ImportRequirement[] = [
    { module: RENDERER_TYPES_MODULE, named: ["SubListWidget"], typeOnly: true },
    { module: SUBLIST_RENDERER_MODULE, named: ["SubListRenderer"] },
    { module: SUBLIST_RENDERER_MODULE, named: ["SubListRow"], typeOnly: true },
    { module: "react", named: ["useCallback"] },
  ];

  const helperLines: string[] = [
    `const ${names.widget}: SubListWidget = ${JSON.stringify(sanitizeWidgetForEmit(widget), null, 4)};`,
  ];

  const stateLines: string[] = [];
  stateLines.push(`${ind(1)}const [${names.rows}, ${names.setRows}] = useState<SubListRow[]>([]);`);
  if (hasFileCols) {
    stateLines.push(
      `${ind(1)}const [${names.fileMap}, ${names.setFileMap}] = useState<Record<string, Record<string, File[]>>>({});`
    );
  }

  const handlerLines: string[] = [];
  handlerLines.push(`${ind(1)}const ${names.rowsChange} = useCallback((rows: SubListRow[]) => {`);
  handlerLines.push(`${ind(2)}${names.setRows}(rows);`);
  if (canMarkDirty) handlerLines.push(`${ind(2)}markDirty();`);
  handlerLines.push(`${ind(1)}}, [${canMarkDirty ? "markDirty" : ""}]);`);
  handlerLines.push("");
  if (hasFileCols) {
    handlerLines.push(
      `${ind(1)}const ${names.fileChange} = useCallback((colId: string, files: File[], rowId?: string) => {`
    );
    handlerLines.push(`${ind(2)}if (!rowId) return;`);
    handlerLines.push(
      `${ind(2)}${names.setFileMap}((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] ?? {}), [colId]: files } }));`
    );
    handlerLines.push(`${ind(1)}}, []);`);
    handlerLines.push("");
  }

  const unsupportedNotes: string[] = [];
  if (widget.parentIdField) {
    unsupportedNotes.push(
      `parentIdField(API연동 컨텐츠 부모 연결)이 설정되어 있지만 파일빌드는 connType='api' 버튼 동작을 지원하지 않아 이 설정이 적용되지 않습니다.`
    );
  }

  const jsxLines: string[] = [];
  unsupportedNotes.forEach((note) => jsxLines.push(`{/* TODO(파일빌드): ${note} */}`));
  jsxLines.push(
    `<SubListRenderer mode="live" widget={${names.widget}} rows={${names.rows}} onChange={${names.rowsChange}}${
      hasFileCols ? ` onFileChange={${names.fileChange}}` : ""
    } />`
  );

  return { imports, helperLines, stateLines, handlerLines, jsxLines, unhandled: buildUnhandled(widget) };
};
