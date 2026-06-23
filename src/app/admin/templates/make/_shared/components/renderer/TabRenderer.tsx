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

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';
import { fetchTemplateConfig } from "../../templateApi";
import { PageGridRenderer } from "./PageGridRenderer";
import type { PageWidgetItem } from "./PageGridRenderer";
import type { TabWidget, TabItem, RendererMode } from "./types";
import type { TableWidget } from "../builder/TableBuilder";
import { useWidgetPageState, flatWidgets } from "../../hooks/useWidgetPageState";
import { useCodeStore } from "@/store/use-code-store";

interface TabRendererProps {
  mode: RendererMode;
  widget: TabWidget;
  /** 탭을 포함하는 상위 페이지 slug — 저장 시 templateSlug로 사용 */
  pageSlug?: string;
}

export function TabRenderer({ mode, widget, pageSlug }: TabRendererProps) {
  const { tabs } = widget;
  const [activeIdx, setActiveIdx] = useState(0);
  /* 한 번이라도 활성화된 탭 인덱스 집합 — lazy mount용 */
  const [mountedTabs, setMountedTabs] = useState<Set<number>>(new Set([0]));
  const { t } = useI18n();
  const searchParams = useSearchParams();

  /**
   * 탭들이 같은 connectedSlug를 사용할 때 공유하는 row id
   * - key: connectedSlug (pageSlug가 달라도 connectedSlug가 같으면 동일 row 공유)
   * - 최초 저장(POST) 후 생성된 id를 저장 → 이후 탭은 해당 id로 PUT
   * - 초기화 시 connectedSlug를 모르므로 urlId는 LiveTabPanel로 별도 전달
   */
  const [sharedDataIdMap, setSharedDataIdMap] = useState<Record<string, number>>({});
  /* URL ?id — 수정 진입 시 초기 row id */
  const urlId = searchParams.get('id') ? Number(searchParams.get('id')) : null;

  /**
   * 저장 완료된 탭 인덱스 집합
   * - 수정 진입(urlId 있음): 첫 번째 탭(0)을 사전 포함 (이미 저장된 상태)
   * - 신규 진입: 빈 Set → 첫 탭 저장 후 추가
   */
  const [savedTabSet, setSavedTabSet] = useState<Set<number>>(
    () => new Set(urlId ? [0] : [])
  );

  /* 탭 간 공유 데이터생성 자동입력 상태 — fieldId → value (모든 탭 공유) */
  const [crossTabFormValues, setCrossTabFormValues] = useState<Record<string, string>>({});

  /* 어느 탭 PageGridRenderer에서도 escalate 될 수 있는 cross-tab 값 업데이트 콜백 */
  const handleCrossTabFormChange = useCallback((fieldId: string, value: string) => {
    setCrossTabFormValues(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  /**
   * 탭 클릭 이동 가드 (live 모드 한정)
   * - 이동 대상 탭보다 앞에 required=true인 미저장 탭이 있으면 이동 차단
   */
  function handleTabClick(idx: number) {
    if (mode === 'live' && idx > 0) {
      /* 0번 탭만 required 대상 — idx 0의 required가 true이고 미저장이면 차단 */
      const firstTab = tabs[0];
      if (firstTab?.required && !savedTabSet.has(0)) {
        const tabLabel = firstTab.labelMsgKey ? t(firstTab.labelMsgKey) : (firstTab.label || '탭 1');
        toast.warning(`'${tabLabel}' 탭을 먼저 저장해주세요.`);
        return;
      }
    }
    setActiveIdx(idx);
    setMountedTabs((prev) => new Set([...prev, idx]));
  }

  /** 탭 신규 저장 후 생성된 id를 slug별로 기록 */
  function handleDataIdCreated(slug: string, id: number) {
    setSharedDataIdMap((prev) => ({ ...prev, [slug]: id }));
  }

  /** 탭 저장 성공 시 해당 탭 인덱스를 savedTabSet에 추가 */
  function handleTabSaved(tabIdx: number) {
    setSavedTabSet((prev) => new Set([...prev, tabIdx]));
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
              (mode === "live" ? (
                <LiveTabPanel
                  tab={tab}
                  tabIdx={idx}
                  pageSlug={pageSlug}
                  sharedDataIdMap={sharedDataIdMap}
                  urlId={urlId}
                  onDataIdCreated={handleDataIdCreated}
                  onSaved={handleTabSaved}
                  crossTabFormValues={crossTabFormValues}
                  onCrossTabFormChange={handleCrossTabFormChange}
                />
              ) : (
                <PreviewTabPanel tab={tab} activeIdx={idx} />
              ))}
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
  /** 이 탭의 인덱스 — savedTabSet 갱신 시 사용 */
  tabIdx: number;
  /** 탭을 포함하는 상위 페이지 slug — 저장 시 templateSlug로 사용 */
  pageSlug?: string;
  /** connectedSlug → row id 매핑 (TabRenderer 레벨에서 관리) */
  sharedDataIdMap: Record<string, number>;
  /** URL ?id — 수정 진입 시 초기 row id */
  urlId: number | null;
  /** 신규 저장(POST) 후 connectedSlug와 생성된 id를 TabRenderer로 전달 */
  onDataIdCreated: (connectedSlug: string, id: number) => void;
  /** POST/PUT 저장 성공 시 탭 인덱스를 TabRenderer로 전달 — savedTabSet 갱신 */
  onSaved: (tabIdx: number) => void;
  /** TabRenderer 레벨에서 관리하는 cross-tab 공유 폼 값 (fieldId → value) */
  crossTabFormValues: Record<string, string>;
  /** 어떤 탭에서도 대상 fieldId를 못 찾으면 TabRenderer로 에스컬레이션 */
  onCrossTabFormChange: (fieldId: string, value: string) => void;
}

/**
 * 각 탭을 독립 컴포넌트로 분리하여 useWidgetPageState를 탭별로 독립 실행.
 * lazy mount + keep-alive 방식으로 탭 전환 시 상태가 유지된다.
 * contentKey가 설정된 탭은 sharedDataId를 통해 같은 row를 GET+merge+PUT 방식으로 저장.
 */
function LiveTabPanel({ tab, tabIdx, pageSlug, sharedDataIdMap, urlId, onDataIdCreated, onSaved, crossTabFormValues, onCrossTabFormChange }: LiveTabPanelProps) {
  const { groups: codeGroups } = useCodeStore();
  const [widgetItems, setWidgetItems] = useState<PageWidgetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  /**
   * 이 탭의 connectedSlug 목록(저장 위젯 기준)을 추출하여
   * sharedDataIdMap에서 일치하는 id를 찾거나 urlId로 폴백
   * - widgetItems 로드 전에는 urlId 반환 (수정 진입 시 초기값 보장)
   */
  const sharedDataId = useMemo(() => {
    if (!widgetItems.length) return urlId;
    const slugs = flatWidgets(widgetItems)
      .map(w => {
        if (w.type === 'form' || w.type === 'sublist' || w.type === 'multiselect') {
          return (w as { connectedSlug?: string }).connectedSlug;
        }
        return undefined;
      })
      .filter((s): s is string => !!s);
    /* sharedDataIdMap에 등록된 slug 우선, 없으면 urlId */
    for (const slug of slugs) {
      if (sharedDataIdMap[slug] !== undefined) return sharedDataIdMap[slug];
    }
    return urlId ?? null;
  }, [widgetItems, sharedDataIdMap, urlId]);

  const { gridProps } = useWidgetPageState(widgetItems, pageSlug ?? tab.pageSlug, {
    contentKey: tab.contentKey,
    sharedDataId,
    onDataIdCreated,
    onSaved: () => onSaved(tabIdx),
  });

  /* 팝업 저장에 사용할 dataSlug — widgetItems의 첫 번째 table 위젯 connectedSlug */
  const dataSlug = useMemo(() => {
    const tw = flatWidgets(widgetItems).find((w) => w.type === "table") as TableWidget | undefined;
    return tw?.connectedSlug;
  }, [widgetItems]);

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

  return (
    <PageGridRenderer
      mode="live"
      widgetItems={widgetItems}
      codeGroups={codeGroups}
      dataSlug={dataSlug}
      crossTabFormValues={crossTabFormValues}
      onCrossTabFormChange={onCrossTabFormChange}
      {...gridProps}
    />
  );
}
