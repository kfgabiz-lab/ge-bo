import type { SearchFieldConfig } from "../../../types";
import { parseOpt } from "../../../utils";
import { SELECT_ALL_PLACEHOLDER, SELECT_ALL_MSG_KEY } from "../../../constants";
import {
  inputCls,
  selectCls,
  fieldOptionGroupCls,
  fieldOptionItemClass,
  fieldOptionTextCls,
  fieldRadioInputCls,
  fieldCheckboxInputCls,
  fieldRelativeWrapCls,
  fieldCharCountCls,
  fieldCharCountPadCls,
  fieldDateRangeInputPadCls,
} from "../../../styles";
import {
  SEARCH_DATE_ICON_CLS,
  SEARCH_DATE_RANGE_SEP_CLS,
  SEARCH_DATE_RANGE_WRAP_CLS,
  SEARCH_DATE_RANGE_INPUT_WRAP_CLS,
} from "../../../components/renderer/rendererStyles";
import { jsStringLiteral, slugOptionFieldLiteral, emitSelectArrow } from "../../widgetGenerator";

type IndFn = (n: number) => string;

const placeholderExprOf = (f: SearchFieldConfig): string => {
  if (f.placeholderMsgKey) return `t(${jsStringLiteral(f.placeholderMsgKey)})`;
  if (f.placeholder) return jsStringLiteral(f.placeholder);
  return `t('common.input.placeholder')`;
};

const selectAllOptionExprOf = (f: SearchFieldConfig): string => {
  if (f.placeholderMsgKey) return `t(${jsStringLiteral(f.placeholderMsgKey)})`;
  if (f.placeholder?.trim() === SELECT_ALL_PLACEHOLDER) return `t(${jsStringLiteral(SELECT_ALL_MSG_KEY)})`;
  if (f.placeholder) return jsStringLiteral(f.placeholder);
  return `t('common.select.placeholder')`;
};

const pushOptions = (
  lines: string[],
  ind: IndFn,
  level: number,
  f: SearchFieldConfig,
  optionTag: (value: string, textExpr: string) => string,
  codeGroupTag: () => string
): void => {
  if (f.codeGroupCode) {
    lines.push(`${ind(level)}${codeGroupTag()}`);
    return;
  }
  (f.options || []).forEach((opt) => {
    const { text, value } = parseOpt(opt);
    lines.push(`${ind(level)}${optionTag(value, `t(${jsStringLiteral(text)})`)}`);
  });
};

export interface PushFieldMarkupOptions {
  jsxLines: string[];
  ind: IndFn;
  level: number;
  field: SearchFieldConfig;
  id: string;
  paramsVar: string;
  setParamsVar: string;
  slugRowDataVar: string;
  radioNameExpr?: string;
}

export const pushFieldMarkup = (o: PushFieldMarkupOptions): void => {
  const { jsxLines, ind, level, field: f, id, paramsVar, setParamsVar, slugRowDataVar, radioNameExpr } = o;
  const l0 = level;
  const l1 = level + 1;
  const l2 = level + 2;
  const idLit = jsStringLiteral(id);
  const readExpr = `String(${paramsVar}[${idLit}] ?? '')`;
  const nameAttr = radioNameExpr ? `name={${radioNameExpr}}` : `name={${idLit}}`;

  switch (f.type) {
    case "input": {
      const hasCharCount = !!(f.showCharCount && f.maxLength);
      const inputCharCountCls = hasCharCount ? `${inputCls} ${fieldCharCountPadCls}` : inputCls;
      const maxLengthAttr = hasCharCount ? ` maxLength={${f.maxLength}}` : "";
      const inputLine = `<input type="text" value={${readExpr}} onChange={e => ${setParamsVar}(prev => ({ ...prev, [${idLit}]: e.target.value }))} placeholder={${placeholderExprOf(f)}}${maxLengthAttr} className=${jsStringLiteral(inputCharCountCls)} />`;
      const plainLines: string[] = [];
      if (hasCharCount) {
        plainLines.push(`<div className=${jsStringLiteral(fieldRelativeWrapCls)}>`);
        plainLines.push(`    ${inputLine}`);
        plainLines.push(
          `    <span className=${jsStringLiteral(fieldCharCountCls)}>{${readExpr}.length}/{${f.maxLength}}</span>`
        );
        plainLines.push(`</div>`);
      } else {
        plainLines.push(inputLine);
      }
      if (!f.codeGroupCode) {
        plainLines.forEach((l) => jsxLines.push(`${ind(l0)}${l}`));
        break;
      }
      const displayAsArg = f.displayAs ? jsStringLiteral(f.displayAs) : "undefined";
      jsxLines.push(`${ind(l0)}{groups.length > 0 ? (`);
      jsxLines.push(
        `${ind(l1)}<input type="text" readOnly value={resolveCodeLabel(${readExpr}, ${jsStringLiteral(f.codeGroupCode)}, ${displayAsArg}, groups, t, true)} className=${jsStringLiteral(inputCls)} />`
      );
      jsxLines.push(`${ind(l0)}) : (`);
      plainLines.forEach((l) => jsxLines.push(`${ind(l1)}${l}`));
      jsxLines.push(`${ind(l0)})}`);
      break;
    }
    case "select":
      if (f.optionSlug && f.selectType !== "autocomplete") {
        jsxLines.push(
          `${ind(l0)}<SlugOptionSelect field={${JSON.stringify(slugOptionFieldLiteral(f))}} value={${readExpr}} onChange={(v) => ${setParamsVar}(prev => ({ ...prev, [${idLit}]: v }))} disabled={false} placeholder={${selectAllOptionExprOf(f)}} className=${jsStringLiteral(selectCls)} rowData={${slugRowDataVar}} />`
        );
        break;
      }
      jsxLines.push(`${ind(l0)}<div className=${jsStringLiteral(fieldRelativeWrapCls)}>`);
      jsxLines.push(
        `${ind(l1)}<select value={${readExpr}} onChange={e => ${setParamsVar}(prev => ({ ...prev, [${idLit}]: e.target.value }))} className=${jsStringLiteral(selectCls)}>`
      );
      jsxLines.push(`${ind(l2)}<option value="">{${selectAllOptionExprOf(f)}}</option>`);
      pushOptions(
        jsxLines,
        ind,
        l2,
        f,
        (value, textExpr) => `<option value={${jsStringLiteral(value)}}>{${textExpr}}</option>`,
        () =>
          `{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <option key={d.code} value={d.code}>{t(d.nameMsgKey || d.name)}</option>)}`
      );
      jsxLines.push(`${ind(l1)}</select>`);
      jsxLines.push(emitSelectArrow(ind, l1));
      jsxLines.push(`${ind(l0)}</div>`);
      break;
    case "date":
    case "yearMonth": {
      const inputTypeAttr = f.type === "yearMonth" ? "month" : "date";
      jsxLines.push(
        `${ind(l0)}<input type="${inputTypeAttr}" value={${readExpr}} onChange={e => ${setParamsVar}(prev => ({ ...prev, [${idLit}]: e.target.value }))} onClick={e => e.currentTarget.showPicker?.()} className=${jsStringLiteral(inputCls)} />`
      );
      break;
    }
    case "dateRange": {
      const startKey = `${id}_from`;
      const endKey = `${id}_to`;
      const startKeyLit = jsStringLiteral(startKey);
      const endKeyLit = jsStringLiteral(endKey);
      const readExprStart = `String(${paramsVar}[${startKeyLit}] ?? '')`;
      const readExprEnd = `String(${paramsVar}[${endKeyLit}] ?? '')`;
      const rangeInputCls = jsStringLiteral(`${inputCls} ${fieldDateRangeInputPadCls}`);
      const rangeWrapCls = jsStringLiteral(SEARCH_DATE_RANGE_INPUT_WRAP_CLS);
      jsxLines.push(`${ind(l0)}<div className=${jsStringLiteral(SEARCH_DATE_RANGE_WRAP_CLS)}>`);
      jsxLines.push(
        `${ind(l1)}<div className=${rangeWrapCls}><Calendar className=${jsStringLiteral(SEARCH_DATE_ICON_CLS)} /><input type="date" value={${readExprStart}} onChange={e => ${setParamsVar}(prev => ({ ...prev, [${startKeyLit}]: e.target.value }))} onClick={e => e.currentTarget.showPicker?.()} className=${rangeInputCls} /></div>`
      );
      jsxLines.push(`${ind(l1)}<span className=${jsStringLiteral(SEARCH_DATE_RANGE_SEP_CLS)}>~</span>`);
      jsxLines.push(
        `${ind(l1)}<div className=${rangeWrapCls}><Calendar className=${jsStringLiteral(SEARCH_DATE_ICON_CLS)} /><input type="date" value={${readExprEnd}} onChange={e => ${setParamsVar}(prev => ({ ...prev, [${endKeyLit}]: e.target.value }))} onClick={e => e.currentTarget.showPicker?.()} className=${rangeInputCls} /></div>`
      );
      jsxLines.push(`${ind(l0)}</div>`);
      break;
    }
    case "radio": {
      const optionLabelCls = jsStringLiteral(fieldOptionItemClass(false));
      const radioInput = jsStringLiteral(fieldRadioInputCls);
      const optionTextCls = jsStringLiteral(fieldOptionTextCls);
      jsxLines.push(`${ind(l0)}<div className=${jsStringLiteral(fieldOptionGroupCls)}>`);
      pushOptions(
        jsxLines,
        ind,
        l1,
        f,
        (value, textExpr) =>
          `<label className=${optionLabelCls}><input type="radio" ${nameAttr} value={${jsStringLiteral(value)}} checked={${readExpr} === ${jsStringLiteral(value)}} onChange={() => ${setParamsVar}(prev => ({ ...prev, [${idLit}]: ${jsStringLiteral(value)} }))} className=${radioInput} /><span className=${optionTextCls}>{${textExpr}}</span></label>`,
        () =>
          `{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className=${optionLabelCls}><input type="radio" ${nameAttr} value={d.code} checked={${readExpr} === d.code} onChange={() => ${setParamsVar}(prev => ({ ...prev, [${idLit}]: d.code }))} className=${radioInput} /><span className=${optionTextCls}>{t(d.nameMsgKey || d.name)}</span></label>)}`
      );
      jsxLines.push(`${ind(l0)}</div>`);
      break;
    }
    case "checkbox": {
      const selectedExpr = `${readExpr}.split(',').filter(Boolean)`;
      const optionLabelCls = jsStringLiteral(fieldOptionItemClass(false));
      const checkboxInput = jsStringLiteral(fieldCheckboxInputCls);
      const optionTextCls = jsStringLiteral(fieldOptionTextCls);
      jsxLines.push(`${ind(l0)}<div className=${jsStringLiteral(fieldOptionGroupCls)}>`);
      pushOptions(
        jsxLines,
        ind,
        l1,
        f,
        (value, textExpr) =>
          `<label className=${optionLabelCls}><input type="checkbox" value={${jsStringLiteral(value)}} checked={${selectedExpr}.includes(${jsStringLiteral(value)})} onChange={() => { const cur = ${selectedExpr}; const next = cur.includes(${jsStringLiteral(value)}) ? cur.filter(v => v !== ${jsStringLiteral(value)}) : [...cur, ${jsStringLiteral(value)}]; ${setParamsVar}(prev => ({ ...prev, [${idLit}]: next.join(',') })); }} className=${checkboxInput} /><span className=${optionTextCls}>{${textExpr}}</span></label>`,
        () =>
          `{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className=${optionLabelCls}><input type="checkbox" value={d.code} checked={${selectedExpr}.includes(d.code)} onChange={() => { const cur = ${selectedExpr}; const next = cur.includes(d.code) ? cur.filter(v => v !== d.code) : [...cur, d.code]; ${setParamsVar}(prev => ({ ...prev, [${idLit}]: next.join(',') })); }} className=${checkboxInput} /><span className=${optionTextCls}>{t(d.nameMsgKey || d.name)}</span></label>)}`
      );
      jsxLines.push(`${ind(l0)}</div>`);
      break;
    }
    case "dateRangeStatus": {
      const beforeExpr = f.beforeTextMsgKey
        ? `t(${jsStringLiteral(f.beforeTextMsgKey)})`
        : f.beforeText
          ? jsStringLiteral(f.beforeText)
          : `t('common.status.before')`;
      const inRangeExpr = f.inRangeTextMsgKey
        ? `t(${jsStringLiteral(f.inRangeTextMsgKey)})`
        : f.inRangeText
          ? jsStringLiteral(f.inRangeText)
          : `t('common.status.inrange')`;
      const afterExpr = f.afterTextMsgKey
        ? `t(${jsStringLiteral(f.afterTextMsgKey)})`
        : f.afterText
          ? jsStringLiteral(f.afterText)
          : `t('common.status.after')`;
      if (f.statusDisplayStyle === "radio") {
        const optionLabelCls = jsStringLiteral(fieldOptionItemClass(false));
        const radioInput = jsStringLiteral(fieldRadioInputCls);
        const optionTextCls = jsStringLiteral(fieldOptionTextCls);
        jsxLines.push(`${ind(l0)}<div className=${jsStringLiteral(fieldOptionGroupCls)}>`);
        jsxLines.push(
          `${ind(l1)}<label className=${optionLabelCls}><input type="radio" ${nameAttr} value="" checked={${readExpr} === ''} onChange={() => ${setParamsVar}(prev => ({ ...prev, [${idLit}]: '' }))} className=${radioInput} /><span className=${optionTextCls}>{t('common.label.all')}</span></label>`
        );
        jsxLines.push(
          `${ind(l1)}<label className=${optionLabelCls}><input type="radio" ${nameAttr} value="before" checked={${readExpr} === 'before'} onChange={() => ${setParamsVar}(prev => ({ ...prev, [${idLit}]: 'before' }))} className=${radioInput} /><span className=${optionTextCls}>{${beforeExpr}}</span></label>`
        );
        jsxLines.push(
          `${ind(l1)}<label className=${optionLabelCls}><input type="radio" ${nameAttr} value="in_range" checked={${readExpr} === 'in_range'} onChange={() => ${setParamsVar}(prev => ({ ...prev, [${idLit}]: 'in_range' }))} className=${radioInput} /><span className=${optionTextCls}>{${inRangeExpr}}</span></label>`
        );
        jsxLines.push(
          `${ind(l1)}<label className=${optionLabelCls}><input type="radio" ${nameAttr} value="after" checked={${readExpr} === 'after'} onChange={() => ${setParamsVar}(prev => ({ ...prev, [${idLit}]: 'after' }))} className=${radioInput} /><span className=${optionTextCls}>{${afterExpr}}</span></label>`
        );
        jsxLines.push(`${ind(l0)}</div>`);
        break;
      }
      jsxLines.push(`${ind(l0)}<div className=${jsStringLiteral(fieldRelativeWrapCls)}>`);
      jsxLines.push(
        `${ind(l1)}<select value={${readExpr}} onChange={e => ${setParamsVar}(prev => ({ ...prev, [${idLit}]: e.target.value }))} className=${jsStringLiteral(selectCls)}>`
      );
      jsxLines.push(`${ind(l2)}<option value="">{t('common.label.all')}</option>`);
      jsxLines.push(`${ind(l2)}<option value="before">{${beforeExpr}}</option>`);
      jsxLines.push(`${ind(l2)}<option value="in_range">{${inRangeExpr}}</option>`);
      jsxLines.push(`${ind(l2)}<option value="after">{${afterExpr}}</option>`);
      jsxLines.push(`${ind(l1)}</select>`);
      jsxLines.push(emitSelectArrow(ind, l1));
      jsxLines.push(`${ind(l0)}</div>`);
      break;
    }
    default:
      break;
  }
};
