import type { SpaceWidget } from "../../components/renderer/types";
import type { SearchFieldConfig } from "../../types";
import { calculateSpaceItemRowTracks } from "../../utils/formGridLayout";
import { spaceGroupClass } from "../../components/renderer/rendererStyles";
import type { ImportRequirement, WidgetCodeBlock, WidgetGenContext, UnhandledConfigKeys } from "../widgetGenerator";
import { jsStringLiteral, collectUnhandledKeys, emitContainerOpen, emitContainerClose } from "../widgetGenerator";

const BG_COLOR_MAP: Record<string, string> = {
  black: "bg-slate-900",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  gray: "bg-slate-400",
  pink: "bg-pink-400",
};

const TEXT_COLOR_MAP: Record<string, string> = {
  white: "text-white",
  black: "text-slate-900",
  green: "text-emerald-500",
  blue: "text-blue-500",
  yellow: "text-yellow-400",
  red: "text-red-500",
  gray: "text-slate-400",
  pink: "text-pink-400",
};

const HANDLED_WIDGET_KEYS = new Set(["type", "widgetId", "items", "align", "showBorder", "bgColor"]);
const IGNORED_WIDGET_KEYS = new Map<string, string>();

const HANDLED_TEXTAREA_KEYS = new Set([
  "id",
  "type",
  "content",
  "contentMsgKey",
  "fontSize",
  "bold",
  "textColor",
  "colSpan",
  "rowSpan",
]);
const HANDLED_ACTION_BUTTON_KEYS = new Set([
  "id",
  "type",
  "label",
  "labelMsgKey",
  "color",
  "textColor",
  "connType",
  "colSpan",
  "rowSpan",
]);
const IGNORED_ITEM_KEYS = new Map<string, string>([
  [
    "fieldKey",
    "SpaceBuilder가 필드 타입 전환 시 남기는 잔여 값 — SpaceRenderer.tsx/pushItemMarkup 어디서도 item.fieldKey를 읽지 않음",
  ],
  [
    "popupSlug",
    "action-button 전용 — Phase1은 버튼 모양만 생성하고 connType별 실제 동작(팝업 오픈 등)은 구현하지 않음(TODO 주석 안내). fe_tsx-generation_widget.md §5.3",
  ],
  ["fileLayerSlug", "action-button 전용 — 위와 동일 사유(§5.3), connType=path 전용"],
  ["params", "action-button 전용 — 위와 동일 사유(§5.3), popup/path/api/datasave 파라미터 전달용"],
  ["connectedSlug", "action-button 전용 — 위와 동일 사유(§5.3), 레거시 slug 연결용"],
  ["connectedContentWidgetIds", "action-button 전용 — 위와 동일 사유(§5.3), connType=content/datasave/api 전용"],
  ["contentAction", "action-button 전용 — 위와 동일 사유(§5.3), connType=content 전용"],
  ["goBackAfterAction", "action-button 전용 — 위와 동일 사유(§5.3)"],
  ["dataSaveSlug", "action-button 전용 — 위와 동일 사유(§5.3), connType=datasave 전용"],
  ["apiInfoId", "action-button 전용 — 위와 동일 사유(§5.3), connType=api 전용"],
  ["apiDownloadFile", "action-button 전용 — 위와 동일 사유(§5.3), connType=api 전용"],
  ["apiIncludeSearchParams", "action-button 전용 — 위와 동일 사유(§5.3), connType=api 전용"],
  ["saveConfirm", "action-button 전용 — 위와 동일 사유(§5.3), 클릭 시 확인창 — 동작 미구현이라 확인창도 없음"],
  ["validationRuleIds", "action-button 전용 — 위와 동일 사유(§5.3), connType=datasave 전용"],
  ["contentValidationRuleIds", "action-button 전용 — 위와 동일 사유(§5.3), connType=content 전용"],
  ["excelTableWidgetId", "action-button 전용 — 위와 동일 사유(§5.3), connType=excel 전용"],
  ["excelPrivacyPopup", "action-button 전용 — 위와 동일 사유(§5.3), connType=excel 전용"],
  ["excelDownloadMode", "action-button 전용 — 위와 동일 사유(§5.3), connType=excel 전용"],
  ["excelRelationIds", "action-button 전용 — 위와 동일 사유(§5.3), connType=excel 전용"],
  ["excelExtraColumns", "action-button 전용 — 위와 동일 사유(§5.3), connType=excel 전용"],
]);

const justifyClassOf = (align: SpaceWidget["align"]): string =>
  align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

const textExprOf = (label: string | undefined, msgKey: string | undefined): string =>
  msgKey ? `t(${jsStringLiteral(msgKey)})` : jsStringLiteral(label ?? "");

export const spaceItemNeedsI18n = (item: SearchFieldConfig): boolean => {
  if (item.type === "textarea") return !!item.contentMsgKey;
  if (item.type === "action-button") return !!item.labelMsgKey || !item.label;
  return false;
};

const pushItemMarkup = (jsxLines: string[], ind: (n: number) => string, item: SearchFieldConfig): void => {
  if (item.type === "textarea") {
    const fontSize = item.fontSize ? `${item.fontSize}px` : "12px";
    const fontWeight = item.bold ? "bold" : "normal";
    const color = item.textColor || "#334155";
    jsxLines.push(
      `${ind(2)}<div style={{ fontSize: '${fontSize}', fontWeight: '${fontWeight}', color: '${color}' }} className="whitespace-pre-wrap leading-relaxed px-1">{${textExprOf(item.content, item.contentMsgKey)}}</div>`
    );
    return;
  }

  if (item.type === "action-button") {
    const bgCls = BG_COLOR_MAP[item.color ?? "black"] ?? BG_COLOR_MAP.black;
    const textCls = TEXT_COLOR_MAP[item.textColor ?? "white"] ?? TEXT_COLOR_MAP.white;
    const labelExpr = item.labelMsgKey
      ? `t(${jsStringLiteral(item.labelMsgKey)})`
      : item.label
        ? jsStringLiteral(item.label)
        : `t('common.btn.default')`;
    jsxLines.push(`${ind(2)}<button`);
    jsxLines.push(`${ind(3)}type="button"`);
    jsxLines.push(`${ind(3)}onClick={() => {`);
    jsxLines.push(
      `${ind(4)}/* TODO(파일빌드 Phase 2): connType='${item.connType || ""}' 버튼 동작은 빌더 런타임 전용이라 파일빌드에서 지원하지 않습니다. 직접 구현해주세요. */`
    );
    jsxLines.push(`${ind(3)}}}`);
    jsxLines.push(
      `${ind(3)}className="text-xs px-4 py-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center min-h-[40px] whitespace-nowrap flex-shrink-0 hover:opacity-90 ${bgCls} ${textCls}"`
    );
    jsxLines.push(`${ind(2)}>`);
    jsxLines.push(`${ind(3)}{${labelExpr}}`);
    jsxLines.push(`${ind(2)}</button>`);
    return;
  }

  jsxLines.push(`${ind(2)}{/* TODO(파일빌드 Phase 2): '${item.type}' 아이템은 아직 코드 생성이 지원되지 않습니다. */}`);
};

const buildUnhandled = (widget: SpaceWidget): UnhandledConfigKeys[] => {
  const widgetUnhandled = collectUnhandledKeys(
    widget as unknown as Record<string, unknown>,
    HANDLED_WIDGET_KEYS,
    new Set(IGNORED_WIDGET_KEYS.keys())
  );
  const ignoredItemKeySet = new Set(IGNORED_ITEM_KEYS.keys());
  const itemUnhandledSet = new Set<string>();
  widget.items.forEach((item) => {
    const handled =
      item.type === "textarea"
        ? HANDLED_TEXTAREA_KEYS
        : item.type === "action-button"
          ? HANDLED_ACTION_BUTTON_KEYS
          : new Set<string>();
    collectUnhandledKeys(item as unknown as Record<string, unknown>, handled, ignoredItemKeySet).forEach((k) =>
      itemUnhandledSet.add(k)
    );
  });
  return [
    { scope: "widget", keys: widgetUnhandled },
    { scope: "field", keys: [...itemUnhandledSet] },
  ];
};

interface RenderGroup {
  colSpan: number;
  rowSpan: number;
  fields: SearchFieldConfig[];
}

const buildGroups = (items: SearchFieldConfig[]): RenderGroup[] => {
  const groups: RenderGroup[] = [];
  items.forEach((field) => {
    const last = groups[groups.length - 1];
    if (field.type === "action-button" && last?.fields[0]?.type === "action-button") {
      last.fields.push(field);
      last.colSpan += field.colSpan ?? 1;
    } else {
      groups.push({ colSpan: field.colSpan ?? 1, rowSpan: field.rowSpan ?? 1, fields: [field] });
    }
  });
  return groups;
};

export const generateSpaceBlock = (widget: SpaceWidget, ctx: WidgetGenContext): WidgetCodeBlock => {
  const { ind, contentColSpan, contentFillHeight } = ctx;
  const showBorder = widget.showBorder !== false;
  const bgColor =
    widget.bgColor && widget.bgColor !== "white" && widget.bgColor !== "none" ? widget.bgColor : undefined;
  const justifyClass = justifyClassOf(widget.align);
  const needsI18n = widget.items.some(spaceItemNeedsI18n);

  const imports: ImportRequirement[] = [];
  const stateLines: string[] = [];
  if (needsI18n) {
    imports.push({ module: "@/hooks/use-i18n", named: ["useI18n"] });
    stateLines.push(`${ind(1)}const { t } = useI18n();`);
  }

  const itemRowIsAuto = calculateSpaceItemRowTracks(widget.items, contentColSpan);
  const groups = buildGroups(widget.items);

  const jsxLines: string[] = [];
  if (widget.items.length === 0) {
    jsxLines.push(emitContainerOpen({ showBorder, bgColor, className: "flex items-center justify-center" }));
    jsxLines.push(
      `${ind(1)}<span className="text-[10px] text-slate-300 italic text-center p-4">아이템을 추가하세요</span>`
    );
    jsxLines.push(emitContainerClose());
    return { imports, helperLines: [], stateLines, handlerLines: [], jsxLines, unhandled: buildUnhandled(widget) };
  }

  jsxLines.push(
    emitContainerOpen({
      showBorder,
      bgColor,
      clipOverflow: false,
      fillHeight: contentFillHeight,
      contentColSpan,
      rowIsAuto: itemRowIsAuto,
    })
  );
  groups.forEach((group) => {
    const isActionGroup = group.fields[0].type === "action-button";
    const groupCls = spaceGroupClass(isActionGroup, justifyClass);
    const colSpanClamped = Math.min(group.colSpan, contentColSpan);
    jsxLines.push(
      `${ind(1)}<div className=${jsStringLiteral(groupCls)} style={{ gridColumn: 'span ${colSpanClamped}', gridRow: 'span ${group.rowSpan}' }}>`
    );
    group.fields.forEach((item) => pushItemMarkup(jsxLines, ind, item));
    jsxLines.push(`${ind(1)}</div>`);
  });
  jsxLines.push(emitContainerClose());

  return { imports, helperLines: [], stateLines, handlerLines: [], jsxLines, unhandled: buildUnhandled(widget) };
};
