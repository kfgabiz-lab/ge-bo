"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderInput, Folder, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import CenterPopupLayout from "@/components/layout/popup/center-popup-layout";
import { useSiteManagementStore } from "@/store/use-site-management-store";
import { useSiteStore } from "@/store/use-site-store";
import { MenuItem } from "@/store/use-menu-store";
import api, { getApiErrorMessage } from "@/lib/api";
import { useI18n } from "@/hooks/use-i18n";

function buildIdMap(items: MenuItem[], map: Map<number, MenuItem> = new Map()) {
  for (const item of items) {
    map.set(item.id, item);
    if (item.children?.length) buildIdMap(item.children, map);
  }
  return map;
}

function collectDescendantIds(item: MenuItem, acc: number[] = []) {
  if (item.children) {
    for (const child of item.children) {
      acc.push(child.id);
      collectDescendantIds(child, acc);
    }
  }
  return acc;
}

function collectAncestorIds(id: number, idMap: Map<number, MenuItem>, acc: number[] = []) {
  const node = idMap.get(id);
  if (node?.parentId != null) {
    acc.push(node.parentId);
    collectAncestorIds(node.parentId, idMap, acc);
  }
  return acc;
}

interface ImportTreeNodeProps {
  item: MenuItem;
  depth: number;
  checked: Set<number>;
  onToggle: (item: MenuItem, checked: boolean) => void;
}

function ImportTreeNode({ item, depth, checked, onToggle }: ImportTreeNodeProps) {
  const { t } = useI18n();
  const displayName = item.nameMsgKey ? t(item.nameMsgKey) : item.name;
  const hasUrl = item.url && item.url.length > 0;
  const isChecked = checked.has(item.id);

  return (
    <div>
      <label
        className="flex items-center gap-1.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer select-none"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onToggle(item, e.target.checked)}
          className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400 cursor-pointer flex-shrink-0"
        />
        {hasUrl ? (
          <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        )}
        <span className="text-xs font-medium text-slate-700 truncate">{displayName}</span>
      </label>
      {item.children?.map((child) => (
        <ImportTreeNode key={child.id} item={child} depth={depth + 1} checked={checked} onToggle={onToggle} />
      ))}
    </div>
  );
}

interface MenuImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function MenuImportModal({ open, onClose, onImported }: MenuImportModalProps) {
  const { t } = useI18n();
  const { sites, fetchSites } = useSiteManagementStore();
  const activeSiteId = useSiteStore((state) => state.activeSiteId);

  const [sourceSiteId, setSourceSiteId] = useState<number | "">("");
  const [tree, setTree] = useState<MenuItem[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [loadingTree, setLoadingTree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectableSites = useMemo(() => sites.filter((s) => s.id !== activeSiteId), [sites, activeSiteId]);
  const idMap = useMemo(() => buildIdMap(tree), [tree]);

  useEffect(() => {
    if (open) {
      fetchSites();
      setSourceSiteId("");
      setTree([]);
      setChecked(new Set());
    }
  }, [open, fetchSites]);

  useEffect(() => {
    if (!sourceSiteId) {
      setTree([]);
      setChecked(new Set());
      return;
    }
    setLoadingTree(true);
    setChecked(new Set());
    api
      .get<MenuItem[]>(`/menus/site/${sourceSiteId}?type=BO`)
      .then((res) => setTree(res.data))
      .catch((err: unknown) => {
        toast.error(getApiErrorMessage(err, "메뉴 목록을 불러오는 중 오류가 발생했습니다."));
        setTree([]);
      })
      .finally(() => setLoadingTree(false));
  }, [sourceSiteId]);

  const handleToggle = (item: MenuItem, isChecked: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (isChecked) {
        next.add(item.id);
        collectAncestorIds(item.id, idMap).forEach((id) => next.add(id));
      } else {
        next.delete(item.id);
        collectDescendantIds(item).forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (checked.size === 0) {
      toast.error("가져올 메뉴를 선택해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ importedCount: number; skippedCount: number }>("/menus/import", {
        sourceSiteId,
        menuIds: [...checked],
      });
      toast.success(`${res.data.importedCount}개의 메뉴를 가져왔습니다.`);
      if (res.data.skippedCount > 0) {
        toast.info(`${res.data.skippedCount}개는 이미 존재하여 건너뛰었습니다.`);
      }
      onClose();
      onImported();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "메뉴 가져오기 중 오류가 발생했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CenterPopupLayout open={open} onClose={onClose} title="메뉴 가져오기" layerWidth="md">
      <div className="px-6 pb-6">
        <p className="text-xs text-slate-500 mb-4">
          다른 홈페이지의 BO 메뉴를 선택해서 현재 홈페이지로 복사합니다. 권한(역할) 설정은 함께 복사되지 않습니다.
        </p>

        <div className="mb-3">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">원본 홈페이지</label>
          <select
            value={sourceSiteId}
            onChange={(e) => setSourceSiteId(e.target.value ? Number(e.target.value) : "")}
            className="w-full border border-slate-200 rounded-md px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 cursor-pointer"
          >
            <option value="">선택하세요</option>
            {selectableSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.nameMsgKey ? t(site.nameMsgKey) : site.name}
              </option>
            ))}
          </select>
        </div>

        <div className="border border-slate-200 rounded-lg min-h-[240px] max-h-[360px] overflow-y-auto p-2">
          {!sourceSiteId ? (
            <div className="flex items-center justify-center h-[220px] text-xs text-slate-400">
              원본 홈페이지를 먼저 선택하세요.
            </div>
          ) : loadingTree ? (
            <div className="flex items-center justify-center h-[220px]">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
          ) : tree.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-xs text-slate-400">
              가져올 수 있는 메뉴가 없습니다.
            </div>
          ) : (
            tree.map((item) => (
              <ImportTreeNode key={item.id} item={item} depth={0} checked={checked} onToggle={handleToggle} />
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-all disabled:opacity-40"
          >
            취소
          </button>
          <button
            onClick={handleImport}
            disabled={submitting || loadingTree || checked.size === 0}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-all disabled:opacity-40"
          >
            {submitting ? "가져오는 중..." : "가져오기"}
          </button>
        </div>
      </div>
    </CenterPopupLayout>
  );
}

export function MenuImportButton({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-all"
      >
        <FolderInput className="w-3.5 h-3.5" />
        메뉴 가져오기
      </button>
      <MenuImportModal open={open} onClose={() => setOpen(false)} onImported={onImported} />
    </>
  );
}
