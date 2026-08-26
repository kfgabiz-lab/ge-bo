"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2, Search, ChevronUp, ChevronDown, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import CenterPopupLayout from "@/components/layout/popup/center-popup-layout";
import api, { getApiErrorMessage } from "@/lib/api";

interface ApiInfoRow {
  id: number;
  method: string;
  urlPattern: string;
  category: string | null;
  accessType: string;
}

const METHOD_ORDER = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const METHOD_BADGE_CLS: Record<string, string> = {
  GET: "bg-blue-50 text-blue-600 border border-blue-200",
  POST: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  PUT: "bg-violet-50 text-violet-600 border border-violet-200",
  PATCH: "bg-amber-50 text-amber-600 border border-amber-200",
  DELETE: "bg-red-50 text-red-600 border border-red-200",
};
const METHOD_BADGE_FALLBACK_CLS = "bg-slate-50 text-slate-600 border border-slate-200";
const METHOD_BADGE_INACTIVE_CLS = "bg-white text-slate-400 border border-slate-200 hover:border-slate-300";

interface UrlGroup {
  urlPattern: string;
  category: string | null;
  methods: { id: number; method: string }[];
}

type SortKey = "urlPattern" | "category";
type SortDir = "asc" | "desc";

export function MenuApiRegisterButton({ menuId }: { menuId: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiList, setApiList] = useState<ApiInfoRow[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [keyword, setKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, mappedRes] = await Promise.all([
        api.get<ApiInfoRow[]>("/api-infos/active"),
        api.get<number[]>(`/menus/${menuId}/apis`),
      ]);
      /* accessType=ALL API는 menu_api 등록과 무관하게 항상 허용되므로 등록 대상 목록에서 제외 */
      setApiList(listRes.data.filter((api) => api.accessType !== "ALL"));
      setChecked(new Set(mappedRes.data));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "API 목록을 불러오는 중 오류가 발생했습니다."));
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setKeyword("");
    loadData();
  };

  const toggle = (id: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      /* 3단계 토글: asc → desc → 정렬 해제 */
      setSortKey(null);
    }
  };

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    let filtered = apiList;
    if (kw) {
      filtered = filtered.filter(
        (api) =>
          api.urlPattern.toLowerCase().includes(kw) ||
          api.method.toLowerCase().includes(kw) ||
          (api.category ?? "").toLowerCase().includes(kw)
      );
    }

    const groupMap = new Map<string, UrlGroup>();
    for (const api of filtered) {
      const group = groupMap.get(api.urlPattern);
      if (group) {
        group.methods.push({ id: api.id, method: api.method });
      } else {
        groupMap.set(api.urlPattern, {
          urlPattern: api.urlPattern,
          category: api.category,
          methods: [{ id: api.id, method: api.method }],
        });
      }
    }

    let result = Array.from(groupMap.values());
    result.forEach((group) => {
      group.methods.sort(
        (a, b) =>
          METHOD_ORDER.indexOf(a.method as (typeof METHOD_ORDER)[number]) -
          METHOD_ORDER.indexOf(b.method as (typeof METHOD_ORDER)[number])
      );
    });

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = (a[sortKey] ?? "").toString();
        const bv = (b[sortKey] ?? "").toString();
        const cmp = av.localeCompare(bv);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [apiList, keyword, sortKey, sortDir]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await api.put(`/menus/${menuId}/apis`, { apiInfoIds: [...checked] });
      toast.success("저장되었습니다.");
      setOpen(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "저장 중 오류가 발생했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-all"
      >
        <Link2 className="w-3.5 h-3.5" />
        API 등록
      </button>

      <CenterPopupLayout open={open} onClose={() => setOpen(false)} title="사용 API 등록" layerWidth="md">
        <div className="px-6 pb-6">
          <p className="text-xs text-slate-500 mb-4">
            이 메뉴에서 사용하는 API를 선택하세요. 여러 화면이 공용으로 쓰는 API는 선택하지 마세요.
          </p>

          {/* 검색 */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="메소드, URL, 카테고리 검색"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            {/* 헤더 — URL/카테고리 클릭 시 정렬 */}
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
              <button
                onClick={() => handleSort("urlPattern")}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-all flex-1"
              >
                URL 패턴
                {sortKey === "urlPattern" ? (
                  sortDir === "asc" ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )
                ) : (
                  <ChevronsUpDown className="w-3 h-3 text-slate-300" />
                )}
              </button>
              <span className="w-52 text-[11px] font-semibold text-slate-500 text-center">METHOD</span>
              <button
                onClick={() => handleSort("category")}
                className="flex items-center gap-1 justify-end text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-all w-24"
              >
                카테고리
                {sortKey === "category" ? (
                  sortDir === "asc" ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )
                ) : (
                  <ChevronsUpDown className="w-3 h-3 text-slate-300" />
                )}
              </button>
            </div>

            {/* 목록 */}
            <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                </div>
              ) : rows.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-slate-400">검색 결과가 없습니다.</p>
              ) : (
                rows.map((group) => (
                  <div key={group.urlPattern} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <span className="text-xs font-mono text-slate-700 flex-1">{group.urlPattern}</span>
                    <span className="w-52 flex flex-wrap items-center justify-center gap-1">
                      {group.methods.map(({ id, method }) => {
                        const active = checked.has(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggle(id)}
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-all ${
                              active
                                ? (METHOD_BADGE_CLS[method] ?? METHOD_BADGE_FALLBACK_CLS)
                                : METHOD_BADGE_INACTIVE_CLS
                            }`}
                          >
                            {method}
                          </button>
                        );
                      })}
                    </span>
                    <span className="w-24 text-[10px] text-slate-400 text-right">{group.category ?? "-"}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-all disabled:opacity-40"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={submitting || loading}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-all disabled:opacity-40"
            >
              {submitting ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </CenterPopupLayout>
    </>
  );
}
