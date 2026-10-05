import type { TabItem, TabWidget, AnyWidget } from "../../components/renderer/types";
import type { ImportRequirement, WidgetCodeBlock, WidgetGenContext, UnhandledConfigKeys } from "../widgetGenerator";
import {
  jsStringLiteral,
  collectUnhandledKeys,
  tabVarNames,
  collectScopedParts,
  panelLeaveCheckNames,
  splitHelperChunks,
} from "../widgetGenerator";
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

const usesName = (lines: string[], name: string): boolean => lines.some((l) => l.includes(name));

const DECLARATION_NAME_PATTERN =
  /^(?:export\s+)?(?:async\s+)?(?:const|let|var|function|class|interface|type)\s+([A-Za-z_$][\w$]*)/;

const ALWAYS_KEEP_NAMES = new Set(["ALL_FORM_WIDGETS", "downloadStoredFile"]);

interface HelperGroup {
  lines: string[];
  name: string;
  text: string;
}

const declarationNameOf = (chunk: string[]): string => {
  const firstLine = chunk.find((l) => l.trim() !== "") ?? "";
  const matched = DECLARATION_NAME_PATTERN.exec(firstLine);
  return matched ? matched[1] : "";
};

const groupHelperLines = (helperLines: string[]): HelperGroup[] => {
  const groups: HelperGroup[] = [];
  let pendingLines: string[] = [];
  splitHelperChunks(helperLines).forEach((chunk) => {
    if (chunk.every((l) => l.trim() === "")) return;
    const name = declarationNameOf(chunk);
    if (name === "") {
      pendingLines.push(...chunk);
      return;
    }
    groups.push({ lines: [...pendingLines, ...chunk], name, text: chunk.join("\n") });
    pendingLines = [];
  });
  if (pendingLines.length > 0) groups.push({ lines: pendingLines, name: "", text: "" });
  return groups;
};

const findConflictingNames = (panelGroups: HelperGroup[][]): Set<string> => {
  const textsByName = new Map<string, Set<string>>();
  panelGroups.forEach((groups) =>
    groups.forEach((g) => {
      if (g.name === "") return;
      const texts = textsByName.get(g.name) ?? new Set<string>();
      texts.add(g.text);
      textsByName.set(g.name, texts);
    })
  );
  const conflicts = new Set<string>();
  textsByName.forEach((texts, name) => {
    if (texts.size > 1) conflicts.add(name);
  });
  return conflicts;
};

const joinGroupLines = (groups: HelperGroup[]): string[] =>
  groups.flatMap((g, i) => (i === 0 ? g.lines : ["", ...g.lines]));

export const generateTabBlock = (widget: TabWidget, ctx: WidgetGenContext): WidgetCodeBlock => {
  const { ind, suffix, tabPanels, blockOf, suffixOf, leaveCheck } = ctx;
  const tabs = widget.tabs ?? [];

  const imports: ImportRequirement[] = [
    { module: "react", named: ["useCallback", "useRef"] },
    { module: "next/navigation", named: ["useSearchParams"] },
  ];
  const helperLines: string[] = [];
  const stateLines: string[] = [];
  const handlerLines: string[] = [];
  const jsxLines: string[] = [];

  if (tabs.length === 0) {
    jsxLines.push(`{/* TODO(파일빌드): 이 탭 위젯에는 탭이 없습니다. 빌더에서 탭을 추가한 뒤 다시 생성해주세요. */}`);
    jsxLines.push(`<div className=${jsStringLiteral(GENERATED_UNSUPPORTED_WIDGET_CLS)} />`);
    return { imports: [], helperLines, stateLines, handlerLines, jsxLines, unhandled: buildUnhandled(widget) };
  }

  const vars = tabVarNames(suffix);
  const requiredGuardActive = tabs[0]?.required === true;
  const needsI18n = requiredGuardActive || tabs.some((tab) => !!tab.labelMsgKey || !tab.label);

  const sharedIdsPattern = new RegExp(`\\b${vars.sharedIds}\\b`);
  const sharedIdsUsed = ctx.allWidgets.some((w) => {
    const block = ctx.blockOf?.(w);
    if (!block) return false;
    return [...block.stateLines, ...block.handlerLines].some((line) => sharedIdsPattern.test(line));
  });

  stateLines.push(`${ind(1)}const [${vars.active}, ${vars.setActive}] = useState(0);`);
  stateLines.push(
    `${ind(1)}const [${vars.mountedTabs}, ${vars.setMountedTabs}] = useState<Set<number>>(new Set([0]));`
  );
  if (sharedIdsUsed) {
    stateLines.push(`${ind(1)}const [${vars.sharedIds}, ${vars.setSharedIds}] = useState<Record<string, number>>({});`);
  }
  if (needsI18n) {
    imports.push({ module: "@/hooks/use-i18n", named: ["useI18n"] });
    stateLines.push(`${ind(1)}const { t } = useI18n();`);
  }

  stateLines.push(
    `${ind(1)}const [crossTabFormValues${suffix}, setCrossTabFormValues${suffix}] = useState<Record<string, string>>({});`
  );
  stateLines.push(
    `${ind(1)}const [crossTabGeneratedValues${suffix}, setCrossTabGeneratedValues${suffix}] = useState<Record<string, { value: string; seq: number }>>({});`
  );
  stateLines.push(`${ind(1)}const confirmLeaveMap${suffix} = useRef<Record<number, () => boolean>>({});`);

  handlerLines.push(
    `${ind(1)}const handleCrossTabFormChange${suffix} = useCallback((key: string, value: string) => setCrossTabFormValues${suffix}((prev) => ({ ...prev, [key]: value })), []);`
  );
  handlerLines.push(
    `${ind(1)}const handleCrossTabGeneratedChange${suffix} = useCallback((key: string, value: string) => {`
  );
  handlerLines.push(
    `${ind(2)}setCrossTabGeneratedValues${suffix}((prev) => ({ ...prev, [key]: { value, seq: (prev[key]?.seq ?? 0) + 1 } }));`
  );
  handlerLines.push(`${ind(1)}}, []);`);
  handlerLines.push(
    `${ind(1)}const handleRegisterConfirmLeave${suffix} = useCallback((idx: number, fn: () => boolean) => { confirmLeaveMap${suffix}.current[idx] = fn; }, []);`
  );

  if (requiredGuardActive) {
    imports.push({ module: "sonner", named: ["toast"] });
    stateLines.push(`${ind(1)}const searchParams${suffix} = useSearchParams();`);
    stateLines.push(
      `${ind(1)}const storedId${suffix} = searchParams${suffix}.get('id') ? Number(searchParams${suffix}.get('id')) : null;`
    );
    stateLines.push(
      `${ind(1)}const [${vars.savedTabs}, ${vars.setSavedTabs}] = useState<Set<number>>(() => new Set(storedId${suffix} !== null ? [0] : []));`
    );
    handlerLines.push(
      `${ind(1)}const handleTabSaved${suffix} = useCallback((idx: number) => ${vars.setSavedTabs}((prev) => new Set([...prev, idx])), []);`
    );
  }

  handlerLines.push(`${ind(1)}const ${vars.handleClick} = (idx: number) => {`);
  if (requiredGuardActive) {
    handlerLines.push(`${ind(2)}if (idx > 0 && !${vars.savedTabs}.has(0)) {`);
    handlerLines.push(`${ind(3)}toast.warning(t('common.tab.save_required', { tab: ${tabLabelExpr(tabs[0], 0)} }));`);
    handlerLines.push(`${ind(3)}return;`);
    handlerLines.push(`${ind(2)}}`);
  }
  handlerLines.push(`${ind(2)}if (${leaveCheck ? "true" : "false"} && idx !== ${vars.active}) {`);
  handlerLines.push(`${ind(3)}const confirmFn = confirmLeaveMap${suffix}.current[${vars.active}];`);
  handlerLines.push(`${ind(3)}if (confirmFn && !confirmFn()) return;`);
  handlerLines.push(`${ind(2)}}`);
  handlerLines.push(`${ind(2)}${vars.setActive}(idx);`);
  handlerLines.push(`${ind(2)}${vars.setMountedTabs}((prev) => new Set([...prev, idx]));`);
  handlerLines.push(`${ind(1)}};`);

  const plans = tabPanels ?? [];
  const resolveBlock = blockOf ?? (() => undefined);

  const panelWidgetsList = tabs.map((_, idx): AnyWidget[] => {
    const plan = plans[idx];
    if (!plan || plan.missing) return [];
    return plan.items.flatMap((item) => item.contents.map((c) => c.widget));
  });
  const panelParts = tabs.map((_, idx) => {
    const plan = plans[idx];
    if (!plan || plan.missing) return undefined;
    return collectScopedParts(
      panelWidgetsList[idx],
      resolveBlock,
      { items: plan.items, autoHeightFlags: plan.autoHeightFlags },
      `TabPanel_${suffix}_${idx}`,
      suffixOf,
      3
    );
  });
  const panelGroups = panelParts.map((p) => (p ? groupHelperLines(p.helperLines) : []));
  const conflictNames = findConflictingNames(panelGroups);
  const isKeptGroup = (g: HelperGroup): boolean => ALWAYS_KEEP_NAMES.has(g.name) || conflictNames.has(g.name);
  const hoistedGroups = panelGroups.flatMap((groups) => groups.filter((g) => !isKeptGroup(g)));
  if (hoistedGroups.length > 0) helperLines.push(...joinGroupLines(hoistedGroups));

  jsxLines.push(`<div className=${jsStringLiteral(TAB_CONTAINER_CLS)}>`);
  jsxLines.push(`${ind(1)}<div className=${jsStringLiteral(TAB_BAR_CLS)}>`);
  tabs.forEach((tab, idx) => {
    const labelExpr = tabLabelExpr(tab, idx);
    jsxLines.push(`${ind(2)}<button`);
    jsxLines.push(`${ind(3)}type="button"`);
    jsxLines.push(`${ind(3)}onClick={() => ${vars.handleClick}(${idx})}`);
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
      const panelWidgets = panelWidgetsList[idx];
      const componentName = `TabPanel_${suffix}_${idx}`;
      const parts = panelParts[idx]!;
      const keptHelperLines = joinGroupLines(panelGroups[idx].filter(isKeptGroup));

      const panelNames = panelLeaveCheckNames(panelWidgets);
      const panelHasConfirmLeave = panelNames.includes("confirmLeave");

      const assembledText = [...parts.stateLines, ...parts.handlerLines, ...parts.jsxLines];
      const propLines: string[] = [];
      const propTypeLines: string[] = [];

      const tabSharedIdsMapUsed = sharedIdsUsed && usesName(assembledText, vars.sharedIds);
      if (tabSharedIdsMapUsed) {
        propLines.push(`${vars.sharedIds}={${vars.sharedIds}}`);
        propTypeLines.push(`${vars.sharedIds}: Record<string, number>;`);
      }
      const setSharedIdsUsed = sharedIdsUsed && usesName(assembledText, vars.setSharedIds);
      if (setSharedIdsUsed) {
        propLines.push(`${vars.setSharedIds}={${vars.setSharedIds}}`);
        propTypeLines.push(`${vars.setSharedIds}: React.Dispatch<React.SetStateAction<Record<string, number>>>;`);
      }
      const setSavedTabsUsed = requiredGuardActive && usesName(assembledText, vars.setSavedTabs);
      if (setSavedTabsUsed) {
        propLines.push(`${vars.setSavedTabs}={${vars.setSavedTabs}}`);
        propTypeLines.push(`${vars.setSavedTabs}: React.Dispatch<React.SetStateAction<Set<number>>>;`);
      }
      const crossFormUsed = usesName(assembledText, "crossTabFormValues");
      if (crossFormUsed) {
        propLines.push(`crossTabFormValues={crossTabFormValues${suffix}}`);
        propTypeLines.push(`crossTabFormValues: Record<string, string>;`);
      }
      const crossOnFormUsed = usesName(assembledText, "onCrossTabFormChange");
      if (crossOnFormUsed) {
        propLines.push(`onCrossTabFormChange={handleCrossTabFormChange${suffix}}`);
        propTypeLines.push(`onCrossTabFormChange: (key: string, value: string) => void;`);
      }
      const crossGeneratedUsed = usesName(assembledText, "crossTabGeneratedValues");
      if (crossGeneratedUsed) {
        propLines.push(`crossTabGeneratedValues={crossTabGeneratedValues${suffix}}`);
        propTypeLines.push(`crossTabGeneratedValues: Record<string, { value: string; seq: number }>;`);
      }
      const crossOnGeneratedUsed = usesName(assembledText, "onCrossTabGeneratedChange");
      if (crossOnGeneratedUsed) {
        propLines.push(`onCrossTabGeneratedChange={handleCrossTabGeneratedChange${suffix}}`);
        propTypeLines.push(`onCrossTabGeneratedChange: (key: string, value: string) => void;`);
      }
      if (panelHasConfirmLeave) {
        propLines.push(`onRegisterConfirmLeave={handleRegisterConfirmLeave${suffix}}`);
        propTypeLines.push(`onRegisterConfirmLeave: (idx: number, fn: () => boolean) => void;`);
      }

      const panelFnLines: string[] = [];
      panelFnLines.push(`function ${componentName}(props: { ${propTypeLines.join(" ")} }) {`);
      if (propLines.length > 0) {
        panelFnLines.push(`    const { ${propLines.map((l) => l.split("={")[0]).join(", ")} } = props;`);
      }
      if (panelNames.length > 0) {
        panelFnLines.push(`    const { ${panelNames.join(", ")} } = useLeaveCheck(${leaveCheck ? "true" : "false"});`);
        imports.push({
          module: "@/app/admin/templates/make/_shared/hooks/useLeaveCheck",
          named: ["useLeaveCheck"],
        });
      }
      keptHelperLines.forEach((l) => panelFnLines.push(l));
      if (keptHelperLines.length > 0) panelFnLines.push("");
      parts.stateLines.forEach((l) => panelFnLines.push(l));
      if (parts.stateLines.length > 0) panelFnLines.push("");
      parts.handlerLines.forEach((l) => panelFnLines.push(l));
      if (parts.handlerLines.length > 0) panelFnLines.push("");
      if (panelHasConfirmLeave) {
        panelFnLines.push(`    useEffect(() => { onRegisterConfirmLeave?.(${idx}, confirmLeave); }, [confirmLeave]);`);
      }
      panelFnLines.push(`    return (`);
      panelFnLines.push(`        <PageGridContainer>`);
      parts.jsxLines.forEach((l) => panelFnLines.push(l));
      panelFnLines.push(`        </PageGridContainer>`);
      panelFnLines.push(`    );`);
      panelFnLines.push(`}`);

      imports.push(...parts.imports);
      helperLines.push(panelFnLines.join("\n"));

      jsxLines.push(`${ind(3)}{${vars.mountedTabs}.has(${idx}) && (`);
      jsxLines.push(`${ind(4)}<${componentName} ${propLines.join(" ")} />`);
      jsxLines.push(`${ind(3)})}`);
    }
    jsxLines.push(`${ind(2)}</div>`);
  });
  jsxLines.push(`${ind(1)}</div>`);
  jsxLines.push(`</div>`);

  return { imports, helperLines, stateLines, handlerLines, jsxLines, unhandled: buildUnhandled(widget) };
};
