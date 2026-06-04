"use client";

/**
 * TabRenderer — 탭 컨텐츠 위젯 렌더러
 *
 * [preview 모드]
 *   - 탭 바 + 탭 전환 인터랙션
 *   - TabItem.items 있으면 PageGridRenderer로 위젯 직접 렌더링
 *   - pageSlug만 있으면 슬러그명 안내 표시
 *   - 둘 다 없으면 "페이지를 연결하세요" 안내
 *
 * [live 모드]
 *   - 처음 방문한 탭만 마운트 (lazy mount) → 이후 탭 전환 시 hidden 처리 (keep-alive)
 *   - 각 탭 패널이 useWidgetPageState를 통해 독립적으로 상태 관리
 *   - pageSlug 없는 탭: "연결된 페이지가 없습니다" 안내
 *
 * 사용법:
 *   <TabRenderer mode="preview" widget={tabWidget} />
 *   <TabRenderer mode="live" widget={tabWidget} />
 */

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from '@/hooks/use-i18n';
import { fetchTemplateConfig } from "../../templateApi";
import { PageGridRenderer } from "./PageGridRenderer";
import type { PageWidgetItem } from "./PageGridRenderer";
import type { TabWidget, TabItem, RendererMode } from "./types";
import { useWidgetPageState } from "../../hooks/useWidgetPageState";
import { useCodeStore } from "@/store/use-code-store";

interface TabRendererProps {
  mode: RendererMode;
  widget: TabWidget;
}

export function TabRenderer({ mode, widget }: TabRendererProps) {
  const { tabs } = widget;
  const [activeIdx, setActiveIdx] = useState(0);
  /* 한 번이라도 활성화된 탭 인덱스 집합 — lazy mount용 */
  const [mountedTabs, setMountedTabs] = useState<Set<number>>(new Set([0]));
  const { t } = useI18n();

  /* 탭 클릭 시 해당 탭을 마운트 목록에 추가 */
  function handleTabClick(idx: number) {
    setActiveIdx(idx);
    setMountedTabs((prev) => new Set([...prev, idx]));
  }

  return (
    <div className="h-full w-full flex flex-col rounded border border-slate-300 bg-white shadow-sm overflow-hidden">
      {/* 탭 바 */}
      <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0">
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(idx)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              idx === activeIdx
                ? "border-slate-800 text-slate-900 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.labelMsgKey ? t(tab.labelMsgKey) : (tab.label || `탭 ${idx + 1}`)}
          </button>
        ))}
      </div>

      {/* 탭 패널 — keep-alive: 마운트된 탭은 hidden으로 숨기되 언마운트하지 않음 */}
      <div className="flex-1 overflow-auto min-h-0">
        {tabs.map((tab, idx) => (
          <div key={tab.id} className={idx === activeIdx ? "h-full" : "hidden"}>
            {mountedTabs.has(idx) &&
              (mode === "live" ? <LiveTabPanel tab={tab} /> : <PreviewTabPanel tab={tab} activeIdx={idx} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Preview 탭 패널 ── */

interface PreviewTabPanelProps {
  tab: TabItem;
  activeIdx: number;
}

function PreviewTabPanel({ tab, activeIdx }: PreviewTabPanelProps) {
  /* items가 있으면 PageGridRenderer로 직접 렌더링 */
  if (tab.items && tab.items.length > 0) {
    return (
      <PageGridRenderer
        mode="preview"
        widgetItems={tab.items.map(
          (item, idx): PageWidgetItem => ({
            id: `tab-preview-${activeIdx}-${idx}`,
            colSpan: item.colSpan,
            rowSpan: item.rowSpan,
            contents: [
              {
                id: `tab-content-${activeIdx}-${idx}`,
                colSpan: item.colSpan,
                rowSpan: item.rowSpan,
                widget: item.widget,
              },
            ],
          })
        )}
      />
    );
  }

  return (
    <div className="h-full flex items-center justify-center text-sm text-slate-400">
      {tab.pageSlug ? <span>{tab.pageSlug} 페이지 렌더링 예정</span> : <span>페이지를 연결하세요</span>}
    </div>
  );
}

/* ── Live 탭 패널 ── */

interface LiveTabPanelProps {
  tab: TabItem;
}

/**
 * 각 탭을 독립 컴포넌트로 분리하여 useWidgetPageState를 탭별로 독립 실행.
 * lazy mount + keep-alive 방식으로 탭 전환 시 상태가 유지된다.
 */
function LiveTabPanel({ tab }: LiveTabPanelProps) {
  const { groups: codeGroups } = useCodeStore();
  const [widgetItems, setWidgetItems] = useState<PageWidgetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const { gridProps } = useWidgetPageState(widgetItems);

  /* pageSlug로 widgetItems 로드 — 최초 1회 */
  useEffect(() => {
    if (!tab.pageSlug) return;
    setLoading(true);
    fetchTemplateConfig(tab.pageSlug)
      .then((cfg) => {
        setWidgetItems(cfg.widgetItems as unknown as PageWidgetItem[]);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [tab.pageSlug]);

  /* pageSlug 없는 탭 */
  if (!tab.pageSlug) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">연결된 페이지가 없습니다</div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (failed) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-red-400">페이지를 불러올 수 없습니다</div>
    );
  }

  if (!widgetItems.length) return null;

  return <PageGridRenderer mode="live" widgetItems={widgetItems} codeGroups={codeGroups} {...gridProps} />;
}
