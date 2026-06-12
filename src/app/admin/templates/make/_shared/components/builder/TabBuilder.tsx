"use client";

/**
 * TabBuilder — 탭 컨텐츠 위젯 설정 빌더 컴포넌트
 *
 * 설정 항목:
 *   - 탭 개수 (1~5) : 버튼 토글로 선택
 *   - 각 탭 레이블  : 텍스트 입력
 *   - 각 탭 페이지  : pageTemplates SELECT BOX에서 연결 페이지 slug 선택
 *
 * 사용법:
 *   <TabBuilder widget={widget} onChange={setWidget} pageTemplates={pageTemplates} />
 */

import { LABEL_CLS, INPUT_CLS } from "./fields/_FieldBase";
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../contexts/BuilderI18nModeContext';
import type { TabWidget, TabItem } from "../renderer/types";
import type { TemplateItem } from "../../types";

/** 탭 최대 개수 */
const MAX_TABS = 5;

interface TabBuilderProps {
  widget: TabWidget;
  onChange: (w: TabWidget) => void;
  /** 연결 페이지 SELECT BOX에 표시할 빌더 페이지 목록 */
  pageTemplates: TemplateItem[];
}

/** 새 탭 아이템 생성 — id는 timestamp 기반 */
function createTabItem(idx: number): TabItem {
  return { id: `tab-${Date.now()}-${idx}`, label: `탭 ${idx + 1}`, pageSlug: "" };
}

export function TabBuilder({ widget, onChange, pageTemplates }: TabBuilderProps) {
  const tabs = widget.tabs;
  const { i18nMode } = useBuilderI18nMode();

  /** 탭 개수 변경 — 늘리면 추가, 줄이면 뒤에서 제거 */
  function handleCountChange(count: number) {
    const current = tabs.length;
    if (count === current) return;

    let next: TabItem[];
    if (count > current) {
      /* 탭 추가 */
      const added = Array.from({ length: count - current }, (_, i) => createTabItem(current + i));
      next = [...tabs, ...added];
    } else {
      /* 탭 제거 */
      next = tabs.slice(0, count);
    }
    onChange({ ...widget, tabs: next });
  }

  /** 개별 탭 필드 업데이트 */
  function handleTabChange(idx: number, patch: Partial<TabItem>) {
    const next = tabs.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    onChange({ ...widget, tabs: next });
  }

  return (
    <div className="space-y-3 pt-1">
      {/* 탭 개수 선택 — 1~5 버튼 토글 */}
      <div>
        <label className={LABEL_CLS}>탭 개수</label>
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_TABS }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleCountChange(n)}
              className={`w-7 h-7 text-xs font-semibold rounded transition-all
                                ${
                                  tabs.length === n
                                    ? "bg-slate-900 text-white"
                                    : "bg-white text-slate-400 border border-slate-200 hover:bg-slate-100"
                                }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* 탭별 설정 — 탭 개수만큼 반복 */}
      <div className="space-y-2">
        {tabs.map((tab, idx) => (
          <div key={tab.id} className="border border-slate-200 rounded p-2 space-y-2 bg-slate-50">
            {/* 탭 번호 헤더 */}
            <p className="text-[10px] font-semibold text-slate-500">탭 {idx + 1}</p>

            {/* 라벨 | key — 한 줄 배치 */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={LABEL_CLS}>
                  라벨 <span className="text-red-400">*</span>
                </label>
                {i18nMode ? (
                  <MessageKeySelector
                    value={tab.labelMsgKey ?? ''}
                    onChange={key => handleTabChange(idx, { labelMsgKey: key || undefined })}
                    resourceType="WORD"
                    size="sm"
                  />
                ) : (
                  <input
                    type="text"
                    value={tab.label}
                    onChange={(e) => handleTabChange(idx, { label: e.target.value })}
                    placeholder={`탭 ${idx + 1}`}
                    className={INPUT_CLS}
                  />
                )}
              </div>
              <div className="w-24">
                <label className={LABEL_CLS}>key</label>
                <input
                  type="text"
                  value={tab.contentKey ?? ""}
                  onChange={(e) => handleTabChange(idx, { contentKey: e.target.value || undefined })}
                  placeholder={`tab_${idx + 1}`}
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* 연결 페이지 SELECT BOX */}
            <div>
              <label className={LABEL_CLS}>연결 페이지</label>
              <select
                value={tab.pageSlug ?? ""}
                onChange={(e) => handleTabChange(idx, { pageSlug: e.target.value })}
                className={INPUT_CLS}
              >
                <option value="">-- 연결 없음 --</option>
                {pageTemplates.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
