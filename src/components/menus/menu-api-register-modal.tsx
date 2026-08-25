"use client";

import { useMemo, useState } from "react";
import { Link2, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import CenterPopupLayout from "@/components/layout/popup/center-popup-layout";

/* 퍼블 단계 — 실제 api_info 연동 전 샘플 데이터 */
interface ApiInfoRow {
  id: number;
  method: string;
  urlPattern: string;
  category: string;
}

const SAMPLE_API_LIST: ApiInfoRow[] = [
  { id: 1, method: "GET", urlPattern: "/api/v1/menus", category: "시스템" },
  { id: 2, method: "POST", urlPattern: "/api/v1/menus", category: "시스템" },
  { id: 3, method: "PATCH", urlPattern: "/api/v1/menus/{id}", category: "시스템" },
  { id: 4, method: "DELETE", urlPattern: "/api/v1/menus/{id}", category: "시스템" },
  { id: 5, method: "GET", urlPattern: "/api/v1/admins", category: "사용자관리" },
  { id: 6, method: "PATCH", urlPattern: "/api/v1/admins/{id}", category: "사용자관리" },
  { id: 7, method: "GET", urlPattern: "/api/v1/roles", category: "권한관리" },
  { id: 8, method: "GET", urlPattern: "/api/v1/codes", category: "공통코드" },
  { id: 9, method: "GET", urlPattern: "/api/v1/sites", category: "사이트관리" },
];

const METHOD_BADGE_CLS: Record<string, string> = {
  GET: "bg-blue-50 text-blue-600 border border-blue-200",
  POST: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  PATCH: "bg-amber-50 text-amber-600 border border-amber-200",
  DELETE: "bg-red-50 text-red-600 border border-red-200",
};

type SortKey = "method" | "urlPattern" | "category";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; cls: string }[] = [
  { key: "method", label: "메소드", cls: "w-20" },
  { key: "urlPattern", label: "URL 패턴", cls: "flex-1" },
  { key: "category", label: "카테고리", cls: "w-24 text-right" },
];

export function MenuApiRegisterButton() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [keyword, setKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
    let result = SAMPLE_API_LIST;
    if (kw) {
      result = result.filter(
        (api) =>
          api.urlPattern.toLowerCase().includes(kw) ||
          api.method.toLowerCase().includes(kw) ||
          api.category.toLowerCase().includes(kw)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = a[sortKey].localeCompare(b[sortKey]);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [keyword, sortKey, sortDir]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
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
            {/* 헤더 — 클릭 시 정렬 */}
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
              <span className="w-4" />
              {COLUMNS.map((col) => {
                const active = sortKey === col.key;
                return (
                  <button
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-all ${col.cls} ${col.key === "category" ? "justify-end" : ""}`}
                  >
                    {col.label}
                    {active ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 목록 */}
            <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
              {rows.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-slate-400">검색 결과가 없습니다.</p>
              ) : (
                rows.map((api) => (
                  <label key={api.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={checked.has(api.id)}
                      onChange={() => toggle(api.id)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="w-20">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${METHOD_BADGE_CLS[api.method]}`}
                      >
                        {api.method}
                      </span>
                    </span>
                    <span className="text-xs font-mono text-slate-700 flex-1">{api.urlPattern}</span>
                    <span className="w-24 text-[10px] text-slate-400 text-right">{api.category}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-all"
            >
              취소
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-all"
            >
              저장
            </button>
          </div>
        </div>
      </CenterPopupLayout>
    </>
  );
}
