import type { TableWidget } from "../../components/builder/TableBuilder";
import type { SearchWidget } from "../../components/renderer/types";
import type { CellType, TableColumnConfig } from "../../types";
import type { ImportRequirement, WidgetCodeBlock, WidgetGenContext, UnhandledConfigKeys } from "../widgetGenerator";
import { jsStringLiteral, collectUnhandledKeys, emitContainerOpen, emitContainerClose } from "../widgetGenerator";
import {
  TABLE_COUNT_BAR_CLS,
  TABLE_THEAD_CLS,
  TABLE_HEADER_CELL_CLS,
  TABLE_HEADER_STATIC_TEXT_CLS,
  TABLE_TD_CLS,
  TABLE_TR_CLS,
  tableSortButtonClass,
  sortIconClass,
  PAGER_WRAP_CLS,
  PAGER_NAV_BTN_CLS,
  BADGE_BASE_CLS,
  BADGE_DOT_BASE_CLS,
  badgeShapeClass,
  DATE_CELL_CLS,
  TEXT_CELL_CLS,
} from "../../components/renderer/rendererStyles";

const PHASE1_CELL_TYPES = new Set<CellType>(["text", "badge", "boolean", "date"]);

const FORMAT_CELL_DATE_HELPER: string[] = [
  "function formatCellDate(rawVal: string, format?: string): string {",
  "    if (!rawVal) return '-';",
  "    if (!format) return rawVal;",
  "    const d = new Date(rawVal);",
  "    if (isNaN(d.getTime())) return rawVal;",
  "    const YYYY = String(d.getFullYear());",
  "    const MM = String(d.getMonth() + 1).padStart(2, '0');",
  "    const DD = String(d.getDate()).padStart(2, '0');",
  "    const HH = String(d.getHours()).padStart(2, '0');",
  "    const mm = String(d.getMinutes()).padStart(2, '0');",
  "    const ss = String(d.getSeconds()).padStart(2, '0');",
  "    return format.replace('YYYY', YYYY).replace('MM', MM).replace('DD', DD).replace('HH', HH).replace('mm', mm).replace('ss', ss);",
  "}",
];

const HANDLED_TABLE_WIDGET_KEYS = new Set([
  "type",
  "widgetId",
  "columns",
  "connectedSearchIds",
  "connectedSlug",
  "pageSize",
  "displayMode",
  "sourceFilter",
]);
const IGNORED_TABLE_WIDGET_KEYS = new Map<string, string>([
  [
    "contentKey",
    "생성 코드는 컴포넌트 로컬 state이므로 파라미터 네임스페이스가 필요 없음 — useWidgetPageState.ts:333-443 fetchTableData도 contentKey 인자를 받지 않음",
  ],
]);

const HANDLED_COLUMN_KEYS = new Set([
  "id",
  "header",
  "headerMsgKey",
  "accessor",
  "data",
  "width",
  "widthUnit",
  "align",
  "sortable",
  "cellType",
  "cellOptions",
  "showIcon",
  "badgeShape",
  "isNumber",
  "trueText",
  "trueTextMsgKey",
  "falseText",
  "falseTextMsgKey",
  "codeGroupCode",
  "displayAs",
  "dateFormat",
  "relationSlugId",
  "relationSlugIds",
]);
const IGNORED_COLUMN_KEYS = new Map<string, string>([
  [
    "fetchDisplayMode",
    "relationSlugId 연동 컬럼 전용 — 해당 컬럼은 hasUnsupportedRelation()으로 이미 unsupported 처리되어 supportedColumns에 들어오지 않음",
  ],
]);

const hasUnsupportedRelation = (col: TableColumnConfig): boolean =>
  !!col.relationSlugId || !!(col.relationSlugIds && col.relationSlugIds.length > 0);

const isColumnSupported = (col: TableColumnConfig): boolean =>
  PHASE1_CELL_TYPES.has(col.cellType) && !hasUnsupportedRelation(col);

const headerExprOf = (col: TableColumnConfig): string => {
  if (col.headerMsgKey) return `t(${jsStringLiteral(col.headerMsgKey)})`;
  if (col.header) return jsStringLiteral(col.header);
  if (col.cellType === "actions") return `t('common.label.action')`;
  return jsStringLiteral("—");
};

const pushHeaderCell = (
  jsxLines: string[],
  ind: (n: number) => string,
  col: TableColumnConfig,
  suffix: string
): void => {
  const widthStyle = col.width ? `, width: '${col.width}${col.widthUnit || "px"}'` : "";
  jsxLines.push(
    `${ind(2)}<th className=${jsStringLiteral(TABLE_HEADER_CELL_CLS)} style={{ textAlign: 'center'${widthStyle} }}>`
  );
  if (col.sortable) {
    const isCurrent = `sortKey${suffix} === '${col.accessor}'`;
    const sortedExpr = `${isCurrent} ? sortDir${suffix} : false`;
    jsxLines.push(
      `${ind(3)}<button onClick={() => handleSort${suffix}('${col.accessor}')} className=${jsStringLiteral(tableSortButtonClass(false))}>`
    );
    jsxLines.push(`${ind(4)}{${headerExprOf(col)}}`);
    jsxLines.push(
      `${ind(4)}{(${sortedExpr}) === 'asc' ? <ChevronUp className=${jsStringLiteral(sortIconClass("asc"))} /> : (${sortedExpr}) === 'desc' ? <ChevronDown className=${jsStringLiteral(sortIconClass("desc"))} /> : <ChevronsUpDown className=${jsStringLiteral(sortIconClass(false))} />}`
    );
    jsxLines.push(`${ind(3)}</button>`);
  } else {
    jsxLines.push(
      `${ind(3)}<span className=${jsStringLiteral(TABLE_HEADER_STATIC_TEXT_CLS)}>{${headerExprOf(col)}}</span>`
    );
  }
  jsxLines.push(`${ind(2)}</th>`);
};

const pushBodyCell = (jsxLines: string[], ind: (n: number) => string, col: TableColumnConfig): void => {
  const widthStyle = col.width ? `, width: '${col.width}${col.widthUnit || "px"}'` : "";
  jsxLines.push(
    `${ind(3)}<td className=${jsStringLiteral(TABLE_TD_CLS)} style={{ textAlign: '${col.align}'${widthStyle} }}>`
  );

  if (!isColumnSupported(col)) {
    const reason = hasUnsupportedRelation(col)
      ? `relationSlugId 연동 컬럼은 formatFetchedRelMulti 런타임 경로라 파일빌드에서 지원하지 않습니다.`
      : `cellType='${col.cellType}' 컬럼은 아직 코드 생성이 지원되지 않습니다.`;
    jsxLines.push(`${ind(4)}{/* TODO(파일빌드 Phase 2): ${reason} */}`);
    jsxLines.push(`${ind(4)}<span className="text-slate-300">-</span>`);
    jsxLines.push(`${ind(3)}</td>`);
    return;
  }

  const rawExpr = `row['${col.accessor}']`;
  const valueExpr = col.data
    ? `resolveEvalExprI18n(evalColumnDataExpr(${jsStringLiteral(col.data)}, row), t)`
    : rawExpr;

  jsxLines.push(`${ind(4)}{(() => {`);
  jsxLines.push(`${ind(5)}const value = ${valueExpr};`);

  switch (col.cellType) {
    case "text": {
      jsxLines.push(`${ind(5)}const strVal = value == null || typeof value === 'object' ? '' : String(value);`);
      if (col.codeGroupCode && col.displayAs !== "value") {
        const displayAsArg = col.displayAs ? jsStringLiteral(col.displayAs) : "undefined";
        jsxLines.push(
          `${ind(5)}const displayVal = resolveCodeLabel(strVal, ${jsStringLiteral(col.codeGroupCode)}, ${displayAsArg}, groups, t);`
        );
      } else if (col.isNumber) {
        jsxLines.push(
          `${ind(5)}const displayVal = strVal !== '' && !isNaN(Number(strVal)) ? Number(strVal).toLocaleString() : strVal;`
        );
      } else {
        jsxLines.push(`${ind(5)}const displayVal = strVal;`);
      }
      jsxLines.push(
        `${ind(5)}return <span className=${jsStringLiteral(TEXT_CELL_CLS)} title={displayVal}>{displayVal}</span>;`
      );
      break;
    }
    case "boolean": {
      const trueExpr = col.trueTextMsgKey
        ? `t(${jsStringLiteral(col.trueTextMsgKey)})`
        : col.trueText
          ? jsStringLiteral(col.trueText)
          : `t('common.label.public')`;
      const falseExpr = col.falseTextMsgKey
        ? `t(${jsStringLiteral(col.falseTextMsgKey)})`
        : col.falseText
          ? jsStringLiteral(col.falseText)
          : `t('common.label.private')`;
      jsxLines.push(`${ind(5)}const boolVal = Boolean(value);`);
      jsxLines.push(`${ind(5)}const boolText = boolVal ? ${trueExpr} : ${falseExpr};`);
      jsxLines.push(`${ind(5)}return <span className={booleanCellClass(boolVal)} title={boolText}>{boolText}</span>;`);
      break;
    }
    case "date": {
      jsxLines.push(
        `${ind(5)}const dateVal = formatCellDate(String(value ?? ''), ${col.dateFormat ? jsStringLiteral(col.dateFormat) : "undefined"});`
      );
      jsxLines.push(
        `${ind(5)}return <span className=${jsStringLiteral(DATE_CELL_CLS)} title={dateVal}>{dateVal}</span>;`
      );
      break;
    }
    case "badge": {
      if (col.cellOptions && col.cellOptions.length > 0) {
        const shapeCls = badgeShapeClass(col.badgeShape);
        const mapEntries = col.cellOptions
          .map((opt) => {
            const textExpr = opt.textMsgKey ? `t(${jsStringLiteral(opt.textMsgKey)})` : jsStringLiteral(opt.text);
            return `[${jsStringLiteral(opt.value)}]: { text: ${textExpr}, color: ${jsStringLiteral(opt.color)} }`;
          })
          .join(", ");
        jsxLines.push(`${ind(5)}const m: Record<string, { text: string; color: string }> = { ${mapEntries} };`);
        jsxLines.push(`${ind(5)}const v = String(value ?? '');`);
        jsxLines.push(`${ind(5)}const b = m[v];`);
        jsxLines.push(`${ind(5)}if (!b) return <span className="text-sm text-slate-600">{v}</span>;`);
        jsxLines.push(
          `${ind(5)}return <span className={\`${BADGE_BASE_CLS} ${shapeCls} \${BADGE_CLS[b.color] || BADGE_CLS.slate}\`}>${col.showIcon ? `<span className={\`${BADGE_DOT_BASE_CLS} \${BADGE_DOT[b.color] || BADGE_DOT.slate}\`} />` : ""}{b.text}</span>;`
        );
      } else {
        jsxLines.push(`${ind(5)}return <span className="text-sm text-slate-600">{String(value ?? '')}</span>;`);
      }
      break;
    }
    default:
      jsxLines.push(`${ind(5)}return null;`);
      break;
  }
  jsxLines.push(`${ind(4)}})()}`);
  jsxLines.push(`${ind(3)}</td>`);
};

const buildUnhandled = (widget: TableWidget, supportedColumns: TableColumnConfig[]): UnhandledConfigKeys[] => {
  const widgetUnhandled = collectUnhandledKeys(
    widget as unknown as Record<string, unknown>,
    HANDLED_TABLE_WIDGET_KEYS,
    new Set(IGNORED_TABLE_WIDGET_KEYS.keys())
  );
  const ignoredColumnKeySet = new Set(IGNORED_COLUMN_KEYS.keys());
  const columnUnhandledSet = new Set<string>();
  supportedColumns.forEach((col) => {
    collectUnhandledKeys(col as unknown as Record<string, unknown>, HANDLED_COLUMN_KEYS, ignoredColumnKeySet).forEach(
      (k) => columnUnhandledSet.add(k)
    );
  });
  return [
    { scope: "widget", keys: widgetUnhandled },
    { scope: "column", keys: [...columnUnhandledSet] },
  ];
};

export const generateTableBlock = (widget: TableWidget, ctx: WidgetGenContext): WidgetCodeBlock => {
  const { suffix, ind, allWidgets, suffixOf, mainConnectedSlug, isEntity } = ctx;
  const rowsVar = `rows${suffix}`;
  const setRowsVar = `setRows${suffix}`;
  const totalVar = `total${suffix}`;
  const setTotalVar = `setTotal${suffix}`;
  const pageVar = `page${suffix}`;
  const setPageVar = `setPage${suffix}`;
  const loadingVar = `loading${suffix}`;
  const setLoadingVar = `setLoading${suffix}`;
  const sortKeyVar = `sortKey${suffix}`;
  const setSortKeyVar = `setSortKey${suffix}`;
  const sortDirVar = `sortDir${suffix}`;
  const setSortDirVar = `setSortDir${suffix}`;
  const dataSlugVar = `dataSlug${suffix}`;
  const resolvedSortKeyVar = `resolvedSortKey${suffix}`;
  const sortExprMapVar = `SORT_EXPR${suffix}`;
  const fetchFn = `fetchData${suffix}`;

  const resolvedSlug = widget.connectedSlug || mainConnectedSlug || "";
  const columns = widget.columns || [];
  const supportedColumns = columns.filter(isColumnSupported);
  const isPagination = widget.displayMode !== "scroll";
  const needsSort = columns.some((c) => c.sortable);
  const needsDateFormat = columns.some((c) => c.cellType === "date");
  const needsDataExpr = supportedColumns.some((c) => !!c.data);
  const needsCodeGroup = supportedColumns.some(
    (c) => c.cellType === "text" && !!c.codeGroupCode && c.displayAs !== "value"
  );
  const needsBadge = supportedColumns.some((c) => c.cellType === "badge" && !!c.cellOptions?.length);
  const needsBoolean = supportedColumns.some((c) => c.cellType === "boolean");
  const sortExprEntries = !isEntity ? columns.filter((c) => c.sortable && !!c.data) : [];
  const needsSortExpr = needsSort && sortExprEntries.length > 0;

  const imports: ImportRequirement[] = [
    { module: "@/lib/api", defaultName: "api" },
    { module: "sonner", named: ["toast"] },
    {
      module: "@/app/admin/templates/make/_shared/utils",
      named: ["flattenPageDataItem", "nextSortDir", "pageGroupRange"],
    },
    { module: "@/hooks/use-i18n", named: ["useI18n"] },
  ];
  if (needsSort) imports.push({ module: "lucide-react", named: ["ChevronUp", "ChevronDown", "ChevronsUpDown"] });
  if (isEntity) {
    imports.push({
      module: "@/app/admin/templates/make/_shared/utils/entityApi",
      named: ["entityApiPath", "normalizeEntityRow", "normalizeEntityPageEnvelope"],
    });
  }
  if (needsDataExpr) {
    imports.push({
      module: "@/app/admin/templates/make/_shared/utils",
      named: ["evalColumnDataExpr", "resolveEvalExprI18n"],
    });
  }
  if (needsCodeGroup) {
    imports.push({ module: "@/app/admin/templates/make/_shared/utils", named: ["resolveCodeLabel"] });
    imports.push({ module: "@/store/use-code-store", named: ["useCodeStore"] });
  }
  if (needsBadge) {
    imports.push({
      module: "@/app/admin/templates/make/_shared/components/renderer/rendererStyles",
      named: ["BADGE_CLS", "BADGE_DOT"],
    });
  }
  if (isPagination) {
    imports.push({
      module: "@/app/admin/templates/make/_shared/components/renderer/rendererStyles",
      named: ["pagerNumberBtnClass"],
    });
  }
  if (needsBoolean) {
    imports.push({
      module: "@/app/admin/templates/make/_shared/components/renderer/rendererStyles",
      named: ["booleanCellClass"],
    });
  }

  const searchWidgetIds = new Set(
    (allWidgets.filter((w) => w.type === "search") as SearchWidget[]).map((w) => w.widgetId)
  );
  const linkedSearchSuffixes: string[] = [];
  const brokenSearchIds: string[] = [];
  (widget.connectedSearchIds || []).forEach((id) => {
    if (searchWidgetIds.has(id)) linkedSearchSuffixes.push(suffixOf(id));
    else brokenSearchIds.push(id);
  });

  const stateLines: string[] = [];
  stateLines.push(`${ind(1)}const { t } = useI18n();`);
  if (needsCodeGroup) {
    stateLines.push(`${ind(1)}const { groups, fetchGroups } = useCodeStore();`);
    stateLines.push(`${ind(1)}useEffect(() => { fetchGroups(); }, [fetchGroups]);`);
  }
  stateLines.push(`${ind(1)}const [${rowsVar}, ${setRowsVar}] = useState<Record<string, unknown>[]>([]);`);
  stateLines.push(`${ind(1)}const [${totalVar}, ${setTotalVar}] = useState(0);`);
  stateLines.push(`${ind(1)}const [${pageVar}, ${setPageVar}] = useState(0);`);
  stateLines.push(`${ind(1)}const [${loadingVar}, ${setLoadingVar}] = useState(false);`);
  if (isPagination) {
    stateLines.push(`${ind(1)}const [totalPages${suffix}, setTotalPages${suffix}] = useState(0);`);
  } else {
    stateLines.push(`${ind(1)}const [hasMore${suffix}, setHasMore${suffix}] = useState(true);`);
  }
  if (needsSort) {
    stateLines.push(`${ind(1)}const [${sortKeyVar}, ${setSortKeyVar}] = useState<string | null>(null);`);
    stateLines.push(`${ind(1)}const [${sortDirVar}, ${setSortDirVar}] = useState<'asc' | 'desc'>('asc');`);
  }
  stateLines.push(`${ind(1)}const ${dataSlugVar} = ${jsStringLiteral(resolvedSlug)};`);

  const helperLines = needsDateFormat ? [...FORMAT_CELL_DATE_HELPER] : [];
  if (needsSortExpr) {
    const entries = sortExprEntries.map((c) => `${jsStringLiteral(c.accessor)}: ${jsStringLiteral(c.data as string)}`);
    helperLines.push(`const ${sortExprMapVar}: Record<string, string> = { ${entries.join(", ")} };`);
  }

  const handlerLines: string[] = [];
  if (brokenSearchIds.length > 0) {
    handlerLines.push(
      `${ind(1)}/* TODO(파일빌드): Table '${suffix}'에 연결된 Search 위젯(${brokenSearchIds.join(", ")})이 이 페이지에 없습니다. 참조가 끊어졌습니다. */`
    );
  }
  handlerLines.push(
    `${ind(1)}const ${fetchFn} = async (page: number, notify = false, searchOverrides?: Record<string, Record<string, string>>, sortOverride?: { sk: string | null; sd: 'asc' | 'desc' }) => {`
  );
  handlerLines.push(`${ind(2)}if (!${dataSlugVar}) { if (notify) toast.error(t('common.error.load_data')); return; }`);
  handlerLines.push(`${ind(2)}${setLoadingVar}(true);`);
  handlerLines.push(`${ind(2)}try {`);
  if (needsSort) {
    handlerLines.push(`${ind(3)}const sk = sortOverride ? sortOverride.sk : ${sortKeyVar};`);
    handlerLines.push(`${ind(3)}const sd = sortOverride ? sortOverride.sd : ${sortDirVar};`);
    handlerLines.push(`${ind(3)}let ${resolvedSortKeyVar}: string | null = sk;`);
    handlerLines.push(`${ind(3)}if (sk) {`);
    handlerLines.push(`${ind(4)}for (const r of ${rowsVar}) {`);
    handlerLines.push(`${ind(5)}const pathMap = r._pathMap as Record<string, string> | undefined;`);
    handlerLines.push(`${ind(5)}if (pathMap?.[sk]) { ${resolvedSortKeyVar} = pathMap[sk]; break; }`);
    handlerLines.push(`${ind(4)}}`);
    handlerLines.push(`${ind(3)}}`);
  }
  const urlExpr = isEntity ? `entityApiPath(${dataSlugVar})` : `'/page-data/' + ${dataSlugVar}`;
  handlerLines.push(`${ind(3)}const res = await api.get(${urlExpr}, {`);
  handlerLines.push(`${ind(4)}params: {`);
  handlerLines.push(`${ind(5)}page, size: ${widget.pageSize || 10},`);
  if (needsSort)
    handlerLines.push(`${ind(5)}...(${resolvedSortKeyVar} ? { sort: ${resolvedSortKeyVar} + ',' + sd } : {}),`);
  if (needsSortExpr)
    handlerLines.push(`${ind(5)}...(sk && ${sortExprMapVar}[sk] ? { sortExpr: ${sortExprMapVar}[sk] } : {}),`);
  linkedSearchSuffixes.forEach((searchSuffix) => {
    handlerLines.push(
      `${ind(5)}...getSearchParams${searchSuffix}(searchOverrides?.[${jsStringLiteral(searchSuffix)}]),`
    );
  });
  if (widget.sourceFilter && !isEntity)
    handlerLines.push(`${ind(5)}filterExpr: ${jsStringLiteral(widget.sourceFilter)},`);
  handlerLines.push(`${ind(4)}},`);
  handlerLines.push(`${ind(3)}});`);
  if (isEntity) {
    handlerLines.push(`${ind(3)}const envelope = normalizeEntityPageEnvelope(res.data);`);
    handlerLines.push(
      `${ind(3)}const items = (envelope.content as Record<string, unknown>[]).map(normalizeEntityRow);`
    );
    handlerLines.push(`${ind(3)}${setRowsVar}(items);`);
    handlerLines.push(`${ind(3)}${setTotalVar}(envelope.totalElements ?? items.length);`);
    if (isPagination) {
      handlerLines.push(`${ind(3)}setTotalPages${suffix}(envelope.totalPages ?? 1);`);
    } else {
      handlerLines.push(`${ind(3)}setHasMore${suffix}(page < (envelope.totalPages ?? 1) - 1);`);
    }
  } else {
    handlerLines.push(
      `${ind(3)}const items = (res.data.content as { id: number; groupId?: string | null; dataJson: Record<string, unknown>; createdAt?: string | null; createdBy?: string | null; updatedAt?: string | null; updatedBy?: string | null }[])`
    );
    handlerLines.push(`${ind(4)}.map(flattenPageDataItem);`);
    handlerLines.push(`${ind(3)}${setRowsVar}(items);`);
    handlerLines.push(`${ind(3)}${setTotalVar}(res.data.totalElements ?? items.length);`);
    if (isPagination) {
      handlerLines.push(`${ind(3)}setTotalPages${suffix}(res.data.totalPages ?? 1);`);
    } else {
      handlerLines.push(`${ind(3)}setHasMore${suffix}(page < (res.data.totalPages ?? 1) - 1);`);
    }
  }
  handlerLines.push(`${ind(3)}${setPageVar}(page);`);
  if (needsSort) {
    handlerLines.push(`${ind(3)}if (sortOverride) {`);
    handlerLines.push(`${ind(4)}${setSortKeyVar}(sortOverride.sk);`);
    handlerLines.push(`${ind(4)}if (sortOverride.sk !== null) ${setSortDirVar}(sortOverride.sd);`);
    handlerLines.push(`${ind(3)}}`);
  }
  handlerLines.push(`${ind(2)}} catch (err) {`);
  handlerLines.push(`${ind(3)}console.error('데이터 조회 오류:', err);`);
  handlerLines.push(`${ind(3)}toast.error(t('common.error.load_data'));`);
  handlerLines.push(`${ind(2)}} finally {`);
  handlerLines.push(`${ind(3)}${setLoadingVar}(false);`);
  handlerLines.push(`${ind(2)}}`);
  handlerLines.push(`${ind(1)}};`);
  handlerLines.push("");
  handlerLines.push(`${ind(1)}useEffect(() => { ${fetchFn}(0); }, []);`);
  handlerLines.push("");

  if (needsSort) {
    handlerLines.push(`${ind(1)}const handleSort${suffix} = (accessor: string) => {`);
    handlerLines.push(`${ind(2)}const isCurrentCol = ${sortKeyVar} === accessor;`);
    handlerLines.push(`${ind(2)}const dir = nextSortDir(isCurrentCol, isCurrentCol ? ${sortDirVar} : null);`);
    handlerLines.push(
      `${ind(2)}${fetchFn}(0, false, undefined, { sk: dir === null ? null : accessor, sd: dir ?? 'asc' });`
    );
    handlerLines.push(`${ind(1)}};`);
    handlerLines.push("");
  }

  const jsxLines: string[] = [];
  jsxLines.push(emitContainerOpen({ className: "bg-white" }));
  jsxLines.push(`${ind(1)}<div className=${jsStringLiteral(TABLE_COUNT_BAR_CLS)}>`);
  jsxLines.push(
    `${ind(2)}<p className="text-xs text-slate-500">{t('common.pagination.total', { count: ${totalVar}.toLocaleString() })}</p>`
  );
  if (isPagination) {
    jsxLines.push(
      `${ind(2)}<p className="text-xs text-slate-400">{${totalVar} > 0 ? t('common.pagination.showing', { start: String(${pageVar} * ${widget.pageSize || 10} + 1), end: String(Math.min((${pageVar} + 1) * ${widget.pageSize || 10}, ${totalVar})) }) : ''}</p>`
    );
  } else {
    jsxLines.push(
      `${ind(2)}<p className="text-xs text-slate-400">{${totalVar} > 0 ? t('common.pagination.showing', { start: '1', end: String(Math.min((${pageVar} + 1) * ${widget.pageSize || 10}, ${totalVar})) }) : ''}</p>`
    );
  }
  jsxLines.push(`${ind(1)}</div>`);
  jsxLines.push(`${ind(1)}<div className="overflow-x-auto">`);
  jsxLines.push(`${ind(2)}<table className="w-full text-sm">`);
  jsxLines.push(
    `${ind(3)}<thead className=${jsStringLiteral(TABLE_THEAD_CLS)}><tr className="border-b border-slate-200 bg-slate-50/80">`
  );
  columns.forEach((col) => pushHeaderCell(jsxLines, ind, col, suffix));
  jsxLines.push(`${ind(3)}</tr></thead>`);
  jsxLines.push(`${ind(3)}<tbody>`);
  jsxLines.push(`${ind(4)}{${loadingVar} ? (`);
  jsxLines.push(
    `${ind(5)}<tr><td colSpan={${columns.length}} className="py-16 text-center text-sm text-slate-400">{t('common.table.loading')}</td></tr>`
  );
  jsxLines.push(`${ind(4)}) : ${rowsVar}.length === 0 ? (`);
  jsxLines.push(
    `${ind(5)}<tr><td colSpan={${columns.length}} className="py-16 text-center text-sm text-slate-400">{t('common.table.no_data')}</td></tr>`
  );
  jsxLines.push(`${ind(4)}) : ${rowsVar}.map((row, idx) => (`);
  jsxLines.push(`${ind(5)}<tr key={idx} className=${jsStringLiteral(TABLE_TR_CLS)}>`);
  columns.forEach((col) => pushBodyCell(jsxLines, ind, col));
  jsxLines.push(`${ind(5)}</tr>`);
  jsxLines.push(`${ind(4)}))}`);
  jsxLines.push(`${ind(3)}</tbody>`);
  jsxLines.push(`${ind(2)}</table>`);
  jsxLines.push(`${ind(1)}</div>`);

  if (isPagination) {
    jsxLines.push(`${ind(1)}{totalPages${suffix} >= 1 && (`);
    jsxLines.push(`${ind(2)}<div className=${jsStringLiteral(PAGER_WRAP_CLS)}>`);
    jsxLines.push(
      `${ind(3)}<button disabled={${pageVar} === 0} onClick={() => ${fetchFn}(${pageVar} - 1)} className=${jsStringLiteral(PAGER_NAV_BTN_CLS)}>{t('common.btn.prev')}</button>`
    );
    jsxLines.push(
      `${ind(3)}{pageGroupRange(${pageVar}, totalPages${suffix}).map((p) => (<button key={p} onClick={() => ${fetchFn}(p)} className={pagerNumberBtnClass(${pageVar} === p)}>{p + 1}</button>))}`
    );
    jsxLines.push(
      `${ind(3)}<button disabled={${pageVar} >= totalPages${suffix} - 1} onClick={() => ${fetchFn}(${pageVar} + 1)} className=${jsStringLiteral(PAGER_NAV_BTN_CLS)}>{t('common.btn.next')}</button>`
    );
    jsxLines.push(`${ind(2)}</div>`);
    jsxLines.push(`${ind(1)})}`);
  } else {
    jsxLines.push(
      `${ind(1)}{hasMore${suffix} && <div className="py-4 text-center text-xs text-slate-400">{t('common.table.loading')}</div>}`
    );
  }
  jsxLines.push(emitContainerClose());

  return {
    imports,
    helperLines,
    stateLines,
    handlerLines,
    jsxLines,
    unhandled: buildUnhandled(widget, supportedColumns),
  };
};
