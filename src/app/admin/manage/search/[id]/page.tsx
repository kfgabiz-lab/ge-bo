"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useCodeStore } from "@/store/use-code-store";
import { useMenusQuery } from "@/hooks/use-menu-queries";
import type { MenuItem } from "@/store/use-menu-store";
import { useI18n } from "@/hooks/use-i18n";
import api from "@/lib/api";

/* 트리 구조인 FO 메뉴를 셀렉트 옵션용으로 평탄화 — url 없는 상위 분류 메뉴는 연결 대상에서 제외 */
type FlatMenuOption = { id: number; label: string; url: string };

function flattenMenuOptions(items: MenuItem[], depth = 0): FlatMenuOption[] {
  return items.flatMap((item) => {
    const label = `${"　".repeat(depth)}${item.metaTitle || item.name}`;
    const self = item.url ? [{ id: item.id, label, url: item.url }] : [];
    const children = item.children ? flattenMenuOptions(item.children, depth + 1) : [];
    return [...self, ...children];
  });
}

/* 분류(page_section) 옵션을 가져올 공통코드 그룹 코드 — 코드값/라벨은 DB(code_detail)에서만 가져온다 */
const PAGE_SECTION_GROUP_CODE = "PAGE_SECTION";

/* ── 검색텍스트 단건 타입 ──
   title 은 뒤늦게 추가된 선택 항목이라 기존 데이터는 NULL 로 내려온다 */
interface SearchTextEntry {
  id: number;
  title: string | null;
  text: string;
  createdAt: string;
}

/* ── 검색관리 단건 상세 응답 타입 ── */
interface SearchMgmtDetail {
  id: number;
  url: string;
  active: boolean;
  /* 분류 — code_detail(group_code='PAGE_SECTION')의 코드값. 선택 입력이라 미지정이면 null */
  pageSection: string | null;
  /* 연동된 FO 메뉴 id — 수동 URL 입력이면 null */
  menuId: number | null;
  texts: SearchTextEntry[];
}

/* ── API 응답의 검색텍스트를 화면 표시용으로 변환 (등록/수정/조회 3곳 공통) ── */
const toTextEntry = (t: SearchTextEntry): SearchTextEntry => ({
  id: t.id,
  title: t.title ?? null,
  text: t.text,
  createdAt: t.createdAt.slice(0, 19).replace("T", " "),
});

/* ── 검색관리 등록/수정 통합 페이지 (id === 'new'이면 신규 등록) ── */
export default function SearchMgmtDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;
  const isNew = routeId === "new";
  const { t } = useI18n();

  /* 실제 저장된 부모 id — 신규 등록 전에는 null */
  const [savedId, setSavedId] = useState<number | null>(isNew ? null : Number(routeId));

  const [url, setUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  /* 분류(page_section) — 선택 입력. 빈 문자열이면 "선택 안 함" */
  const [pageSection, setPageSection] = useState("");
  /* URL 입력방식 — 직접입력 또는 FO 메뉴 선택. 메뉴 선택 시 url은 선택된 메뉴 값으로 자동 고정 */
  const [inputMode, setInputMode] = useState<"manual" | "menu">("manual");
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);

  const { data: menuList } = useMenusQuery("FO");
  const menuOptions = useMemo(() => flattenMenuOptions(menuList ?? []), [menuList]);
  /* 검색텍스트 제목 — 선택 입력(미입력 시 전송하지 않음) */
  const [titleInput, setTitleInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [textList, setTextList] = useState<SearchTextEntry[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  /* 공통코드 스토어 — BO 전역 공통 패턴(useCodeStore + GET /codes) 재사용 */
  const { groups: codeGroups, fetchGroups } = useCodeStore();

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  /* 분류 셀렉트 옵션 — PAGE_SECTION 그룹의 활성 코드를 sortOrder 순으로 노출 */
  const pageSectionOptions = useMemo(
    () =>
      (codeGroups.find((g) => g.groupCode === PAGE_SECTION_GROUP_CODE)?.details ?? [])
        .filter((d) => d.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [codeGroups]
  );

  /* 수정 모드 — 실제 데이터 로드 */
  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get<SearchMgmtDetail>(`/search-manage/${routeId}`);
        setUrl(res.data.url);
        setIsActive(res.data.active);
        /* 저장된 분류 복원 — 미지정(null)이면 "선택 안 함"으로 */
        setPageSection(res.data.pageSection ?? "");
        /* 연동된 메뉴가 있으면 메뉴선택 모드로, 없으면 직접입력 모드로 복원 */
        setInputMode(res.data.menuId ? "menu" : "manual");
        setSelectedMenuId(res.data.menuId ?? null);
        setTextList(res.data.texts.map(toTextEntry));
      } catch {
        toast.error(t("search.alert.dataNotFound"));
        router.back();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [routeId, isNew, router]);

  /* 등록 — 화면 전체(URL/분류/사용여부 + 입력 중인 검색텍스트) 한 번에 저장
       신규면 생성 후 해당 id로 URL만 교체(화면 이동 없음), 기존이면 그대로 갱신 */
  const handleRegister = useCallback(async () => {
    if (!url.trim()) {
      toast.error(t("search.alert.urlRequired"));
      return;
    }
    setSaving(true);
    try {
      const trimmedText = textInput.trim();
      /* 제목은 선택 입력 — 미입력이면 null 로 보내 서버에서 NULL 로 저장되게 한다 */
      const trimmedTitle = titleInput.trim();
      const textPayload = { title: trimmedTitle || null, text: trimmedText };

      /* 분류는 미선택 시 빈 문자열로 보낸다.
               서버는 pageSection 이 null 이면 "필드 미전달 = 기존 값 유지"로 해석하므로,
               null 을 보내면 선택 해제가 저장되지 않는다. 빈 문자열은 서버에서 NULL 로 정규화된다. */
      const sectionPayload = pageSection.trim();
      /* 메뉴선택 모드가 아니면 항상 null 전송 — 연결 해제도 이 필드로 명시적으로 반영된다 */
      const menuIdPayload = inputMode === "menu" ? selectedMenuId : null;

      if (savedId) {
        await api.put(`/search-manage/${savedId}`, {
          url: url.trim(),
          active: isActive,
          pageSection: sectionPayload,
          menuId: menuIdPayload,
        });
        if (trimmedText) {
          const res = await api.post<SearchMgmtDetail>(`/search-manage/${savedId}/texts`, textPayload);
          setTextList(res.data.texts.map(toTextEntry));
          setTitleInput("");
          setTextInput("");
        }
        toast.success(t("common.saved"));
        return;
      }

      const created = await api.post<SearchMgmtDetail>("/search-manage", {
        url: url.trim(),
        active: isActive,
        pageSection: sectionPayload,
        menuId: menuIdPayload,
      });
      const newId = created.data.id;
      let latestTexts = created.data.texts;

      if (trimmedText) {
        const res = await api.post<SearchMgmtDetail>(`/search-manage/${newId}/texts`, textPayload);
        latestTexts = res.data.texts;
        setTitleInput("");
        setTextInput("");
      }

      setSavedId(newId);
      setTextList(latestTexts.map(toTextEntry));
      toast.success(t("site.created"));
      router.replace(`/admin/manage/search/${newId}`);
    } catch {
      toast.error(t("menu.save_error"));
    } finally {
      setSaving(false);
    }
  }, [url, isActive, pageSection, inputMode, selectedMenuId, titleInput, textInput, savedId, router, t]);

  /* 검색텍스트 삭제 — 브라우저 기본 confirm으로 확인 후 실행 */
  const handleDeleteText = useCallback(
    async (entryId: number) => {
      if (!savedId) return;
      if (!confirm(t("search.confirm.deleteSearchText"))) return;
      try {
        await api.delete(`/search-manage/${savedId}/texts/${entryId}`);
        setTextList((prev) => prev.filter((e) => e.id !== entryId));
      } catch {
        toast.error(t("search.alert.deleteFailed"));
      }
    },
    [savedId, t]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-slate-400">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <PageLayout mode="live">
      {/* URL + 분류 + 사용여부 — 분류 입력이 추가되어 rowSpan 을 1 늘리고, 아래 목록에서 1 줄인다(전체 높이 유지) */}
      <GridCell colSpan={12} rowSpan={3}>
        <div className="h-full space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">{t("popup.label.url")}</label>
              <div className="flex gap-1 rounded-md border border-slate-200 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode("manual")}
                  className={`rounded px-2 py-1 ${
                    inputMode === "manual" ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                >
                  {t("search.btn.manualInput")}
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("menu")}
                  className={`rounded px-2 py-1 ${inputMode === "menu" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                >
                  {t("search.btn.selectMenu")}
                </button>
              </div>
            </div>
            {inputMode === "menu" ? (
              <select
                value={selectedMenuId ?? ""}
                onChange={(e) => {
                  const menuId = e.target.value ? Number(e.target.value) : null;
                  setSelectedMenuId(menuId);
                  const matched = menuOptions.find((m) => m.id === menuId);
                  setUrl(matched?.url ?? "");
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="">{t("search.option.selectFoMenu")}</option>
                {menuOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t("search.label.urlInput")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            )}
          </div>
          {/* 분류 — URL(=search_manage) 단위 속성. 선택 입력이라 "선택 안 함" 허용 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("training.label.category")}</label>
            <select
              value={pageSection}
              onChange={(e) => setPageSection(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="">{t("search.option.notSelected")}</option>
              {pageSectionOptions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">{t("common.label.isActive")}</span>
            <ToggleSwitch checked={isActive} onChange={setIsActive} />
          </div>
        </div>
      </GridCell>

      {/* 검색텍스트 등록 — 제목 입력이 추가되어 rowSpan 을 1 늘리고, 아래 목록에서 1 줄인다(전체 높이 유지) */}
      <GridCell colSpan={12} rowSpan={4}>
        <div className="h-full space-y-2 rounded-lg border border-slate-200 bg-white p-5">
          {/* 제목 — 선택 입력, 미입력 시 FO 검색결과에서 URL 이 대신 노출된다 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("common.label.title")}</label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder={t("search.placeholder.titleInput")}
              maxLength={200}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <label className="block text-sm font-medium text-slate-700">{t("search.label.searchText")}</label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={t("search.placeholder.searchTextInput")}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/manage/search")}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t("common.btn.list")}
            </button>
            <button
              type="button"
              onClick={handleRegister}
              disabled={saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savedId ? t("common.btn.save") : t("search.btn.register")}
            </button>
          </div>
        </div>
      </GridCell>

      {/* 등록된 검색텍스트 목록 — 최신순, 넘치면 내부 스크롤
                (위 카드들이 rowSpan 을 늘린 만큼 여기서 줄여 전체 높이 14를 유지한다) */}
      <GridCell colSpan={12} rowSpan={7}>
        <div className="h-full space-y-2 overflow-y-auto pr-1">
          {textList.length === 0 && (
            <p className="p-4 text-center text-sm text-slate-400">{t("search.empty.noSearchText")}</p>
          )}
          {textList.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                {/* 제목 — 없는 기존 데이터는 아예 렌더링하지 않는다 */}
                {entry.title && <p className="mb-1 block text-sm font-medium text-slate-700">{entry.title}</p>}
                <p className="whitespace-pre-wrap text-sm text-slate-800">{entry.text}</p>
                <p className="mt-1 text-xs text-slate-400">{entry.createdAt}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteText(entry.id)}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                {t("common.btn.delete")}
              </button>
            </div>
          ))}
        </div>
      </GridCell>
    </PageLayout>
  );
}
