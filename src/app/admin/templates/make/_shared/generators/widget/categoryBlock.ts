import type { CategoryWidget } from "../../components/renderer/types";
import type { ImportRequirement, WidgetCodeBlock, WidgetGenContext, UnhandledConfigKeys } from "../widgetGenerator";
import { jsStringLiteral, collectUnhandledKeys, emitContainerOpen, emitContainerClose } from "../widgetGenerator";
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
} from "../../components/renderer/rendererStyles";

const UTILS_MODULE = "@/app/admin/templates/make/_shared/utils";

const HANDLED_WIDGET_KEYS = new Set([
  "type",
  "widgetId",
  "dbSlug",
  "depth",
  "parentWidgetId",
  "label",
  "labelMsgKey",
  "fieldId",
  "fieldCode",
  "fieldTitle",
  "fieldDesc",
  "allowCreate",
  "createConnType",
  "createPopupSlug",
  "createPath",
  "createParams",
  "createParamSave",
  "allowEdit",
  "editConnType",
  "editPopupSlug",
  "editPath",
  "editParams",
  "editParamSave",
  "allowDetail",
  "detailConnType",
  "detailPopupSlug",
  "detailPath",
  "detailParams",
  "allowDelete",
  "relationSlugId",
  "showBorder",
]);

const IGNORED_WIDGET_KEYS = new Map<string, string>([
  ["contentKey", "산출물에 데이터 조립 개념이 없어 사용하지 않음"],
  ["bgColor", "CategoryRenderer가 사용하지 않는 값"],
]);

const categoryVarNames = (suffix: string) => ({
  items: `categoryItems${suffix}`,
  setItems: `setCategoryItems${suffix}`,
  loading: `categoryLoading${suffix}`,
  setLoading: `setCategoryLoading${suffix}`,
  selectedId: `selectedId${suffix}`,
  setSelectedId: `setSelectedId${suffix}`,
  inputName: `categoryInputName${suffix}`,
  setInputName: `setCategoryInputName${suffix}`,
  showInput: `categoryShowInput${suffix}`,
  setShowInput: `setCategoryShowInput${suffix}`,
  dragIndexRef: `categoryDragIndexRef${suffix}`,
  dropIndex: `categoryDropIndex${suffix}`,
  setDropIndex: `setCategoryDropIndex${suffix}`,
  fetch: `fetchCategory${suffix}`,
  create: `handleCategoryCreate${suffix}`,
  delete: `handleCategoryDelete${suffix}`,
  select: `handleCategorySelect${suffix}`,
  edit: `handleCategoryEdit${suffix}`,
  detail: `handleCategoryDetail${suffix}`,
  addClick: `handleCategoryAdd${suffix}`,
  dragStart: `handleCategoryDragStart${suffix}`,
  dragOver: `handleCategoryDragOver${suffix}`,
  dragLeave: `handleCategoryDragLeave${suffix}`,
  drop: `handleCategoryDrop${suffix}`,
  fieldKeys: `CATEGORY_FIELD_KEYS_${suffix}`,
  brokenParentSel: `selectedParent${suffix}`,
  dbSlug: `categoryDbSlug${suffix}`,
});

const CATEGORY_ITEM_INTERFACE_LINES: string[] = [
  "interface CategoryItem {",
  "    id: number;",
  "    name: string;",
  "    depth: number;",
  "    parentId: number | null;",
  "    sortOrder?: number;",
  "    code?: string;",
  "    description?: string;",
  "    _dataJson?: Record<string, unknown>;",
  "    _flatJson?: Record<string, unknown>;",
  "}",
];

const CATEGORY_FETCH_SIZE_LINE = "const CATEGORY_FETCH_SIZE = '9999';";

const SORT_CATEGORY_ITEMS_LINES: string[] = [
  "function sortCategoryItems(rows: CategoryItem[]): CategoryItem[] {",
  "    return [...rows].sort((a, b) => {",
  "        if (a.sortOrder == null && b.sortOrder == null) return 0;",
  "        if (a.sortOrder == null) return 1;",
  "        if (b.sortOrder == null) return -1;",
  "        return a.sortOrder - b.sortOrder;",
  "    });",
  "}",
];

const constNameForSlug = (slug: string): string => {
  const upper = slug.replace(/[^0-9A-Za-z]+/g, "_").toUpperCase();
  const trimmed = upper.replace(/^_+|_+$/g, "");
  const safe = /^[0-9]/.test(trimmed) ? `P_${trimmed}` : trimmed;
  return `${safe}_PAGE_PATH`;
};

interface ResolvedPagePath {
  constName: string;
  constLine: string;
  todoLine?: string;
}

const resolvePagePath = (slug: string, ctx: WidgetGenContext): ResolvedPagePath => {
  const constName = constNameForSlug(slug);
  const mode = ctx.outputModeOf(slug);
  if (mode === "layerpopup") {
    return {
      constName,
      constLine: `const ${constName} = ${jsStringLiteral(`/admin/widgetSub/${slug}`)};`,
      todoLine: `연결 대상(${slug})이 LayerPopup 모드입니다. 산출물에서는 페이지 이동으로 동작합니다(레이어 팝업 미지원).`,
    };
  }
  if (mode === undefined) {
    return {
      constName,
      constLine: `const ${constName} = ${jsStringLiteral(`/admin/generated/${slug}`)};`,
      todoLine: `연결 대상(${slug})의 출력 모드를 확인하지 못했습니다. 대상이 LayerPopup이면 산출물에서는 페이지 이동으로 동작합니다(레이어 팝업 미지원).`,
    };
  }
  return {
    constName,
    constLine: `const ${constName} = ${jsStringLiteral(`/admin/generated/${slug}`)};`,
  };
};

const labelExprOf = (widget: CategoryWidget): string => {
  if (widget.labelMsgKey) return `t(${jsStringLiteral(widget.labelMsgKey)})`;
  if (widget.label) return jsStringLiteral(widget.label);
  return `t('common.category.default_label', { depth: '${widget.depth}' })`;
};

const buildUnhandled = (widget: CategoryWidget, parentBroken: boolean): UnhandledConfigKeys[] => {
  const keys = collectUnhandledKeys(
    widget as unknown as Record<string, unknown>,
    HANDLED_WIDGET_KEYS,
    new Set(IGNORED_WIDGET_KEYS.keys())
  );
  if (parentBroken) keys.push("parentWidgetId");
  return [{ scope: "widget", keys }];
};

export const generateCategoryBlock = (widget: CategoryWidget, ctx: WidgetGenContext): WidgetCodeBlock => {
  const { ind, suffix, allWidgets, suffixOf } = ctx;
  const names = categoryVarNames(suffix);
  const isSelectedExpr = `${names.selectedId} === item.id`;

  const categoryWidgetIds = new Set(
    allWidgets.filter((w): w is CategoryWidget => w.type === "category").map((w) => w.widgetId)
  );
  const parentWidgetId = widget.parentWidgetId;
  const hasParentConfig = widget.depth > 1 && !!parentWidgetId;
  const parentBroken = hasParentConfig && !categoryWidgetIds.has(parentWidgetId as string);
  const parentSelExpr: string | null = !hasParentConfig
    ? null
    : parentBroken
      ? names.brokenParentSel
      : categoryVarNames(suffixOf(parentWidgetId as string)).selectedId;
  const parentNotSelectedExpr = parentSelExpr != null ? `${parentSelExpr} == null` : null;

  const createEnabled = widget.allowCreate !== false;
  const createMode: "inline" | "popup" | "path" =
    widget.createConnType === "popup" && widget.createPopupSlug
      ? "popup"
      : widget.createConnType === "path" && widget.createPath
        ? "path"
        : "inline";

  const editEnabled =
    !!widget.allowEdit &&
    ((widget.editConnType === "popup" && !!widget.editPopupSlug) ||
      (widget.editConnType === "path" && !!widget.editPath));
  const editMode: "popup" | "path" | undefined = editEnabled ? widget.editConnType : undefined;

  const detailEnabled =
    !!widget.allowDetail &&
    ((widget.detailConnType === "popup" && !!widget.detailPopupSlug) ||
      (widget.detailConnType === "path" && !!widget.detailPath));
  const detailMode: "popup" | "path" | undefined = detailEnabled ? widget.detailConnType : undefined;

  const deleteEnabled = widget.allowDelete !== false;

  const needsRouter = (createEnabled && createMode !== "inline") || editEnabled || detailEnabled;

  const icons: string[] = [
    ...(createEnabled ? ["Plus"] : []),
    ...(createEnabled && createMode === "inline" ? ["Check", "X"] : []),
    ...(editEnabled ? ["Pencil"] : []),
    ...(detailEnabled ? ["Eye"] : []),
    ...(deleteEnabled ? ["Trash2"] : []),
    "GripVertical",
  ];

  const imports: ImportRequirement[] = [
    { module: "react", named: ["useRef"] },
    { module: "@/lib/api", defaultName: "api" },
    { module: "sonner", named: ["toast"] },
    { module: "@/hooks/use-i18n", named: ["useI18n"] },
    { module: "lucide-react", named: icons },
    {
      module: UTILS_MODULE,
      named: [
        "flattenPageDataItem",
        ...(createEnabled && createMode !== "inline" ? ["parseActionParams"] : []),
        ...(editEnabled || detailEnabled ? ["buildRowActionQuery"] : []),
      ],
    },
  ];
  if (needsRouter) imports.push({ module: "next/navigation", named: ["useRouter"] });

  const helperLines: string[] = [];
  helperLines.push(...CATEGORY_ITEM_INTERFACE_LINES);
  helperLines.push(CATEGORY_FETCH_SIZE_LINE);

  const routingConsts: { mode: "create" | "edit" | "detail"; resolved: ResolvedPagePath }[] = [];
  if (createMode === "popup")
    routingConsts.push({ mode: "create", resolved: resolvePagePath(widget.createPopupSlug as string, ctx) });
  if (editMode === "popup")
    routingConsts.push({ mode: "edit", resolved: resolvePagePath(widget.editPopupSlug as string, ctx) });
  if (detailMode === "popup")
    routingConsts.push({ mode: "detail", resolved: resolvePagePath(widget.detailPopupSlug as string, ctx) });
  routingConsts.forEach(({ resolved }) => helperLines.push(resolved.constLine));

  const fetchPrefix = widget.relationSlugId ? `_fetchedRel${widget.relationSlugId}.` : "";
  const idKey = widget.fieldId || "id";
  const codeKey = fetchPrefix + (widget.fieldCode || "code");
  const titleKey = fetchPrefix + (widget.fieldTitle || "name");
  const descKey = fetchPrefix + (widget.fieldDesc || "description");
  helperLines.push(
    `const ${names.fieldKeys} = { id: ${jsStringLiteral(idKey)}, code: ${jsStringLiteral(codeKey)}, title: ${jsStringLiteral(titleKey)}, desc: ${jsStringLiteral(descKey)} };`
  );
  helperLines.push(...SORT_CATEGORY_ITEMS_LINES);

  const stateLines: string[] = [];
  stateLines.push(`${ind(1)}const { t } = useI18n();`);
  stateLines.push(`${ind(1)}const ${names.dbSlug} = ${jsStringLiteral(widget.dbSlug ?? "")};`);
  if (needsRouter) stateLines.push(`${ind(1)}const router = useRouter();`);
  stateLines.push(`${ind(1)}const [${names.items}, ${names.setItems}] = useState<CategoryItem[]>([]);`);
  stateLines.push(`${ind(1)}const [${names.loading}, ${names.setLoading}] = useState(false);`);
  stateLines.push(`${ind(1)}const [${names.selectedId}, ${names.setSelectedId}] = useState<number | null>(null);`);
  if (createEnabled && createMode === "inline") {
    stateLines.push(`${ind(1)}const [${names.inputName}, ${names.setInputName}] = useState('');`);
    stateLines.push(`${ind(1)}const [${names.showInput}, ${names.setShowInput}] = useState(false);`);
  }
  stateLines.push(`${ind(1)}const ${names.dragIndexRef} = useRef<number | null>(null);`);
  stateLines.push(`${ind(1)}const [${names.dropIndex}, ${names.setDropIndex}] = useState<number | null>(null);`);
  if (parentBroken) {
    stateLines.push(`${ind(1)}const ${names.brokenParentSel}: number | null = null;`);
  }

  const handlerLines: string[] = [];

  if (parentBroken) {
    handlerLines.push(
      `${ind(1)}/* TODO(파일빌드): Category '${suffix}'의 상위 카테고리 위젯(${parentWidgetId})이 이 페이지에 없습니다. 참조가 끊어졌습니다. */`
    );
  }

  handlerLines.push(`${ind(1)}const ${names.fetch} = async (parentId: number | null) => {`);
  handlerLines.push(`${ind(2)}if (!${names.dbSlug}) return;`);
  if (hasParentConfig) {
    handlerLines.push(`${ind(2)}if (parentId == null) { ${names.setItems}([]); return; }`);
  }
  handlerLines.push(`${ind(2)}${names.setLoading}(true);`);
  handlerLines.push(`${ind(2)}try {`);
  handlerLines.push(
    `${ind(3)}const params: Record<string, string> = { eq_depth: '${widget.depth}', size: CATEGORY_FETCH_SIZE };`
  );
  handlerLines.push(`${ind(3)}if (parentId != null) params.eq_parentId = String(parentId);`);
  handlerLines.push(`${ind(3)}const res = await api.get(\`/page-data/\${${names.dbSlug}}\`, { params });`);
  handlerLines.push(
    `${ind(3)}const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[]).map((item) => {`
  );
  handlerLines.push(`${ind(4)}const flat = flattenPageDataItem(item as Parameters<typeof flattenPageDataItem>[0]);`);
  handlerLines.push(`${ind(4)}return {`);
  handlerLines.push(
    `${ind(5)}id: flat[${names.fieldKeys}.id] != null ? Number(flat[${names.fieldKeys}.id]) : item.id,`
  );
  handlerLines.push(`${ind(5)}name: String(flat[${names.fieldKeys}.title] ?? ''),`);
  handlerLines.push(`${ind(5)}depth: Number(item.dataJson.depth ?? ${widget.depth}),`);
  handlerLines.push(`${ind(5)}parentId: item.dataJson.parentId != null ? Number(item.dataJson.parentId) : null,`);
  handlerLines.push(
    `${ind(5)}sortOrder: item.dataJson.sortOrder != null ? Number(item.dataJson.sortOrder) : undefined,`
  );
  handlerLines.push(
    `${ind(5)}code: flat[${names.fieldKeys}.code] != null ? String(flat[${names.fieldKeys}.code]) : undefined,`
  );
  handlerLines.push(
    `${ind(5)}description: flat[${names.fieldKeys}.desc] != null ? String(flat[${names.fieldKeys}.desc]) : undefined,`
  );
  handlerLines.push(`${ind(5)}_dataJson: item.dataJson,`);
  handlerLines.push(`${ind(5)}_flatJson: flat,`);
  handlerLines.push(`${ind(4)}};`);
  handlerLines.push(`${ind(3)}});`);
  handlerLines.push(`${ind(3)}${names.setItems}(sortCategoryItems(rows));`);
  handlerLines.push(`${ind(2)}} catch {`);
  handlerLines.push(`${ind(3)}toast.error(t('common.error.load'));`);
  handlerLines.push(`${ind(2)}} finally {`);
  handlerLines.push(`${ind(3)}${names.setLoading}(false);`);
  handlerLines.push(`${ind(2)}}`);
  handlerLines.push(`${ind(1)}};`);
  handlerLines.push("");

  if (hasParentConfig) {
    handlerLines.push(`${ind(1)}useEffect(() => {`);
    handlerLines.push(`${ind(2)}${names.setSelectedId}(null);`);
    handlerLines.push(`${ind(2)}${names.fetch}(${parentSelExpr});`);
    handlerLines.push(`${ind(1)}}, [${parentSelExpr}]);`);
  } else {
    handlerLines.push(`${ind(1)}useEffect(() => { ${names.fetch}(null); }, []);`);
  }
  handlerLines.push("");

  handlerLines.push(`${ind(1)}const ${names.select} = (item: CategoryItem) => {`);
  handlerLines.push(`${ind(2)}${names.setSelectedId}(${names.selectedId} === item.id ? null : item.id);`);
  handlerLines.push(`${ind(1)}};`);
  handlerLines.push("");

  if (createEnabled) {
    handlerLines.push(`${ind(1)}const ${names.addClick} = () => {`);
    if (hasParentConfig) {
      handlerLines.push(`${ind(2)}if (${parentNotSelectedExpr}) {`);
      handlerLines.push(`${ind(3)}toast.warning(t('common.category.select_parent_warning'));`);
      handlerLines.push(`${ind(3)}return;`);
      handlerLines.push(`${ind(2)}}`);
    }
    if (createMode === "inline") {
      handlerLines.push(`${ind(2)}${names.setShowInput}((v) => !v);`);
      handlerLines.push(`${ind(2)}${names.setInputName}('');`);
    } else if (createMode === "popup") {
      const resolved = routingConsts.find((r) => r.mode === "create")!.resolved;
      if (resolved.todoLine) handlerLines.push(`${ind(2)}/* TODO(파일빌드): ${resolved.todoLine} */`);
      if (hasParentConfig) {
        handlerLines.push(
          `${ind(2)}const rowForParams = ${parentSelExpr} != null ? { id: String(${parentSelExpr}) } : {};`
        );
      } else {
        handlerLines.push(`${ind(2)}const rowForParams = {};`);
      }
      handlerLines.push(
        `${ind(2)}const parsed = parseActionParams(${jsStringLiteral(widget.createParams ?? "")}, rowForParams);`
      );
      if (hasParentConfig) {
        handlerLines.push(`${ind(2)}if (${parentSelExpr} != null) parsed['parentId'] = String(${parentSelExpr});`);
      }
      if (widget.createParamSave) handlerLines.push(`${ind(2)}parsed['_paramSave'] = 'true';`);
      handlerLines.push(
        `${ind(2)}const qs = Object.keys(parsed).length > 0 ? \`?\${new URLSearchParams(parsed).toString()}\` : '';`
      );
      handlerLines.push(`${ind(2)}router.push(\`\${${resolved.constName}}\${qs}\`);`);
    } else {
      if (hasParentConfig) {
        handlerLines.push(
          `${ind(2)}const rowForParams = ${parentSelExpr} != null ? { id: String(${parentSelExpr}) } : {};`
        );
      } else {
        handlerLines.push(`${ind(2)}const rowForParams = {};`);
      }
      handlerLines.push(
        `${ind(2)}const parsed = parseActionParams(${jsStringLiteral(widget.createParams ?? "")}, rowForParams);`
      );
      if (widget.createParamSave) handlerLines.push(`${ind(2)}parsed['_paramSave'] = 'true';`);
      handlerLines.push(
        `${ind(2)}const qs = Object.keys(parsed).length > 0 ? \`?\${new URLSearchParams(parsed).toString()}\` : '';`
      );
      handlerLines.push(`${ind(2)}router.push(${jsStringLiteral(widget.createPath as string)} + qs);`);
    }
    handlerLines.push(`${ind(1)}};`);
    handlerLines.push("");
  }

  if (createEnabled && createMode === "inline") {
    handlerLines.push(`${ind(1)}const ${names.create} = async () => {`);
    handlerLines.push(
      `${ind(2)}if (!${names.inputName}.trim()) { toast.warning(t('common.validation.name.required')); return; }`
    );
    handlerLines.push(`${ind(2)}try {`);
    handlerLines.push(`${ind(3)}const dataJson: Record<string, unknown> = {`);
    handlerLines.push(`${ind(4)}name: ${names.inputName}.trim(),`);
    handlerLines.push(`${ind(4)}depth: ${widget.depth},`);
    handlerLines.push(`${ind(4)}sortOrder: ${names.items}.length + 1,`);
    handlerLines.push(`${ind(3)}};`);
    if (hasParentConfig) {
      handlerLines.push(`${ind(3)}if (${parentSelExpr} != null) dataJson.parentId = ${parentSelExpr};`);
    }
    handlerLines.push(`${ind(3)}await api.post(\`/page-data/\${${names.dbSlug}}\`, { dataJson });`);
    handlerLines.push(`${ind(3)}toast.success(t('common.saved'));`);
    handlerLines.push(`${ind(3)}${names.setInputName}('');`);
    handlerLines.push(`${ind(3)}${names.setShowInput}(false);`);
    handlerLines.push(`${ind(3)}${names.fetch}(${parentSelExpr ?? "null"});`);
    handlerLines.push(`${ind(2)}} catch {`);
    handlerLines.push(`${ind(3)}toast.error(t('common.error.save'));`);
    handlerLines.push(`${ind(2)}}`);
    handlerLines.push(`${ind(1)}};`);
    handlerLines.push("");
  }

  if (editEnabled) {
    const editQueryExpr = `buildRowActionQuery(item.id, ${jsStringLiteral(widget.editParams ?? "")}, item._flatJson ?? {}${widget.editParamSave ? ", true" : ""})`;
    handlerLines.push(`${ind(1)}const ${names.edit} = (item: CategoryItem) => {`);
    if (editMode === "popup") {
      const resolved = routingConsts.find((r) => r.mode === "edit")!.resolved;
      if (resolved.todoLine) handlerLines.push(`${ind(2)}/* TODO(파일빌드): ${resolved.todoLine} */`);
      handlerLines.push(`${ind(2)}router.push(\`\${${resolved.constName}}\${${editQueryExpr}}\`);`);
    } else {
      handlerLines.push(`${ind(2)}router.push(${jsStringLiteral(widget.editPath as string)} + ${editQueryExpr});`);
    }
    handlerLines.push(`${ind(1)}};`);
    handlerLines.push("");
  }

  if (detailEnabled) {
    const detailQueryExpr = `buildRowActionQuery(item.id, ${jsStringLiteral(widget.detailParams ?? "")}, item._flatJson ?? {})`;
    handlerLines.push(`${ind(1)}const ${names.detail} = (item: CategoryItem) => {`);
    if (detailMode === "popup") {
      const resolved = routingConsts.find((r) => r.mode === "detail")!.resolved;
      if (resolved.todoLine) handlerLines.push(`${ind(2)}/* TODO(파일빌드): ${resolved.todoLine} */`);
      handlerLines.push(`${ind(2)}router.push(\`\${${resolved.constName}}\${${detailQueryExpr}}\`);`);
    } else {
      handlerLines.push(`${ind(2)}router.push(${jsStringLiteral(widget.detailPath as string)} + ${detailQueryExpr});`);
    }
    handlerLines.push(`${ind(1)}};`);
    handlerLines.push("");
  }

  if (deleteEnabled) {
    handlerLines.push(`${ind(1)}const ${names.delete} = async (id: number) => {`);
    handlerLines.push(`${ind(2)}if (!confirm(t('common.confirm.delete'))) return;`);
    handlerLines.push(`${ind(2)}try {`);
    handlerLines.push(`${ind(3)}await api.delete(\`/page-data/\${${names.dbSlug}}/\${id}\`);`);
    handlerLines.push(`${ind(3)}toast.success(t('common.deleted'));`);
    handlerLines.push(`${ind(3)}if (${names.selectedId} === id) ${names.setSelectedId}(null);`);
    handlerLines.push(`${ind(3)}${names.fetch}(${parentSelExpr ?? "null"});`);
    handlerLines.push(`${ind(2)}} catch {`);
    handlerLines.push(`${ind(3)}toast.error(t('common.error.delete'));`);
    handlerLines.push(`${ind(2)}}`);
    handlerLines.push(`${ind(1)}};`);
    handlerLines.push("");
  }

  handlerLines.push(`${ind(1)}const ${names.dragStart} = (index: number) => {`);
  handlerLines.push(`${ind(2)}${names.dragIndexRef}.current = index;`);
  handlerLines.push(`${ind(1)}};`);
  handlerLines.push("");
  handlerLines.push(`${ind(1)}const ${names.dragOver} = (e: React.DragEvent, index: number) => {`);
  handlerLines.push(`${ind(2)}e.preventDefault();`);
  handlerLines.push(`${ind(2)}if (${names.dropIndex} === index) return;`);
  handlerLines.push(`${ind(2)}${names.setDropIndex}(index);`);
  handlerLines.push(`${ind(1)}};`);
  handlerLines.push("");
  handlerLines.push(`${ind(1)}const ${names.dragLeave} = (e: React.DragEvent) => {`);
  handlerLines.push(`${ind(2)}if (e.currentTarget.contains(e.relatedTarget as Node)) return;`);
  handlerLines.push(`${ind(2)}${names.setDropIndex}(null);`);
  handlerLines.push(`${ind(1)}};`);
  handlerLines.push("");
  handlerLines.push(`${ind(1)}const ${names.drop} = async (e: React.DragEvent, toIndex: number) => {`);
  handlerLines.push(`${ind(2)}e.preventDefault();`);
  handlerLines.push(`${ind(2)}${names.setDropIndex}(null);`);
  handlerLines.push(`${ind(2)}const fromIndex = ${names.dragIndexRef}.current;`);
  handlerLines.push(`${ind(2)}${names.dragIndexRef}.current = null;`);
  handlerLines.push(`${ind(2)}if (fromIndex == null || fromIndex === toIndex) return;`);
  handlerLines.push(`${ind(2)}const reordered = [...${names.items}];`);
  handlerLines.push(`${ind(2)}const [moved] = reordered.splice(fromIndex, 1);`);
  handlerLines.push(`${ind(2)}reordered.splice(toIndex, 0, moved);`);
  handlerLines.push(`${ind(2)}const updated = reordered.map((item, i) => ({ ...item, sortOrder: i + 1 }));`);
  handlerLines.push(`${ind(2)}${names.setItems}(updated);`);
  handlerLines.push(
    `${ind(2)}const originalSortMap = new Map(${names.items}.map((item) => [item.id, item.sortOrder]));`
  );
  handlerLines.push(
    `${ind(2)}const changed = updated.filter((item) => item.sortOrder !== originalSortMap.get(item.id));`
  );
  handlerLines.push(`${ind(2)}try {`);
  handlerLines.push(`${ind(3)}await Promise.all(`);
  handlerLines.push(`${ind(4)}changed.map((item) => {`);
  handlerLines.push(
    `${ind(5)}const dataJson: Record<string, unknown> = { ...(item._dataJson ?? {}), sortOrder: item.sortOrder };`
  );
  handlerLines.push(`${ind(5)}return api.put(\`/page-data/\${${names.dbSlug}}/\${item.id}\`, { dataJson });`);
  handlerLines.push(`${ind(4)}})`);
  handlerLines.push(`${ind(3)});`);
  handlerLines.push(`${ind(2)}} catch {`);
  handlerLines.push(`${ind(3)}toast.error(t('common.error.sort'));`);
  handlerLines.push(`${ind(3)}${names.fetch}(${parentSelExpr ?? "null"});`);
  handlerLines.push(`${ind(2)}}`);
  handlerLines.push(`${ind(1)}};`);
  handlerLines.push("");

  const jsxLines: string[] = [];
  jsxLines.push(`<div className=${jsStringLiteral(CATEGORY_OUTER_WRAP_CLS)}>`);
  jsxLines.push(
    `${ind(1)}${emitContainerOpen({ showBorder: true, className: CATEGORY_CONTAINER_CLS, fillHeight: ctx.contentFillHeight })}`
  );

  jsxLines.push(`${ind(2)}<div className=${jsStringLiteral(CATEGORY_HEADER_CLS)}>`);
  jsxLines.push(
    `${ind(3)}<span className=${jsStringLiteral(CATEGORY_HEADER_LABEL_CLS)}>{${labelExprOf(widget)}}</span>`
  );
  if (createEnabled) {
    const buttonLines: string[] = [];
    buttonLines.push(`${ind(3)}<button`);
    buttonLines.push(`${ind(4)}onClick={${names.addClick}}`);
    buttonLines.push(`${ind(4)}className=${jsStringLiteral(categoryAddButtonClass(false))}`);
    buttonLines.push(`${ind(3)}>`);
    buttonLines.push(`${ind(4)}<Plus className=${jsStringLiteral(CATEGORY_HEADER_ICON_CLS)} />`);
    buttonLines.push(`${ind(4)}{t('common.btn.add')}`);
    buttonLines.push(`${ind(3)}</button>`);
    if (createMode === "inline" && hasParentConfig) {
      jsxLines.push(`${ind(3)}{!(${parentNotSelectedExpr}) && (`);
      jsxLines.push(...buttonLines);
      jsxLines.push(`${ind(3)})}`);
    } else {
      jsxLines.push(...buttonLines);
    }
  }
  jsxLines.push(`${ind(2)}</div>`);

  if (createEnabled && createMode === "inline") {
    jsxLines.push(`${ind(2)}{${names.showInput} && (`);
    jsxLines.push(`${ind(3)}<div className=${jsStringLiteral(CATEGORY_INPUT_ROW_CLS)}>`);
    jsxLines.push(`${ind(4)}<input`);
    jsxLines.push(`${ind(5)}type="text"`);
    jsxLines.push(`${ind(5)}autoFocus`);
    jsxLines.push(`${ind(5)}value={${names.inputName}}`);
    jsxLines.push(`${ind(5)}onChange={(e) => ${names.setInputName}(e.target.value)}`);
    jsxLines.push(
      `${ind(5)}onKeyDown={(e) => { if (e.key === 'Enter') ${names.create}(); if (e.key === 'Escape') ${names.setShowInput}(false); }}`
    );
    jsxLines.push(`${ind(5)}placeholder={t('common.input.name_placeholder')}`);
    jsxLines.push(`${ind(5)}className=${jsStringLiteral(CATEGORY_INPUT_CLS)}`);
    jsxLines.push(`${ind(4)}/>`);
    jsxLines.push(
      `${ind(4)}<button onClick={${names.create}} className=${jsStringLiteral(CATEGORY_INPUT_CONFIRM_BTN_CLS)}>`
    );
    jsxLines.push(`${ind(5)}<Check className=${jsStringLiteral(CATEGORY_INPUT_ICON_CLS)} />`);
    jsxLines.push(`${ind(4)}</button>`);
    jsxLines.push(
      `${ind(4)}<button onClick={() => ${names.setShowInput}(false)} className=${jsStringLiteral(CATEGORY_INPUT_CANCEL_BTN_CLS)}>`
    );
    jsxLines.push(`${ind(5)}<X className=${jsStringLiteral(CATEGORY_INPUT_ICON_CLS)} />`);
    jsxLines.push(`${ind(4)}</button>`);
    jsxLines.push(`${ind(3)}</div>`);
    jsxLines.push(`${ind(2)})}`);
  }

  jsxLines.push(`${ind(2)}<div className=${jsStringLiteral(CATEGORY_LIST_WRAP_CLS)}>`);
  if (hasParentConfig) {
    jsxLines.push(`${ind(3)}{${parentNotSelectedExpr} && (`);
    jsxLines.push(`${ind(4)}<div className=${jsStringLiteral(CATEGORY_STATE_WRAP_CLS)}>`);
    jsxLines.push(
      `${ind(5)}<span className=${jsStringLiteral(CATEGORY_STATE_TEXT_ITALIC_CLS)}>{t('common.category.select_parent')}</span>`
    );
    jsxLines.push(`${ind(4)}</div>`);
    jsxLines.push(`${ind(3)})}`);
  }
  const notBlockedPrefix = hasParentConfig ? `!(${parentNotSelectedExpr}) && ` : "";
  jsxLines.push(`${ind(3)}{${notBlockedPrefix}${names.loading} && (`);
  jsxLines.push(`${ind(4)}<div className=${jsStringLiteral(CATEGORY_STATE_WRAP_CLS)}>`);
  jsxLines.push(`${ind(5)}<span className=${jsStringLiteral(CATEGORY_STATE_TEXT_CLS)}>{t('common.loading')}</span>`);
  jsxLines.push(`${ind(4)}</div>`);
  jsxLines.push(`${ind(3)})}`);
  jsxLines.push(`${ind(3)}{${notBlockedPrefix}!${names.loading} && ${names.items}.length === 0 && (`);
  jsxLines.push(`${ind(4)}<div className=${jsStringLiteral(CATEGORY_STATE_WRAP_CLS)}>`);
  jsxLines.push(
    `${ind(5)}<span className=${jsStringLiteral(CATEGORY_STATE_TEXT_ITALIC_CLS)}>{t('common.table.no_data')}</span>`
  );
  jsxLines.push(`${ind(4)}</div>`);
  jsxLines.push(`${ind(3)})}`);
  jsxLines.push(`${ind(3)}{${notBlockedPrefix}!${names.loading} && ${names.items}.length > 0 && (`);
  jsxLines.push(`${ind(4)}<div className=${jsStringLiteral(CATEGORY_LIST_CLS)}>`);
  jsxLines.push(`${ind(5)}{${names.items}.map((item, index) => (`);
  jsxLines.push(`${ind(6)}<div key={item.id} className=${jsStringLiteral(CATEGORY_ITEM_WRAP_CLS)}>`);
  jsxLines.push(`${ind(7)}{${names.dropIndex} === index && ${names.dragIndexRef}.current !== index && (`);
  jsxLines.push(`${ind(8)}<div className=${jsStringLiteral(CATEGORY_DROP_LINE_CLS)} />`);
  jsxLines.push(`${ind(7)})}`);
  jsxLines.push(`${ind(7)}<div`);
  jsxLines.push(`${ind(8)}draggable`);
  jsxLines.push(`${ind(8)}onDragStart={() => ${names.dragStart}(index)}`);
  jsxLines.push(`${ind(8)}onDragOver={(e) => ${names.dragOver}(e, index)}`);
  jsxLines.push(`${ind(8)}onDragLeave={(e) => ${names.dragLeave}(e)}`);
  jsxLines.push(`${ind(8)}onDrop={(e) => ${names.drop}(e, index)}`);
  jsxLines.push(`${ind(8)}onClick={() => ${names.select}(item)}`);
  jsxLines.push(
    `${ind(8)}className={${isSelectedExpr} ? ${jsStringLiteral(categoryCardClass(true))} : ${jsStringLiteral(categoryCardClass(false))}}`
  );
  jsxLines.push(`${ind(7)}>`);
  jsxLines.push(`${ind(8)}{${isSelectedExpr} && (`);
  jsxLines.push(`${ind(9)}<div className=${jsStringLiteral(CATEGORY_ACCENT_BAR_CLS)} />`);
  jsxLines.push(`${ind(8)})}`);
  jsxLines.push(`${ind(8)}<div className=${jsStringLiteral(CATEGORY_CARD_BODY_CLS)}>`);
  jsxLines.push(
    `${ind(9)}<div className=${jsStringLiteral(categoryDragHandleClass(false))} onClick={(e) => e.stopPropagation()}>`
  );
  jsxLines.push(
    `${ind(10)}<GripVertical className={${isSelectedExpr} ? ${jsStringLiteral(categoryGripIconClass(true))} : ${jsStringLiteral(categoryGripIconClass(false))}} />`
  );
  jsxLines.push(
    `${ind(10)}<span className={${isSelectedExpr} ? ${jsStringLiteral(categoryOrderNumClass(true))} : ${jsStringLiteral(categoryOrderNumClass(false))}}>`
  );
  jsxLines.push(`${ind(11)}{index + 1}`);
  jsxLines.push(`${ind(10)}</span>`);
  jsxLines.push(`${ind(9)}</div>`);
  jsxLines.push(`${ind(9)}<div className=${jsStringLiteral(CATEGORY_CARD_MAIN_CLS)}>`);
  jsxLines.push(`${ind(10)}<div className=${jsStringLiteral(CATEGORY_CARD_ROW1_CLS)}>`);
  jsxLines.push(`${ind(11)}{item.code && (`);
  jsxLines.push(
    `${ind(12)}<span className={${isSelectedExpr} ? ${jsStringLiteral(categoryCodeBadgeClass(true))} : ${jsStringLiteral(categoryCodeBadgeClass(false))}}>`
  );
  jsxLines.push(`${ind(13)}{item.code}`);
  jsxLines.push(`${ind(12)}</span>`);
  jsxLines.push(`${ind(11)})}`);
  jsxLines.push(
    `${ind(11)}<span className={${isSelectedExpr} ? ${jsStringLiteral(categoryTitleClass(true))} : ${jsStringLiteral(categoryTitleClass(false))}}>`
  );
  jsxLines.push(`${ind(12)}{item.name}`);
  jsxLines.push(`${ind(11)}</span>`);
  jsxLines.push(
    `${ind(11)}<div className=${jsStringLiteral(CATEGORY_ACTIONS_WRAP_CLS)} onClick={(e) => e.stopPropagation()}>`
  );
  if (editEnabled) {
    jsxLines.push(`${ind(12)}<button`);
    jsxLines.push(`${ind(13)}onClick={() => ${names.edit}(item)}`);
    jsxLines.push(
      `${ind(13)}className={${isSelectedExpr} ? ${jsStringLiteral(categoryActionButtonClass(false, true))} : ${jsStringLiteral(categoryActionButtonClass(false, false))}}`
    );
    jsxLines.push(`${ind(13)}title={t('common.btn.edit')}`);
    jsxLines.push(`${ind(12)}>`);
    jsxLines.push(`${ind(13)}<Pencil className=${jsStringLiteral(CATEGORY_ACTION_ICON_CLS)} />`);
    jsxLines.push(`${ind(12)}</button>`);
  }
  if (detailEnabled) {
    jsxLines.push(`${ind(12)}<button`);
    jsxLines.push(`${ind(13)}onClick={() => ${names.detail}(item)}`);
    jsxLines.push(
      `${ind(13)}className={${isSelectedExpr} ? ${jsStringLiteral(categoryActionButtonClass(false, true))} : ${jsStringLiteral(categoryActionButtonClass(false, false))}}`
    );
    jsxLines.push(`${ind(13)}title={t('common.btn.detail')}`);
    jsxLines.push(`${ind(12)}>`);
    jsxLines.push(`${ind(13)}<Eye className=${jsStringLiteral(CATEGORY_ACTION_ICON_CLS)} />`);
    jsxLines.push(`${ind(12)}</button>`);
  }
  if (deleteEnabled) {
    jsxLines.push(`${ind(12)}<button`);
    jsxLines.push(`${ind(13)}onClick={() => ${names.delete}(item.id)}`);
    jsxLines.push(
      `${ind(13)}className={${isSelectedExpr} ? ${jsStringLiteral(categoryDeleteButtonClass(false, true))} : ${jsStringLiteral(categoryDeleteButtonClass(false, false))}}`
    );
    jsxLines.push(`${ind(13)}title={t('common.btn.delete')}`);
    jsxLines.push(`${ind(12)}>`);
    jsxLines.push(`${ind(13)}<Trash2 className=${jsStringLiteral(CATEGORY_ACTION_ICON_CLS)} />`);
    jsxLines.push(`${ind(12)}</button>`);
  }
  jsxLines.push(`${ind(11)}</div>`);
  jsxLines.push(`${ind(10)}</div>`);
  jsxLines.push(`${ind(10)}{item.description && (`);
  jsxLines.push(
    `${ind(11)}<p className={${isSelectedExpr} ? ${jsStringLiteral(categoryDescClass(true))} : ${jsStringLiteral(categoryDescClass(false))}}>`
  );
  jsxLines.push(`${ind(12)}{item.description}`);
  jsxLines.push(`${ind(11)}</p>`);
  jsxLines.push(`${ind(10)})}`);
  jsxLines.push(`${ind(9)}</div>`);
  jsxLines.push(`${ind(8)}</div>`);
  jsxLines.push(`${ind(7)}</div>`);
  jsxLines.push(`${ind(6)}</div>`);
  jsxLines.push(`${ind(5)}))}`);
  jsxLines.push(`${ind(5)}{${names.dropIndex} === ${names.items}.length && (`);
  jsxLines.push(`${ind(6)}<div className=${jsStringLiteral(CATEGORY_DROP_LINE_LAST_CLS)} />`);
  jsxLines.push(`${ind(5)})}`);
  jsxLines.push(`${ind(4)}</div>`);
  jsxLines.push(`${ind(3)})}`);
  jsxLines.push(`${ind(2)}</div>`);

  jsxLines.push(`${ind(1)}${emitContainerClose()}`);
  jsxLines.push(`</div>`);

  return { imports, helperLines, stateLines, handlerLines, jsxLines, unhandled: buildUnhandled(widget, parentBroken) };
};
