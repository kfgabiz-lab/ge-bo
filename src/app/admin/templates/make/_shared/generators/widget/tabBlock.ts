import type { TabItem, TabWidget } from "../../components/renderer/types";
import type { ImportRequirement, WidgetCodeBlock, WidgetGenContext, UnhandledConfigKeys } from "../widgetGenerator";
import { jsStringLiteral, collectUnhandledKeys, emitGridItems, tabVarNames } from "../widgetGenerator";
import {
  TAB_CONTAINER_CLS,
  TAB_BAR_CLS,
  TAB_PANEL_WRAP_CLS,
  TAB_PANEL_ACTIVE_CLS,
  TAB_PANEL_HIDDEN_CLS,
  tabButtonClass,
  GENERATED_UNSUPPORTED_WIDGET_CLS,
} from "../../components/renderer/rendererStyles";

const HANDLED_WIDGET_KEYS = new Set(["type", "widgetId", "tabs"]);
const IGNORED_WIDGET_KEYS = new Map<string, string>();

const HANDLED_TAB_KEYS = new Set(["id", "label", "labelMsgKey", "pageSlug", "contentKey", "required"]);

const IGNORED_TAB_KEYS = new Map<string, string>([
  [
    "items",
    "TabRenderer의 PreviewTabPanel 전용 인라인 위젯 목록 — live 모드(LiveTabPanel)는 pageSlug로만 서브페이지를 로드하므로 운영 산출물과 무관",
  ],
]);

const buildUnhandled = (widget: TabWidget): UnhandledConfigKeys[] => {
  const widgetUnhandled = collectUnhandledKeys(
    widget as unknown as Record<string, unknown>,
    HANDLED_WIDGET_KEYS,
    new Set(IGNORED_WIDGET_KEYS.keys())
  );
  const ignoredTabKeySet = new Set(IGNORED_TAB_KEYS.keys());
  const tabUnhandledSet = new Set<string>();
  (widget.tabs ?? []).forEach((tab) => {
    collectUnhandledKeys(tab as unknown as Record<string, unknown>, HANDLED_TAB_KEYS, ignoredTabKeySet).forEach((k) =>
      tabUnhandledSet.add(k)
    );
  });
  return [
    { scope: "widget", keys: widgetUnhandled },
    { scope: "field", keys: [...tabUnhandledSet] },
  ];
};

const tabLabelExpr = (tab: TabItem, idx: number): string =>
  tab.labelMsgKey
    ? `t(${jsStringLiteral(tab.labelMsgKey)})`
    : tab.label
      ? jsStringLiteral(tab.label)
      : `t('common.tab.default_label', { n: '${idx + 1}' })`;

export const generateTabBlock = (widget: TabWidget, ctx: WidgetGenContext): WidgetCodeBlock => {
  const { ind, suffix, tabPanels, blockOf } = ctx;
  const tabs = widget.tabs ?? [];

  const imports: ImportRequirement[] = [];
  const helperLines: string[] = [];
  const stateLines: string[] = [];
  const handlerLines: string[] = [];
  const jsxLines: string[] = [];

  if (tabs.length === 0) {
    jsxLines.push(`{/* TODO(파일빌드): 이 탭 위젯에는 탭이 없습니다. 빌더에서 탭을 추가한 뒤 다시 생성해주세요. */}`);
    jsxLines.push(`<div className=${jsStringLiteral(GENERATED_UNSUPPORTED_WIDGET_CLS)} />`);
    return { imports, helperLines, stateLines, handlerLines, jsxLines, unhandled: buildUnhandled(widget) };
  }

  const vars = tabVarNames(suffix);
  const requiredGuardActive = tabs[0]?.required === true;
  const needsI18n = requiredGuardActive || tabs.some((tab) => !!tab.labelMsgKey || !tab.label);

  stateLines.push(`${ind(1)}const [${vars.active}, ${vars.setActive}] = useState(0);`);
  if (needsI18n) {
    imports.push({ module: "@/hooks/use-i18n", named: ["useI18n"] });
    stateLines.push(`${ind(1)}const { t } = useI18n();`);
  }

  if (requiredGuardActive) {
    imports.push({ module: "sonner", named: ["toast"] });
    imports.push({ module: "next/navigation", named: ["useSearchParams"] });
    stateLines.push(`${ind(1)}const searchParams = useSearchParams();`);
    stateLines.push(`${ind(1)}const storedId = searchParams.get('id') ? Number(searchParams.get('id')) : null;`);
    stateLines.push(
      `${ind(1)}const [${vars.savedTabs}, ${vars.setSavedTabs}] = useState<Set<number>>(() => new Set(storedId !== null ? [0] : []));`
    );
    handlerLines.push(`${ind(1)}const ${vars.handleClick} = (idx: number) => {`);
    handlerLines.push(`${ind(2)}if (idx > 0 && !${vars.savedTabs}.has(0)) {`);
    handlerLines.push(`${ind(3)}toast.warning(t('common.tab.save_required', { tab: ${tabLabelExpr(tabs[0], 0)} }));`);
    handlerLines.push(`${ind(3)}return;`);
    handlerLines.push(`${ind(2)}}`);
    handlerLines.push(`${ind(2)}${vars.setActive}(idx);`);
    handlerLines.push(`${ind(1)}};`);
  }

  const plans = tabPanels ?? [];
  const resolveBlock = blockOf ?? (() => undefined);

  jsxLines.push(`<div className=${jsStringLiteral(TAB_CONTAINER_CLS)}>`);
  jsxLines.push(`${ind(1)}<div className=${jsStringLiteral(TAB_BAR_CLS)}>`);
  tabs.forEach((tab, idx) => {
    const labelExpr = tabLabelExpr(tab, idx);
    jsxLines.push(`${ind(2)}<button`);
    jsxLines.push(`${ind(3)}type="button"`);
    jsxLines.push(`${ind(3)}onClick={() => ${requiredGuardActive ? vars.handleClick : vars.setActive}(${idx})}`);
    jsxLines.push(
      `${ind(3)}className={${vars.active} === ${idx} ? ${jsStringLiteral(tabButtonClass(true))} : ${jsStringLiteral(tabButtonClass(false))}}`
    );
    jsxLines.push(`${ind(2)}>`);
    jsxLines.push(`${ind(3)}{${labelExpr}}`);
    jsxLines.push(`${ind(2)}</button>`);
  });
  jsxLines.push(`${ind(1)}</div>`);

  jsxLines.push(`${ind(1)}<div className=${jsStringLiteral(TAB_PANEL_WRAP_CLS)}>`);
  tabs.forEach((tab, idx) => {
    const plan = plans[idx];
    jsxLines.push(
      `${ind(2)}<div className={${vars.active} === ${idx} ? ${jsStringLiteral(TAB_PANEL_ACTIVE_CLS)} : ${jsStringLiteral(TAB_PANEL_HIDDEN_CLS)}}>`
    );
    if (!plan || plan.missing) {
      jsxLines.push(
        `${ind(3)}{/* TODO(파일빌드): 탭 '${tab.label || tab.id}'의 연결 페이지(${tab.pageSlug || "미설정"}) 템플릿을 불러오지 못해 내용을 전개하지 못했습니다. 해당 slug의 템플릿을 확인한 뒤 다시 생성해주세요. */}`
      );
      jsxLines.push(`${ind(3)}<div className=${jsStringLiteral(GENERATED_UNSUPPORTED_WIDGET_CLS)} />`);
    } else {
      jsxLines.push(`${ind(3)}<PageGridContainer>`);
      emitGridItems(plan, resolveBlock, 4).forEach((l) => jsxLines.push(l));
      jsxLines.push(`${ind(3)}</PageGridContainer>`);
    }
    jsxLines.push(`${ind(2)}</div>`);
  });
  jsxLines.push(`${ind(1)}</div>`);
  jsxLines.push(`</div>`);

  return { imports, helperLines, stateLines, handlerLines, jsxLines, unhandled: buildUnhandled(widget) };
};
