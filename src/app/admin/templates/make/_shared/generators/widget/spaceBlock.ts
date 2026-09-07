import type { SpaceWidget } from "../../components/renderer/types";
import type { SearchFieldConfig } from "../../types";
import { calculateSpaceItemRowTracks } from "../../utils/formGridLayout";
import { spaceGroupClass, spaceJustifyClass } from "../../components/renderer/rendererStyles";
import { actionButtonClass, textareaStaticCls } from "../../styles";
import { parseActionParams } from "../../utils";
import type { ImportRequirement, WidgetCodeBlock, WidgetGenContext, UnhandledConfigKeys } from "../widgetGenerator";
import {
  jsStringLiteral,
  collectUnhandledKeys,
  emitContainerOpen,
  emitContainerClose,
  GENERATED_PAGE_BASE_CONST,
} from "../widgetGenerator";
import { emitContentActionHandler } from "./space/contentActionEmitter";

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
  "connectedContentWidgetIds",
  "contentAction",
  "goBackAfterAction",
  "saveConfirm",
  "contentValidationRuleIds",
  "popupSlug",
  "params",
]);

const IGNORED_ITEM_KEYS = new Map<string, string>([
  [
    "fieldKey",
    "SpaceBuilder가 필드 타입 전환 시 남기는 잔여 값 — SpaceRenderer.tsx:108-176 handleButtonClick과 FieldRenderer.tsx action-button 분기 어디서도 item.fieldKey를 읽지 않음",
  ],
]);

const justifyClassOf = (align: SpaceWidget["align"]): string => spaceJustifyClass(align);

const textExprOf = (label: string | undefined, msgKey: string | undefined): string =>
  msgKey ? `t(${jsStringLiteral(msgKey)})` : jsStringLiteral(label ?? "");

export const spaceItemNeedsI18n = (item: SearchFieldConfig): boolean => {
  if (item.type === "textarea") return !!item.contentMsgKey;
  if (item.type === "action-button") return !!item.labelMsgKey || !item.label;
  return false;
};

const pushItemMarkup = (
  jsxLines: string[],
  ind: (n: number) => string,
  item: SearchFieldConfig,
  onClickBody: string[]
): void => {
  if (item.type === "textarea") {
    const fontSize = item.fontSize ? `${item.fontSize}px` : "12px";
    const fontWeight = item.bold ? "bold" : "normal";
    const color = item.textColor || "#334155";
    jsxLines.push(
      `${ind(2)}<div style={{ fontSize: '${fontSize}', fontWeight: '${fontWeight}', color: '${color}' }} className=${jsStringLiteral(textareaStaticCls)}>{${textExprOf(item.content, item.contentMsgKey)}}</div>`
    );
    return;
  }

  if (item.type === "action-button") {
    const labelExpr = item.labelMsgKey
      ? `t(${jsStringLiteral(item.labelMsgKey)})`
      : item.label
        ? jsStringLiteral(item.label)
        : `t('common.btn.default')`;
    jsxLines.push(`${ind(2)}<button`);
    jsxLines.push(`${ind(3)}type="button"`);
    jsxLines.push(`${ind(3)}onClick={() => {`);
    onClickBody.forEach((l) => jsxLines.push(`${ind(4)}${l}`));
    jsxLines.push(`${ind(3)}}}`);
    jsxLines.push(`${ind(3)}className=${jsStringLiteral(actionButtonClass(item.color, item.textColor))}`);
    jsxLines.push(`${ind(2)}>`);
    jsxLines.push(`${ind(3)}{${labelExpr}}`);
    jsxLines.push(`${ind(2)}</button>`);
    return;
  }

  jsxLines.push(`${ind(2)}{/* TODO(파일빌드): '${item.type}' 아이템은 아직 코드 생성이 지원되지 않습니다. */}`);
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

const UNSUPPORTED_CONN_TYPE_NOTE: Record<string, string> = {
  path: "connType='path'(파일 레이어 연결) 동작은 아직 코드 생성이 지원되지 않습니다.",
  excel: "connType='excel'(엑셀 다운로드) 동작은 아직 코드 생성이 지원되지 않습니다.",
  datasave: "connType='datasave'(데이터 저장) 동작은 아직 코드 생성이 지원되지 않습니다.",
  api: "connType='api'(API 연동) 동작은 아직 코드 생성이 지원되지 않습니다.",
};

export const generateSpaceBlock = (widget: SpaceWidget, ctx: WidgetGenContext): WidgetCodeBlock => {
  const { ind, contentColSpan, contentFillHeight, suffix, leaveCheckNames } = ctx;
  const showBorder = widget.showBorder !== false;
  const bgColor = widget.bgColor && widget.bgColor !== "none" ? widget.bgColor : undefined;
  const justifyClass = justifyClassOf(widget.align);
  const needsI18n = widget.items.some(spaceItemNeedsI18n);

  const imports: ImportRequirement[] = [];
  const helperLines: string[] = [];
  const stateLines: string[] = [];
  const handlerLines: string[] = [];
  if (needsI18n) {
    imports.push({ module: "@/hooks/use-i18n", named: ["useI18n"] });
    stateLines.push(`${ind(1)}const { t } = useI18n();`);
  }

  const onClickBodyByItem = new Map<SearchFieldConfig, string[]>();
  let needsRouter = false;
  widget.items.forEach((item, itemIdx) => {
    if (item.type !== "action-button") return;
    const body: string[] = [];
    if (item.saveConfirm) body.push(`if (!window.confirm(t('common.confirm.save'))) return;`);

    const connType = item.connType ?? "";
    if (connType === "content" && item.connectedContentWidgetIds?.length && item.contentAction) {
      const fnName = `handleContentAction${suffix}_${itemIdx}`;
      const widgetsConstName = `CONTENT_WIDGETS_${suffix}_${itemIdx}`;
      const result = emitContentActionHandler({
        ctx,
        fnName,
        widgetsConstName,
        connectedContentWidgetIds: item.connectedContentWidgetIds,
        action: item.contentAction,
        goBackAfterAction: !!item.goBackAfterAction,
        contentValidationRuleIds: item.contentValidationRuleIds,
      });
      if (result.todo) {
        body.push(`/* TODO(파일빌드): ${result.todo} */`);
      } else {
        result.helperLines.forEach((l) => helperLines.push(l));
        result.handlerLines.forEach((l) => handlerLines.push(l));
        result.imports.forEach((i) => imports.push(i));
        if (item.goBackAfterAction) needsRouter = true;
        body.push(`${fnName}();`);
      }
    } else if (connType === "close") {
      needsRouter = true;
      if (leaveCheckNames.includes("confirmLeave")) body.push(`if (!confirmLeave()) return;`);
      body.push(`router.back();`);
    } else if (connType === "popup" && item.popupSlug) {
      needsRouter = true;
      helperLines.push(GENERATED_PAGE_BASE_CONST);
      const params = parseActionParams(item.params, {});
      const qs = new URLSearchParams(params).toString();
      body.push(
        `/* TODO(파일빌드): 연결 대상(${item.popupSlug})이 빌더에서 레이어 팝업으로 설정돼 있어도 산출물은 페이지 이동으로 동작합니다. 산출물이 아직 생성되지 않았다면 404가 납니다. */`
      );
      body.push(`router.push(\`\${GENERATED_PAGE_BASE}/${item.popupSlug}${qs ? `?${qs}` : ""}\`);`);
    } else if (UNSUPPORTED_CONN_TYPE_NOTE[connType]) {
      body.push(`/* TODO(파일빌드): ${UNSUPPORTED_CONN_TYPE_NOTE[connType]} */`);
    } else {
      body.push(`/* TODO(파일빌드): connType='${connType}' 버튼 동작을 확정할 수 없습니다. 직접 구현해주세요. */`);
    }
    onClickBodyByItem.set(item, body);
  });

  if (needsRouter) {
    imports.push({ module: "next/navigation", named: ["useRouter"] });
    stateLines.push(`${ind(1)}const router = useRouter();`);
  }

  const itemRowIsAuto = calculateSpaceItemRowTracks(widget.items, contentColSpan);
  const groups = buildGroups(widget.items);

  const jsxLines: string[] = [];
  if (widget.items.length === 0) {
    jsxLines.push(
      `{/* TODO(파일빌드): 이 공간영역 위젯에는 아이템이 없습니다. 빌더에서 아이템을 추가한 뒤 다시 생성해주세요. */}`
    );
    jsxLines.push(emitContainerOpen({ showBorder, bgColor, clipOverflow: false, fillHeight: contentFillHeight }));
    jsxLines.push(emitContainerClose());
    return { imports, helperLines, stateLines, handlerLines, jsxLines, unhandled: buildUnhandled(widget) };
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
    group.fields.forEach((item) => pushItemMarkup(jsxLines, ind, item, onClickBodyByItem.get(item) ?? []));
    jsxLines.push(`${ind(1)}</div>`);
  });
  jsxLines.push(emitContainerClose());

  return { imports, helperLines, stateLines, handlerLines, jsxLines, unhandled: buildUnhandled(widget) };
};
