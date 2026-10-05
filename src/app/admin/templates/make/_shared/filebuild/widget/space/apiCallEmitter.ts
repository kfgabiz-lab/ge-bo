import type { SearchFieldConfig } from "../../../types";
import type { SearchWidget } from "../../../components/renderer/types";
import type { TableWidget } from "../../../components/builder/TableBuilder";
import type { ImportRequirement, WidgetGenContext } from "../../widgetGenerator";
import { parseActionParams, buildDateRangeStatusSortExpr } from "../../../utils";

const UTILS_MODULE = "@/app/admin/templates/make/_shared/utils";
const API_INFO_OPTION_MODULE = "@/app/admin/templates/make/_shared/components/builder/fields/ApiInfoSelectField";

export interface ApiCallEmitResult {
  handlerLines: string[];
  helperLines: string[];
  stateLines: string[];
  imports: ImportRequirement[];
  todo?: string;
}

export interface ApiCallEmitOptions {
  ctx: WidgetGenContext;
  fnName: string;
  item: SearchFieldConfig;
}

const PARSE_CONTENT_DISPOSITION_HELPER: string[] = [
  "function parseContentDispositionFilename(disposition?: string): string | null {",
  "    if (!disposition) return null;",
  "    const utf8Match = /filename\\*=UTF-8''([^;]+)/i.exec(disposition);",
  "    if (utf8Match) {",
  "        try {",
  "            return decodeURIComponent(utf8Match[1].trim());",
  "        } catch {",
  "            return utf8Match[1].trim();",
  "        }",
  "    }",
  '    const basicMatch = /filename="?([^";]+)"?/i.exec(disposition);',
  "    return basicMatch ? basicMatch[1].trim() : null;",
  "}",
];

const buildSearchParamsExpr = (ctx: WidgetGenContext): string => {
  const searchWidgets = ctx.allWidgets.filter((w) => w.type === "search") as SearchWidget[];
  if (searchWidgets.length === 0) return "{}";
  const spreads = searchWidgets.map((w) => `...getSearchParams${ctx.suffixOf(w.widgetId)}()`);
  return `{ ${spreads.join(", ")} }`;
};

const buildTableSortLines = (
  ctx: WidgetGenContext,
  ind: (n: number) => string,
  level: number
): { lines: string[]; imports: ImportRequirement[]; expr: string } => {
  const firstTable = ctx.allWidgets.find((w) => w.type === "table") as TableWidget | undefined;
  const columns = firstTable?.columns ?? [];
  const sortable = columns.some((c) => c.sortable);
  if (!firstTable || !sortable) return { lines: [], imports: [], expr: "{}" };

  const tableSuffix = ctx.suffixOf(firstTable.widgetId);
  const sortKeyVar = `sortKey${tableSuffix}`;
  const sortDirVar = `sortDir${tableSuffix}`;
  const sortExprEntries = !ctx.isEntity
    ? columns.filter((c) => c.sortable && (!!c.data || !!buildDateRangeStatusSortExpr(c)))
    : [];
  const needsSortExpr = sortExprEntries.length > 0;
  const columnsLiteral = JSON.stringify(
    columns.map((c) => ({
      accessor: c.accessor,
      relationSlugId: c.relationSlugId,
      relationSlugIds: c.relationSlugIds,
    }))
  );

  const lines: string[] = [];
  lines.push(`${ind(level)}const currentTableSortParams: Record<string, string> = {};`);
  lines.push(`${ind(level)}if (${sortKeyVar}) {`);
  lines.push(
    `${ind(level + 1)}currentTableSortParams.sort = \`\${resolveFetchSortKey(${columnsLiteral}, ${sortKeyVar})},\${${sortDirVar}}\`;`
  );
  if (needsSortExpr) {
    lines.push(
      `${ind(level + 1)}if (SORT_EXPR${tableSuffix}[${sortKeyVar}]) currentTableSortParams.sortExpr = SORT_EXPR${tableSuffix}[${sortKeyVar}];`
    );
  }
  lines.push(`${ind(level)}}`);

  return {
    lines,
    imports: [{ module: UTILS_MODULE, named: ["resolveFetchSortKey"] }],
    expr: "currentTableSortParams",
  };
};

export const emitApiCallHandler = (o: ApiCallEmitOptions): ApiCallEmitResult => {
  const { ctx, fnName, item } = o;
  const { ind } = ctx;

  if (item.apiInfoId == null) {
    return {
      handlerLines: [],
      helperLines: [],
      stateLines: [],
      imports: [],
      todo: "connType='api'에서 apiInfoId 미선택 시(mode1, 컨텐츠 위젯 직접 저장) 동작은 아직 코드 생성이 지원되지 않습니다.",
    };
  }

  if ((item.connectedContentWidgetIds ?? []).length > 0) {
    return {
      handlerLines: [],
      helperLines: [],
      stateLines: [],
      imports: [],
      todo: "connType='api'에 연결된 컨텐츠 위젯이 있는 요청 바디 조립은 아직 코드 생성이 지원되지 않습니다.",
    };
  }

  const imports: ImportRequirement[] = [
    { module: "@/lib/api", defaultName: "api", named: ["getApiErrorMessage"] },
    { module: "sonner", named: ["toast"] },
    { module: API_INFO_OPTION_MODULE, named: ["ApiInfoOption"], typeOnly: true },
  ];

  const stateLines: string[] = [
    `${ind(1)}const [apiInfoOptions, setApiInfoOptions] = useState<ApiInfoOption[]>([]);`,
    `${ind(1)}useEffect(() => { api.get('/api-infos/active').then((res) => setApiInfoOptions(res.data || [])).catch(() => {}); }, []);`,
  ];

  const parsedParams = parseActionParams(item.params, {});
  const includeSearchParams = !!item.apiIncludeSearchParams;
  const downloadFile = !!item.apiDownloadFile;

  const helperLines: string[] = [];
  if (downloadFile) helperLines.push(...PARSE_CONTENT_DISPOSITION_HELPER);

  const handlerLines: string[] = [];
  handlerLines.push(`${ind(1)}const ${fnName} = async () => {`);
  handlerLines.push(`${ind(2)}const apiInfo = apiInfoOptions.find((a) => a.id === ${item.apiInfoId});`);
  handlerLines.push(`${ind(2)}if (!apiInfo) {`);
  handlerLines.push(`${ind(3)}toast.error('연결된 API를 찾을 수 없습니다. 관리자에게 문의해 주세요.');`);
  handlerLines.push(`${ind(3)}return;`);
  handlerLines.push(`${ind(2)}}`);
  handlerLines.push(`${ind(2)}const restParams: Record<string, string> = ${JSON.stringify(parsedParams)};`);
  handlerLines.push(
    `${ind(2)}let url = apiInfo.urlPattern.startsWith('/api/v1') ? apiInfo.urlPattern.slice('/api/v1'.length) : apiInfo.urlPattern;`
  );
  handlerLines.push(`${ind(2)}url = url.replace(/\\{([^}]+)\\}/g, (matched, key: string) => {`);
  handlerLines.push(`${ind(3)}if (!(key in restParams)) return matched;`);
  handlerLines.push(`${ind(3)}const val = restParams[key];`);
  handlerLines.push(`${ind(3)}delete restParams[key];`);
  handlerLines.push(`${ind(3)}return encodeURIComponent(val);`);
  handlerLines.push(`${ind(2)}});`);

  let finalParamsExpr = "restParams";
  if (includeSearchParams) {
    const searchParamsExpr = buildSearchParamsExpr(ctx);
    const tableSort = buildTableSortLines(ctx, ind, 2);
    tableSort.imports.forEach((i) => imports.push(i));
    handlerLines.push(`${ind(2)}const currentSearchParams: Record<string, string> = ${searchParamsExpr};`);
    tableSort.lines.forEach((l) => handlerLines.push(l));
    finalParamsExpr = `{ ...currentSearchParams, ...${tableSort.expr}, ...restParams }`;
  }
  handlerLines.push(`${ind(2)}const finalParams: Record<string, string> = ${finalParamsExpr};`);
  handlerLines.push(`${ind(2)}const method = (apiInfo.method || 'GET').toUpperCase();`);
  handlerLines.push(`${ind(2)}try {`);
  if (downloadFile) {
    handlerLines.push(`${ind(3)}const res = await api.request({`);
    handlerLines.push(`${ind(4)}method,`);
    handlerLines.push(`${ind(4)}url,`);
    handlerLines.push(`${ind(4)}responseType: 'blob',`);
    handlerLines.push(
      `${ind(4)}...(method === 'GET' || method === 'DELETE' ? { params: finalParams } : { data: finalParams }),`
    );
    handlerLines.push(`${ind(3)}});`);
    handlerLines.push(`${ind(3)}const disposition = res.headers?.['content-disposition'] as string | undefined;`);
    handlerLines.push(
      `${ind(3)}const filename = parseContentDispositionFilename(disposition) ?? \`\${apiInfo.name || 'download'}.xlsx\`;`
    );
    handlerLines.push(`${ind(3)}const blobUrl = URL.createObjectURL(res.data);`);
    handlerLines.push(`${ind(3)}const a = document.createElement('a');`);
    handlerLines.push(`${ind(3)}a.href = blobUrl;`);
    handlerLines.push(`${ind(3)}a.download = filename;`);
    handlerLines.push(`${ind(3)}document.body.appendChild(a);`);
    handlerLines.push(`${ind(3)}a.click();`);
    handlerLines.push(`${ind(3)}document.body.removeChild(a);`);
    handlerLines.push(`${ind(3)}URL.revokeObjectURL(blobUrl);`);
  } else {
    handlerLines.push(`${ind(3)}if (method === 'GET' || method === 'DELETE') {`);
    handlerLines.push(`${ind(4)}await api.request({ method, url, params: finalParams });`);
    handlerLines.push(`${ind(3)}} else {`);
    handlerLines.push(`${ind(4)}await api.request({ method, url, data: finalParams });`);
    handlerLines.push(`${ind(3)}}`);
    handlerLines.push(`${ind(3)}toast.success(\`\${apiInfo.name} 요청이 완료되었습니다.\`);`);
  }
  handlerLines.push(`${ind(2)}} catch (err) {`);
  handlerLines.push(`${ind(3)}toast.error(getApiErrorMessage(err, '요청을 실행할 수 없습니다.'));`);
  handlerLines.push(`${ind(2)}}`);
  handlerLines.push(`${ind(1)}};`);
  handlerLines.push("");

  return { handlerLines, helperLines, stateLines, imports };
};
